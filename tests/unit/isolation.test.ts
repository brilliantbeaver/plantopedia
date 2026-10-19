import { test, expect, jest } from "@jest/globals";
const load = jest.fn(() => {
  throw new Error("Root env loader must never run");
});
const dotenv = jest.fn(() => {
  throw new Error("dotenv must never run");
});
const sdk = jest.fn(() => {
  throw new Error("Real SDK factory must never run");
});
jest.unstable_mockModule("../../server/src/config/load-env.js", () => ({
  loadConfig: load,
}));
jest.unstable_mockModule("dotenv", () => ({ config: dotenv }));
jest.unstable_mockModule("../../server/src/storage/firebase.js", () => ({
  createFirebase: sdk,
}));
test("app factory and pure config import do not load files or construct real SDKs", async () => {
  const { parseConfig } = await import("../../server/src/config/env.js");
  const { createApp } = await import("../../server/src/http/app.js");
  const { fixtures } = await import("../../server/tests/fixtures.js");
  const config = parseConfig({
    NODE_ENV: "test",
    ALLOW_LIVE_PROVIDERS: "false",
    CLERK_SECRET_KEY: "fixture",
    CLERK_ISSUER_URL: "https://fixture.example.invalid",
    FIREBASE_PROJECT_ID: "demo-plantopedia",
    FIREBASE_STORAGE_BUCKET: "demo-bucket",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
  });
  expect(config.ALLOW_LIVE_PROVIDERS).toBe(false);
  expect(createApp(fixtures().deps)).toBeDefined();
  expect(load).not.toHaveBeenCalled();
  expect(dotenv).not.toHaveBeenCalled();
  expect(sdk).not.toHaveBeenCalled();
});
