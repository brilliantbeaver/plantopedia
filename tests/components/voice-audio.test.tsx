import { createCapture, createPlayback } from "../../src/platform/audio";
const mockPermission = jest.fn(async () => ({ granted: true }));
const mockNativeStart = jest.fn(async () => {});
const mockStreams: {
  stop: jest.Mock;
  release: jest.Mock;
  buffer: (value: {
    data: ArrayBuffer;
    sampleRate: number;
    channels: number;
  }) => void;
}[] = [];
const mockPlayer = {
  seekTo: jest.fn(async () => {}),
  play: jest.fn(),
  pause: jest.fn(),
  remove: jest.fn(),
  addListener: jest.fn(),
};
const mockDelete = jest.fn();
let mockStatus: (value: { didJustFinish?: boolean; error?: string }) => void;
jest.mock("expo-audio", () => ({
  requestRecordingPermissionsAsync: () => mockPermission(),
  setAudioModeAsync: jest.fn(async () => {}),
  createAudioPlayer: () => mockPlayer,
  AudioModule: {
    AudioStream: class {
      stop = jest.fn();
      release = jest.fn();
      buffer = () => {};
      constructor() {
        mockStreams.push(this);
      }
      start = () => mockNativeStart();
      addListener(_event: string, listener: typeof this.buffer) {
        this.buffer = listener;
        return { remove: jest.fn() };
      }
    },
  },
}));
jest.mock("expo-file-system", () => ({
  Paths: { cache: "cache" },
  File: class {
    uri = "private-reply.wav";
    exists = true;
    write() {}
    delete = mockDelete;
  },
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "synthetic" }));
beforeEach(() => {
  jest.clearAllMocks();
  mockStreams.length = 0;
  mockNativeStart.mockImplementation(async () => {});
  mockPermission.mockImplementation(async () => ({ granted: true }));
  mockPlayer.addListener.mockImplementation((_event, callback) => {
    mockStatus = callback;
    return { remove: jest.fn() };
  });
});
test("native capture normalizes the actual device format and releases its microphone", async () => {
  const capture = createCapture();
  await capture.start();
  const stream = mockStreams[0]!;
  stream.buffer({
    data: new Int16Array(48000).fill(1000).buffer,
    sampleRate: 48000,
    channels: 1,
  });
  const base64 = await capture.finish();
  expect(atob(base64).length).toBe(48000);
  expect(stream.stop).toHaveBeenCalled();
  expect(stream.release).toHaveBeenCalledTimes(1);
  await capture.cancel();
});
test("cancel before permission resolves never creates a microphone stream", async () => {
  let grant!: (value: { granted: boolean }) => void;
  mockPermission.mockImplementation(
    () =>
      new Promise((resolve) => {
        grant = resolve;
      }),
  );
  const capture = createCapture();
  const starting = capture.start();
  await capture.cancel();
  grant({ granted: true });
  await starting;
  expect(mockStreams).toHaveLength(0);
});
test("cancel during native start stops a late stream and releases it once", async () => {
  let release!: () => void;
  mockNativeStart.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const capture = createCapture();
  const starting = capture.start();
  for (let index = 0; index < 10; index++) await Promise.resolve();
  const stream = mockStreams[0]!;
  await capture.cancel();
  expect(stream.release).not.toHaveBeenCalled();
  release();
  await starting;
  expect(stream.stop).toHaveBeenCalled();
  expect(stream.release).toHaveBeenCalledTimes(1);
});
test("native playback surfaces playback errors and removes its private reply file", async () => {
  const playback = createPlayback("synthetic-wav");
  const playing = playback.play();
  await Promise.resolve();
  mockStatus({ error: "decoder failure" });
  await expect(playing).rejects.toThrow("voice_playback_failed");
  playback.dispose();
  expect(mockDelete).toHaveBeenCalled();
  expect(mockPlayer.remove).toHaveBeenCalled();
});
