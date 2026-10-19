import { randomUUID } from "expo-crypto";
import type { ApiClient } from "../services/api";
import { RequestError } from "../services/api";
import { createCapture, createPlayback } from "./audio";
import type { VoiceCapture, VoicePlayback } from "./audio-contract";
import { MAX_VOICE_SECONDS } from "../features/voice/pcm";
import {
  initialVoice,
  type VoiceState,
  type VoiceTransport,
} from "./voice-contract";
export * from "./voice-contract";
export function createVoiceTransport(
  api: ApiClient,
  emit: (state: VoiceState) => void,
): VoiceTransport {
  let state = initialVoice;
  let generation = 0;
  let capture: VoiceCapture | undefined;
  let playback: VoicePlayback | undefined;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let draft:
    | {
        conversationId: string;
        locale: Parameters<VoiceTransport["record"]>[1];
        audioBase64?: string;
      }
    | undefined;
  let pendingId: string | undefined;
  function publish(patch: Partial<VoiceState>) {
    state = { ...state, ...patch };
    emit(state);
  }
  async function stopRecording() {
    clearTimeout(timer);
    const recording = capture;
    const recordingDraft = draft;
    capture = undefined;
    if (!recording) return;
    try {
      const audioBase64 = await recording.finish();
      if (draft === recordingDraft && recordingDraft)
        recordingDraft.audioBase64 = audioBase64;
    } finally {
      await recording.cancel();
    }
  }
  const transport: VoiceTransport = {
    async record(conversationId, locale) {
      if (!["idle", "ready", "error"].includes(state.phase)) return;
      const cleanup = transport.disconnect();
      const current = ++generation;
      publish({ ...initialVoice, phase: "requesting_permission" });
      await cleanup;
      if (current !== generation) return;
      draft = { conversationId, locale };
      const recording = createCapture();
      capture = recording;
      publish({ ...initialVoice, phase: "requesting_permission" });
      try {
        await recording.start();
        if (current !== generation) {
          await recording.cancel();
          return;
        }
        publish({ phase: "recording" });
        timer = setTimeout(() => {
          publish({ phase: "sending" });
          void stopRecording()
            .then(() => {
              if (current === generation) publish({ phase: "recorded" });
            })
            .catch((error) => {
              if (current === generation)
                publish({
                  phase: "error",
                  error:
                    error instanceof Error
                      ? error.message
                      : "voice_unavailable",
                });
            });
        }, MAX_VOICE_SECONDS * 1000);
      } catch (error) {
        await recording.cancel().catch(() => undefined);
        if (current === generation)
          publish({
            phase: "error",
            error: error instanceof Error ? error.message : "voice_unavailable",
          });
      }
    },
    async send() {
      if (!["recording", "recorded"].includes(state.phase) || !draft) return;
      const current = generation;
      publish({ phase: "sending" });
      try {
        await stopRecording();
        if (current !== generation || !draft?.audioBase64) return;
        controller = new AbortController();
        const signal = AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(110000),
        ]);
        const input = { ...draft, id: randomUUID() };
        pendingId = input.id;
        let result = await api.startVoiceTurn(input, input.id, signal);
        draft = undefined; // Raw audio is never kept after dispatch.
        if (current !== generation) return;
        publish({ phase: "processing" });
        while (result.status === "processing") {
          await new Promise<void>((resolve, reject) => {
            const done = () => {
              clearTimeout(wait);
              signal.removeEventListener("abort", abort);
              resolve();
            };
            const abort = () => {
              clearTimeout(wait);
              signal.removeEventListener("abort", abort);
              reject(new Error("voice_cancelled"));
            };
            const wait = setTimeout(done, 800);
            signal.addEventListener("abort", abort, { once: true });
            if (signal.aborted) abort();
          });
          result = await api.voiceTurn(input.id, signal);
          if (current !== generation) return;
        }
        pendingId = undefined;
        if (result.status !== "complete")
          throw new Error(
            result.status === "failed" ? result.code : "voice_cancelled",
          );
        publish({
          phase: "ready",
          caption: result.text,
          userCaption: result.userText,
          completedId: result.id,
        });
        try {
          playback = createPlayback(result.audioBase64);
          publish({ audioReady: true });
          await transport.play();
        } catch {
          /* The completed transcript remains available if audio playback is blocked. */
        }
      } catch (error) {
        if (current !== generation) return;
        draft = undefined;
        const id = pendingId;
        pendingId = undefined;
        if (id) void api.cancelVoiceTurn(id).catch(() => undefined);
        publish({
          phase: "error",
          error:
            error instanceof RequestError
              ? error.code
              : error instanceof Error
                ? error.message
                : "voice_unavailable",
        });
      }
    },
    async play() {
      if (!playback) return;
      if (state.playingAudio) {
        playback.stop();
        publish({ playingAudio: false });
        return;
      }
      const current = generation;
      publish({ playingAudio: true });
      try {
        await playback.play();
      } finally {
        if (current === generation) publish({ playingAudio: false });
      }
    },
    async disconnect() {
      ++generation;
      clearTimeout(timer);
      controller?.abort();
      controller = undefined;
      const recording = capture;
      capture = undefined;
      draft = undefined;
      playback?.dispose();
      playback = undefined;
      const id = pendingId;
      pendingId = undefined;
      publish(initialVoice);
      await recording?.cancel().catch(() => undefined);
      if (id) await api.cancelVoiceTurn(id).catch(() => undefined);
    },
  };
  return transport;
}
