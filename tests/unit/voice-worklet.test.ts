import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test, expect } from "@jest/globals";
function worklet(rate: number) {
  type CaptureInstance = {
    process(inputs: Float32Array[][]): boolean;
    port: { onmessage(event: { data: { muted: boolean } }): void };
  };
  let Capture: new () => CaptureInstance;
  const frames: ArrayBuffer[] = [];
  vm.runInNewContext(readFileSync("public/voice-capture.js", "utf8"), {
    sampleRate: rate,
    AudioWorkletProcessor: class {
      port = {
        onmessage: (_: unknown) => {},
        postMessage: (data: ArrayBuffer) => frames.push(data),
      };
    },
    registerProcessor: (_: string, type: unknown) => {
      Capture = type as new () => CaptureInstance;
    },
  });
  return { capture: new Capture!(), frames };
}
test.each([24000, 44100, 48000])(
  "PCM streaming preserves duration/amplitude across 128-frame boundaries at %i Hz",
  (rate) => {
    const { capture, frames } = worklet(rate);
    for (let i = 0; i < rate; i += 128)
      capture.process([[new Float32Array(Math.min(128, rate - i)).fill(0.5)]]);
    expect(frames).toHaveLength(50);
    expect(frames.reduce((sum, frame) => sum + frame.byteLength, 0)).toBe(
      48000,
    );
    expect(new DataView(frames[0]!).getInt16(0, true)).toBe(16384);
  },
);
test("muting flushes partial microphone audio so it cannot leak into the next turn", () => {
  const { capture, frames } = worklet(24000);
  capture.process([[new Float32Array(300).fill(0.5)]]);
  capture.port.onmessage({ data: { muted: true } });
  capture.process([[new Float32Array(1000).fill(0.5)]]);
  expect(frames).toHaveLength(0);
  capture.port.onmessage({ data: { muted: false } });
  capture.process([[new Float32Array(480).fill(0.25)]]);
  expect(frames).toHaveLength(1);
  expect(new DataView(frames[0]!).getInt16(0, true)).toBe(8192);
});
