import Foundation
import Capacitor
import AppTrackingTransparency

@objc(TrackingPermissionPlugin)
public class TrackingPermissionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TrackingPermissionPlugin"
    public let jsName = "TrackingPermission"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise)
    ]

    private func statusString(_ status: ATTrackingManager.AuthorizationStatus) -> String {
        switch status {
        case .authorized:
            return "authorized"
        case .denied:
            return "denied"
        case .restricted:
            return "restricted"
        case .notDetermined:
            return "notDetermined"
        @unknown default:
            return "unknown"
        }
    }

    @objc public func getStatus(_ call: CAPPluginCall) {
        call.resolve([
            "status": statusString(ATTrackingManager.trackingAuthorizationStatus)
        ])
    }

    @objc public func requestPermission(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            ATTrackingManager.requestTrackingAuthorization { status in
                call.resolve([
                    "status": self.statusString(status)
                ])
            }
        }
    }
}
