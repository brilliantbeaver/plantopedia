import { pacedAudio } from "../../src/platform/paced-audio";
import type { StreamAudio } from "../../src/platform/stream-audio-contract";
function setup() {
  const hardware: StreamAudio = {
    start: jest.fn(async () => {}),
    enqueue: jest.fn(),
    finish: jest.fn(),
    interrupt: jest.fn(() => ({ itemId: "reply", ms: 500 })),
    mute: jest.fn(),
    duck: jest.fn(),
    dispose: jest.fn(async () => {}),
  };
  const error = jest.fn();
  const audio = pacedAudio(() => hardware)(jest.fn());
  return { audio, hardware, error };
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(0);
});
afterEach(() => jest.useRealTimers());
test("a 45-second fast reply feeds hardware a small playable lead without a fatal overflow", async () => {
  const { audio, hardware, error } = setup();
  await audio.start(jest.fn(), error);
  audio.enqueue("reply", btoa("\0".repeat(48000 * 45)));
  audio.finish("reply");
  expect(hardware.enqueue).toHaveBeenCalledTimes(10);
  expect(hardware.finish).not.toHaveBeenCalled();
  jest.advanceTimersByTime(45000);
  expect(hardware.enqueue).toHaveBeenCalledTimes(450);
  expect(hardware.finish).toHaveBeenCalledWith("reply");
  expect(error).not.toHaveBeenCalled();
  await audio.dispose();
});
test("interruption drops undispatched audio and late finish markers without replay", async () => {
  const { audio, hardware, error } = setup();
  await audio.start(jest.fn(), error);
  audio.enqueue("reply", btoa("\0".repeat(48000 * 30)));
  audio.finish("reply");
  const first = (hardware.enqueue as jest.Mock).mock.calls.length;
  expect(await audio.interrupt()).toEqual({ itemId: "reply", ms: 500 });
  jest.advanceTimersByTime(60000);
  expect(hardware.enqueue).toHaveBeenCalledTimes(first);
  expect(hardware.finish).not.toHaveBeenCalled();
  await audio.dispose();
});
test("dispose clears pacing timers and still releases the microphone", async () => {
  const { audio, hardware, error } = setup();
  await audio.start(jest.fn(), error);
  audio.enqueue("reply", btoa("\0".repeat(48000 * 30)));
  await audio.dispose();
  const first = (hardware.enqueue as jest.Mock).mock.calls.length;
  jest.advanceTimersByTime(60000);
  expect(hardware.enqueue).toHaveBeenCalledTimes(first);
  expect(hardware.dispose).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});
