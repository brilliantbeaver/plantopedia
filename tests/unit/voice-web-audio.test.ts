import { test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { createCapture, createPlayback } from "../../src/platform/audio.web.js";
const stop = jest.fn();
const getUserMedia = jest.fn<() => Promise<unknown>>();
const decode = jest.fn(async () => ({
  sampleRate: 24000,
  numberOfChannels: 1,
  getChannelData: () => new Float32Array(24000).fill(0.2),
}));
const play = jest.fn(async () => {});
const pause = jest.fn();
const revoke = jest.fn();
const descriptors = new Map<string, PropertyDescriptor | undefined>();
let recorderCount = 0;
function override(name: string, value: unknown) {
  descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { value, configurable: true });
}
beforeEach(() => {
  jest.clearAllMocks();
  recorderCount = 0;
  getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] });
  override("navigator", { mediaDevices: { getUserMedia } });
  override(
    "MediaRecorder",
    class {
      state = "inactive";
      mimeType = "audio/webm";
      listeners = new Map<string, (() => void)[]>();
      constructor() {
        recorderCount++;
      }
      addEventListener(type: string, handler: () => void) {
        this.listeners.set(type, [
          ...(this.listeners.get(type) ?? []),
          handler,
        ]);
      }
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        queueMicrotask(() =>
          this.listeners.get("stop")?.forEach((handler) => handler()),
        );
      }
    },
  );
  override(
    "OfflineAudioContext",
    class {
      decodeAudioData = decode;
    },
  );
  override(
    "Audio",
    class {
      play = play;
      pause = pause;
      addEventListener() {}
      removeAttribute() {}
      load() {}
    },
  );
  jest.spyOn(URL, "createObjectURL").mockReturnValue("blob:reply");
  jest.spyOn(URL, "revokeObjectURL").mockImplementation(revoke);
});
afterEach(() => {
  for (const [key, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  descriptors.clear();
  jest.restoreAllMocks();
});
test("web capture stops every media track before decoding and returns canonical PCM", async () => {
  const capture = createCapture();
  await capture.start();
  const result = await capture.finish();
  expect(stop).toHaveBeenCalledTimes(1);
  expect(decode).toHaveBeenCalled();
  expect(Buffer.from(result, "base64")).toHaveLength(48000);
  await capture.cancel();
});
test("web cancellation stops a stream that arrives after its permission prompt", async () => {
  let grant!: (value: unknown) => void;
  getUserMedia.mockImplementation(
    () =>
      new Promise((resolve) => {
        grant = resolve;
      }),
  );
  const capture = createCapture();
  const starting = capture.start();
  await capture.cancel();
  grant({ getTracks: () => [{ stop }] });
  await starting;
  expect(stop).toHaveBeenCalledTimes(1);
  expect(recorderCount).toBe(0);
});
test("web playback preserves autoplay failure and revokes reply URLs on disposal", async () => {
  play.mockRejectedValueOnce(new Error("NotAllowedError"));
  const playback = createPlayback(Buffer.alloc(44).toString("base64"));
  await expect(playback.play()).rejects.toThrow("voice_playback_failed");
  playback.dispose();
  expect(revoke).toHaveBeenCalledWith("blob:reply");
  expect(pause).toHaveBeenCalled();
});
