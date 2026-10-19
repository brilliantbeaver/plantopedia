import { expect, test } from "@jest/globals";
import {
  Candidate,
  Identify,
  lowEvidence,
  normalizeSearch,
  providerLanguage,
} from "@plantopedia/contracts";
import { parseConfig } from "../../server/src/config/env.js";
import { assertMetadataFree } from "../../src/features/capture/metadata.js";
import sharp from "sharp";
const candidate = (score: number) =>
  Candidate.parse({
    scientificName: "Acer rubrum",
    authorship: "L.",
    commonNames: [],
    score,
    taxonId: null,
  });
test("uncertainty thresholds and provider scores remain distinct", () => {
  expect(lowEvidence([])).toBe(true);
  expect(lowEvidence([candidate(0.59)])).toBe(true);
  expect(lowEvidence([candidate(0.8), candidate(0.7)])).toBe(true);
  expect(lowEvidence([candidate(0.8), candidate(0.2)])).toBe(false);
  expect(() => candidate(NaN)).toThrow();
});
test("organ/image validation and locale mapping", () => {
  expect(
    Identify.safeParse({
      photoIds: ["one", "two"],
      organs: ["leaf"],
      locale: "en",
    }).success,
  ).toBe(false);
  expect(providerLanguage("ko")).toBe("en");
  expect(providerLanguage("zh-Hans")).toBe("zh");
  expect(normalizeSearch(" Ａcer ")).toBe("acer");
});
const env = {
  NODE_ENV: "test",
  CLERK_SECRET_KEY: "fixture",
  CLERK_ISSUER_URL: "https://fixture.clerk.accounts.dev",
  FIREBASE_PROJECT_ID: "demo-plantopedia",
  FIREBASE_STORAGE_BUCKET: "demo-bucket",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
};
test("pure configuration parses false exactly, never inherits live flags", () => {
  process.env.ALLOW_LIVE_PROVIDERS = "true";
  const config = parseConfig({ ...env, ALLOW_LIVE_PROVIDERS: "false" });
  expect(config.ALLOW_LIVE_PROVIDERS).toBe(false);
  expect(config.NODE_ENV).toBe("test");
  delete process.env.ALLOW_LIVE_PROVIDERS;
});
test("emulator/real conflicts and missing secrets fail using names only", () => {
  expect(() =>
    parseConfig({ ...env, USE_FIREBASE_EMULATORS: "false" }),
  ).toThrow("Remove emulator hosts");
  expect(() => parseConfig({ ...env, ALLOW_LIVE_PROVIDERS: "true" })).toThrow(
    "PLANTNET_API_KEY",
  );
  expect(() =>
    parseConfig({ ...env, FIREBASE_PROJECT_ID: "production" }),
  ).toThrow("Invalid emulator");
});
test("derivative metadata guard rejects EXIF, comments and inspection errors before upload", async () => {
  const jpeg = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "green" },
  })
    .jpeg()
    .toBuffer();
  expect(() => assertMetadataFree(jpeg)).not.toThrow();
  const exif = Buffer.concat([
    jpeg.subarray(0, 2),
    Buffer.from([0xff, 0xe1, 0, 8, 69, 120, 105, 102, 0, 0]),
    jpeg.subarray(2),
  ]);
  expect(() => assertMetadataFree(exif)).toThrow("metadata_detected");
  const comment = Buffer.concat([
    jpeg.subarray(0, 2),
    Buffer.from([0xff, 0xfe, 0, 4, 65, 66]),
    jpeg.subarray(2),
  ]);
  expect(() => assertMetadataFree(comment)).toThrow("metadata_detected");
  expect(() => assertMetadataFree(new Uint8Array(2))).toThrow();
});
