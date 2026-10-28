import Capacitor
import UIKit

/// The app's web view screen. Registers our own plugins with the bridge and
/// keeps the status bar light over the app's dark background.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PlayerPlugin())
        bridge?.registerPluginInstance(PushSupportPlugin())
        bridge?.registerPluginInstance(UploadsPlugin())
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        .lightContent
    }
}
