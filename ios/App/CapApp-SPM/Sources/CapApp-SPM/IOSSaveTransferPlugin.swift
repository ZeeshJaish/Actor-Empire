import Foundation
import UIKit
import UniformTypeIdentifiers
import Capacitor

@objc(IOSSaveTransferPlugin)
public class IOSSaveTransferPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "IOSSaveTransferPlugin"
    public let jsName = "IOSSaveTransfer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "beginExport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "beginExportRecord", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "appendExportChunk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishExportRecord", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "beginExportManifest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "appendExportManifestChunk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finalizeExport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareStreamedExport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelExport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "beginImport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepareImportManifest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readImportManifestChunk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "beginImportRecord", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readImportRecordChunk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishImportRecord", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readLegacyImportChunk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishImport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelImport", returnType: CAPPluginReturnPromise),
    ]

    private let ioQueue = DispatchQueue(label: "com.zeeshapps.actorempire.save-transfer", qos: .utility)
    private var exports: [String: IOSSaveTransferExportSession] = [:]
    private var imports: [String: IOSSaveTransferImportSession] = [:]
    private var importFiles: [String: URL] = [:]
    private var pendingPickerCall: CAPPluginCall?

    private func sessionRoot() throws -> URL {
        let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("ActorEmpireSaveTransfer", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }

    private func sessionID(_ call: CAPPluginCall) throws -> String {
        guard let id = call.getString("sessionId"), UUID(uuidString: id) != nil else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer session id is invalid.")
        }
        return id
    }

    private func exportSession(_ call: CAPPluginCall) throws -> IOSSaveTransferExportSession {
        let id = try sessionID(call)
        guard let session = exports[id] else {
            throw IOSSaveTransferFraming.FramingError.invalid("Export session is no longer available.")
        }
        return session
    }

    private func importSession(_ call: CAPPluginCall) throws -> IOSSaveTransferImportSession {
        let id = try sessionID(call)
        guard let session = imports[id] else {
            throw IOSSaveTransferFraming.FramingError.invalid("Import session is no longer available.")
        }
        return session
    }

    private func boundedChunk(_ call: CAPPluginCall) throws -> Data {
        guard let raw = call.getString("dataBase64"), !raw.isEmpty,
              raw.count <= 4 * ((IOSSaveTransferFraming.maxChunkBytes + 2) / 3),
              let data = Data(base64Encoded: raw), !data.isEmpty,
              data.count <= IOSSaveTransferFraming.maxChunkBytes else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer chunk exceeds its bridge limit.")
        }
        return data
    }

    private func requestedChunkBytes(_ call: CAPPluginCall) throws -> Int {
        guard let count = call.getInt("maxBytes"), count > 0,
              count <= IOSSaveTransferFraming.maxChunkBytes else {
            throw IOSSaveTransferFraming.FramingError.invalid("Transfer chunk request exceeds its limit.")
        }
        return count
    }

    private func chunkPayload(_ data: Data) -> [String: Any] {
        ["dataBase64": data.base64EncodedString(), "byteLength": data.count, "done": data.isEmpty]
    }

    private func removeExport(_ id: String) {
        guard let session = exports.removeValue(forKey: id) else { return }
        session.cancel()
        try? FileManager.default.removeItem(at: session.fileURL.deletingLastPathComponent())
    }

    private func removeImport(_ id: String) {
        imports.removeValue(forKey: id)?.cancel()
        if let file = importFiles.removeValue(forKey: id) {
            try? FileManager.default.removeItem(at: file.deletingLastPathComponent())
        }
    }

    @objc public func beginExport(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                let id = UUID().uuidString
                let directory = try self.sessionRoot().appendingPathComponent("export-\(id)", isDirectory: true)
                let filename = call.getString("filename") ?? "actor-empire-save-transfer.aesave"
                let session = try IOSSaveTransferExportSession(directory: directory, filename: filename)
                self.exports[id] = session
                call.resolve([
                    "sessionId": id,
                    "maxChunkBytes": IOSSaveTransferFraming.maxChunkBytes,
                    "maxBase64Chars": 4 * ((IOSSaveTransferFraming.maxChunkBytes + 2) / 3),
                ])
            } catch { call.reject("Could not begin streamed save export: \(error)") }
        }
    }

    @objc public func beginExportRecord(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                guard let id = call.getString("recordId") else {
                    throw IOSSaveTransferFraming.FramingError.invalid("Record id is missing.")
                }
                try self.exportSession(call).beginRecord(id: id)
                call.resolve()
            } catch { call.reject("Could not begin export record: \(error)") }
        }
    }

    @objc public func appendExportChunk(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                let bytes = try self.boundedChunk(call)
                let accepted = try self.exportSession(call).appendRecordChunk(bytes)
                call.resolve(["acceptedBytes": accepted])
            } catch { call.reject("Could not append export chunk: \(error)") }
        }
    }

    @objc public func finishExportRecord(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                let session = try self.exportSession(call)
                let result = try session.finishRecord()
                call.resolve(["recordId": session.lastRecordID ?? "", "byteLength": result.byteLength, "sha256": result.sha256])
            } catch { call.reject("Could not finish export record: \(error)") }
        }
    }

    @objc public func beginExportManifest(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                guard let length = call.getInt("byteLength") else {
                    throw IOSSaveTransferFraming.FramingError.invalid("Manifest length is missing.")
                }
                try self.exportSession(call).beginManifest(byteLength: length)
                call.resolve()
            } catch { call.reject("Could not begin transfer manifest: \(error)") }
        }
    }

    @objc public func appendExportManifestChunk(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                let bytes = try self.boundedChunk(call)
                let accepted = try self.exportSession(call).appendManifestChunk(bytes)
                call.resolve(["acceptedBytes": accepted])
            } catch { call.reject("Could not append transfer manifest: \(error)") }
        }
    }

    @objc public func finalizeExport(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                let result = try self.exportSession(call).finalize()
                call.resolve(["byteLength": result.byteLength, "sha256": result.sha256])
            } catch {
                if let id = call.getString("sessionId") { self.removeExport(id) }
                call.reject("Could not finalize streamed save export: \(error)")
            }
        }
    }

    @objc public func shareStreamedExport(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                let id = try self.sessionID(call)
                let session = try self.exportSession(call)
                guard FileManager.default.fileExists(atPath: session.fileURL.path) else {
                    throw IOSSaveTransferFraming.FramingError.invalid("Export file is not finalized.")
                }
                DispatchQueue.main.async {
                    guard let presenter = self.bridge?.viewController else {
                        call.reject("No iOS view controller is available to share the transfer.")
                        return
                    }
                    let controller = UIActivityViewController(activityItems: [session.fileURL], applicationActivities: nil)
                    if let popover = controller.popoverPresentationController {
                        popover.sourceView = presenter.view
                        popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
                    }
                    controller.completionWithItemsHandler = { _, completed, _, error in
                        self.ioQueue.async { self.removeExport(id) }
                        if let error { call.reject("Could not share save transfer: \(error)") }
                        else { call.resolve(["shared": completed]) }
                    }
                    presenter.present(controller, animated: true)
                }
            } catch { call.reject("Could not share streamed save export: \(error)") }
        }
    }

    @objc public func cancelExport(_ call: CAPPluginCall) {
        ioQueue.async {
            if let id = call.getString("sessionId") { self.removeExport(id) }
            call.resolve()
        }
    }

    @objc public func beginImport(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pendingPickerCall == nil else {
                call.reject("A transfer file picker is already open.")
                return
            }
            guard let presenter = self.bridge?.viewController else {
                call.reject("No iOS view controller is available to select the transfer.")
                return
            }
            self.pendingPickerCall = call
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.data, UTType.json], asCopy: true)
            picker.delegate = self
            presenter.present(picker, animated: true)
        }
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        let call = pendingPickerCall
        pendingPickerCall = nil
        call?.reject("No transfer file selected.")
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        let call = pendingPickerCall
        pendingPickerCall = nil
        guard let call, let selected = urls.first else { return }
        ioQueue.async {
            let id = UUID().uuidString
            let directory = try? self.sessionRoot().appendingPathComponent("import-\(id)", isDirectory: true)
            do {
                guard let directory else {
                    throw IOSSaveTransferFraming.FramingError.invalid("Could not prepare import directory.")
                }
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                let copied = directory.appendingPathComponent("selected.aesave")
                let scoped = selected.startAccessingSecurityScopedResource()
                defer { if scoped { selected.stopAccessingSecurityScopedResource() } }
                try FileManager.default.copyItem(at: selected, to: copied)
                let session = try IOSSaveTransferImportSession(fileURL: copied)
                self.imports[id] = session
                self.importFiles[id] = copied
                call.resolve([
                    "sessionId": id,
                    "formatVersion": session.formatVersion,
                    "totalBytes": session.totalBytes,
                    "maxChunkBytes": IOSSaveTransferFraming.maxChunkBytes,
                ])
            } catch {
                if let directory { try? FileManager.default.removeItem(at: directory) }
                call.reject("Could not open save transfer file: \(error)")
            }
        }
    }

    @objc public func prepareImportManifest(_ call: CAPPluginCall) {
        ioQueue.async {
            do { call.resolve(["byteLength": try self.importSession(call).prepareManifest()]) }
            catch { call.reject("Could not read transfer manifest: \(error)") }
        }
    }

    @objc public func readImportManifestChunk(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                let bytes = try self.importSession(call).readManifestChunk(maxBytes: self.requestedChunkBytes(call))
                call.resolve(self.chunkPayload(bytes))
            } catch { call.reject("Could not stream transfer manifest: \(error)") }
        }
    }

    @objc public func beginImportRecord(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                let header = try self.importSession(call).beginRecord()
                guard let text = String(data: header.header, encoding: .utf8) else {
                    throw IOSSaveTransferFraming.FramingError.invalid("Transfer record header is not UTF-8.")
                }
                call.resolve(["headerJson": text, "byteLength": header.byteLength])
            } catch { call.reject("Could not begin transfer record: \(error)") }
        }
    }

    @objc public func readImportRecordChunk(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                let bytes = try self.importSession(call).readRecordChunk(maxBytes: self.requestedChunkBytes(call))
                call.resolve(self.chunkPayload(bytes))
            } catch { call.reject("Could not stream transfer record: \(error)") }
        }
    }

    @objc public func finishImportRecord(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                let result = try self.importSession(call).finishRecord()
                call.resolve(["byteLength": result.byteLength, "sha256": result.sha256])
            } catch { call.reject("Could not verify transfer record: \(error)") }
        }
    }

    @objc public func readLegacyImportChunk(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                let bytes = try self.importSession(call).readLegacyChunk(maxBytes: self.requestedChunkBytes(call))
                call.resolve(self.chunkPayload(bytes))
            } catch { call.reject("Could not stream legacy transfer: \(error)") }
        }
    }

    @objc public func finishImport(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                let id = try self.sessionID(call)
                let result = try self.importSession(call).finish()
                self.removeImport(id)
                call.resolve(["recordCount": result.recordCount, "recordBytes": result.recordBytes])
            } catch { call.reject("Transfer file did not finish cleanly: \(error)") }
        }
    }

    @objc public func cancelImport(_ call: CAPPluginCall) {
        ioQueue.async {
            if let id = call.getString("sessionId") { self.removeImport(id) }
            call.resolve()
        }
    }
}
