import type { StreamAudioFactory } from "./stream-audio-contract";

// Realtime generates faster than a speaker plays. Feed hardware at playback
// speed with a small lead, rather than overflowing its bounded native queue.
export function pacedAudio(factory: StreamAudioFactory): StreamAudioFactory {
  return (played) => {
    const audio = factory(played);
    let chunks: { id: string; data: string; ms: number }[] = [];
    let queuedMs = 0;
    let end = 0;
    let done: string | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let fail: (error: Error) => void = () => {};
    function clear() {
      clearTimeout(timer);
      timer = undefined;
      chunks = [];
      queuedMs = 0;
      end = 0;
      done = undefined;
    }
    function pump() {
      timer = undefined;
      if (disposed) return;
      try {
        while (chunks.length && end - performance.now() < 1000) {
          const chunk = chunks.shift()!;
          queuedMs -= chunk.ms;
          audio.enqueue(chunk.id, chunk.data);
          end = Math.max(end, performance.now()) + chunk.ms;
        }
        if (chunks.length) timer = setTimeout(pump, 50);
        else if (done) {
          const id = done;
          done = undefined;
          audio.finish(id);
        }
      } catch {
        clear();
        fail(new Error("voice_audio_failed"));
      }
    }
    return {
      prime: () => audio.prime?.(),
      start(onAudio, onError) {
        fail = onError;
        return audio.start(onAudio, onError);
      },
      enqueue(id, data) {
        if (disposed) return;
        // 6,400 base64 characters encode 100 ms of 24 kHz mono PCM16.
        for (let offset = 0; offset < data.length; offset += 6400) {
          const part = data.slice(offset, offset + 6400);
          const bytes =
            (part.length * 3) / 4 -
            (part.endsWith("==") ? 2 : part.endsWith("=") ? 1 : 0);
          if (bytes % 2) {
            clear();
            fail(new Error("invalid_voice_audio"));
            return;
          }
          const ms = bytes / 48;
          queuedMs += ms;
          if (queuedMs > 95000) {
            clear();
            fail(new Error("voice_audio_backpressure"));
            return;
          }
          chunks.push({ id, data: part, ms });
        }
        if (!timer) pump();
      },
      finish(id) {
        done = id;
        if (!timer) pump();
      },
      interrupt() {
        clear();
        return audio.interrupt();
      },
      mute: (value) => audio.mute(value),
      duck: (value) => audio.duck(value),
      async dispose() {
        disposed = true;
        clear();
        await audio.dispose();
      },
    };
  };
}
