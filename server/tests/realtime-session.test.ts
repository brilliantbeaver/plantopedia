import type { VoiceServerEvent } from "@plantopedia/contracts";
import { EventEmitter } from "node:events";
import { test, expect, jest, afterEach } from "@jest/globals";
import WebSocket from "ws";
import { createRealtimeSessions } from "../src/providers/realtime-session.js";
import { isBackchannel } from "../src/providers/voice-endpointing.js";
import { parseConfig } from "../src/config/env.js";
import { AppError } from "../src/application/errors.js";
import { defaultVoiceSettings } from "@plantopedia/contracts";
import type { PreparedVoiceTurn } from "../src/application/ports.js";
const config = parseConfig({
  NODE_ENV: "test",
  OPENAI_API_KEY: "fixture",
  CLERK_SECRET_KEY: "fixture",
  CLERK_ISSUER_URL: "https://fixture.example.invalid",
  FIREBASE_PROJECT_ID: "demo-plantopedia",
  FIREBASE_STORAGE_BUCKET: "demo-bucket",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
});
type SentEvent = {
  type: string;
  response?: { metadata: { purpose: string; turn: string } };
  item?: { content?: { text?: string }[] };
};
class Socket extends EventEmitter {
  readyState = 1;
  bufferedAmount = 0;
  sent: SentEvent[] = [];
  send(raw: string) {
    this.sent.push(JSON.parse(raw));
  }
  frame(event: unknown) {
    this.emit("message", Buffer.from(JSON.stringify(event)));
  }
  terminate() {
    this.readyState = 3;
    this.emit("close");
  }
}
const auth = { uid: "alice", sessionId: "alice-session" };
const tick = async () => {
  for (let i = 0; i < 4; i++)
    await new Promise<void>((resolve) => setImmediate(resolve));
};
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((close) => close());
});
async function setup(overrides: Partial<PreparedVoiceTurn> = {}) {
  const socket = new Socket();
  const live = createRealtimeSessions(
    config,
    () => socket as unknown as WebSocket,
  );
  cleanups.push(live.shutdown);
  const complete = jest
    .fn<PreparedVoiceTurn["complete"]>()
    .mockResolvedValue([]);
  const prepared: PreparedVoiceTurn = {
    audioBase64: "",
    instructions: "Saved plants: fern",
    history: [],
    tools: [],
    execute: async () => ({}),
    complete,
    ...overrides,
  };
  const prepare = jest.fn(async () => prepared);
  const events: VoiceServerEvent[] = [];
  const ended = jest.fn();
  const connection = live.connect(
    auth,
    prepare,
    (event) => events.push(event as VoiceServerEvent),
    ended,
  );
  socket.emit("open");
  await tick();
  socket.frame({ type: "session.updated" });
  return {
    socket,
    live,
    connection,
    prepare,
    prepared,
    complete,
    events,
    ended,
  };
}
async function utterance(socket: Socket, id: string) {
  socket.frame({ type: "input_audio_buffer.speech_started" });
  socket.frame({ type: "input_audio_buffer.speech_stopped" });
  socket.frame({ type: "input_audio_buffer.committed", item_id: id });
  await tick();
  return socket.sent
    .filter(
      (e) =>
        e.type === "response.create" &&
        e.response?.metadata.purpose === "transcript",
    )
    .at(-1)!.response?.metadata.turn as string;
}
function transcript(socket: Socket, turn: string, text: string) {
  socket.frame({
    type: "response.done",
    response: {
      status: "completed",
      metadata: { turn, purpose: "transcript" },
      output: [{ type: "message", content: [{ type: "output_text", text }] }],
    },
  });
}
function audio(
  socket: Socket,
  turn: string,
  item = "answer-a",
  response = "response-a",
  text = "Your fern is growing.",
) {
  socket.frame({
    type: "response.created",
    response: { id: response, metadata: { turn, purpose: "answer" } },
  });
  socket.frame({
    type: "response.output_audio.delta",
    response_id: response,
    item_id: item,
    delta: Buffer.alloc(4800).toString("base64"),
  });
  socket.frame({
    type: "response.output_audio_transcript.delta",
    response_id: response,
    item_id: item,
    delta: text,
  });
}
function done(socket: Socket, turn: string) {
  socket.frame({
    type: "response.output_audio.done",
    response_id: "response-a",
    item_id: "answer-a",
  });
  socket.frame({
    type: "response.done",
    response: {
      id: "response-a",
      status: "completed",
      metadata: { turn, purpose: "answer" },
      output: [],
    },
  });
}
test("one persistent connection uses semantic endpointing and streams speech without waiting for transcript or response completion", async () => {
  const { socket, events, connection, complete } = await setup();
  expect(socket.sent[0]).toMatchObject({
    type: "session.update",
    session: {
      model: "gpt-realtime-2.1",
      reasoning: { effort: "minimal" },
      audio: {
        input: {
          turn_detection: {
            type: "semantic_vad",
            eagerness: "auto",
            create_response: false,
            interrupt_response: false,
          },
        },
      },
    },
  });
  const turn = await utterance(socket, "user-a");
  expect(socket.sent.filter((e) => e.type === "response.create")).toHaveLength(
    2,
  );
  audio(socket, turn);
  expect(events.some((e) => e.type === "audio")).toBe(true);
  expect(complete).not.toHaveBeenCalled();
  done(socket, turn);
  transcript(socket, turn, "How is my fern?");
  await tick();
  expect(complete).not.toHaveBeenCalled();
  connection.receive({
    type: "played",
    itemId: "answer-a",
    ms: 100,
    interrupted: false,
  });
  await tick();
  expect(complete).toHaveBeenCalledWith(
    "How is my fern?",
    "Your fern is growing.",
  );
  await utterance(socket, "user-b");
  expect(socket.readyState).toBe(1);
});
test("brief backchannels duck then restore speech without canceling or adding a new answer", async () => {
  const { socket, events } = await setup();
  const first = await utterance(socket, "user-a");
  audio(socket, first);
  const second = await utterance(socket, "user-b");
  expect(events).toContainEqual({ type: "duck", active: true });
  transcript(socket, second, "Mm-hmm.");
  await tick();
  expect(socket.sent.some((e) => e.type === "response.cancel")).toBe(false);
  expect(
    socket.sent.filter(
      (e) =>
        e.type === "response.create" &&
        e.response?.metadata.purpose === "answer",
    ),
  ).toHaveLength(1);
  expect(socket.sent).toContainEqual({
    type: "conversation.item.delete",
    item_id: "user-b",
  });
  expect(events).toContainEqual({ type: "duck", active: false });
});
test("meaningful interruption truncates at heard audio and fences late chunks from the previous reply", async () => {
  const { socket, connection, complete, events } = await setup();
  const first = await utterance(socket, "user-a");
  audio(socket, first);
  transcript(socket, first, "Describe my fern.");
  const second = await utterance(socket, "user-b");
  transcript(socket, second, "Wait, tell me about the roses instead.");
  await tick();
  expect(socket.sent.some((e) => e.type === "response.cancel")).toBe(true);
  const count = events.filter((e) => e.type === "audio").length;
  socket.frame({
    type: "response.output_audio.delta",
    response_id: "response-a",
    item_id: "answer-a",
    delta: Buffer.alloc(4800).toString("base64"),
  });
  expect(events.filter((e) => e.type === "audio")).toHaveLength(count);
  connection.receive({
    type: "played",
    itemId: "answer-a",
    ms: 45,
    interrupted: true,
  });
  socket.frame({
    type: "response.done",
    response: {
      id: "response-a",
      status: "cancelled",
      metadata: { turn: first, purpose: "answer" },
      output: [],
    },
  });
  await tick();
  expect(socket.sent).toContainEqual({
    type: "conversation.item.truncate",
    item_id: "answer-a",
    content_index: 0,
    audio_end_ms: 45,
  });
  expect(complete).toHaveBeenCalledWith("Describe my fern.", "");
  expect(
    socket.sent.filter(
      (e) =>
        e.type === "response.create" &&
        e.response?.metadata.purpose === "answer",
    ),
  ).toHaveLength(2);
});
test("muting discards input and shutdown closes each owner's microphone connection", async () => {
  const { live, connection, socket, ended } = await setup();
  expect(() =>
    live.connect(
      auth,
      async () => {
        throw new Error();
      },
      () => {},
      () => {},
    ),
  ).toThrow("voice_already_active");
  connection.receive({ type: "mute", muted: true });
  connection.receive({
    type: "audio",
    data: Buffer.alloc(960).toString("base64"),
  });
  expect(socket.sent.some((e) => e.type === "input_audio_buffer.append")).toBe(
    false,
  );
  live.closeUser("alice");
  expect(ended).toHaveBeenCalledTimes(1);
  expect(socket.readyState).toBe(3);
  connection.receive({ type: "stop" });
  expect(ended).toHaveBeenCalledTimes(1);
});
test.each([
  ["mm-hmm", "A fern likes humidity.", 600, true],
  ["yes", "Would you like a reminder?", 500, false],
  ["okay", "Shall I show your roses?", 500, false],
  ["wait", "A fern likes humidity.", 500, false],
  ["no, the other plant", "A fern likes humidity.", 900, false],
  ["yeah", "A fern likes humidity.", 3000, false],
])(
  "backchannel classification preserves answers and corrections: %s",
  (text, assistant, ms, expected) => {
    expect(isBackchannel(text, assistant, ms)).toBe(expected);
  },
);

