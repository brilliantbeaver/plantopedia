import { test, expect } from "@jest/globals";
import {
  Preferences,
  defaultPreferences,
  defaultVoiceSettings,
} from "@plantopedia/contracts";
import { companionService } from "../src/application/companion.js";
import { voiceAmbience } from "../src/providers/voice-ambience.js";
import { fixtures } from "./fixtures.js";
const auth = { uid: "user_a", sessionId: "session_a" };
test("existing preference records gain defaults, while unknown or unsupported voice settings are rejected", () => {
  expect(
    Preferences.parse({ theme: "light", locale: "en", retainTranscripts: true })
      .voice,
  ).toEqual(defaultVoiceSettings);
  expect(
    Preferences.safeParse({
      ...defaultPreferences,
      voice: { voice: "unavailable" },
    }).success,
  ).toBe(false);
  expect(
    Preferences.safeParse({ ...defaultPreferences, voice: { stability: 1 } })
      .success,
  ).toBe(false);
});
test("owner preferences survive a service restart and reach prepared voice sessions", async () => {
  const { deps } = fixtures();
  const service = companionService(deps);
  await service.start(auth, "start_chat", {
    id: "chat_a",
    plantId: null,
    photoId: null,
    locale: "en",
  });
  const settings = {
    ...defaultVoiceSettings,
    voice: "cedar" as const,
    ambience: "breeze" as const,
    interruption: "firm" as const,
  };
  await service.preferences(auth, { ...defaultPreferences, voice: settings });
  const restarted = companionService(deps);
  expect((await restarted.preferences(auth)).voice).toEqual(settings);
  expect(
    (
      await restarted.prepareLiveVoice(
        auth,
        { id: "turn_a", conversationId: "chat_a", locale: "en" },
        [],
        new AbortController().signal,
      )
    ).voice,
  ).toEqual(settings);
});
test.each(["rain", "breeze"] as const)(
  "%s ambience preserves PCM duration, stays quiet and cannot overflow",
  (kind) => {
    const quiet = Buffer.alloc(48000);
    const decorated = Buffer.from(
      voiceAmbience(kind)(quiet.toString("base64")),
      "base64",
    );
    expect(decorated.length).toBe(quiet.length);
    let energy = 0;
    for (let i = 0; i < decorated.length; i += 2) {
      const sample = decorated.readInt16LE(i);
      energy += sample * sample;
      expect(Math.abs(sample)).toBeLessThan(1000);
    }
    expect(energy).toBeGreaterThan(0);
    const loud = Buffer.alloc(4800);
    for (let i = 0; i < loud.length; i += 2)
      loud.writeInt16LE(i % 4 ? 32767 : -32768, i);
    expect(
      Buffer.from(voiceAmbience(kind)(loud.toString("base64")), "base64")
        .length,
    ).toBe(loud.length);
  },
);
test("ambience off leaves provider audio byte-for-byte unchanged", () => {
  const input = Buffer.from([1, 2, 3, 4]).toString("base64");
  expect(voiceAmbience("off")(input)).toBe(input);
});
