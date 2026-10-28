import Capacitor
import UIKit

/// The "Uploads" plugin: asks iOS for the extra half minute or so it allows in
/// the background, so uploads in flight can finish after the app leaves the screen.
@objc(UploadsPlugin)
public class UploadsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "UploadsPlugin"
    public let jsName = "Uploads"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private var task = UIBackgroundTaskIdentifier.invalid

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            if let self, self.task == .invalid {
                self.task = UIApplication.shared.beginBackgroundTask(withName: "Uploads") { [weak self] in
                    self?.end()
                }
            }
            call.resolve()
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.end()
            call.resolve()
        }
    }

    private func end() {
        guard task != .invalid else { return }
        UIApplication.shared.endBackgroundTask(task)
        task = .invalid
    }
}