test("interrupting several queued audio items waits for every truncation acknowledgment", async () => {
  const { socket, connection, events } = await setup();
  const first = await utterance(socket, "user-a");
  audio(socket, first, "answer-a", "response-a");
  audio(socket, first, "answer-b", "response-b");
  connection.receive({ type: "interrupt" });
  expect(events).toContainEqual({
    type: "interrupt",
    itemId: "answer-b",
    itemIds: ["answer-a", "answer-b"],
  });
  socket.frame({
    type: "response.done",
    response: {
      id: "response-b",
      status: "cancelled",
      metadata: { turn: first, purpose: "answer" },
    },
  });
  await utterance(socket, "user-b");
  connection.receive({
    type: "played",
    itemId: "answer-a",
    ms: 40,
    interrupted: true,
  });
  await tick();
  expect(
    socket.sent.filter(
      (e) =>
        e.type === "response.create" &&
        e.response?.metadata.purpose === "answer",
    ),
  ).toHaveLength(1);
  connection.receive({
    type: "played",
    itemId: "answer-b",
    ms: 0,
    interrupted: true,
  });
  await tick();
  expect(
    socket.sent.filter(
      (e) =>
        e.type === "response.create" &&
        e.response?.metadata.purpose === "answer",
    ),
  ).toHaveLength(2);
});

