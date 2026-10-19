import { EventEmitter } from "node:events";
import { beforeEach, afterEach, test, expect, jest } from "@jest/globals";
import request from "supertest";
import { parseConfig } from "../src/config/env.js";
import type { PreparedVoiceTurn } from "../src/application/ports.js";
import { fixtures } from "./fixtures.js";
import { createApp } from "../src/http/app.js";
import { companionService } from "../src/application/companion.js";
const sockets: MockSocket[] = [];
class MockSocket extends EventEmitter {
  static OPEN = 1;
  readyState = 0;
  sent: { type: string; audio?: string; [key: string]: unknown }[] = [];
  constructor(readonly url: string) {
    super();
    sockets.push(this);
  }
  send(text: string) {
    this.sent.push(JSON.parse(text));
  }
  frame(value: unknown) {
    this.emit("message", Buffer.from(JSON.stringify(value)));
  }
  open() {
    this.readyState = 1;
    this.emit("open");
  }
  terminate() {
    this.readyState = 3;
    this.emit("close");
  }
}
jest.unstable_mockModule("ws", () => ({ default: MockSocket }));
const { createVoice, wave } = await import("../src/providers/voice.js");
const config = parseConfig({
  NODE_ENV: "test",
  OPENAI_API_KEY: "fixture-key",
  CLERK_SECRET_KEY: "fixture",
  CLERK_ISSUER_URL: "https://fixture.example.invalid",
  FIREBASE_PROJECT_ID: "demo-plantopedia",
  FIREBASE_STORAGE_BUCKET: "demo-bucket",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
});
const auth = { uid: "user_a", sessionId: "session_user_a" };
const audioBase64 = Buffer.alloc(24000, 1).toString("base64");
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
let voice: ReturnType<typeof createVoice>;
beforeEach(() => {
  sockets.length = 0;
  voice = createVoice(config);
});
afterEach(async () => {
  await voice.shutdown();
  jest.useRealTimers();
});
function input(overrides: Partial<PreparedVoiceTurn> = {}): PreparedVoiceTurn {
  return {
    audioBase64,
    instructions: "Synthetic plant companion instructions",
    history: [],
    tools: [
      {
        name: "get_plant",
        description: "read",
        parameters: { type: "object" },
      },
    ],
    execute: jest
      .fn<PreparedVoiceTurn["execute"]>()
      .mockResolvedValue({ nickname: "Fern" }),
    complete: jest.fn<PreparedVoiceTurn["complete"]>().mockResolvedValue([]),
    ...overrides,
  };
}
async function start(prepared = input(), id = "turn_a") {
  await voice.start(
    auth,
    { id, conversationId: "chat_a" },
    async () => prepared,
  );
  await tick();
  const socket = sockets.at(-1)!;
  socket.open();
  socket.frame({ type: "session.updated" });
  await tick();
  socket.frame({ type: "input_audio_buffer.committed", item_id: "item_audio" });
  await tick();
  socket.frame({
    type: "response.done",
    response: {
      id: "transcript",
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: "How are my fern’s leaves?" }],
        },
      ],
    },
  });
  await tick();
  return socket;
}
function reply(socket: MockSocket, id = "reply") {
  socket.frame({
    type: "response.output_audio.delta",
    delta: Buffer.alloc(4800).toString("base64"),
  });
  socket.frame({
    type: "response.done",
    response: {
      id,
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            { type: "output_audio", transcript: "Your fern has green leaves." },
          ],
        },
      ],
    },
  });
}
test("pins Realtime 2.1, disables VAD, transcribes and answers with the same model, wraps completed PCM as WAV and closes", async () => {
  const prepared = input();
  const socket = await start(prepared);
  expect(socket.url).toContain("/v1/realtime?model=gpt-realtime-2.1");
  expect(socket.sent[0]).toMatchObject({
    type: "session.update",
    session: {
      model: "gpt-realtime-2.1",
      audio: { input: { turn_detection: null, format: { rate: 24000 } } },
    },
  });
  expect(
    socket.sent
      .filter((event) => event.type === "input_audio_buffer.append")
      .map((event) => event.audio)
      .join(""),
  ).toBe(audioBase64);
  expect(
    socket.sent.find((event) => event.type === "response.create"),
  ).toMatchObject({
    response: { conversation: "none", output_modalities: ["text"], tools: [] },
  });
  reply(socket);
  await tick();
  const result = await voice.status(auth, "turn_a");
  expect(result.status).toBe("complete");
  if (result.status !== "complete") throw new Error("not complete");
  expect(
    Buffer.from(result.audioBase64, "base64").subarray(0, 4).toString(),
  ).toBe("RIFF");
  expect(prepared.complete).toHaveBeenCalledWith(
    "How are my fern’s leaves?",
    "Your fern has green leaves.",
  );
  expect(socket.readyState).toBe(3);
});
test("reserves before async preparation, deduplicates POST and fences other owners and Clerk sessions", async () => {
  let release!: (value: PreparedVoiceTurn) => void;
  const pending = new Promise<PreparedVoiceTurn>((resolve) => {
    release = resolve;
  });
  const prepare = jest
    .fn<() => Promise<PreparedVoiceTurn>>()
    .mockReturnValue(pending);
  await voice.start(auth, { id: "turn_a", conversationId: "chat_a" }, prepare);
  await voice.start(auth, { id: "turn_a", conversationId: "chat_a" }, prepare);
  expect(prepare).toHaveBeenCalledTimes(1);
  await expect(
    voice.start(auth, { id: "turn_b", conversationId: "chat_a" }, prepare),
  ).rejects.toMatchObject({ code: "voice_already_active" });
  for (const other of [
    { ...auth, uid: "user_b" },
    { ...auth, sessionId: "other_session" },
  ]) {
    await expect(voice.status(other, "turn_a")).rejects.toMatchObject({
      status: 404,
    });
    await expect(voice.close(other, "turn_a")).rejects.toMatchObject({
      status: 404,
    });
  }
  await voice.close(auth, "turn_a");
  release(input());
  await tick();
  expect(sockets).toHaveLength(0);
  expect(await voice.status(auth, "turn_a")).toMatchObject({
    status: "cancelled",
  });
});
test("executes calls once and only continues after all tool outputs", async () => {
  const prepared = input();
  const socket = await start(prepared);
  const event = {
    type: "response.done",
    response: {
      id: "tools",
      status: "completed",
      output: [
        {
          type: "function_call",
          call_id: "call_a",
          name: "get_plant",
          arguments: '{"plantId":"plant_a"}',
        },
        {
          type: "function_call",
          call_id: "call_b",
          name: "get_plant",
          arguments: '{"plantId":"plant_b"}',
        },
      ],
    },
  };
  socket.frame(event);
  socket.frame(event);
  await tick();
  expect(prepared.execute).toHaveBeenCalledTimes(2);
  const tail = socket.sent.slice(-3);
  expect(tail.map((event) => event.type)).toEqual([
    "conversation.item.create",
    "conversation.item.create",
    "response.create",
  ]);
  reply(socket);
  await tick();
  expect((await voice.status(auth, "turn_a")).status).toBe("complete");
});
test.each(["close", "closeUser", "shutdown"])(
  "%s stops the socket immediately and fences a late tool result",
  async (action) => {
    let release!: (value: unknown) => void;
    const execute = jest.fn<PreparedVoiceTurn["execute"]>().mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const prepared = input({ execute });
    const socket = await start(prepared);
    socket.frame({
      type: "response.done",
      response: {
        id: "tools",
        status: "completed",
        output: [
          {
            type: "function_call",
            call_id: "call",
            name: "get_plant",
            arguments: "{}",
          },
        ],
      },
    });
    await tick();
    const sent = socket.sent.length;
    if (action === "close") await voice.close(auth, "turn_a");
    else if (action === "closeUser") await voice.closeUser(auth.uid);
    else await voice.shutdown();
    expect(socket.readyState).toBe(3);
    release({ private: "late evidence" });
    await tick();
    expect(socket.sent).toHaveLength(sent);
    expect(prepared.complete).not.toHaveBeenCalled();
  },
);
test.each(["error", "close", "incomplete", "silence"])(
  "%s never publishes a successful/partial turn",
  async (failure) => {
    const prepared = input();
    const socket = await start(prepared);
    if (failure === "error")
      socket.frame({
        type: "error",
        error: { message: "secret-provider-details" },
      });
    else if (failure === "close") socket.terminate();
    else if (failure === "incomplete")
      socket.frame({
        type: "response.done",
        response: { id: "bad", status: "incomplete" },
      });
    else
      socket.frame({
        type: "response.done",
        response: { id: "empty", status: "completed", output: [] },
      });
    await tick();
    expect((await voice.status(auth, "turn_a")).status).toBe("failed");
    expect(prepared.complete).not.toHaveBeenCalled();
    expect(JSON.stringify(await voice.status(auth, "turn_a"))).not.toContain(
      "secret-provider-details",
    );
  },
);
test("deadline terminates a silent upstream and completed audio expires", async () => {
  const socket = await start();
  jest.useFakeTimers();
  // The deadline was created with real timers; exercise expiry using a new turn.
  await voice.close(auth, "turn_a");
  await voice.start(
    auth,
    { id: "turn_b", conversationId: "chat_a" },
    async () => input(),
  );
  await Promise.resolve();
  await Promise.resolve();
  const second = sockets.at(-1)!;
  second.open();
  await jest.advanceTimersByTimeAsync(90001);
  expect(second.readyState).toBe(3);
  expect((await voice.status(auth, "turn_b")).status).toBe("failed");
  await jest.advanceTimersByTimeAsync(120001);
  await expect(voice.status(auth, "turn_b")).rejects.toMatchObject({
    status: 404,
  });
  expect(socket.readyState).toBe(3);
});
test("PCM WAV header declares mono 24 kHz 16-bit audio", () => {
  const result = wave(Buffer.alloc(48000));
  expect(result.readUInt16LE(22)).toBe(1);
  expect(result.readUInt32LE(24)).toBe(24000);
  expect(result.readUInt16LE(34)).toBe(16);
  expect(result.readUInt32LE(40)).toBe(48000);
});

