import AVFoundation
import Capacitor
import MediaPlayer
import UIKit

/// One entry of the queue, as the web app sent it.
struct QueueTrack {
    let id: String
    let title: String
    let artist: String
    let album: String
    let artwork: String
    let duration: Double
    /// The object exactly as received, handed back by getState.
    let raw: JSObject

    init?(_ object: JSObject) {
        let id: String
        if let text = object["id"] as? String {
            id = text
        } else if let number = object["id"] as? NSNumber {
            id = number.stringValue
        } else {
            return nil
        }
        self.id = id
        title = object["title"] as? String ?? ""
        artist = object["artist"] as? String ?? ""
        album = object["album"] as? String ?? ""
        artwork = object["artwork"] as? String ?? ""
        duration = (object["duration"] as? NSNumber)?.doubleValue ?? 0
        raw = object
    }
}

enum RepeatMode: String {
    case off, all, one
}

/// Why a track couldn't be played, worded for the listener.
struct TrackFailure: Error {
    let message: String
    var locked = false

    static let loadFailed = TrackFailure(message: "This track couldn't be loaded.")
    static let playFailed = TrackFailure(message: "This track couldn't be played.")
}

/// The app's music player: plays the queue on an AVPlayer, fetches stream links
/// from the API, and drives the lock screen. The web app controls it while it is
/// in front; in the background it carries on through the queue by itself.
/// All state lives on the main thread.
final class MusicPlayer: NSObject {
    static let shared = MusicPlayer()

    /// Receives every event for the web app (name, payload).
    var onEvent: ((String, [String: Any]) -> Void)?

    private let player = AVPlayer()
    private var apiBase: String?
    private var token: String?

    private(set) var tracks: [QueueTrack] = []
    private(set) var index = 0
    private var repeatMode = RepeatMode.off

    /// The id of the track loaded (or loading) into the player.
    private var loadedId: String?
    /// Bumped on every load so late network replies for an old track are ignored.
    private var generation = 0
    /// Whether the listener wants sound: true while playing and while a track is loading to play.
    private var playWhenReady = false
    private var resolving = false
    private var pendingSeek: Double?
    private var failures = 0
    private var retriedCurrent = false
    private var resumeAfterInterruption = false

    private var cache: [String: (url: URL, at: Date)] = [:]
    private var inflight: [String: [(Result<URL, TrackFailure>) -> Void]] = [:]
    private let cacheLifetime: TimeInterval = 600

    private var timeObserver: Any?
    private var statusObservation: NSKeyValueObservation?
    private var itemObservation: NSKeyValueObservation?
    private var artwork: (url: String, image: MPMediaItemArtwork)?
    private var artworkLoading: String?

    private override init() {
        super.init()
        player.automaticallyWaitsToMinimizeStalling = true
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)