test("new text history added during an open voice session is synchronized once", async () => {
  const { socket, prepare, prepared } = await setup();
  const text = {
    id: "late-text",
    schemaVersion: 1 as const,
    revision: 1,
    createdAt: "2026-10-18T12:00:00Z",
    updatedAt: "2026-10-18T12:00:00Z",
    conversationId: "chat_a",
    role: "user" as const,
    text: "I call my fern Fernie.",
    sources: [],
    evidence: [],
    transport: "text" as const,
    delivery: "complete" as const,
  };
  prepare.mockImplementation(async () => ({ ...prepared, history: [text] }));
  await utterance(socket, "user-a");
  const inserted = socket.sent.filter(
    (event) =>
      event.type === "conversation.item.create" &&
      event.item?.content?.[0]?.text === text.text,
  );
  expect(inserted).toHaveLength(1);
});
test("late transcription from an earlier interruption cannot take over a newer turn", async () => {
  const { socket, connection } = await setup();
  const first = await utterance(socket, "user-a");
  audio(socket, first);
  const second = await utterance(socket, "user-b");
  const third = await utterance(socket, "user-c");
  transcript(socket, third, "Tell me about roses instead.");
  await tick();
  transcript(socket, second, "Wait, I meant a different plant.");
  await tick();
  socket.frame({
    type: "response.done",
    response: {
      id: "response-a",
      status: "cancelled",
      metadata: { turn: first, purpose: "answer" },
    },
  });
  connection.receive({
    type: "played",
    itemId: "answer-a",
    ms: 20,
    interrupted: true,
  });
  await tick();
  const answers = socket.sent.filter(
    (event) =>
      event.type === "response.create" &&
      event.response?.metadata.purpose === "answer",
  );
  expect(answers.map((event) => event.response?.metadata.turn)).toEqual([
    first,
    third,
  ]);
});