test("HTTP turns enforce auth, audio bounds, ownership and durable duplicate reservations without storing audio", async () => {
  const { deps, documents } = fixtures();
  deps.voice = voice;
  const companion = companionService(deps);
  await companion.start(auth, "create_chat", {
    id: "chat_a",
    plantId: null,
    photoId: null,
    locale: "en",
  });
  const app = createApp(deps);
  const body = {
    id: "turn_http",
    conversationId: "chat_a",
    locale: "en",
    audioBase64,
  };
  expect((await request(app).post("/v1/voice/turns").send(body)).status).toBe(
    401,
  );
  expect(
    (
      await request(app)
        .post("/v1/voice/turns")
        .set("Authorization", "Bearer user_b")
        .set("Idempotency-Key", body.id)
        .send(body)
    ).status,
  ).toBe(404);
  expect(
    (
      await request(app)
        .post("/v1/voice/turns")
        .set("Authorization", "Bearer user_a")
        .set("Idempotency-Key", body.id)
        .send({ ...body, audioBase64: "invalid" })
    ).status,
  ).toBe(422);
  expect(
    (
      await request(app)
        .post("/v1/voice/turns")
        .set("Authorization", "Bearer user_a")
        .set("Idempotency-Key", body.id)
        .send(body)
    ).status,
  ).toBe(200);
  await tick();
  expect(
    (
      await request(app)
        .get(`/v1/voice/turns/${body.id}`)
        .set("Authorization", "Bearer user_b")
    ).status,
  ).toBe(404);
  await voice.close(auth, body.id);
  const serialized = JSON.stringify([...documents.values()]);
  expect(serialized).not.toContain(audioBase64);
  expect(
    [...documents.keys()].some((key) => key.includes("voice_attempts")),
  ).toBe(true);
  await expect(
    companion.prepareVoice(auth, body, [], new AbortController().signal),
  ).rejects.toMatchObject({ code: "provider_outcome_unknown" });
});

