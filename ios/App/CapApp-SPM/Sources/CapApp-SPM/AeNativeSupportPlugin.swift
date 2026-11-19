import Foundation
import UIKit
import Capacitor

/* Phase 1 of the week-speed plan (2026-11-17), the native build (plan item 6), iOS side:
   - beginBackgroundTask / endBackgroundTask: the game starts one around every save of a slot. If the player leaves
     the app while a save runs, iOS then gives it time to finish instead of suspending the page mid-write (iOS's top
     non-fatal is a save that ran out of time). The game ends it as soon as the save settles; iOS ends it itself if
     its time runs out.
   - deviceInfo: the phone's model identifier (for example iPhone14,5) and memory, for the kill reports the Week Ahead
     gate (phone model x career size) is calibrated from. */
@objc(AeNativeSupportPlugin)
public class AeNativeSupportPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AeNativeSupportPlugin"
    public let jsName = "AeNativeSupport"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "beginBackgroundTask", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endBackgroundTask", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deviceInfo", returnType: CAPPluginReturnPromise)
    ]
    private var tasks: [Int: UIBackgroundTaskIdentifier] = [:]
    private var nextId = 1

    @objc func beginBackgroundTask(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let id = self.nextId
            self.nextId += 1
            // The expiration handler is held by UIKit only until the task ends, so a strong capture leaves no cycle.
            let task = UIApplication.shared.beginBackgroundTask(withName: "actor-empire-save") {
                // Out of time: iOS needs the task ended now.
                DispatchQueue.main.async {
                    guard let task = self.tasks.removeValue(forKey: id) else { return }
                    UIApplication.shared.endBackgroundTask(task)
                }
            }
            if task == .invalid {
                call.resolve(["id": 0])
                return
            }
            self.tasks[id] = task
            call.resolve(["id": id])
        }
    }

    @objc func endBackgroundTask(_ call: CAPPluginCall) {
        let id = call.getInt("id") ?? 0
        DispatchQueue.main.async {
            if let task = self.tasks.removeValue(forKey: id) {
                UIApplication.shared.endBackgroundTask(task)
            }
            call.resolve()
        }
    }

    @objc func deviceInfo(_ call: CAPPluginCall) {
        call.resolve([
            "model": AeNativeSupportPlugin.modelIdentifier(),
            "totalMemBytes": Double(ProcessInfo.processInfo.physicalMemory)
        ])
    }

    /// The hardware model identifier (iPhone14,5), safe to put into a script.
    public static func modelIdentifier() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machine = withUnsafeBytes(of: &systemInfo.machine) { raw in
            String(decoding: raw.prefix(while: { $0 != 0 }), as: UTF8.self)
        }
        let safe = machine.filter { $0.isLetter || $0.isNumber || $0 == "," || $0 == "." || $0 == "_" || $0 == "-" }
        return safe.isEmpty ? "unknown" : safe
    }
}
