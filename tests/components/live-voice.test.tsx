import { createLiveVoiceTransport } from "../../src/platform/live-voice";
import { apiClient } from "../../src/services/api";
import type {
  StreamAudio,
  PlayedAudio,
} from "../../src/platform/stream-audio-contract";
import type { VoiceState } from "../../src/platform/voice-contract";
jest.mock("../../src/platform/stream-audio", () => ({
  createStreamAudio: jest.fn(),
}));
class Socket {
  static OPEN = 1;
  readyState = 1;
  bufferedAmount = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  send = jest.fn();
  close = jest.fn();
  constructor(readonly url: string) {
    sockets.push(this);
  }
  frame(event: unknown) {
    this.onmessage?.({ data: JSON.stringify(event) });
  }
}
const sockets: Socket[] = [];
const original = globalThis.WebSocket;
beforeEach(() => {
  sockets.length = 0;
  globalThis.WebSocket = Socket as unknown as typeof WebSocket;
});
afterEach(() => {
  globalThis.WebSocket = original;
});
const tick = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
function setup(start?: StreamAudio["start"]) {
  const api = apiClient(async () => "token");
  jest.spyOn(api, "voiceConnection").mockResolvedValue({
    url: "ws://localhost:3001/v1/voice/session",
    token: "private-token",
  });
  let capture: (data: string) => void = () => {};
  let played: (data: PlayedAudio) => void = () => {};
  const audio: StreamAudio = {
    start: jest.fn(
      start ??
        (async (onAudio) => {
          capture = onAudio;
        }),
    ),
    enqueue: jest.fn(),
    finish: jest.fn(),
    interrupt: jest.fn(async () => ({ itemId: "item-a", ms: 320 })),
    mute: jest.fn(),
    duck: jest.fn(),
    dispose: jest.fn(async () => {}),
  };
  const states: VoiceState[] = [];
  const transport = createLiveVoiceTransport(
    api,
    (state) => states.push(state),
    (callback) => {
      played = callback;
      return audio;
    },
  );
  return {
    transport,
    audio,
    states,
    capture: (data: string) => capture(data),
    played: (data: PlayedAudio) => played(data),
  };
}
test("opens once, authenticates in a frame, streams continuously, and mutes without submitting recordings", async () => {
  const f = setup();
  await f.transport.record("conversation_a", "en");
  const socket = sockets[0]!;
  expect(socket.url).not.toContain("private-token");
  socket.onopen?.();
  expect(JSON.parse(socket.send.mock.calls[0]![0])).toMatchObject({
    type: "authenticate",
    token: "private-token",
  });
  f.capture("AAAAAA==");
  expect(socket.send).toHaveBeenCalledTimes(1);
  socket.frame({ type: "ready" });
  f.capture("AAAAAA==");
  f.capture("AQABAA==");
  expect(socket.send).toHaveBeenCalledTimes(3);
  await f.transport.send();
  f.capture("CCCC");
  expect(f.audio.mute).toHaveBeenCalledWith(true);
  expect(socket.send).toHaveBeenCalledTimes(4);
  await f.transport.disconnect();
  expect(f.audio.dispose).toHaveBeenCalledTimes(1);
  expect(socket.close).toHaveBeenCalledTimes(1);
});
test("streaming playback starts on the first chunk and stays listening after the reply", async () => {
  const f = setup();
  await f.transport.record("conversation_a", "en");
  const socket = sockets[0]!;
  socket.frame({ type: "ready" });
  socket.frame({ type: "audio", itemId: "item-a", data: "AAAAAA==" });
  expect(f.audio.enqueue).toHaveBeenCalledWith("item-a", "AAAAAA==");
  expect(f.states.at(-1)?.playingAudio).toBe(true);
  socket.frame({ type: "audio_done", itemId: "item-a" });
  expect(f.audio.finish).toHaveBeenCalledWith("item-a");
  f.played({ itemId: "item-a", ms: 200 });
  expect(f.states.at(-1)?.phase).toBe("listening");
  expect(f.audio.dispose).not.toHaveBeenCalled();
  await f.transport.disconnect();
});
test("local and server interruption acknowledgements cannot truncate the same reply twice", async () => {
  const f = setup();
  await f.transport.record("conversation_a", "en");
  const socket = sockets[0]!;
  socket.frame({ type: "ready" });
  socket.frame({ type: "audio", itemId: "item-a", data: "AAAAAA==" });
  const interrupt = f.transport.play();
  socket.frame({ type: "interrupt", itemId: "item-a" });
  await interrupt;
  await tick();
  const acknowledgements = socket.send.mock.calls
    .map(([raw]) => JSON.parse(raw))
    .filter((event) => event.type === "played");
  expect(acknowledgements).toEqual([
    { type: "played", itemId: "item-a", ms: 320, interrupted: true },
  ]);
  socket.frame({ type: "audio", itemId: "item-a", data: "AQABAA==" });
  expect(f.audio.enqueue).toHaveBeenCalledTimes(1);
  await f.transport.disconnect();
});
test("ending while microphone permission is pending prevents a late socket or microphone activation", async () => {
  let grant!: () => void;
  const f = setup(
    async () =>
      new Promise<void>((resolve) => {
        grant = resolve;
      }),
  );
  const pending = f.transport.record("conversation_a", "en");
  await f.transport.disconnect();
  grant();
  await pending;
  expect(sockets).toHaveLength(0);
  expect(f.audio.dispose).toHaveBeenCalled();
  expect(f.states.at(-1)?.phase).toBe("idle");
});
test("connection loss closes audio without reconnecting or replaying a user's speech", async () => {
  const f = setup();
  await f.transport.record("conversation_a", "en");
  const socket = sockets[0]!;
  socket.frame({ type: "ready" });
  socket.onclose?.();
  await tick();
  expect(f.audio.dispose).toHaveBeenCalledTimes(1);
  expect(f.states.at(-1)?.phase).toBe("error");
  expect(sockets).toHaveLength(1);
});

