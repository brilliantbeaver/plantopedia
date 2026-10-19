import { createServer } from "node:http";
import { once } from "node:events";
import { test, expect, jest, afterEach } from "@jest/globals";
import WebSocket from "ws";
import { attachVoiceSocket } from "../src/http/voice-socket.js";
import { fixtures } from "./fixtures.js";
import { companionService } from "../src/application/companion.js";
const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});
async function setup(allowedOrigins: readonly string[] = []) {
  const data = fixtures();
  const auth = { uid: "user_a", sessionId: "session_user_a" };
  const companion = companionService(data.deps);
  await companion.start(auth, "create-chat", {
    id: "chat_a",
    locale: "en",
    plantId: null,
    photoId: null,
  });
  let resolveClosed!: () => void;
  const connectionClosed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });
  const connected = jest.fn<NonNullable<typeof data.deps.voice.connect>>(
    (_auth, prepare, emit, ended) => {
      void prepare("test-turn", [], new AbortController().signal).then(
        () => emit({ type: "ready" }),
        () => ended(),
      );
      return { receive: jest.fn(), close: jest.fn(() => resolveClosed()) };
    },
  );
  data.deps.voice.connect = connected;
  const server = createServer();
  const relay = attachVoiceSocket(server, data.deps, { allowedOrigins });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("address");
  cleanup.push(async () => {
    relay.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const url = `ws://127.0.0.1:${address.port}/v1/voice/session`;
  return { ...data, connected, connectionClosed, url, companion, auth };
}
test("socket authentication binds conversation/context to the authenticated owner before audio", async () => {
  const { connected, connectionClosed, url } = await setup();
  const ws = new WebSocket(url);
  await once(ws, "open");
  ws.send(
    JSON.stringify({
      type: "authenticate",
      token: "user_a",
      conversationId: "chat_a",
      locale: "en",
    }),
  );
  const [message] = await once(ws, "message");
  expect(JSON.parse(String(message))).toEqual({ type: "ready" });
  expect(connected.mock.calls[0]?.[0]).toEqual({
    uid: "user_a",
    sessionId: "session_user_a",
  });
  ws.close();
  await once(ws, "close");
  await new Promise<void>((resolve) => setImmediate(resolve));
  await connectionClosed;
  expect(connected.mock.results[0]!.value.close).toHaveBeenCalledTimes(1);
});
test.each(["invalid-token", "user_b"])(
  "unauthorized token/conversation %s never becomes a usable voice session",
  async (token) => {
    const { connected, url } = await setup();
    const ws = new WebSocket(url);
    await once(ws, "open");
    const closed = once(ws, "close");
    ws.send(
      JSON.stringify({
        type: "authenticate",
        token,
        conversationId: "chat_a",
        locale: "en",
      }),
    );
    await closed;
    expect(connected).not.toHaveBeenCalled();
  },
);
test("disconnect during identity verification fences late provider connection", async () => {
  const f = await setup();
  let verify!: (auth: typeof f.auth) => void;
  f.deps.identity.verify = async () =>
    new Promise((resolve) => {
      verify = resolve;
    });
  const ws = new WebSocket(f.url);
  await once(ws, "open");
  ws.send(
    JSON.stringify({
      type: "authenticate",
      token: "user_a",
      conversationId: "chat_a",
      locale: "en",
    }),
  );
  while (!verify) await new Promise<void>((resolve) => setImmediate(resolve));
  ws.close();
  await once(ws, "close");
  await new Promise<void>((resolve) => setImmediate(resolve));
  verify(f.auth);
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(f.connected).not.toHaveBeenCalled();
});
test("unexpected browser origins are refused before upgrade", async () => {
  const { url, connected } = await setup();
  const ws = new WebSocket(url, { origin: "https://unrelated.example" });
  const [error] = await once(ws, "error");
  expect(String(error)).toContain("403");
  expect(connected).not.toHaveBeenCalled();
});

test.each([
  "https://phone-preview.example",
  "http://192.168.2.56:8081",
  "https://api.example",
])(
  "configured browser/native WebSocket origin %s can connect but still authenticates",
  async (origin) => {
    const { url, connected } = await setup([origin]);
    const ws = new WebSocket(url, { origin });
    await once(ws, "open");
    expect(connected).not.toHaveBeenCalled();
    const ready = once(ws, "message");
    ws.send(
      JSON.stringify({
        type: "authenticate",
        token: "user_a",
        conversationId: "chat_a",
        locale: "en",
      }),
    );
    expect(JSON.parse(String((await ready)[0]))).toEqual({ type: "ready" });
    ws.close();
    await once(ws, "close");
  },
);
test("live context persists only heard answers and respects transcript opt-out", async () => {
  const f = await setup();
  await f.companion.preferences(f.auth, {
    ...(await f.companion.preferences(f.auth)),
    retainTranscripts: false,
  });
  const turn = await f.companion.prepareLiveVoice(
    f.auth,
    { id: "turn-a", conversationId: "chat_a", locale: "en" },
    [],
    new AbortController().signal,
  );
  const prior = await turn.complete("My fern", "");
  expect(await f.companion.history(f.auth, "chat_a")).toEqual([]);
  const next = await f.companion.prepareLiveVoice(
    f.auth,
    { id: "turn-b", conversationId: "chat_a", locale: "en" },
    prior,
    new AbortController().signal,
  );
  expect(next.history.some((item) => item.text === "My fern")).toBe(true);
});

test("voice messages retain question-before-answer order and fetch only recent context", async () => {
  const f = await setup();
  const recent = jest.spyOn(f.deps.repository, "recent");
  const turn = await f.companion.prepareLiveVoice(
    f.auth,
    { id: "ordered-turn", conversationId: "chat_a", locale: "en" },
    [],
    new AbortController().signal,
  );
  await turn.complete("Question", "Answer");
  expect(
    (await f.companion.history(f.auth, "chat_a")).map((item) => item.role),
  ).toEqual(["user", "assistant"]);
  expect(
    recent.mock.calls.some(
      ([path, , limit]) => path.endsWith("/messages") && limit === 12,
    ),
  ).toBe(true);
});
