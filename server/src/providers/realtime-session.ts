import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import type {
  RealtimeClientEvent,
  RealtimeServerEvent,
} from "openai/resources/realtime/realtime";
import {
  VoiceClientEvent,
  defaultVoiceSettings,
  type VoiceSettings,
  type Message,
} from "@plantopedia/contracts";
import { z } from "zod";
import type { Config } from "../config/env.js";
import type { VoiceProvider, PreparedVoiceTurn } from "../application/ports.js";
import { AppError } from "../application/errors.js";

import { isBackchannel } from "./voice-endpointing.js";
import { voiceAmbience } from "./voice-ambience.js";

const recoverableServiceFailure = (error: unknown) =>
  error instanceof AppError && [429, 502, 503, 504].includes(error.status);

type Turn = {
  id: string;
  sequence: number;
  userItem: string;
  prepared?: PreparedVoiceTurn;
  userText?: string;
  text: string;
  textItem?: string;
  itemId?: string;
  bytes: number;
  items: Map<string, { bytes: number; heard: boolean; truncated?: boolean }>;
  interrupted: boolean;
  heard: boolean;
  done: boolean;
  saved: boolean;
  overlap?: Turn;
  durationMs: number;
  calls: number;
  controller: AbortController;
  pendingCalls: Set<string>;
  cancelled?: () => void;
  cancelWait?: Promise<void>;
};
// Injectable socket factory keeps interruption, ordering and cleanup testable.
export function createRealtimeSessions(
  config: Config,
  socketFactory = (url: string, options: WebSocket.ClientOptions) =>
    new WebSocket(url, options),
) {
  const sessions = new Map<string, () => void>();
  let draining = false;
  const connect: NonNullable<VoiceProvider["connect"]> = (
    auth,
    prepare,
    emit,
    ended,
  ) => {
    if (draining || sessions.size >= 32) throw new AppError(503, "voice_busy");
    if (sessions.has(auth.uid)) throw new AppError(409, "voice_already_active");
    const controller = new AbortController();
    const turns = new Map<string, Turn>();
    const responses = new Map<string, Turn>();
    const completedResponses = new Set<string>();
    const seededMessages = new Set<string>();
    let prior: Message[] = [];
    let current: Turn | undefined;
    let ready = false;
    let muted = false;
    let speaking = false;
    let awaitingTruncate: (() => void) | undefined;
    let truncateWait: Promise<void> = Promise.resolve();
    const pendingTruncates = new Set<string>();
    let lastActivity = Date.now();
    let speechStart = 0;
    let speechDuration = 0;
    let audioStartMs: number | undefined;
    let overlapped: Turn | undefined;
    let byteWindow = Date.now();
    let inputBytes = 0;
    let settings: VoiceSettings = defaultVoiceSettings;
    let ambience = voiceAmbience("off");
    const socket = socketFactory(
      `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(config.OPENAI_REALTIME_MODEL)}`,
      {
        headers: { Authorization: `Bearer ${config.OPENAI_API_KEY}` },
        handshakeTimeout: 10000,
        maxPayload: 1024 * 1024,
      },
    );
    function send(event: RealtimeClientEvent) {
      if (controller.signal.aborted) return;
      if (
        socket.readyState !== WebSocket.OPEN ||
        socket.bufferedAmount > 512000
      )
        throw new Error("voice_connection_lost");
      socket.send(JSON.stringify(event));
    }
    function close() {
      if (controller.signal.aborted) return;
      controller.abort();
      for (const turn of turns.values()) turn.controller.abort();
      clearTimeout(startup);
      clearTimeout(lifetime);
      clearInterval(watchdog);
      awaitingTruncate?.();
      for (const turn of turns.values()) turn.cancelled?.();
      sessions.delete(auth.uid);
      turns.clear();
      prior = [];
      socket.terminate();
      ended();
    }
    function fail(error: unknown) {
      if (controller.signal.aborted) return;
      console.warn(
        JSON.stringify({
          service: "plantopedia-voice",
          code:
            error instanceof AppError ? error.code : "voice_pipeline_failed",
        }),
      );
      emit({
        type: "error",
        code: error instanceof AppError ? error.code : "voice_connection_lost",
      });
      close();
    }
    const startup = setTimeout(() => fail(new Error("startup")), 20000);
    const lifetime = setTimeout(
      () => fail(new AppError(408, "voice_session_ended")),
      10 * 60000,
    );
    const watchdog = setInterval(() => {
      if (
        Date.now() - lastActivity > 90000 ||
        (speechStart && Date.now() - speechStart > 60000)
      )
        fail(new AppError(408, "voice_session_ended"));
    }, 1000);
    startup.unref();
    lifetime.unref();
    watchdog.unref();
    sessions.set(auth.uid, close);
    async function persist(turn: Turn) {
      if (
        turn.saved ||
        !turn.done ||
        turn.userText === undefined ||
        !turn.prepared ||
        (!turn.heard && !turn.interrupted)
      )
        return;
      turn.saved = true;
      // Never persist a complete answer the user interrupted before hearing it.
      let messages: Message[];
      try {
        messages = await turn.prepared.complete(
          turn.userText,
          turn.interrupted ? "" : turn.text,
        );
      } catch (error) {
        if (!recoverableServiceFailure(error)) throw error;
        turn.saved = false;
        emit({ type: "notice", code: "voice_history_unavailable" });
        return;
      }
      if (controller.signal.aborted) return;
      prior = [...prior, ...messages].slice(-200);
      for (const message of messages) seededMessages.add(message.id);
      emit({ type: "completed", id: turn.id });
    }
    function interrupt() {
      if (!current || current.interrupted) return;
      current.interrupted = true;
      current.controller.abort();
      current.done = true;
      if (speaking) {
        const interrupted = current;
        interrupted.cancelWait = new Promise<void>((resolve) => {
          interrupted.cancelled = resolve;
        });
        send({ type: "response.cancel" });
      }
      for (const callId of current.pendingCalls)
        send({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: '{"cancelled":true}',
          },
        });
      current.pendingCalls.clear();
      speaking = false;
      const unheard = [...current.items]
        .filter(([, item]) => !item.heard)
        .map(([id]) => id);
      if (unheard.length) {
        unheard.forEach((id) => pendingTruncates.add(id));
        truncateWait = new Promise<void>((resolve) => {
          awaitingTruncate = resolve;
        });
      }
      emit({
        type: "interrupt",
        itemId: current.itemId ?? null,
        itemIds: unheard,
      });
      void persist(current).catch(fail);
    }
    function answer(turn: Turn) {
      if (turn.interrupted || controller.signal.aborted || current !== turn)
        return;
      speaking = true;
      send({
        type: "response.create",
        response: { metadata: { purpose: "answer", turn: turn.id } },
      });
    }
    async function startTurn(itemId: string) {
      if (turns.size >= 80) throw new AppError(408, "voice_session_ended");
      // A commit belongs to the just-finished utterance. Late work from earlier
      // turns cannot initiate a response after speech_started cancels it.
      const turn: Turn = {
        sequence: turns.size,
        durationMs: speechDuration,
        ...(overlapped ? { overlap: overlapped } : {}),
        id: randomUUID(),
        userItem: itemId,
        text: "",
        bytes: 0,
        items: new Map(),
        interrupted: false,
        heard: false,
        done: false,
        saved: false,
        calls: 0,
        controller: new AbortController(),
        pendingCalls: new Set(),
      };
      turns.set(turn.id, turn);
      if (!turn.overlap) current = turn;
      if (!turn.overlap) emit({ type: "activity", state: "thinking" });
      // Transcription is an out-of-band use of the SAME realtime model. It no
      // longer blocks the spoken response and never joins the main conversation.
      send({
        type: "response.create",
        response: {
          conversation: "none",
          output_modalities: ["text"],
          tools: [],
          input: [{ type: "item_reference", id: itemId }],
          instructions:
            "Transcribe only the user's speech verbatim, in its original language. Do not answer it. If no intelligible speech exists, return an empty string.",
          metadata: { purpose: "transcript", turn: turn.id },
          max_output_tokens: 1200,
        },
      } as unknown as RealtimeClientEvent); // SDK 7.34 omits documented item_reference.
      if (!turn.overlap) await prepareAnswer(turn);
    }
    async function prepareAnswer(turn: Turn) {
      try {
        await prepareAnswerWork(turn);
      } catch (error) {
        if (controller.signal.aborted || turn.interrupted || current !== turn)
          return;
        if (!recoverableServiceFailure(error)) throw error;
        turn.interrupted = true;
        turn.done = true;
        turn.heard = true;
        turn.saved = true;
        turn.controller.abort();
        emit({ type: "activity", state: "listening" });
        emit({ type: "notice", code: "voice_context_unavailable" });
      }
    }
    async function prepareAnswerWork(turn: Turn) {
      turn.prepared = await prepare(turn.id, prior, controller.signal);
      if (controller.signal.aborted || turn.interrupted || current !== turn)
        return;
      const settled = Promise.all([
        truncateWait,
        ...[...turns.values()].map((item) => item.cancelWait),
      ]);
      await Promise.race([
        settled,
        new Promise<never>((_, reject) => {
          const timer = setTimeout(
            () => reject(new Error("playback_ack_timeout")),
            5000,
          );
          timer.unref();
          settled.then(() => clearTimeout(timer));
        }),
      ]);
      if (controller.signal.aborted || turn.interrupted || current !== turn)
        return;
      seedHistory(turn.prepared.history);
      send({
        type: "session.update",
        session: {
          type: "realtime",
          instructions: [
            turn.prepared.instructions,
            "# Spoken conversation",
            `Speak naturally and briefly, usually one or two sentences. ${settings.delivery === "calm" ? "Keep a calm, steady delivery and consistent volume." : "Use a warm, expressive delivery."} Allow the user to interrupt. Use tools for saved photos and personal context. If a tool is unavailable, explain that limitation briefly without inventing an answer; keep the conversation open. Never read internal identifiers aloud.`,
            "# Spoken progress updates",
            "For a lookup or multi-step request that may take noticeable time, speak one short, action-specific preamble in the commentary channel immediately before tools or extended reasoning. Match the user's language and vary the wording. Keep it to one brief clause, roughly 4–9 words in English or similarly short in other languages. For example: ‘I’ll check where hydrangeas grow.’ or ‘I’ll take a look at your recent photos.’ These describe intended work, never completed work or unverified results.",
            "Skip preambles for immediate answers, simple confirmations or corrections, unclear audio, silence, background noise, and side conversations. Ask for clarification when needed. Do not announce internal reasoning or tool names, estimate a wait time, or use generic fillers such as ‘Hold on for a minute’. Use at most one preamble per user request; after tool results, give the answer without another waiting message. Never replace the answer with a progress update.",
          ].join("\n"),
        },
      });
      answer(turn);
    }
    async function handle(event: RealtimeServerEvent) {
      if (controller.signal.aborted) return;
      switch (event.type) {
        case "response.created": {
          const id = event.response.metadata?.turn;
          if (id && event.response.metadata?.purpose === "answer") {
            const turn = turns.get(id);
            if (turn) responses.set(event.response.id!, turn);
          }
          return;
        }
        case "session.updated":
          if (!ready) {
            ready = true;
            clearTimeout(startup);
            emit({ type: "ready" });
          }
          return;
        case "input_audio_buffer.speech_started":
          audioStartMs = event.audio_start_ms;
          speechStart = lastActivity = Date.now();
          overlapped =
            current && (!current.done || !current.heard) && !current.interrupted
              ? current
              : undefined;
          if (overlapped) emit({ type: "duck", active: true });
          emit({ type: "activity", state: "hearing" });
          return;
        case "input_audio_buffer.speech_stopped":
          speechDuration =
            audioStartMs !== undefined && event.audio_end_ms !== undefined
              ? Math.max(0, event.audio_end_ms - audioStartMs)
              : speechStart
                ? Date.now() - speechStart
                : 0;
          audioStartMs = undefined;
          speechStart = 0;
          lastActivity = Date.now();
          return;
        case "input_audio_buffer.committed":
          if (muted) {
            send({ type: "conversation.item.delete", item_id: event.item_id });
            return;
          }
          await startTurn(event.item_id);
          return;
        case "response.output_audio.delta": {
          const turn = responses.get(event.response_id);
          if (!turn || turn !== current || turn.interrupted) return;
          turn.itemId = event.item_id;
          let item = turn.items.get(event.item_id);
          if (!item) {
            item = { bytes: 0, heard: false };
            turn.items.set(event.item_id, item);
            turn.heard = false;
          }
          const length = Buffer.byteLength(event.delta, "base64");
          item.bytes += length;
          turn.bytes += length;
          if (turn.bytes > 48000 * 90) throw new Error("reply_too_long");
          lastActivity = Date.now();
          emit({
            type: "audio",
            itemId: event.item_id,
            data: ambience(event.delta),
          });
          return;
        }
        case "response.output_audio_transcript.delta":
          if (
            current &&
            responses.get(event.response_id) === current &&
            !current.interrupted
          ) {
            if (current.text && current.textItem !== event.item_id)
              current.text += "\n\n";
            current.textItem = event.item_id;
            current.text += event.delta;
            emit({ type: "caption", role: "assistant", text: current.text });
          }
          return;
        case "response.output_audio.done":
          if (
            current &&
            responses.get(event.response_id) === current &&
            !current.interrupted
          )
            emit({ type: "audio_done", itemId: event.item_id });
          return;
        case "response.done": {
          if (event.response.id) {
            if (completedResponses.has(event.response.id)) return;
            completedResponses.add(event.response.id);
          }
          const metadata = event.response.metadata;
          const turn = metadata?.turn ? turns.get(metadata.turn) : undefined;
          if (!turn) return;
          if (metadata?.purpose === "answer") turn.cancelled?.();
          if (metadata?.purpose === "transcript") {
            if (event.response.status !== "completed") {
              turn.userText = "";
              if (turn.overlap) {
                turn.saved = true;
                send({
                  type: "conversation.item.delete",
                  item_id: turn.userItem,
                });
                emit({ type: "duck", active: false });
              } else await persist(turn);
              emit({ type: "notice", code: "voice_transcript_unavailable" });
              return;
            }
            turn.userText = (event.response.output ?? [])
              .flatMap((item) =>
                item.type === "message"
                  ? (item.content?.flatMap((part) =>
                      part.type === "output_text" ? [part.text] : [],
                    ) ?? [])
                  : [],
              )
              .join("")
              .trim()
              .slice(0, 16000);
            if (!turn.userText) {
              turn.saved = true;
              if (current === turn) interrupt();
              send({
                type: "conversation.item.delete",
                item_id: turn.userItem,
              });
              emit({ type: "duck", active: false });
              emit({ type: "activity", state: "listening" });
              if (!turn.overlap)
                emit({ type: "notice", code: "voice_no_speech" });
              return;
            }
            if (turn.overlap) {
              if (current && turn.sequence < current.sequence) {
                // An older transcription must not replace a newer user turn.
                turn.interrupted = true;
                turn.done = true;
                turn.prepared = await prepare(
                  turn.id,
                  prior,
                  controller.signal,
                );
                await persist(turn);
                return;
              }
              if (
                isBackchannel(
                  turn.userText,
                  turn.overlap.text,
                  turn.durationMs,
                  settings.interruption,
                )
              ) {
                // Drop only the backchannel item; the assistant keeps speaking.
                send({
                  type: "conversation.item.delete",
                  item_id: turn.userItem,
                });
                turn.saved = true;
                emit({ type: "duck", active: false });
                emit({ type: "activity", state: "listening" });
                return;
              }
              if (current && current !== turn) interrupt();
              current = turn;
              emit({ type: "duck", active: false });
              emit({ type: "activity", state: "thinking" });
              void prepareAnswer(turn).catch(fail);
            }
            if (current === turn)
              emit({ type: "caption", role: "user", text: turn.userText });
            await persist(turn);
            return;
          }
          if (turn !== current || turn.interrupted) return;
          speaking = false;
          if (event.response.status !== "completed") {
            turn.done = true;
            if (turn.itemId) emit({ type: "audio_done", itemId: turn.itemId });
            else turn.heard = true;
            emit({ type: "activity", state: "listening" });
            emit({ type: "notice", code: "voice_reply_incomplete" });
            await persist(turn);
            return;
          }
          const calls = (event.response.output ?? []).filter(
            (item) => item.type === "function_call",
          );
          if (calls.length) {
            turn.calls += calls.length;
            if (turn.calls > 8 || !turn.prepared) throw new Error("tool_limit");
            const prepared = turn.prepared;
            for (const call of calls)
              if (call.call_id) turn.pendingCalls.add(call.call_id);
            // Reads run concurrently; proposed changes are handled serially.
            const read = calls.every(
              (call) => !call.name.startsWith("propose_"),
            );
            const execute = async (call: (typeof calls)[number]) => {
              if (turn.interrupted || controller.signal.aborted) return;
              let result: unknown;
              let deadline: ReturnType<typeof setTimeout> | undefined;
              try {
                result = await Promise.race([
                  prepared.execute(call.name, JSON.parse(call.arguments)),
                  new Promise<never>((_, reject) => {
                    deadline = setTimeout(
                      () =>
                        reject(new AppError(504, "voice_tool_timeout", true)),
                      12000,
                    );
                    deadline.unref();
                  }),
                ]);
              } catch (error) {
                if (turn.interrupted || controller.signal.aborted) return;
                // Auth/deletion failures must still end access. A search
                // timeout or malformed tool arguments must not close the mic.
                if (
                  error instanceof AppError &&
                  [401, 403, 404, 410].includes(error.status)
                )
                  throw error;
                result = {
                  error:
                    error instanceof z.ZodError || error instanceof SyntaxError
                      ? "invalid_arguments"
                      : "tool_unavailable",
                  instruction:
                    "Explain this limitation briefly. Do not invent results or automatically repeat this operation.",
                };
                console.warn(
                  JSON.stringify({
                    service: "plantopedia-voice",
                    code: "voice_tool_unavailable",
                  }),
                );
              } finally {
                clearTimeout(deadline);
              }
              if (
                turn.interrupted ||
                controller.signal.aborted ||
                !call.call_id ||
                !turn.pendingCalls.delete(call.call_id)
              )
                return;
              send({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: call.call_id!,
                  output: JSON.stringify(result) ?? "null",
                },
              });
            };
            if (read) await Promise.all(calls.map(execute));
            else for (const call of calls) await execute(call);
            answer(turn);
            return;
          }
          turn.done = true;
          if (!turn.itemId) {
            turn.heard = true;
            emit({ type: "activity", state: "listening" });
          }
          await persist(turn);
          return;
        }
        case "error":
          // Cancellation can race the last audio chunk; the response is already done.
          if (event.error.code === "response_cancel_not_active") {
            for (const turn of turns.values()) turn.cancelled?.();
            return;
          }
          throw new AppError(502, "voice_provider_error");
      }
    }
    function seedHistory(history: Message[]) {
      for (const item of history) {
        if (seededMessages.has(item.id)) continue;
        seededMessages.add(item.id);
        if (!item.text.trim()) continue;
        send({
          type: "conversation.item.create",
          item:
            item.role === "user"
              ? {
                  type: "message",
                  role: "user",
                  content: [{ type: "input_text", text: item.text }],
                }
              : {
                  type: "message",
                  role: "assistant",
                  content: [{ type: "output_text", text: item.text }],
                },
        });
      }
    }
    socket.on("open", () => {
      void (async () => {
        const prepared = await prepare(randomUUID(), [], controller.signal);
        if (controller.signal.aborted) return;
        prior = prepared.history;
        settings = prepared.voice ?? defaultVoiceSettings;
        ambience = voiceAmbience(settings.ambience);
        send({
          type: "session.update",
          session: {
            type: "realtime",
            model: config.OPENAI_REALTIME_MODEL,
            instructions: prepared.instructions,
            output_modalities: ["audio"],
            reasoning: { effort: "minimal" },
            max_output_tokens: 1600,
            audio: {
              input: {
                format: { type: "audio/pcm", rate: 24000 },
                noise_reduction: {
                  type:
                    settings.microphone === "headset"
                      ? "near_field"
                      : "far_field",
                },
                turn_detection: {
                  type: "semantic_vad",
                  eagerness:
                    settings.turnTaking === "patient"
                      ? "low"
                      : settings.turnTaking === "quick"
                        ? "high"
                        : "auto",
                  create_response: false,
                  interrupt_response: false,
                },
              },
              output: {
                format: { type: "audio/pcm", rate: 24000 },
                voice: settings.voice,
                speed:
                  settings.pace === "relaxed"
                    ? 0.85
                    : settings.pace === "brisk"
                      ? 1.15
                      : 1,
              },
            },
            tools: prepared.tools.map((tool) => ({
              type: "function",
              ...tool,
            })),
            tool_choice: "auto",
          },
        });
        seedHistory(prior);
      })().catch(fail);
    });
    // Do not serialize speech_started behind database/tool awaits: interruption
    // has to fence those operations immediately.
    socket.on("message", (data) => {
      try {
        void handle(JSON.parse(data.toString()) as RealtimeServerEvent).catch(
          fail,
        );
      } catch (error) {
        fail(error);
      }
    });
    socket.on("error", fail);
    socket.on("close", () => {
      if (!controller.signal.aborted) fail(new Error("provider_closed"));
    });
    return {
      close,
      receive(raw) {
        try {
          const event = VoiceClientEvent.parse(raw);
          if (event.type === "stop") {
            close();
            return;
          }
          if (!ready || controller.signal.aborted) return;
          if (event.type === "audio" && !muted) {
            const bytes = Buffer.byteLength(event.data, "base64");
            if (bytes % 2 || bytes > 24000) throw new Error("invalid_audio");
            if (Date.now() - byteWindow > 1000) {
              inputBytes = 0;
              byteWindow = Date.now();
            }
            inputBytes += bytes;
            if (inputBytes > 144000) throw new Error("audio_rate");
            send({ type: "input_audio_buffer.append", audio: event.data });
          } else if (event.type === "mute") {
            muted = event.muted;
            speechStart = 0;
            audioStartMs = undefined;
            overlapped = undefined;
            emit({ type: "duck", active: false });
            send({ type: "input_audio_buffer.clear" });
          } else if (event.type === "interrupt") interrupt();
          else if (event.type === "played") {
            const turn = [...turns.values()].find((item) =>
              item.items.has(event.itemId),
            );
            if (!turn) return;
            const item = turn.items.get(event.itemId)!;
            if (event.interrupted || turn.interrupted) {
              if (item.truncated) return;
              item.truncated = true;
              turn.interrupted = true;
              send({
                type: "conversation.item.truncate",
                item_id: event.itemId,
                content_index: 0,
                audio_end_ms: Math.min(event.ms, Math.floor(item.bytes / 48)),
              });
              pendingTruncates.delete(event.itemId);
              if (!pendingTruncates.size) {
                awaitingTruncate?.();
                awaitingTruncate = undefined;
              }
            } else {
              item.heard = true;
              turn.heard = [...turn.items.values()].every((item) => item.heard);
            }
            void persist(turn).catch(fail);
          }
        } catch (error) {
          fail(error);
        }
      },
    };
  };
  return {
    connect,
    hasUser: (uid: string) => sessions.has(uid),
    closeUser(uid: string) {
      sessions.get(uid)?.();
    },
    shutdown() {
      draining = true;
      for (const close of [...sessions.values()]) close();
    },
  };
}
