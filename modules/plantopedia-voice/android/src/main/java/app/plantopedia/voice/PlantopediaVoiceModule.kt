package app.plantopedia.voice

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.*
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.os.Handler
import android.os.Looper
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.Executors

class PlantopediaVoiceModule : Module() {
  private val lock = Any()
  @Volatile private var running = false
  @Volatile private var muted = false
  private var recorder: AudioRecord? = null
  private var track: AudioTrack? = null
  private var aec: AcousticEchoCanceler? = null
  private var noise: NoiseSuppressor? = null
  private var manager: AudioManager? = null
  private var previousMode = AudioManager.MODE_NORMAL
  private var previousSpeaker = false
  private var inputThread: Thread? = null
  private val writer = Executors.newSingleThreadExecutor()
  private val main = Handler(Looper.getMainLooper())
  private var item: String? = null
  private var frames = 0L
  private var finished = false
  private var generation = 0
  private var focus: AudioFocusRequest? = null
  private val progress = object : Runnable {
    override fun run() {
      synchronized(lock) {
        if (!running) return
        val id = item
        if (id != null && finished && playedFrames() >= frames) {
          sendEvent("played", mapOf("itemId" to id, "ms" to frames * 1000 / 24000))
          item = null; frames = 0; finished = false
        }
      }
      main.postDelayed(this, 30)
    }
  }
  override fun definition() = ModuleDefinition {
    Name("PlantopediaVoice")
    Events("audio", "played", "failure")
    AsyncFunction("start") { startAudio() }.runOnQueue(Queues.MAIN)
    AsyncFunction("enqueue") { id: String, data: String -> enqueue(id, data) }.runOnQueue(Queues.MAIN)
    AsyncFunction("finish") { id: String -> synchronized(lock) { if (item == id) finished = true } }.runOnQueue(Queues.MAIN)
    AsyncFunction("interrupt") { synchronized(lock) { interruptAudio() } }.runOnQueue(Queues.MAIN)
    AsyncFunction("duck") { value: Boolean -> track?.setVolume(if (value) 0.25f else 1f) }.runOnQueue(Queues.MAIN)
    AsyncFunction("mute") { value: Boolean -> muted = value }.runOnQueue(Queues.MAIN)
    AsyncFunction("stop") { stopAudio() }.runOnQueue(Queues.MAIN)
    OnActivityEntersBackground { lost() }
    OnDestroy { stopAudio(); writer.shutdownNow() }
  }
  private fun startAudio() {
    stopAudio()
    val context = appContext.reactContext ?: error("voice_audio_failed")
    check(context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) { "voice_microphone_denied" }
    try {
      val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      manager = audio; previousMode = audio.mode; previousSpeaker = audio.isSpeakerphoneOn
      audio.mode = AudioManager.MODE_IN_COMMUNICATION
      audio.isSpeakerphoneOn = true
      val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build()
      focus = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(attributes).setOnAudioFocusChangeListener { change -> if (change < 0) lost() }.build()
      check(audio.requestAudioFocus(focus!!) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) { "voice_audio_interrupted" }
      val inputSize = maxOf(4800, AudioRecord.getMinBufferSize(24000, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT))
      val input = AudioRecord(MediaRecorder.AudioSource.VOICE_COMMUNICATION, 24000, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, inputSize)
      recorder = input
      check(input.state == AudioRecord.STATE_INITIALIZED) { "voice_audio_failed" }
      if (AcousticEchoCanceler.isAvailable()) aec = AcousticEchoCanceler.create(input.audioSessionId)?.apply { enabled = true }
      if (NoiseSuppressor.isAvailable()) noise = NoiseSuppressor.create(input.audioSessionId)?.apply { enabled = true }
      val outputSize = maxOf(4800, AudioTrack.getMinBufferSize(24000, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT))
      track = AudioTrack.Builder().setAudioAttributes(attributes).setAudioFormat(AudioFormat.Builder().setSampleRate(24000).setEncoding(AudioFormat.ENCODING_PCM_16BIT).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build()).setTransferMode(AudioTrack.MODE_STREAM).setBufferSizeInBytes(outputSize).build()
      check(track!!.state == AudioTrack.STATE_INITIALIZED) { "voice_audio_failed" }
      running = true; muted = false; input.startRecording(); track!!.play()
      inputThread = Thread({
        val bytes = ByteArray(960)
        while (running) {
          val read = input.read(bytes, 0, bytes.size, AudioRecord.READ_BLOCKING)
          if (read < 0) { if (running) lost(); break }
          if (read > 0 && !muted && running) sendEvent("audio", mapOf("data" to Base64.encodeToString(bytes, 0, read, Base64.NO_WRAP)))
        }
      }, "PlantopediaMicrophone").also { it.start() }
      main.post(progress)
    } catch (error: Throwable) { stopAudio(); throw error }
  }
  private fun playedFrames(): Long = track?.playbackHeadPosition?.toLong()?.and(0xffffffffL) ?: 0L
  private fun enqueue(id: String, data: String) {
    val bytes = Base64.decode(data, Base64.DEFAULT)
    check(bytes.size % 2 == 0) { "invalid_voice_audio" }
    val epoch: Int
    synchronized(lock) {
      check(running) { "voice_audio_failed" }
      if (item != id) {
        check(item == null) { "voice_audio_overlap" }
        track?.pause(); track?.flush(); track?.play()
        item = id; frames = 0; finished = false
      }
      check(frames - playedFrames() < 24000 * 20) { "voice_audio_backpressure" }
      frames += bytes.size / 2; epoch = generation
    }
    writer.execute {
      var offset = 0
      while (offset < bytes.size && running) {
        val count = synchronized(lock) {
          if (generation != epoch) return@execute
          // Nonblocking writes allow interruption to flush immediately.
          track?.write(bytes, offset, bytes.size - offset, AudioTrack.WRITE_NON_BLOCKING) ?: -1
        }
        if (count < 0) { lost(); return@execute }
        offset += count
        if (count == 0) Thread.sleep(5)
      }
    }
  }
  private fun interruptAudio(): Map<String, Any>? {
    val result = item?.let { mapOf("itemId" to it, "ms" to minOf(frames, playedFrames()) * 1000 / 24000) }
    generation++; track?.pause(); track?.flush(); if (running) track?.play()
    item = null; frames = 0; finished = false
    return result
  }
  private fun lost() { if (running) { stopAudio(); sendEvent("failure", mapOf("code" to "voice_audio_interrupted")) } }
  private fun stopAudio() {
    running = false; muted = true; main.removeCallbacks(progress)
    val input = recorder; recorder = null
    try { input?.stop() } catch (_: Exception) {}
    if (Thread.currentThread() !== inputThread) inputThread?.join(300)
    inputThread = null; input?.release()
    synchronized(lock) {
      interruptAudio(); track?.release(); track = null
      aec?.release(); aec = null; noise?.release(); noise = null
      focus?.let { manager?.abandonAudioFocusRequest(it) }; focus = null
      manager?.let { it.mode = previousMode; it.isSpeakerphoneOn = previousSpeaker }; manager = null
    }
  }
}
