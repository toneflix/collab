import Capacitor
import Foundation

/// The "Player" plugin: hands the web app's commands to MusicPlayer and its
/// events back to the web app. One instance lives as long as the bridge.
@objc(PlayerPlugin)
public class PlayerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PlayerPlugin"
    public let jsName = "Player"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setQueue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seek", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "next", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "previous", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setRepeat", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
    ]

    private var player: MusicPlayer { MusicPlayer.shared }

    override public func load() {
        DispatchQueue.main.async { [weak self] in
            MusicPlayer.shared.onEvent = { [weak self] name, data in
                self?.notifyListeners(name, data: data)
            }
        }
    }

    /// Runs the command on the main thread, where the player lives, then resolves.
    private func run(_ call: CAPPluginCall, _ body: @escaping () -> Void) {
        DispatchQueue.main.async {
            body()
            call.resolve()
        }
    }

    @objc func configure(_ call: CAPPluginCall) {
        let base = call.getString("apiBase") ?? ""
        let token = call.getString("token")
        run(call) { self.player.configure(apiBase: base, token: token) }
    }

    @objc func setQueue(_ call: CAPPluginCall) {
        let tracks = (call.getArray("tracks", JSObject.self) ?? []).compactMap(QueueTrack.init)
        let index = call.getInt("index") ?? 0
        let autoplay = call.getBool("autoplay") ?? false
        let reload = call.getBool("reload") ?? false
        let position = call.getDouble("position") ?? 0
        run(call) {
            self.player.setQueue(tracks, index: index, autoplay: autoplay, reload: reload, position: position)
        }
    }

    @objc func play(_ call: CAPPluginCall) {
        run(call) { self.player.play() }
    }

    @objc func pause(_ call: CAPPluginCall) {
        run(call) { self.player.pause() }
    }

    @objc func seek(_ call: CAPPluginCall) {
        let position = call.getDouble("position") ?? 0
        run(call) { self.player.seek(to: position) }
    }

    @objc func next(_ call: CAPPluginCall) {
        run(call) { self.player.next() }
    }

    @objc func previous(_ call: CAPPluginCall) {
        run(call) { self.player.previous() }
    }

    @objc func setRepeat(_ call: CAPPluginCall) {
        let mode = RepeatMode(rawValue: call.getString("mode") ?? "") ?? .off
        run(call) { self.player.setRepeat(mode) }
    }

    @objc func setVolume(_ call: CAPPluginCall) {
        let volume = call.getDouble("volume") ?? 1
        run(call) { self.player.setVolume(volume) }
    }

    @objc func stop(_ call: CAPPluginCall) {
        run(call) { self.player.stop() }
    }

    @objc func getState(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(self.player.state())
        }
    }
}
