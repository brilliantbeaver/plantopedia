import { test } from "node:test";
import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
import { localWebEnvironment } from "../../scripts/local-web-env.mjs";

const key = `pk_test_${Buffer.from("local-fixture.clerk.accounts.dev$").toString("base64")}`;
const development = {
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: key,
  CLERK_SECRET_KEY: "sk_test_fixture",
};
test("local web switches the entire client/server Clerk identity and API together", () => {
  const env = localWebEnvironment(
    {
      CLERK_SECRET_KEY: "sk_live_do-not-use",
      CLERK_PROXY_URL: "https://production.example/__clerk",
      EXPO_PUBLIC_CLERK_PROXY_URL: "https://production.example/__clerk",
      EXPO_PUBLIC_API_BASE_URL: "https://production.example",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_wrong",
      CLERK_ISSUER_URL: "https://production.example",
      PORT: "3099",
      PLANTOPEDIA_AUTO_START_API: "false",
      PLANTOPEDIA_PHONE_API: "true",
      FIREBASE_PROJECT_ID: "configured-project",
    },
    development,
    {
      PATH: "/bin",
      CLERK_SECRET_KEY: "sk_live_ambient",
      EXPO_PUBLIC_API_BASE_URL: "https://ambient.example",
    },
  );
  assert.equal(env.CLERK_SECRET_KEY, development.CLERK_SECRET_KEY);
  assert.equal(env.CLERK_PUBLISHABLE_KEY, key);
  assert.equal(env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, key);
  assert.equal(
    env.CLERK_ISSUER_URL,
    "https://local-fixture.clerk.accounts.dev",
  );
  assert.equal(env.CLERK_PROXY_URL, "");
  assert.equal(env.EXPO_PUBLIC_CLERK_PROXY_URL, "");
  assert.equal(env.EXPO_PUBLIC_API_BASE_URL, "http://127.0.0.1:3099");
  assert.equal(env.PLANTOPEDIA_AUTO_START_API, "true");
  assert.equal(env.PLANTOPEDIA_PHONE_API, "false");
  assert.equal(env.EXPO_NO_DOTENV, "1");
  assert.equal(env.FIREBASE_PROJECT_ID, "configured-project");
});
test("missing/mixed/live keys and malformed development issuers fail before startup without key disclosure", () => {
  for (const bad of [
    {},
    { ...development, CLERK_SECRET_KEY: "sk_live_private_sentinel" },
    { ...development, EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_wrong" },
    {
      ...development,
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from("user:secret@evil.example$").toString("base64")}`,
    },
  ]) {
    assert.throws(
      () => localWebEnvironment({}, bad),
      (error) =>
        !error.message.includes("private_sentinel") &&
        !error.message.includes("user:secret"),
    );
  }
});
