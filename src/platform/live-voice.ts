import {
  VoiceServerEvent,
  type VoiceClientEvent,
} from "@plantopedia/contracts";
import type { ApiClient } from "../services/api";
import {
  initialVoice,
  type VoiceState,
  type VoiceTransport,
} from "./voice-contract";
import { createStreamAudio } from "./stream-audio";
import type { StreamAudio, StreamAudioFactory } from "./stream-audio-contract";
import { pacedAudio } from "./paced-audio";

export function createLiveVoiceTransport(
  api: ApiClient,
  emit: (state: VoiceState) => void,
  audioFactory: StreamAudioFactory = createStreamAudio,
): VoiceTransport {
  const playbackFactory = pacedAudio(audioFactory);
  let state = { ...initialVoice, live: true };
  let generation = 0;
  let socket: WebSocket | undefined;
  let audio: StreamAudio | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let primeTimer: ReturnType<typeof setTimeout> | undefined;
  let playback: (
    played: import("./stream-audio-contract").PlayedAudio,
  ) => void = () => {};
  let ready = false;
  let currentItem: string | null = null;
  const interrupted = new Set<string>();
  const queued = new Map<string, { chunks: string[]; done: boolean }>();
  let queuedBytes = 0;
  function enqueue(itemId: string, data: string) {
    if (interrupted.has(itemId)) return;
    if (currentItem && currentItem !== itemId) {
      const item = queued.get(itemId) ?? { chunks: [], done: false };
      item.chunks.push(data);
      queued.set(itemId, item);
      queuedBytes += data.length;
      if (queuedBytes > 6080000) void fail("voice_audio_backpressure");
      return;
    }
    currentItem = itemId;
    publish({ playingAudio: true, phase: "ready" });
    audio?.enqueue(itemId, data);
  }
  function playNext() {
    const next = queued.entries().next().value;
    if (!next) return;
    const [id, item] = next;
    queued.delete(id);
    for (const chunk of item.chunks) {
      queuedBytes -= chunk.length;
      enqueue(id, chunk);
    }
    if (item.done) audio?.finish(id);
  }
  const publish = (patch: Partial<VoiceState>) => {
    state = { ...state, ...patch };
    emit(state);
  };
  function send(event: VoiceClientEvent) {
    if (socket?.readyState !== WebSocket.OPEN) return;
    if (socket.bufferedAmount > 256000) {
      void fail("voice_connection_lost");
      return;
    }
    socket.send(JSON.stringify(event));
  }
  async function cleanup() {
    generation++;
    ready = false;
    clearTimeout(timer);
    clearTimeout(primeTimer);
    const oldSocket = socket;
    socket = undefined;
    if (oldSocket) {
      oldSocket.onopen =
        oldSocket.onmessage =
        oldSocket.onerror =
        oldSocket.onclose =
          null;
      oldSocket.close();
    }
    const oldAudio = audio;
    audio = undefined;
    interrupted.clear();
    currentItem = null;
    queued.clear();
    queuedBytes = 0;
    await oldAudio?.dispose();
  }
  async function fail(code: string) {
    const done = cleanup();
    const run = generation;
    await done.catch(() => undefined);
    if (generation === run)
      publish({ phase: "error", error: code, playingAudio: false });
  }
  async function stopReply(itemId?: string | null, itemIds?: string[]) {
    const targets = new Set([
      ...(itemIds ?? (itemId ? [itemId] : [])),
      ...queued.keys(),
      ...(currentItem ? [currentItem] : []),
    ]);
    const fresh = [...targets].filter((id) => !interrupted.has(id));
    if (targets.size && !fresh.length) return;
    fresh.forEach((id) => interrupted.add(id));
    queued.clear();
    queuedBytes = 0;
    publish({ playingAudio: false, caption: "" });
    audio?.duck(false);
    const run = generation;
    const played = await audio?.interrupt();
    if (run !== generation) return;
    currentItem = null;
    if (played) {
      interrupted.add(played.itemId);
      send({ type: "played", ...played, interrupted: true });
    }
    for (const id of fresh)
      if (id !== played?.itemId)
        send({ type: "played", itemId: id, ms: 0, interrupted: true });
  }

  return {
    prime() {
      if (audio || !["idle", "error"].includes(state.phase)) return;
      audio = playbackFactory((played) => playback(played));
      try {
        audio.prime?.();
      } catch {
        void fail("voice_unavailable");
        return;
      }
      primeTimer = setTimeout(() => {
        void cleanup();
      }, 30000);
    },
    async record(conversationId, locale) {
      if (!["idle", "error"].includes(state.phase)) return;
      clearTimeout(primeTimer);
      const run = ++generation;
      state = {
        ...initialVoice,
        live: true,
        muted: false,
        phase: "requesting_permission",
      };
      emit(state);
      const current = () => run === generation;
      timer = setTimeout(() => {
        if (current()) void fail("voice_connection_lost");
      }, 25000);
      playback = (played) => {
        if (!current()) return;
        if (interrupted.has(played.itemId)) return;
        currentItem = null;
        send({ type: "played", ...played, interrupted: false });
        publish({ playingAudio: false, phase: "listening" });
        playNext();
      };
      const localAudio = audio ?? playbackFactory((played) => playback(played));
      audio = localAudio;
      try {
        // Start hardware from the tap so browser playback remains gesture-authorized.
        const microphone = localAudio.start(
          (data) => {
            if (current() && ready && !state.muted)
              send({ type: "audio", data });
          },
          (error) => {
            if (current()) void fail(error.message);
          },
        );
        const connection = api.voiceConnection();
        const [, config] = await Promise.all([microphone, connection]);
        if (!current()) {
          await localAudio.dispose();
          return;
        }
        publish({ phase: "connecting" });
        const ws = new WebSocket(config.url);
        socket = ws;
        ws.onopen = () => {
          if (current())
            ws.send(
              JSON.stringify({
                type: "authenticate",
                token: config.token,
                conversationId,
                locale,
              }),
            );
        };
        ws.onmessage = ({ data }) => {
          if (!current()) return;
          try {
            const event = VoiceServerEvent.parse(JSON.parse(String(data)));
            switch (event.type) {
              case "duck":
                localAudio.duck(event.active);
                break;
              case "ready":
                ready = true;
                clearTimeout(timer);
                publish({ phase: "listening" });
                break;
              case "activity":
                publish({
                  notice: null,
                  phase:
                    event.state === "thinking" ? "processing" : event.state,
                  ...(event.state === "hearing"
                    ? { userCaption: "", caption: "" }
                    : {}),
                });
                break;
              case "interrupt":
                void stopReply(event.itemId, event.itemIds).catch(() =>
                  fail("voice_audio_failed"),
                );
                break;
              case "audio":
                enqueue(event.itemId, event.data);
                break;
              case "audio_done":
                if (interrupted.has(event.itemId)) break;
                if (currentItem === event.itemId)
                  localAudio.finish(event.itemId);
                else {
                  const item = queued.get(event.itemId);
                  if (item) item.done = true;
                }
                break;
              case "caption":
                publish(
                  event.role === "user"
                    ? { userCaption: event.text }
                    : { caption: event.text },
                );
                break;
              case "completed":
                publish({ completedId: event.id });
                break;
              case "notice":
                publish({ notice: event.code });
                break;
              case "error":
                void fail(event.code);
                break;
            }
          } catch {
            void fail("voice_connection_lost");
          }
        };
        ws.onerror = ws.onclose = () => {
          if (current()) void fail("voice_connection_lost");
        };
      } catch (error) {
        if (current())
          await fail(
            error instanceof Error ? error.message : "voice_unavailable",
          );
      }
    },
    async send() {
      if (!ready) return;
      const muted = !state.muted;
      audio?.mute(muted);
      send({ type: "mute", muted });
      publish({ muted });
    },
    async play() {
      send({ type: "interrupt" });
      await stopReply();
      publish({ phase: "listening" });
    },
    async disconnect() {
      send({ type: "stop" });
      const done = cleanup();
      const run = generation;
      await done.catch(() => undefined);
      if (run === generation) {
        state = { ...initialVoice, live: true };
        emit(state);
      }
    },
  };
}
