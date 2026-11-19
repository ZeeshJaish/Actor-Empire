import UIKit
import WebKit
import Capacitor
import CapApp_SPM

class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginType(PurchasesPlugin.self)
        bridge?.registerPluginType(TrackingPermissionPlugin.self)
        // Phase 1 (2026-11-17): a background task around saves, and device info (AeNativeSupportPlugin.swift).
        bridge?.registerPluginType(AeNativeSupportPlugin.self)
        // 19 Nov 2026: save export on iPhone, as on Android (AeSaveTransferPlugin.swift, services/saveTransfer.ts).
        bridge?.registerPluginType(AeSaveTransferPlugin.self)
        // Week Ahead (2026-11-13): iOS does not report navigator.deviceMemory, so the game reads the phone's RAM
        // (GiB) from here to decide whether the background week fits (App.tsx deviceAffordsWeekAhead). This runs
        // in loadView, before Capacitor loads the page, so the value is there from the first frame.
        let memoryGiB = Double(ProcessInfo.processInfo.physicalMemory) / 1_073_741_824
        let memoryScript = WKUserScript(
            // Phase 1 (2026-11-17): the model identifier too, for kill reports (App.tsx getDevicePhoneModel).
            source: "window.__aeDeviceMemoryGB = \(String(format: "%.2f", memoryGiB)); window.__aeDeviceModel = \"\(AeNativeSupportPlugin.modelIdentifier())\";",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        webView?.configuration.userContentController.addUserScript(memoryScript)
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        webView?.evaluateJavaScript(
            "window.dispatchEvent(new CustomEvent('actor-empire-memory-warning', { detail: { platform: 'ios' } }))"
        )
    }
}