test("complete voice turns retain evidence and sources, respect transcript opt-out and block completion after deletion", async () => {
  const { deps, documents } = fixtures();
  const companion = companionService(deps);
  await companion.start(auth, "start_chat", {
    id: "chat_a",
    plantId: null,
    photoId: null,
    locale: "en",
  });
  const body = {
    id: "turn_saved",
    conversationId: "chat_a",
    locale: "en",
    audioBase64,
  };
  const prepared = await companion.prepareVoice(
    auth,
    body,
    [],
    new AbortController().signal,
  );
  const messages = await prepared.complete("A question", "A reply");
  expect(
    messages.every(
      (item) => item.transport === "voice" && item.delivery === "complete",
    ),
  ).toBe(true);
  expect(await companion.history(auth, "chat_a")).toHaveLength(2);
  await companion.preferences(auth, {
    theme: "system",
    locale: "en",
    retainTranscripts: false,
  });
  const transient = await companion.prepareVoice(
    auth,
    { ...body, id: "turn_private" },
    messages,
    new AbortController().signal,
  );
  expect(transient.history).toHaveLength(2);
  await transient.complete("Private question", "Private reply");
  expect(JSON.stringify([...documents.values()])).not.toContain(
    "Private question",
  );
  const late = await companion.prepareVoice(
    auth,
    { ...body, id: "turn_deleted" },
    [],
    new AbortController().signal,
  );
  await companion.removeConversation(auth, "chat_a");
  await expect(late.complete("late", "late")).rejects.toMatchObject({
    status: 410,
  });
});
