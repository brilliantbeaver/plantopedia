import ExpoModulesCore
import AVFoundation
import UIKit

public class PlantopediaVoiceModule: Module {
  private var engine: AVAudioEngine?
  private var player: AVAudioPlayerNode?
  private var converter: AVAudioConverter?
  private let pcm = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 24000, channels: 1, interleaved: false)!
  private let output = AVAudioFormat(standardFormatWithSampleRate: 24000, channels: 1)!
  private var item: String?
  private var frames: Int64 = 0
  private var pending = 0
  private var finished = false
  private var generation = 0
  private var tapInstalled = false
  private var captureEpoch = 0
  private var startRequest = 0
  private var spans: [(start: Int64, length: Int64)] = []
  private var muted = false
  private let lock = NSLock()
  private var observers: [NSObjectProtocol] = []

  public func definition() -> ModuleDefinition {
    Name("PlantopediaVoice")
    Events("audio", "played", "failure")
    AsyncFunction("start") { () async throws in
      let request = await MainActor.run { self.startRequest += 1; return self.startRequest }
      let allowed = await withCheckedContinuation { continuation in
        AVAudioSession.sharedInstance().requestRecordPermission { continuation.resume(returning: $0) }
      }
      guard allowed else { throw NSError(domain: "voice_microphone_denied", code: 1) }
      try await MainActor.run { if self.startRequest == request { try self.startAudio() } }
    }
    AsyncFunction("enqueue") { (id: String, encoded: String) in try self.enqueue(id, encoded) }.runOnQueue(.main)
    AsyncFunction("finish") { (id: String) in
      if self.item == id { self.finished = true; self.drained() }
    }.runOnQueue(.main)
    AsyncFunction("interrupt") { () -> [String: Any]? in self.interruptAudio() }.runOnQueue(.main)
    AsyncFunction("duck") { (value: Bool) in self.player?.volume = value ? 0.25 : 1 }.runOnQueue(.main)
    AsyncFunction("mute") { (value: Bool) in self.lock.lock(); self.muted = value; self.lock.unlock() }.runOnQueue(.main)
    AsyncFunction("stop") { self.stopAudio() }.runOnQueue(.main)
    OnDestroy { DispatchQueue.main.async { self.stopAudio() } }
  }
  private func startAudio() throws {
    stopAudio()
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
    try session.setPreferredIOBufferDuration(0.02)
    try session.setActive(true)
    let engine = AVAudioEngine()
    let player = AVAudioPlayerNode()
    self.engine = engine; self.player = player
    do {
      // Both input and output must share the voice-processing engine for AEC.
      try engine.inputNode.setVoiceProcessingEnabled(true)
      engine.attach(player)
      engine.connect(player, to: engine.mainMixerNode, format: output)
      let hardware = engine.inputNode.outputFormat(forBus: 0)
      guard let converter = AVAudioConverter(from: hardware, to: pcm) else { throw NSError(domain: "voice_format", code: 1) }
      self.converter = converter
      lock.lock(); muted = false; captureEpoch += 1; let epoch = captureEpoch; lock.unlock()
      engine.inputNode.installTap(onBus: 0, bufferSize: AVAudioFrameCount(hardware.sampleRate * 0.02), format: hardware) { [weak self] buffer, _ in
        guard let self else { return }
        self.lock.lock(); let muted = self.muted || self.captureEpoch != epoch; self.lock.unlock()
        if muted { return }
        let capacity = AVAudioFrameCount(ceil(Double(buffer.frameLength) * 24000 / hardware.sampleRate)) + 8
        guard let converted = AVAudioPCMBuffer(pcmFormat: self.pcm, frameCapacity: capacity) else { return }
        var supplied = false
        var error: NSError?
        converter.convert(to: converted, error: &error) { _, status in
          if supplied { status.pointee = .noDataNow; return nil }
          supplied = true; status.pointee = .haveData; return buffer
        }
        if error != nil { self.sendEvent("failure", ["code": "voice_audio_failed"]); return }
        if converted.frameLength > 0, let bytes = converted.int16ChannelData?[0] {
          self.sendEvent("audio", ["data": Data(bytes: bytes, count: Int(converted.frameLength) * 2).base64EncodedString()])
        }
      }
      tapInstalled = true
      try engine.start()
      player.play()
      let center = NotificationCenter.default
      observers = [
        center.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] event in
          if let type = event.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt, type == AVAudioSession.InterruptionType.began.rawValue { self?.lost() }
        },
        center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in self?.lost() },
        center.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] event in
          if let reason = event.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt, reason == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue { self?.lost() }
        }
      ]
    } catch { stopAudio(); throw error }
  }
  private func lost() { stopAudio(); sendEvent("failure", ["code": "voice_audio_interrupted"]) }
  private func elapsed() -> Int64 {
    guard let player, let time = player.lastRenderTime, let position = player.playerTime(forNodeTime: time) else { return 0 }
    return spans.reduce(0) { $0 + max(0, min($1.length, position.sampleTime - $1.start)) }
  }
  private func enqueue(_ id: String, _ encoded: String) throws {
    guard let player, engine?.isRunning == true, let data = Data(base64Encoded: encoded), data.count % 2 == 0 else { throw NSError(domain: "voice_audio_failed", code: 1) }
    if item != id {
      guard item == nil else { throw NSError(domain: "voice_audio_overlap", code: 1) }
      player.stop(); player.play(); item = id; frames = 0; pending = 0; finished = false
    }
    if frames - elapsed() > 24000 * 20 { throw NSError(domain: "voice_audio_backpressure", code: 1) }
    let count = data.count / 2
    guard let buffer = AVAudioPCMBuffer(pcmFormat: output, frameCapacity: AVAudioFrameCount(count)), let samples = buffer.floatChannelData?[0] else { return }
    buffer.frameLength = AVAudioFrameCount(count)
    data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
      for i in 0..<count {
        let value = UInt16(raw[i * 2]) | UInt16(raw[i * 2 + 1]) << 8
        samples[i] = Float(Int16(bitPattern: value)) / 32768
      }
    }
    let now = player.lastRenderTime.flatMap { player.playerTime(forNodeTime: $0) }?.sampleTime ?? 0
    let start = max(now + 480, spans.last.map { $0.start + $0.length } ?? 0)
    spans.append((start, Int64(count)))
    frames += Int64(count); pending += 1
    let epoch = generation
    player.scheduleBuffer(buffer, at: AVAudioTime(sampleTime: start, atRate: 24000), options: [], completionCallbackType: .dataPlayedBack) { [weak self] _ in
      DispatchQueue.main.async {
        guard let self, self.generation == epoch else { return }
        self.pending -= 1; self.drained()
      }
    }
  }
  private func drained() {
    if finished && pending == 0, let item {
      sendEvent("played", ["itemId": item, "ms": Int(frames * 1000 / 24000)])
      self.item = nil; frames = 0; finished = false; spans = []
    }
  }
  private func interruptAudio() -> [String: Any]? {
    let result: [String: Any]? = item.map { ["itemId": $0, "ms": Int(elapsed() * 1000 / 24000)] }
    generation += 1; player?.stop(); if engine?.isRunning == true { player?.play() }
    item = nil; frames = 0; pending = 0; finished = false; spans = []
    return result
  }
  private func stopAudio() {
    startRequest += 1
    lock.lock(); muted = true; captureEpoch += 1; lock.unlock()
    observers.forEach { NotificationCenter.default.removeObserver($0) }; observers = []
    _ = interruptAudio()
    if let engine { if tapInstalled { engine.inputNode.removeTap(onBus: 0) }; engine.stop() }; tapInstalled = false
    engine = nil; player = nil; converter = nil
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }
}