test("tool preludes and later audio items play sequentially, and interruption clears every unheard item", async () => {
  const f = setup();
  await f.transport.record("conversation_a", "en");
  const socket = sockets[0]!;
  socket.frame({ type: "ready" });
  socket.frame({ type: "audio", itemId: "item-a", data: "AAAAAA==" });
  socket.frame({ type: "audio_done", itemId: "item-a" });
  socket.frame({ type: "audio", itemId: "item-b", data: "AQABAA==" });
  socket.frame({ type: "audio_done", itemId: "item-b" });
  expect(f.audio.enqueue).toHaveBeenCalledTimes(1);
  socket.frame({
    type: "interrupt",
    itemId: "item-b",
    itemIds: ["item-a", "item-b"],
  });
  await tick();
  const acknowledgements = socket.send.mock.calls
    .map(([raw]) => JSON.parse(raw))
    .filter((event) => event.type === "played");
  expect(acknowledgements).toEqual([
    { type: "played", itemId: "item-a", ms: 320, interrupted: true },
    { type: "played", itemId: "item-b", ms: 0, interrupted: true },
  ]);
  f.played({ itemId: "item-a", ms: 1000 });
  expect(f.audio.enqueue).toHaveBeenCalledTimes(1);
  await f.transport.disconnect();
});
test("completed tool preludes advance to queued reply audio without overlapping outputs", async () => {
  const f = setup();
  await f.transport.record("conversation_a", "en");
  const socket = sockets[0]!;
  socket.frame({ type: "ready" });
  socket.frame({ type: "audio", itemId: "item-a", data: "AAAAAA==" });
  socket.frame({ type: "audio", itemId: "item-b", data: "AQABAA==" });
  socket.frame({ type: "audio_done", itemId: "item-b" });
  f.played({ itemId: "item-a", ms: 200 });
  expect(f.audio.enqueue).toHaveBeenLastCalledWith("item-b", "AQABAA==");
  expect(f.audio.finish).toHaveBeenCalledWith("item-b");
  expect(f.states.at(-1)?.playingAudio).toBe(true);
  await f.transport.disconnect();
});

test("the initial tap can unlock playback before conversation creation without opening the microphone", async () => {
  const f = setup();
  f.audio.prime = jest.fn();
  f.transport.prime?.();
  expect(f.audio.prime).toHaveBeenCalledTimes(1);
  expect(f.audio.start).not.toHaveBeenCalled();
  expect(sockets).toHaveLength(0);
  await f.transport.record("new_conversation", "en");
  expect(f.audio.start).toHaveBeenCalledTimes(1);
  await f.transport.disconnect();
});
