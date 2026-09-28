import Foundation
import Capacitor

@objc(IOSLongSessionDiagnosticsPlugin)
public class IOSLongSessionDiagnosticsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IOSLongSessionDiagnosticsPlugin"
    public let jsName = "IOSLongSessionDiagnostics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkpoint", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledgeReport", returnType: CAPPluginReturnPromise),
    ]

    @objc public func getState(_ call: CAPPluginCall) {
        call.resolve(IOSLongSessionDiagnosticsStore.shared.state())
    }

    @objc public func checkpoint(_ call: CAPPluginCall) {
        let payload = call.options.reduce(into: [String: Any]()) { result, entry in
            guard let key = entry.key as? String else { return }
            result[key] = entry.value
        }
        IOSLongSessionDiagnosticsStore.shared.recordCheckpoint(payload)
        IOSRendererRecoveryEvents.publishCheckpoint(payload["checkpoint"] as? String ?? "")
        call.resolve()
    }

    @objc public func acknowledgeReport(_ call: CAPPluginCall) {
        guard let reportId = call.getString("reportId"), !reportId.isEmpty else {
            call.reject("Missing reportId.")
            return
        }
        IOSLongSessionDiagnosticsStore.shared.acknowledgeReport(reportId: reportId)
        call.resolve()
    }
}
