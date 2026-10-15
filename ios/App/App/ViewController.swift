import UIKit
import Capacitor
import CapApp_SPM

class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginType(PurchasesPlugin.self)
        bridge?.registerPluginType(TrackingPermissionPlugin.self)
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        webView?.evaluateJavaScript(
            "window.dispatchEvent(new CustomEvent('actor-empire-memory-warning', { detail: { platform: 'ios' } }))"
        )
    }
}
