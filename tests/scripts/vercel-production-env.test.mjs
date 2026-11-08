import { test } from "node:test";
import assert from "node:assert/strict";
import { productionEnvironment } from "../../scripts/vercel-production-env.mjs";
const origin = "https://plants.example.test";
const input = {
  CLERK_SECRET_KEY: "sk_live_fixture",
  CLERK_PUBLISHABLE_KEY: "pk_live_fixture",
  CLERK_PROXY_URL: origin + "/__clerk",
  CLERK_ISSUER_URL: origin + "/__clerk",
  FIREBASE_PRIVATE_KEY: "fixture_pem",
  KINDWISE_PLANTID_API_KEY: "fixture_plant",
  KINDWISE_INSECTID_API_KEY: "fixture_bug",
  VERCEL_API_TOKEN: "do_not_upload",
  GOOGLE_CLIENT_SECRET: "managed_in_clerk",
  EXPO_PUBLIC_API_KEY: "do_not_upload",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  USE_FIREBASE_EMULATORS: "true",
  NODE_ENV: "development",
  LANGSMITH_HIDE_INPUTS: "false",
  LANGSMITH_PROJECT: "plantopedia-local",
};
test("production allowlist scopes server secrets, excludes deployment/mobile/Google credentials and overrides unsafe local flags", () => {
  const env = productionEnvironment(input, origin),
    values = Object.fromEntries(env.map((v) => [v.key, v.value]));
  for (const key of [
    "VERCEL_API_TOKEN",
    "GOOGLE_CLIENT_SECRET",
    "EXPO_PUBLIC_API_KEY",
    "FIRESTORE_EMULATOR_HOST",
  ])
    assert.equal(key in values, false);
  assert.equal(values.NODE_ENV, "production");
  assert.equal(values.USE_FIREBASE_EMULATORS, "false");
  assert.equal(values.LANGSMITH_HIDE_INPUTS, "true");
  assert.equal(values.LANGSMITH_PROJECT, "plantopedia-production");
  assert.equal(values.ALLOW_PUBLIC_IDENTIFICATION, "false");
  for (const key of [
    "CLERK_SECRET_KEY",
    "FIREBASE_PRIVATE_KEY",
    "KINDWISE_PLANTID_API_KEY",
    "KINDWISE_INSECTID_API_KEY",
  ]) {
    const v = env.find((v) => v.key === key);
    assert.equal(v.type, "sensitive");
    assert.deepEqual(v.target, ["production"]);
  }
});
test("development identities or a different proxy origin cannot silently overwrite production", () => {
  assert.throws(
    () =>
      productionEnvironment(
        { ...input, CLERK_SECRET_KEY: "sk_test_fixture" },
        origin,
      ),
    /live Clerk/,
  );
  assert.throws(
    () =>
      productionEnvironment(
        { ...input, CLERK_PROXY_URL: "http://localhost:8081" },
        origin,
      ),
    /proxy/,
  );
});