        timeObserver = player.addPeriodicTimeObserver(
            forInterval: CMTime(seconds: 0.25, preferredTimescale: 600), queue: .main
        ) { [weak self] _ in
            guard let self, self.player.rate != 0 else { return }
            self.emitTime()
        }
        statusObservation = player.observe(\.timeControlStatus, options: [.new]) { [weak self] _, _ in
            DispatchQueue.main.async { self?.timeControlChanged() }
        }

        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(itemEnded(_:)),
                           name: .AVPlayerItemDidPlayToEndTime, object: nil)
        center.addObserver(self, selector: #selector(itemFailedToPlay(_:)),
                           name: .AVPlayerItemFailedToPlayToEndTime, object: nil)
        center.addObserver(self, selector: #selector(interrupted(_:)),
                           name: AVAudioSession.interruptionNotification, object: nil)
        center.addObserver(self, selector: #selector(routeChanged(_:)),
                           name: AVAudioSession.routeChangeNotification, object: nil)
        center.addObserver(self, selector: #selector(enteredForeground),
                           name: UIApplication.willEnterForegroundNotification, object: nil)

        setUpRemoteCommands()
    }

    // MARK: - Commands

    func configure(apiBase: String, token: String?) {
        var base = apiBase
        while base.hasSuffix("/") { base.removeLast() }
        self.apiBase = base
        self.token = (token?.isEmpty ?? true) ? nil : token
    }

    func setQueue(_ newTracks: [QueueTrack], index newIndex: Int, autoplay: Bool, reload: Bool, position: Double) {
        guard !newTracks.isEmpty else {
            stop()
            return
        }
        let target = min(max(newIndex, 0), newTracks.count - 1)
        failures = 0

        if !reload, let loadedId, loadedId == newTracks[target].id {
            tracks = newTracks
            index = target
            prefetchNext()
            updateNowPlaying()
            return
        }
        tracks = newTracks
        load(at: target, position: position, autoplay: autoplay)
    }

    func play() {
        guard !tracks.isEmpty else { return }
        let item = player.currentItem
        if !resolving, item == nil || item?.status == .failed {
            load(at: index, position: currentPosition, autoplay: true)
            return
        }
        if let item, item.duration.isNumeric, item.currentTime().seconds >= item.duration.seconds - 0.5 {
            player.seek(to: .zero)
        }
        playWhenReady = true
        activateSession()
        if item != nil { player.play() }
        emitState()
        updateNowPlaying()
    }

    func pause() {
        playWhenReady = false
        player.pause()
        emitState()
        emitTime()
        updateNowPlaying()
    }

    func togglePlayPause() {
        playWhenReady ? pause() : play()
    }

    func seek(to position: Double) {
        let target = max(0, position)
        guard player.currentItem != nil else {
            pendingSeek = target
            return
        }
        player.seek(to: CMTime(seconds: target, preferredTimescale: 600),
                    toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] _ in
            DispatchQueue.main.async {
                self?.emitTime()
                self?.updateNowPlaying()
            }
        }
    }

    /// The next track; on the last one it wraps with repeat on, or reports the end.
    func next() {
        guard !tracks.isEmpty else { return }
        failures = 0
        if let target = advanceIndex() {
            load(at: target, position: 0, autoplay: true)
        } else {
            emit("queueEnd", [:])
        }
    }

    /// Restarts the track after 3 seconds in (or on the first), otherwise goes back one.
    func previous() {
        guard !tracks.isEmpty else { return }
        failures = 0
        if currentPosition > 3 || index == 0 {
            seek(to: 0)
        } else {
            load(at: index - 1, position: 0, autoplay: true)
        }
    }

    func setRepeat(_ mode: RepeatMode) {
        repeatMode = mode
    }

    func setVolume(_ volume: Double) {
        player.volume = Float(min(max(volume, 0), 1))
    }

    /// Stops and forgets the queue, and takes the player off the lock screen.
    func stop() {
        generation += 1
        playWhenReady = false
        resolving = false
        pendingSeek = nil
        player.pause()
        replaceItem(nil)
        tracks = []
        index = 0
        loadedId = nil
        failures = 0
        artwork = nil
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        setRemoteCommandsEnabled(false)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        emitState()
    }

    func state() -> [String: Any] {
        [
            "tracks": tracks.map { $0.raw },
            "index": index,
            "position": currentPosition,
            "duration": currentDuration,
            "playing": playWhenReady,
        ]
    }

    // MARK: - Loading

    /// Loads the track at `position` in the queue: fetches its stream link, then plays it.
    /// A retry reloads the same track without announcing a new index.
    private func load(at position: Int, position seconds: Double, autoplay: Bool, isRetry: Bool = false) {
        guard tracks.indices.contains(position) else { return }
        generation += 1
        let gen = generation
        let track = tracks[position]

        index = position
        loadedId = track.id
        playWhenReady = autoplay
        resolving = true
        pendingSeek = seconds > 0 ? seconds : nil
        if !isRetry { retriedCurrent = false }
        player.pause()
        replaceItem(nil)

        if autoplay { activateSession() }
        setRemoteCommandsEnabled(true)
        if !isRetry { emit("index", ["index": position, "id": track.id]) }
        emitState()
        updateNowPlaying()

        resolve(track) { [weak self] result in
            guard let self, gen == self.generation else { return }
            self.resolving = false
            switch result {
            case .success(let url):
                self.attach(url: url)
                self.prefetchNext()
            case .failure(let failure):
                self.trackFailed(failure)
            }
        }
    }

    private func attach(url: URL) {
        let item = AVPlayerItem(url: url)
        replaceItem(item)
        if let seconds = pendingSeek {
            pendingSeek = nil
            player.seek(to: CMTime(seconds: seconds, preferredTimescale: 600),
                        toleranceBefore: .zero, toleranceAfter: .zero)
        }
        if playWhenReady {
            activateSession()
            player.play()
        }
        emitState()
    }

    private func replaceItem(_ item: AVPlayerItem?) {
        itemObservation = nil
        player.replaceCurrentItem(with: item)
        guard let item else { return }
        itemObservation = item.observe(\.status, options: [.new]) { [weak self] item, _ in
            DispatchQueue.main.async { self?.itemStatusChanged(item) }
        }
    }

    private func itemStatusChanged(_ item: AVPlayerItem) {
        guard item === player.currentItem else { return }
        switch item.status {
        case .readyToPlay:
            updateNowPlaying()
            emitTime()
        case .failed:
            itemFailed()
        default:
            break
        }
    }

    /// The stream itself failed: the link may have expired, so fetch a fresh one
    /// and try once more before giving up on the track.
    private func itemFailed() {
        guard let loadedId else { return }
        cache[loadedId] = nil
        if !retriedCurrent {
            retriedCurrent = true
            load(at: index, position: currentPosition, autoplay: playWhenReady, isRetry: true)
        } else {
            trackFailed(.playFailed)
        }
    }

    /// Skips past a failed track while there is somewhere to go and fewer than
    /// three have failed in a row; otherwise stops on it, keeping the queue.
    private func trackFailed(_ failure: TrackFailure) {
        failures += 1
        let id = tracks.indices.contains(index) ? tracks[index].id : (loadedId ?? "")
        let target = advanceIndex()
        let skip = failures < 3 && target != nil

        emit("error", [
            "index": index,
            "id": id,
            "message": failure.message,
            "locked": failure.locked,
            "skipped": skip,
        ])
        if skip, let target {
            load(at: target, position: 0, autoplay: true)
        } else {
            playWhenReady = false
            player.pause()
            emitState()
            updateNowPlaying()
        }
    }

    /// Where next() goes from here, or nil at the end of the queue with repeat off.
    private func advanceIndex() -> Int? {
        if index < tracks.count - 1 { return index + 1 }
        return repeatMode == .off ? nil : 0
    }

    @objc private func itemEnded(_ notification: Notification) {
        DispatchQueue.main.async { [weak self] in
            guard let self, (notification.object as? AVPlayerItem) === self.player.currentItem else { return }
            if self.repeatMode == .one {
                self.player.seek(to: .zero)
                self.player.play()
            } else if let target = self.advanceIndex() {
                self.load(at: target, position: 0, autoplay: true)
            } else {
                self.playWhenReady = false
                self.player.pause()
                self.emitState()
                self.emitTime()
                self.updateNowPlaying()
                self.emit("queueEnd", [:])
            }
        }
    }

    @objc private func itemFailedToPlay(_ notification: Notification) {
        DispatchQueue.main.async { [weak self] in
            guard let self, (notification.object as? AVPlayerItem) === self.player.currentItem else { return }
            self.itemFailed()
        }
    }

    private func timeControlChanged() {
        if player.timeControlStatus == .playing {
            failures = 0
            retriedCurrent = false
        }
        emitState()
        updateNowPlaying()
    }

    // MARK: - Stream links

    /// Fetches the track's stream link from the API, reusing one fetched in the last
    /// ten minutes. Holds a background task meanwhile so the move to the next track
    /// can finish while the app is in the background.
    private func resolve(_ track: QueueTrack, completion: @escaping (Result<URL, TrackFailure>) -> Void) {
        if let hit = cache[track.id], Date().timeIntervalSince(hit.at) < cacheLifetime {
            completion(.success(hit.url))
            return
        }
        if inflight[track.id] != nil {
            inflight[track.id]?.append(completion)
            return
        }
        guard let request = trackRequest(track.id) else {
            completion(.failure(.loadFailed))
            return
        }
        inflight[track.id] = [completion]

        var task = UIBackgroundTaskIdentifier.invalid
        task = UIApplication.shared.beginBackgroundTask(withName: "Resolve track") {
            UIApplication.shared.endBackgroundTask(task)
            task = .invalid
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            let result = Self.parse(track: track, data: data, response: response, error: error)
            DispatchQueue.main.async {
                guard let self else { return }
                if case .success(let (url, json)) = result {
                    self.cache[track.id] = (url, Date())
                    self.emit("resolved", ["id": track.id, "track": json])
                }
                let waiting = self.inflight.removeValue(forKey: track.id) ?? []
                waiting.forEach { $0(result.map { $0.0 }) }
                if task != .invalid {
                    UIApplication.shared.endBackgroundTask(task)
                    task = .invalid
                }
            }
        }.resume()
    }

    private func trackRequest(_ id: String) -> URLRequest? {
        guard let apiBase,
              let encoded = id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let url = URL(string: "\(apiBase)/tracks/\(encoded)?with=streamUrl,artist,release&mode=play")
        else { return nil }
        var request = URLRequest(url: url, timeoutInterval: 20)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("XMLHttpRequest", forHTTPHeaderField: "X-Requested-With")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        return request
    }

    /// Reads the stream link out of the API's reply, or says why there isn't one.
    private static func parse(track: QueueTrack, data: Data?, response: URLResponse?, error: Error?)
        -> Result<(URL, [String: Any]), TrackFailure> {
        guard error == nil,
              let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
              let data,
              let body = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let json = body["data"] as? [String: Any]
        else { return .failure(.loadFailed) }

        if let link = json["streamUrl"] as? String, !link.isEmpty, let url = URL(string: link) {
            return .success((url, json))
        }
        if (json["locked"] as? Bool) == true {
            let title = json["title"] as? String ?? track.title
            return .failure(TrackFailure(message: "\"\(title)\" is part of a paid release. Buy it to listen.", locked: true))
        }
        return .failure(TrackFailure(message: "This track can't be played right now."))
    }

    /// Fetches the next track's link while this one plays, so moving on is quick.
    private func prefetchNext() {
        guard let target = advanceIndex(), target != index else { return }
        resolve(tracks[target]) { _ in }
    }

    // MARK: - Audio session

    private func activateSession() {
        try? AVAudioSession.sharedInstance().setActive(true)
    }

    /// Pauses for calls and alarms, and picks up again afterwards when iOS says to.
    @objc private func interrupted(_ notification: Notification) {
        guard let info = notification.userInfo,
              let raw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            switch type {
            case .began:
                self.resumeAfterInterruption = self.playWhenReady
                if self.playWhenReady { self.pause() }
            case .ended:
                let options = AVAudioSession.InterruptionOptions(
                    rawValue: info[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0)
                if self.resumeAfterInterruption, options.contains(.shouldResume) { self.play() }
                self.resumeAfterInterruption = false
            @unknown default:
                break
            }
        }
    }

    /// Pauses when headphones are unplugged rather than playing out loud.
    @objc private func routeChanged(_ notification: Notification) {
        guard let raw = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
              AVAudioSession.RouteChangeReason(rawValue: raw) == .oldDeviceUnavailable else { return }
        DispatchQueue.main.async { [weak self] in
            guard let self, self.playWhenReady else { return }
            self.pause()
        }
    }

    /// Catches the web app up after the background, where time updates aren't sent.
    @objc private func enteredForeground() {
        guard !tracks.isEmpty else { return }
        emit("index", ["index": index, "id": tracks[index].id])
        emitState()
        emitTime()
    }

    // MARK: - Lock screen

    private func setUpRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()
        center.playCommand.addTarget { [weak self] _ in self?.play(); return .success }
        center.pauseCommand.addTarget { [weak self] _ in self?.pause(); return .success }
        center.togglePlayPauseCommand.addTarget { [weak self] _ in self?.togglePlayPause(); return .success }
        center.nextTrackCommand.addTarget { [weak self] _ in self?.next(); return .success }
        center.previousTrackCommand.addTarget { [weak self] _ in self?.previous(); return .success }
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            self?.seek(to: event.positionTime)
            return .success
        }
        setRemoteCommandsEnabled(false)
    }

    private func setRemoteCommandsEnabled(_ enabled: Bool) {
        let center = MPRemoteCommandCenter.shared()
        [center.playCommand, center.pauseCommand, center.togglePlayPauseCommand,
         center.nextTrackCommand, center.previousTrackCommand, center.changePlaybackPositionCommand]
            .forEach { $0.isEnabled = enabled }
    }

    private func updateNowPlaying() {
        guard tracks.indices.contains(index) else { return }
        let track = tracks[index]
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: track.title,
            MPMediaItemPropertyArtist: track.artist,
            MPMediaItemPropertyAlbumTitle: track.album,
            MPMediaItemPropertyPlaybackDuration: currentDuration,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: currentPosition,
            MPNowPlayingInfoPropertyPlaybackRate: player.timeControlStatus == .playing ? 1.0 : 0.0,
        ]
        if let artwork, artwork.url == track.artwork {
            info[MPMediaItemPropertyArtwork] = artwork.image
        } else {
            loadArtwork(track.artwork)
        }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    /// Downloads the cover in the background and adds it once it arrives.
    private func loadArtwork(_ link: String) {
        guard !link.isEmpty, artworkLoading != link, let url = URL(string: link) else { return }
        artworkLoading = link
        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            let image = data.flatMap(UIImage.init(data:))
            DispatchQueue.main.async {
                guard let self, self.artworkLoading == link else { return }
                self.artworkLoading = nil
                guard let image else { return }
                self.artwork = (link, MPMediaItemArtwork(boundsSize: image.size) { _ in image })
                self.updateNowPlaying()
            }
        }.resume()
    }

    // MARK: - Events

    private var currentPosition: Double {
        if resolving, let pendingSeek { return pendingSeek }
        let seconds = player.currentTime().seconds
        return seconds.isFinite ? max(0, seconds) : 0
    }

    private var currentDuration: Double {
        if let duration = player.currentItem?.duration, duration.isNumeric, duration.seconds.isFinite {
            return duration.seconds
        }
        return tracks.indices.contains(index) ? tracks[index].duration : 0
    }

    /// How far the stream has downloaded ahead of the playhead, in seconds from the start.
    private var buffered: Double {
        guard let ranges = player.currentItem?.loadedTimeRanges.map(\.timeRangeValue) else { return 0 }
        let now = player.currentTime()
        let range = ranges.first { $0.containsTime(now) } ?? ranges.last
        guard let end = range?.end.seconds, end.isFinite else { return 0 }
        return end
    }

    private func emitState() {
        let loading = resolving || (playWhenReady && player.timeControlStatus == .waitingToPlayAtSpecifiedRate)
        emit("state", ["playing": playWhenReady, "loading": loading])
    }

    /// Sends the playhead, except in the background where nobody is watching.
    private func emitTime() {
        guard UIApplication.shared.applicationState != .background else { return }
        emit("time", ["position": currentPosition, "duration": currentDuration, "buffered": buffered])
    }

    private func emit(_ name: String, _ data: [String: Any]) {
        onEvent?(name, data)
    }
}
