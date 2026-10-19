import type { VoiceSettings } from "@plantopedia/contracts";

// Quiet synthesized weather texture, mixed only into outgoing speech. No
// recordings, downloads, microphone changes or extra provider calls.
export function voiceAmbience(kind: VoiceSettings["ambience"]) {
  let low = 0;
  let phase = 0;
  return (base64: string): string => {
    if (kind === "off") return base64;
    const pcm = Buffer.from(base64, "base64");
    for (let i = 0; i + 1 < pcm.length; i += 2) {
      const white = Math.random() * 2 - 1;
      low = 0.985 * low + 0.015 * white;
      phase += 1 / 24000;
      const texture =
        kind === "rain"
          ? (white * 0.65 + low * 2) * 110
          : low * (1.5 + Math.sin(phase * 0.7) * 0.5) * 450;
      pcm.writeInt16LE(
        Math.max(
          -32768,
          Math.min(32767, Math.round(pcm.readInt16LE(i) + texture)),
        ),
        i,
      );
    }
    return pcm.toString("base64");
  };
}
