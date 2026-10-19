import {
  AudioModule,
  createAudioPlayer,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import { File, Paths } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { encodePcm, MAX_VOICE_SECONDS } from "../features/voice/pcm";
import type { AudioStream } from "expo-audio";
import type { VoiceCapture, VoicePlayback } from "./audio-contract";
export function createCapture(): VoiceCapture {
  let cancelled = false;
  let stream: AudioStream | undefined;
  let starting = false;
  // The SDK types expose this native constructor; eslint cannot follow the
  // default NativeAudioModule export through ExpoAudio's re-export.
  // eslint-disable-next-line import/namespace
  const { AudioStream: NativeAudioStream } = AudioModule;
  let subscription: { remove(): void } | undefined;
  let rate = 24000;
  let channels = 1;
  let frames = 0;
  let invalid = false;
  const chunks: Int16Array[] = [];
  function stop() {
    stream?.stop();
    subscription?.remove();
  }
  return {
    async start() {
      const permission = await requestRecordingPermissionsAsync();
      if (cancelled) return;
      if (!permission.granted) throw new Error("voice_permission");
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        allowsBackgroundRecording: false,
      });
      if (cancelled) return;
      stream = new NativeAudioStream({
        sampleRate: 24000,
        channels: 1,
        encoding: "int16",
      });
      subscription = stream.addListener("audioStreamBuffer", (buffer) => {
        if (cancelled) return;
        if (
          frames &&
          (rate !== buffer.sampleRate || channels !== buffer.channels)
        ) {
          invalid = true;
          stop();
          return;
        }
        rate = buffer.sampleRate;
        channels = buffer.channels;
        if (
          rate < 8000 ||
          rate > 96000 ||
          channels < 1 ||
          channels > 2 ||
          buffer.data.byteLength % (2 * channels)
        ) {
          invalid = true;
          stop();
          return;
        }
        const samples = new Int16Array(buffer.data);
        const count = Math.min(
          samples.length,
          Math.max(0, (rate * MAX_VOICE_SECONDS - frames) * channels),
        );
        chunks.push(samples.slice(0, count));
        frames += count / channels;
        if (frames >= rate * MAX_VOICE_SECONDS) stop();
      });
      const startedStream = stream;
      starting = true;
      try {
        await startedStream.start();
      } finally {
        starting = false;
        if (cancelled) {
          startedStream.stop();
          startedStream.release();
          if (stream === startedStream) stream = undefined;
        }
      }
    },
    async finish() {
      stop();
      if (cancelled || invalid) throw new Error("invalid_voice_audio");
      const monoChannels = Array.from(
        { length: channels },
        () => new Float32Array(frames),
      );
      let frame = 0;
      for (const chunk of chunks) {
        for (let index = 0; index < chunk.length; index += channels, frame++)
          for (let channel = 0; channel < channels; channel++)
            monoChannels[channel]![frame] =
              (chunk[index + channel] ?? 0) / 32768;
      }
      chunks.length = 0;
      stream?.release();
      stream = undefined;
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      return encodePcm(monoChannels, rate);
    },
    async cancel() {
      cancelled = true;
      stop();
      chunks.length = 0;
      if (!starting) {
        stream?.release();
        stream = undefined;
      }
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    },
  };
}
export function createPlayback(audioBase64: string): VoicePlayback {
  const file = new File(Paths.cache, `voice-${randomUUID()}.wav`);
  file.write(audioBase64, { encoding: "base64" });
  const player = createAudioPlayer(file.uri);
  let complete: ((error?: Error) => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function settle(error?: Error) {
    clearTimeout(timer);
    const done = complete;
    complete = undefined;
    done?.(error);
  }
  const subscription = player.addListener("playbackStatusUpdate", (status) => {
    if (status.error) settle(new Error("voice_playback_failed"));
    else if (status.didJustFinish) settle();
  });
  return {
    async play() {
      await player.seekTo(0);
      return new Promise<void>((resolve, reject) => {
        complete = (error) => (error ? reject(error) : resolve());
        timer = setTimeout(() => {
          player.pause();
          settle(new Error("voice_playback_failed"));
        }, 70000);
        try {
          player.play();
        } catch {
          settle(new Error("voice_playback_failed"));
        }
      });
    },
    stop() {
      player.pause();
      settle();
    },
    dispose() {
      player.pause();
      settle();
      subscription.remove();
      player.remove();
      if (file.exists) file.delete();
    },
  };
}
