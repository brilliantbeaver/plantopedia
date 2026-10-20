import { test } from "node:test";
import assert from "node:assert/strict";
import { vercelWebConfig } from "../../scripts/vercel-web-config.mjs";

const production = {
  CLERK_PUBLISHABLE_KEY: "pk_live_fixture",
  CLERK_PROXY_URL: "https://production.example/__clerk",
};
test("production builds use their explicit live Clerk proxy and API origin", () => {
  assert.deepEqual(vercelWebConfig(production), {
    publishableKey: production.CLERK_PUBLISHABLE_KEY,
    proxyUrl: production.CLERK_PROXY_URL,
    apiBaseUrl: "https://production.example",
  });
  assert.throws(
    () =>
      vercelWebConfig({
        ...production,
        CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
      }),
    /requires a live/,
  );
  assert.throws(
    () => vercelWebConfig({ ...production, CLERK_PROXY_URL: "" }),
    /requires a live/,
  );
});
test("an explicitly configured preview uses development Clerk and its deployment API", () => {
  assert.deepEqual(
    vercelWebConfig({
      VERCEL_ENV: "preview",
      VERCEL_URL: "preview.vercel.app",
      CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
    }),
    {
      publishableKey: "pk_test_fixture",
      proxyUrl: "",
      apiBaseUrl: "https://preview.vercel.app",
    },
  );
  assert.throws(
    () => vercelWebConfig({ VERCEL_ENV: "preview" }),
    /Preview environment/,
  );
});
test("public build configuration rejects credentials, HTTP and ambiguous URL paths", () => {
  for (const value of [
    "http://example.com/__clerk",
    "https://example.com/__clerk?key=secret",
    "https://user:secret@example.com/__clerk",
    "https://example.com/__clerk/",
  ])
    assert.throws(
      () => vercelWebConfig({ ...production, CLERK_PROXY_URL: value }),
      /exact HTTPS/,
    );
  for (const value of [
    "http://example.com",
    "https://example.com/path",
    "https://user:secret@example.com",
  ])
    assert.throws(
      () =>
        vercelWebConfig({
          VERCEL_ENV: "preview",
          CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
          EXPO_PUBLIC_API_BASE_URL: value,
        }),
      /exact HTTPS/,
    );
});
