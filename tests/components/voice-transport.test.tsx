import { apiClient } from "../../src/services/api";
import { createVoiceTransport } from "../../src/platform/voice";
import {
  initialVoice,
  type VoiceState,
} from "../../src/platform/voice-contract";
const mockStart = jest.fn(async () => {});
const mockFinish = jest.fn(async () => "encoded-pcm");
const mockCancel = jest.fn(async () => {});
const mockPlay = jest.fn(async () => {});
const mockDispose = jest.fn();
const mockCreatePlayback = jest.fn(() => ({
  play: mockPlay,
  stop: jest.fn(),
  dispose: mockDispose,
}));
jest.mock("../../src/platform/audio", () => ({
  createCapture: () => ({
    start: mockStart,
    finish: mockFinish,
    cancel: mockCancel,
  }),
  createPlayback: (value: string) => mockCreatePlayback(value),
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "turn_fixture" }));
beforeEach(() => {
  jest.clearAllMocks();
  mockStart.mockImplementation(async () => {});
  mockPlay.mockImplementation(async () => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
const flush = async () => {
  for (let i = 0; i < 15; i++) await Promise.resolve();
};
function setup() {
  const api = apiClient(async () => "fixture");
  const start = jest.spyOn(api, "startVoiceTurn").mockResolvedValue({
    id: "turn_fixture",
    status: "complete",
    text: "Green leaves.",
    userText: "Describe the leaves.",
    audioBase64: "reply-audio",
  });
  const poll = jest.spyOn(api, "voiceTurn");
  const cancel = jest
    .spyOn(api, "cancelVoiceTurn")
    .mockResolvedValue({ cancelled: true });
  let state: VoiceState = initialVoice;
  const transport = createVoiceTransport(api, (next) => {
    state = next;
  });
  return { transport, start, poll, cancel, state: () => state };
}
test("recording stays local until Send, stops the mic before dispatch and exposes reply/transcript for playback", async () => {
  const fixture = setup();
  await fixture.transport.record("chat_a", "en");
  expect(fixture.state().phase).toBe("recording");
  expect(fixture.start).not.toHaveBeenCalled();
  await fixture.transport.send();
  expect(mockCancel).toHaveBeenCalled();
  expect(fixture.start).toHaveBeenCalledWith(
    {
      id: "turn_fixture",
      conversationId: "chat_a",
      locale: "en",
      audioBase64: "encoded-pcm",
    },
    "turn_fixture",
    expect.anything(),
  );
  expect(fixture.state()).toMatchObject({
    phase: "ready",
    caption: "Green leaves.",
    userCaption: "Describe the leaves.",
    audioReady: true,
    playingAudio: false,
  });
  await fixture.transport.play();
  expect(mockPlay).toHaveBeenCalledTimes(2);
  await fixture.transport.disconnect();
  expect(mockDispose).toHaveBeenCalled();
  expect(fixture.state()).toEqual(initialVoice);
});
test("long processing is polled without re-uploading/rebilling", async () => {
  jest.useFakeTimers();
  const fixture = setup();
  fixture.start.mockResolvedValue({ id: "turn_fixture", status: "processing" });
  fixture.poll
    .mockResolvedValueOnce({ id: "turn_fixture", status: "processing" })
    .mockResolvedValueOnce({
      id: "turn_fixture",
      status: "complete",
      text: "Reply",
      userText: "Question",
      audioBase64: "audio",
    });
  await fixture.transport.record("chat_a", "fr");
  const sending = fixture.transport.send();
  await flush();
  expect(fixture.state().phase).toBe("processing");
  await jest.advanceTimersByTimeAsync(1601);
  await sending;
  expect(fixture.start).toHaveBeenCalledTimes(1);
  expect(fixture.poll).toHaveBeenCalledTimes(2);
  expect(fixture.state().phase).toBe("ready");
  await fixture.transport.disconnect();
});
test("cancel during permission prevents late microphone activation and sending", async () => {
  let release!: () => void;
  mockStart.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const fixture = setup();
  const recording = fixture.transport.record("chat_a", "en");
  await flush();
  await fixture.transport.disconnect();
  release();
  await recording;
  await fixture.transport.send();
  expect(fixture.state()).toEqual(initialVoice);
  expect(fixture.start).not.toHaveBeenCalled();
  expect(mockCancel).toHaveBeenCalled();
});
test("navigation/account cleanup cancels the known backend turn and ignores a late response", async () => {
  let release!: (
    value: Awaited<ReturnType<ReturnType<typeof apiClient>["startVoiceTurn"]>>,
  ) => void;
  const fixture = setup();
  fixture.start.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  await fixture.transport.record("chat_a", "en");
  const sending = fixture.transport.send();
  await flush();
  await fixture.transport.disconnect();
  expect(fixture.cancel).toHaveBeenCalledWith("turn_fixture");
  release({
    id: "turn_fixture",
    status: "complete",
    text: "Old owner private answer",
    userText: "Old question",
    audioBase64: "audio",
  });
  await sending;
  expect(fixture.state()).toEqual(initialVoice);
  expect(mockCreatePlayback).not.toHaveBeenCalled();
});
test("30-second limit stops recording locally and waits for explicit Send", async () => {
  jest.useFakeTimers();
  const fixture = setup();
  await fixture.transport.record("chat_a", "en");
  await jest.advanceTimersByTimeAsync(30001);
  expect(fixture.state().phase).toBe("recorded");
  expect(mockFinish).toHaveBeenCalledTimes(1);
  expect(fixture.start).not.toHaveBeenCalled();
  await fixture.transport.send();
  expect(fixture.start).toHaveBeenCalledTimes(1);
  await fixture.transport.disconnect();
});
test("rapid record/send clicks create only one recording and paid turn", async () => {
  const fixture = setup();
  await Promise.all([
    fixture.transport.record("chat_a", "en"),
    fixture.transport.record("chat_a", "en"),
  ]);
  expect(mockStart).toHaveBeenCalledTimes(1);
  await Promise.all([fixture.transport.send(), fixture.transport.send()]);
  expect(fixture.start).toHaveBeenCalledTimes(1);
  await fixture.transport.disconnect();
});
test("playback rejection preserves captions and explicit replay", async () => {
  const fixture = setup();
  mockPlay.mockRejectedValueOnce(new Error("autoplay blocked"));
  await fixture.transport.record("chat_a", "en");
  await fixture.transport.send();
  expect(fixture.state()).toMatchObject({
    phase: "ready",
    caption: "Green leaves.",
    playingAudio: false,
    audioReady: true,
  });
  await fixture.transport.play();
  await fixture.transport.disconnect();
});
test("provider failure never automatically retries and clears local audio", async () => {
  const fixture = setup();
  fixture.start.mockRejectedValue(new Error("voice_unavailable"));
  await fixture.transport.record("chat_a", "en");
  await fixture.transport.send();
  expect(fixture.state().phase).toBe("error");
  expect(fixture.start).toHaveBeenCalledTimes(1);
  expect(fixture.cancel).toHaveBeenCalledWith("turn_fixture");
  await fixture.transport.disconnect();
});
