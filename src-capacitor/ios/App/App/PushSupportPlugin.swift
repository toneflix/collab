import Capacitor
import Foundation

/// Whether this build carries a Firebase config. Push is only set up with one.
enum FirebaseConfig {
    static var isBundled: Bool {
        Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil
    }
}

/// The "PushSupport" plugin: tells the web app whether push can be used, so it
/// doesn't register for notifications in a build without Firebase.
@objc(PushSupportPlugin)
public class PushSupportPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PushSupportPlugin"
    public let jsName = "PushSupport"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
    ]

    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["value": FirebaseConfig.isBundled])
    }
}
