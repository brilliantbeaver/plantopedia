import { encodePcm } from "../features/voice/pcm";
import type { VoiceCapture, VoicePlayback } from "./audio-contract";
export function createCapture(): VoiceCapture {
  let cancelled = false;
  let stream: MediaStream | undefined;
  let recorder: MediaRecorder | undefined;
  const chunks: Blob[] = [];
  let bytes = 0;
  const stopTracks = () => stream?.getTracks().forEach((track) => track.stop());
  return {
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      if (cancelled) {
        stopTracks();
        return;
      }
      recorder = new MediaRecorder(stream, { audioBitsPerSecond: 64000 });
      recorder.addEventListener("dataavailable", (event) => {
        if (cancelled) return;
        bytes += event.data.size;
        if (bytes <= 2 * 1024 * 1024) chunks.push(event.data);
      });
      recorder.start(250);
    },
    async finish() {
      if (!recorder || cancelled || recorder.state !== "recording")
        throw new Error("voice_cancelled");
      let timer: ReturnType<typeof setTimeout>;
      const stopped = new Promise<void>((resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("voice_recording_failed")),
          3000,
        );
        recorder!.addEventListener("stop", () => resolve(), { once: true });
        recorder!.addEventListener(
          "error",
          () => reject(new Error("voice_recording_failed")),
          { once: true },
        );
      });
      recorder.stop();
      stopTracks();
      try {
        await stopped;
      } finally {
        clearTimeout(timer!);
      }
      if (bytes > 2 * 1024 * 1024) throw new Error("invalid_voice_audio");
      const data = await new Blob(chunks, {
        type: recorder.mimeType,
      }).arrayBuffer();
      chunks.length = 0;
      const context = new OfflineAudioContext(1, 1, 24000);
      const audio = await context.decodeAudioData(data);
      if (cancelled) throw new Error("voice_cancelled");
      return encodePcm(
        Array.from({ length: audio.numberOfChannels }, (_, index) =>
          audio.getChannelData(index),
        ),
        audio.sampleRate,
      );
    },
    async cancel() {
      cancelled = true;
      if (recorder?.state === "recording") recorder.stop();
      stopTracks();
      chunks.length = 0;
    },
  };
}
export function createPlayback(audioBase64: string): VoicePlayback {
  const bytes = Uint8Array.from(atob(audioBase64), (character) =>
    character.charCodeAt(0),
  );
  const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
  const player = new Audio(url);
  let complete: ((error?: Error) => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function settle(error?: Error) {
    clearTimeout(timer);
    const done = complete;
    complete = undefined;
    done?.(error);
  }
  player.addEventListener("ended", () => settle());
  player.addEventListener("error", () =>
    settle(new Error("voice_playback_failed")),
  );
  return {
    async play() {
      player.currentTime = 0;
      return new Promise<void>((resolve, reject) => {
        complete = (error) => (error ? reject(error) : resolve());
        timer = setTimeout(() => {
          player.pause();
          settle(new Error("voice_playback_failed"));
        }, 70000);
        void player
          .play()
          .catch(() => settle(new Error("voice_playback_failed")));
      });
    },
    stop() {
      player.pause();
      settle();
    },
    dispose() {
      player.pause();
      settle();
      player.removeAttribute("src");
      player.load();
      URL.revokeObjectURL(url);
    },
  };
}
