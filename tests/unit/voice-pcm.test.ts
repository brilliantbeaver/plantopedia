import { test, expect } from "@jest/globals";
import { encodePcm } from "../../src/features/voice/pcm.js";
test("resamples stereo 48 kHz audio into little-endian mono PCM16 at 24 kHz", () => {
  const left = new Float32Array(48000).fill(1);
  const right = new Float32Array(48000).fill(-0.5);
  const bytes = Buffer.from(encodePcm([left, right], 48000), "base64");
  expect(bytes.length).toBe(48000);
  expect(bytes.readInt16LE(0)).toBe(8192);
});
test("bounds a long recording, clips peaks and rejects empty/too-short audio", () => {
  const bytes = Buffer.from(
    encodePcm([new Float32Array(24000 * 32).fill(-2)], 24000),
    "base64",
  );
  expect(bytes.length).toBe(1440000);
  expect(bytes.readInt16LE(0)).toBe(-32768);
  expect(() => encodePcm([], 24000)).toThrow();
  expect(() => encodePcm([new Float32Array(100)], 24000)).toThrow(
    "voice_too_short",
  );
});
