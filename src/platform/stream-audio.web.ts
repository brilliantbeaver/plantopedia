import { bytesToBase64 } from "../features/voice/pcm";
import type { StreamAudioFactory } from "./stream-audio-contract";
export const createStreamAudio: StreamAudioFactory = (onPlayed) => {
  let disposed = false;
  let context: AudioContext | undefined;
  let stream: MediaStream | undefined;
  let capture: AudioWorkletNode | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let silent: GainNode | undefined;
  let output: GainNode | undefined;
  let active:
    | {
        id: string;
        spans: { start: number; duration: number }[];
        end: number;
        done: boolean;
      }
    | undefined;
  const nodes = new Set<AudioBufferSourceNode>();
  let failed: (error: Error) => void = () => {};
  const progress = () =>
    active && context
      ? {
          itemId: active.id,
          ms: Math.floor(
            active.spans.reduce(
              (sum, span) =>
                sum +
                Math.max(
                  0,
                  Math.min(span.duration, context!.currentTime - span.start),
                ),
              0,
            ) * 1000,
          ),
        }
      : null;
  function interrupt() {
    const result = progress();
    active = undefined;
    for (const node of nodes) {
      node.onended = null;
      node.stop();
      node.disconnect();
    }
    nodes.clear();
    return result;
  }
  function drained() {
    if (active?.done && nodes.size === 0) {
      const result = progress();
      active = undefined;
      if (result) onPlayed(result);
    }
  }
  function prime() {
    if (context || disposed) return;
    context = new AudioContext({ latencyHint: "interactive" });
    output = context.createGain();
    output.connect(context.destination);
    // Called by the original tap, even if a new conversation must be saved first.
    void context.resume().catch(() => undefined);
  }
  return {
    prime,
    async start(onAudio, onError) {
      failed = onError;
      // Create/resume in the original click task, before permission/network awaits.
      prime();
      if (!context) throw new Error("voice_audio_failed");
      const resumed = context.resume();
      try {
        const acquired = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
        if (disposed) {
          acquired.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = acquired;
        await resumed;
        await context.audioWorklet.addModule("/voice-capture.js");
        if (disposed) return;
        source = context.createMediaStreamSource(stream);
        capture = new AudioWorkletNode(context, "plantopedia-capture");
        silent = context.createGain();
        silent.gain.value = 0;
        capture.port.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
          if (!disposed) onAudio(bytesToBase64(new Uint8Array(data)));
        };
        capture.onprocessorerror = () =>
          onError(new Error("voice_audio_failed"));
        source.connect(capture);
        capture.connect(silent);
        silent.connect(context.destination);
        for (const track of stream.getTracks())
          track.onended = () => {
            if (!disposed) onError(new Error("voice_microphone_lost"));
          };
        context.onstatechange = () => {
          if (!disposed && context?.state === "suspended")
            onError(new Error("voice_audio_suspended"));
        };
      } catch (error) {
        void resumed.catch(() => undefined);
        throw error;
      }
    },
    enqueue(itemId, base64) {
      if (disposed || !context) return;
      if (active && active.id !== itemId) {
        failed(new Error("voice_audio_overlap"));
        return;
      }
      const raw = atob(base64);
      if (raw.length % 2) {
        failed(new Error("invalid_voice_audio"));
        return;
      }
      const buffer = context.createBuffer(1, raw.length / 2, 24000);
      const pcm = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) {
        const value = raw.charCodeAt(i * 2) | (raw.charCodeAt(i * 2 + 1) << 8);
        pcm[i] = (value >= 32768 ? value - 65536 : value) / 32768;
      }
      active ??= {
        id: itemId,
        spans: [],
        end: context.currentTime + 0.06,
        done: false,
      };
      // A bounded queue protects against a stalled output device/network burst.
      if (active.end - context.currentTime > 20) {
        failed(new Error("voice_audio_backpressure"));
        return;
      }
      const node = context.createBufferSource();
      node.buffer = buffer;
      node.connect(output!);
      const start = Math.max(context.currentTime, active.end);
      active.spans.push({ start, duration: buffer.duration });
      active.end = start + buffer.duration;
      nodes.add(node);
      node.onended = () => {
        nodes.delete(node);
        node.disconnect();
        drained();
      };
      node.start(start);
    },
    finish(itemId) {
      if (active?.id === itemId) {
        active.done = true;
        drained();
      }
    },
    interrupt,
    duck(active) {
      if (context && output)
        output.gain.setTargetAtTime(
          active ? 0.25 : 1,
          context.currentTime,
          0.03,
        );
    },
    mute(muted) {
      stream?.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
      capture?.port.postMessage({ muted });
    },
    async dispose() {
      disposed = true;
      interrupt();
      stream?.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      source?.disconnect();
      capture?.disconnect();
      silent?.disconnect();
      output?.disconnect();
      if (capture) {
        capture.port.onmessage = null;
        capture.port.close();
      }
      if (context) {
        context.onstatechange = null;
        await context.close().catch(() => undefined);
      }
    },
  };
};
