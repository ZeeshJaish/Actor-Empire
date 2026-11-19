import Foundation
import UIKit
import Capacitor

/* Save transfer on iPhone (19 Nov 2026, Zeesh: "iPhone mein save import/export nahi hota"). The same calls as Android's
   AndroidSaveTransferPlugin (services/saveTransfer.ts): a big career arrives in pieces of a few hundred KB appended to a
   file (a 70-80 MB career never crosses the bridge as one string), then the share sheet offers the file: Save to Files,
   AirDrop, Messages, Mail. Each export gets its own folder in the app's temporary directory; folders older than ten
   minutes are removed when the next export starts. Import needs no native code: the page's file picker reads the file. */
@objc(AeSaveTransferPlugin)
public class AeSaveTransferPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AeSaveTransferPlugin"
    public let jsName = "AeSaveTransfer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareExport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "beginExport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "appendExport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishExport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelExport", returnType: CAPPluginReturnPromise)
    ]

    private final class PendingExport {
        let url: URL
        let handle: FileHandle
        var chars = 0
        init(url: URL, handle: FileHandle) { self.url = url; self.handle = handle }
    }
    private var pending: [String: PendingExport] = [:]
    private let lock = NSLock()
    private static let defaultName = "actor-empire-save-transfer.aesave"

    private var exportsRoot: URL {
        FileManager.default.temporaryDirectory.appendingPathComponent("save_exports", isDirectory: true)
    }

    private func safeName(_ name: String?) -> String {
        let allowed = Set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-")
        let cleaned = String((name ?? "").map { allowed.contains($0) ? $0 : "_" })
        return cleaned.isEmpty ? AeSaveTransferPlugin.defaultName : cleaned
    }

    private func removeOldExports() {
        let manager = FileManager.default
        guard let entries = try? manager.contentsOfDirectory(at: exportsRoot, includingPropertiesForKeys: [.contentModificationDateKey]) else { return }
        let cutoff = Date().addingTimeInterval(-10 * 60)
        for entry in entries {
            let modified = (try? entry.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate ?? Date()
            if modified < cutoff { try? manager.removeItem(at: entry) }
        }
    }

    private func newExportFile(_ filename: String?) throws -> (String, URL) {
        removeOldExports()
        let id = UUID().uuidString
        let folder = exportsRoot.appendingPathComponent(id, isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let url = folder.appendingPathComponent(safeName(filename))
        guard FileManager.default.createFile(atPath: url.path, contents: nil) else {
            throw NSError(domain: "AeSaveTransfer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not prepare the export file."])
        }
        return (id, url)
    }

    private func write(_ text: String, to handle: FileHandle) throws {
        let data = Data(text.utf8)
        if #available(iOS 13.4, *) {
            try handle.seekToEnd()
            try handle.write(contentsOf: data)
        } else {
            handle.seekToEndOfFile()
            handle.write(data)
        }
    }

    /** The share sheet with the finished file; resolves when the player closes it. */
    private func present(_ url: URL, _ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard var top = self.bridge?.viewController else {
                call.reject("Save export failed: nothing to show the share sheet on.")
                return
            }
            while let next = top.presentedViewController { top = next }
            let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            if let popover = sheet.popoverPresentationController {
                // iPad: the sheet needs an anchor
                popover.sourceView = top.view
                popover.sourceRect = CGRect(x: top.view.bounds.midX, y: top.view.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }
            var answered = false
            sheet.completionWithItemsHandler = { _, completed, _, error in
                if answered { return }
                answered = true
                if let error = error { call.reject("Save export failed: \(error.localizedDescription)") }
                else { call.resolve(["shared": completed]) }
            }
            top.present(sheet, animated: true)
        }
    }

    @objc func shareExport(_ call: CAPPluginCall) {
        guard let content = call.getString("content"), !content.isEmpty else {
            call.reject("Missing export content.")
            return
        }
        do {
            let (_, url) = try newExportFile(call.getString("filename"))
            try Data(content.utf8).write(to: url, options: .atomic)
            present(url, call)
        } catch {
            call.reject("Save export failed: \(error.localizedDescription)")
        }
    }

    @objc func beginExport(_ call: CAPPluginCall) {
        do {
            let (id, url) = try newExportFile(call.getString("filename"))
            let handle = try FileHandle(forWritingTo: url)
            lock.lock()
            pending[id] = PendingExport(url: url, handle: handle)
            lock.unlock()
            call.resolve(["id": id])
        } catch {
            call.reject("Save export failed: \(error.localizedDescription)")
        }
    }

    @objc func appendExport(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), let chunk = call.getString("chunk") else {
            call.reject("Unknown export.")
            return
        }
        lock.lock()
        let entry = pending[id]
        lock.unlock()
        guard let export = entry else {
            call.reject("Unknown export.")
            return
        }
        guard FileManager.default.fileExists(atPath: export.url.path) else {
            // iOS cleared the temporary folder mid-export: never finish a file that lost its start
            call.reject("Save export was interrupted.")
            return
        }
        do {
            try write(chunk, to: export.handle)
            export.chars += chunk.utf16.count
            call.resolve()
        } catch {
            call.reject("Save export failed: \(error.localizedDescription)")
        }
    }

    @objc func finishExport(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("Unknown export.")
            return
        }
        lock.lock()
        let entry = pending.removeValue(forKey: id)
        lock.unlock()
        guard let export = entry else {
            call.reject("Unknown export.")
            return
        }
        try? export.handle.close()
        // the page counts UTF-16 units, as String.utf16 does: a file that is short of them is never offered
        if let expected = call.getInt("chars"), expected != export.chars {
            try? FileManager.default.removeItem(at: export.url.deletingLastPathComponent())
            call.reject("Save export was cut short.")
            return
        }
        present(export.url, call)
    }

    @objc func cancelExport(_ call: CAPPluginCall) {
        if let id = call.getString("id") {
            lock.lock()
            let entry = pending.removeValue(forKey: id)
            lock.unlock()
            if let export = entry {
                try? export.handle.close()
                try? FileManager.default.removeItem(at: export.url.deletingLastPathComponent())
            }
        }
        call.resolve()
    }
}
