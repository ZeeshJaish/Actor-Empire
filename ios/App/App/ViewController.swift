import UIKit
import Capacitor
import CapApp_SPM

class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginType(PurchasesPlugin.self)
        bridge?.registerPluginType(TrackingPermissionPlugin.self)
    }
}