function toolCall(
  socket: Socket,
  turn: string,
  name = "search_web",
  args = '{"query":"hydrangea"}',
  response = "tool-response",
) {
  socket.frame({
    type: "response.done",
    response: {
      id: response,
      status: "completed",
      metadata: { turn, purpose: "answer" },
      output: [
        { type: "function_call", name, arguments: args, call_id: "call-a" },
      ],
    },
  });
}
test("a spoken preamble streams during a slow lookup without completing the turn before the final answer is heard", async () => {
  let resolve!: (value: unknown) => void;
  const { socket, events, connection, complete, ended } = await setup({
    execute: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  const turn = await utterance(socket, "user-a");
  transcript(socket, turn, "Where do hydrangeas grow?");
  audio(
    socket,
    turn,
    "preamble",
    "response-pre",
    "I’ll check where hydrangeas grow.",
  );
  socket.frame({
    type: "response.output_audio.done",
    response_id: "response-pre",
    item_id: "preamble",
  });
  toolCall(socket, turn, "search_web", "{}", "response-pre");
  await tick();
  expect(events).toContainEqual(
    expect.objectContaining({ type: "audio", itemId: "preamble" }),
  );
  connection.receive({
    type: "played",
    itemId: "preamble",
    ms: 100,
    interrupted: false,
  });
  expect(complete).not.toHaveBeenCalled();
  expect(events.some((e) => e.type === "completed")).toBe(false);
  resolve({
    result: "Hydrangeas are native to parts of Asia and the Americas.",
  });
  await tick();
  audio(
    socket,
    turn,
    "answer-a",
    "response-a",
    "Hydrangeas are native to parts of Asia and the Americas.",
  );
  done(socket, turn);
  await tick();
  expect(complete).not.toHaveBeenCalled();
  connection.receive({
    type: "played",
    itemId: "answer-a",
    ms: 100,
    interrupted: false,
  });
  await tick();
  expect(complete).toHaveBeenCalledWith(
    "Where do hydrangeas grow?",
    "I’ll check where hydrangeas grow.\n\nHydrangeas are native to parts of Asia and the Americas.",
  );
  expect(events.filter((e) => e.type === "completed")).toHaveLength(1);
  expect(ended).not.toHaveBeenCalled();
});
test("interrupting a spoken preamble fences its pending lookup and subsequent audio", async () => {
  let resolve!: (value: unknown) => void;
  const { socket, connection, complete, events, ended } = await setup({
    execute: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  const turn = await utterance(socket, "user-a");
  transcript(socket, turn, "Where do hydrangeas grow?");
  audio(
    socket,
    turn,
    "preamble",
    "response-pre",
    "I’ll check where hydrangeas grow.",
  );
  toolCall(socket, turn, "search_web", "{}", "response-pre");
  await tick();
  connection.receive({ type: "interrupt" });
  connection.receive({
    type: "played",
    itemId: "preamble",
    ms: 50,
    interrupted: true,
  });
  const count = events.filter((e) => e.type === "audio").length;
  resolve({ result: "Late result must not be spoken." });
  audio(socket, turn, "late", "response-late");
  await tick();
  expect(events.filter((e) => e.type === "audio")).toHaveLength(count);
  expect(
    socket.sent.filter((e) => e.response?.metadata.purpose === "answer"),
  ).toHaveLength(1);
  expect(JSON.stringify(socket.sent)).not.toContain("Late result");
  expect(complete).toHaveBeenCalledWith("Where do hydrangeas grow?", "");
  expect(ended).not.toHaveBeenCalled();
});
test.each(["upstream", "arguments"])(
  "a recoverable %s tool failure returns a result and keeps voice open",
  async (failure) => {
    const { socket, ended, events } = await setup({
      execute: async () => {
        throw new AppError(502, "search_unavailable", true);
      },
    });
    const turn = await utterance(socket, "user-a");
    audio(socket, turn); // A spoken prelude must not be the end of the conversation.
    toolCall(
      socket,
      turn,
      "search_web",
      failure === "arguments" ? "{bad-json" : "{}",
    );
    await tick();
    expect(ended).not.toHaveBeenCalled();
    expect(events.filter((e) => e.type === "error")).toEqual([]);
    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        type: "conversation.item.create",
        item: expect.objectContaining({
          type: "function_call_output",
          call_id: "call-a",
          output: expect.stringContaining(
            failure === "arguments" ? "invalid_arguments" : "tool_unavailable",
          ),
        }),
      }),
    );
    expect(
      socket.sent.filter((e) => e.response?.metadata.purpose === "answer"),
    ).toHaveLength(2);
  },
);
test("access loss during a tool still ends the session", async () => {
  const { socket, ended } = await setup({
    execute: async () => {
      throw new AppError(401, "unauthorized");
    },
  });
  const turn = await utterance(socket, "user-a");
  toolCall(socket, turn);
  await tick();
  expect(ended).toHaveBeenCalledTimes(1);
});
test("a tool completing after interruption cannot restart its old answer", async () => {
  let resolve!: (value: unknown) => void;
  const { socket, connection } = await setup({
    execute: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  const turn = await utterance(socket, "user-a");
  toolCall(socket, turn);
  await tick();
  connection.receive({ type: "interrupt" });
  resolve({ private: "late result" });
  await tick();
  expect(
    socket.sent.filter((e) => e.response?.metadata.purpose === "answer"),
  ).toHaveLength(1);
  expect(JSON.stringify(socket.sent)).not.toContain("late result");
});
test("a failed overlap transcript restores volume and preserves the current response", async () => {
  const { socket, events, ended } = await setup();
  const first = await utterance(socket, "user-a");
  audio(socket, first);
  const second = await utterance(socket, "user-b");
  socket.frame({
    type: "response.done",
    response: {
      status: "failed",
      metadata: { turn: second, purpose: "transcript" },
    },
  });
  await tick();
  expect(ended).not.toHaveBeenCalled();
  expect(events).toContainEqual({ type: "duck", active: false });
  expect(events).toContainEqual({
    type: "notice",
    code: "voice_transcript_unavailable",
  });
  expect(socket.sent.some((e) => e.type === "response.cancel")).toBe(false);
});
test("an incomplete spoken response returns to listening rather than closing the session", async () => {
  const { socket, events, ended } = await setup();
  const turn = await utterance(socket, "user-a");
  audio(socket, turn);
  socket.frame({
    type: "response.done",
    response: {
      id: "response-a",
      status: "incomplete",
      metadata: { turn, purpose: "answer" },
      output: [],
    },
  });
  await tick();
  expect(ended).not.toHaveBeenCalled();
  expect(events).toContainEqual({ type: "audio_done", itemId: "answer-a" });
  expect(events).toContainEqual({
    type: "notice",
    code: "voice_reply_incomplete",
  });
});
test("saved voice controls configure the model without enabling automatic provider interruptions", async () => {
  const { socket } = await setup({
    voice: {
      ...defaultVoiceSettings,
      voice: "cedar",
      pace: "relaxed",
      turnTaking: "patient",
      microphone: "busy",
      ambience: "rain",
    },
  });
  expect(socket.sent[0]).toMatchObject({
    session: {
      audio: {
        input: {
          noise_reduction: { type: "far_field" },
          turn_detection: {
            eagerness: "low",
            create_response: false,
            interrupt_response: false,
          },
        },
        output: { voice: "cedar", speed: 0.85 },
      },
    },
  });
});
test("duplicate played acknowledgments truncate an interrupted item once", async () => {
  const { socket, connection } = await setup();
  const turn = await utterance(socket, "user-a");
  audio(socket, turn);
  connection.receive({ type: "interrupt" });
  for (let i = 0; i < 2; i++)
    connection.receive({
      type: "played",
      itemId: "answer-a",
      ms: 30,
      interrupted: true,
    });
  expect(
    socket.sent.filter((e) => e.type === "conversation.item.truncate"),
  ).toHaveLength(1);
});
test("interruption sensitivity ignores acknowledgments but preserves explicit corrections", () => {
  expect(isBackchannel("yeah", "Your fern likes humidity.", 2000, "firm")).toBe(
    true,
  );
  expect(isBackchannel("yeah", "Your fern likes humidity.", 800, "easy")).toBe(
    false,
  );
  expect(isBackchannel("stop", "Your fern likes humidity.", 200, "firm")).toBe(
    false,
  );
  expect(
    isBackchannel(
      "Tell me about roses.",
      "Your fern likes humidity.",
      2000,
      "off",
    ),
  ).toBe(true);
});

test("pausing the microphone during overlap restores reply volume and discards a late partial commit", async () => {
  const { socket, events, connection } = await setup();
  const first = await utterance(socket, "user-a");
  audio(socket, first);
  socket.frame({
    type: "input_audio_buffer.speech_started",
    audio_start_ms: 0,
  });
  connection.receive({ type: "mute", muted: true });
  expect(events.at(-1)).toEqual({ type: "duck", active: false });
  const count = socket.sent.filter((e) => e.type === "response.create").length;
  socket.frame({
    type: "input_audio_buffer.committed",
    item_id: "muted-partial",
  });
  await tick();
  expect(socket.sent.filter((e) => e.type === "response.create")).toHaveLength(
    count,
  );
});
test("slow tools time out without closing the session or replaying a late result", async () => {
  const { socket, ended } = await setup({
    execute: () => new Promise(() => {}),
  });
  const turn = await utterance(socket, "user-a");
  jest.useFakeTimers();
  try {
    toolCall(socket, turn);
    await jest.advanceTimersByTimeAsync(12000);
    expect(ended).not.toHaveBeenCalled();
    expect(
      socket.sent.filter((e) => e.response?.metadata.purpose === "answer"),
    ).toHaveLength(2);
  } finally {
    jest.useRealTimers();
  }
});

test("empty speech transcripts do not generate a phantom turn or close listening", async () => {
  const { socket, events, ended, complete } = await setup();
  const turn = await utterance(socket, "user-a");
  transcript(socket, turn, " ");
  await tick();
  expect(ended).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();
  expect(events).toContainEqual({ type: "notice", code: "voice_no_speech" });
  expect(socket.sent.some((e) => e.type === "response.cancel")).toBe(true);
});

test("a temporary context outage skips answering and allows the next utterance to recover", async () => {
  const { socket, prepare, events, ended } = await setup();
  prepare.mockRejectedValueOnce(
    new AppError(503, "database_unavailable", true),
  );
  const failed = await utterance(socket, "user-a");
  transcript(socket, failed, "How is the fern?");
  await tick();
  expect(ended).not.toHaveBeenCalled();
  expect(events).toContainEqual({
    type: "notice",
    code: "voice_context_unavailable",
  });
  expect(
    socket.sent.filter((e) => e.response?.metadata.purpose === "answer"),
  ).toHaveLength(0);
  await utterance(socket, "user-b");
  expect(
    socket.sent.filter((e) => e.response?.metadata.purpose === "answer"),
  ).toHaveLength(1);
});
test("a temporary history save failure reports unsaved text without ending voice access", async () => {
  const { socket, connection, complete, events, ended } = await setup();
  complete.mockRejectedValueOnce(
    new AppError(503, "database_unavailable", true),
  );
  const turn = await utterance(socket, "user-a");
  audio(socket, turn);
  done(socket, turn);
  transcript(socket, turn, "How is the fern?");
  await tick();
  connection.receive({
    type: "played",
    itemId: "answer-a",
    ms: 100,
    interrupted: false,
  });
  await tick();
  expect(ended).not.toHaveBeenCalled();
  expect(events).toContainEqual({
    type: "notice",
    code: "voice_history_unavailable",
  });
  await utterance(socket, "user-b");
  expect(socket.readyState).toBe(1);
});
