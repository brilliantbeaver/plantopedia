export const VOICE_RATE = 24000;
export const MAX_VOICE_SECONDS = 30;
export function bytesToBase64(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 16384)
    parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 16384)));
  return btoa(parts.join(""));
}
// Average channels and source samples before reducing the sample rate.
export function encodePcm(
  channels: readonly Float32Array[],
  sampleRate: number,
): string {
  const sourceLength = channels[0]?.length ?? 0;
  if (
    !channels.length ||
    sampleRate < 8000 ||
    sampleRate > 96000 ||
    channels.some((channel) => channel.length !== sourceLength)
  )
    throw new Error("invalid_voice_audio");
  const frames = Math.min(
    VOICE_RATE * MAX_VOICE_SECONDS,
    Math.floor((sourceLength * VOICE_RATE) / sampleRate),
  );
  if (frames < VOICE_RATE / 4) throw new Error("voice_too_short");
  const bytes = new Uint8Array(frames * 2);
  const output = new DataView(bytes.buffer);
  for (let frame = 0; frame < frames; frame++) {
    const start = Math.floor((frame * sampleRate) / VOICE_RATE);
    const end = Math.max(
      start + 1,
      Math.floor(((frame + 1) * sampleRate) / VOICE_RATE),
    );
    let sum = 0;
    for (const channel of channels)
      for (let index = start; index < end; index++)
        sum += channel[Math.min(index, sourceLength - 1)] ?? 0;
    const sample = Math.max(
      -1,
      Math.min(1, sum / (channels.length * (end - start))),
    );
    output.setInt16(
      frame * 2,
      Math.round(sample * (sample < 0 ? 32768 : 32767)),
      true,
    );
  }
  return bytesToBase64(bytes);
}
