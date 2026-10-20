import { generateKeyPairSync } from "node:crypto";
import { expect, test } from "@jest/globals";
import { parseConfig } from "../../server/src/config/env.js";

const env = {
  NODE_ENV: "test",
  CLERK_SECRET_KEY: "fixture-secret",
  CLERK_ISSUER_URL: "https://fixture.clerk.accounts.dev",
  FIREBASE_PROJECT_ID: "demo-plantopedia",
  FIREBASE_STORAGE_BUCKET: "demo-bucket",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
};

test("Clerk proxy configuration requires a matching publishable key and exact HTTPS path", () => {
  const proxy = "https://plantopedia-nine.vercel.app/__clerk";
  expect(() => parseConfig({ ...env, CLERK_PROXY_URL: proxy })).toThrow(
    "requires CLERK_PUBLISHABLE_KEY",
  );
  const key = "pk_live_Zml4dHVyZSQ=";
  expect(
    parseConfig({ ...env, CLERK_PROXY_URL: proxy, CLERK_PUBLISHABLE_KEY: key })
      .CLERK_PROXY_URL,
  ).toBe(proxy);
  for (const invalid of [
    "http://example.com/__clerk",
    "https://example.com/",
    `${proxy}/`,
    `${proxy}?token=private`,
    "https://user:private@example.com/__clerk",
  ]) {
    expect(() =>
      parseConfig({
        ...env,
        CLERK_PROXY_URL: invalid,
        CLERK_PUBLISHABLE_KEY: key,
      }),
    ).toThrow("Invalid configuration: CLERK_PROXY_URL");
  }
});

test("browser origins are optional, bounded and parsed as exact origins", () => {
  expect(parseConfig(env).WEB_ALLOWED_ORIGINS).toEqual([]);
  expect(
    parseConfig({
      ...env,
      WEB_ALLOWED_ORIGINS:
        " https://preview.example, http://192.168.2.56:8081 ",
    }).WEB_ALLOWED_ORIGINS,
  ).toEqual(["https://preview.example", "http://192.168.2.56:8081"]);
  expect(() =>
    parseConfig({
      ...env,
      WEB_ALLOWED_ORIGINS: Array(17).fill("https://preview.example").join(","),
    }),
  ).toThrow("WEB_ALLOWED_ORIGINS");
});

test.each([
  "*",
  "https://*.example.com",
  "null",
  "https://preview.example/",
  "https://preview.example/path",
  "https://user:secret@preview.example",
  "file://preview.example",
])("rejects non-origin allowlist entry %s", (origin) => {
  expect(() => parseConfig({ ...env, WEB_ALLOWED_ORIGINS: origin })).toThrow(
    "WEB_ALLOWED_ORIGINS",
  );
});

test.each([
  "https://fixture.clerk.accounts.dev",
  "https://clerk.example.com",
  "https://app.example.com/__clerk",
])("accepts the exact HTTPS Clerk issuer %s", (issuer) => {
  expect(
    parseConfig({ ...env, CLERK_ISSUER_URL: issuer }).CLERK_ISSUER_URL,
  ).toBe(issuer);
});

test.each([
  undefined,
  "",
  "fixture.clerk.accounts.dev",
  "http://fixture.clerk.accounts.dev",
  "https://fixture.clerk.accounts.dev/",
  "https://fixture.clerk.accounts.dev/path",
  "https://app.example.com/__clerk/",
  "https://app.example.com/__clerk/extra",
  "https://app.example.com/__clerk?query=value",
  "https://app.example.com/__clerk#fragment",
  "https://user:private-value@app.example.com/__clerk",
  "https://fixture.clerk.accounts.dev?query=value",
  "https://fixture.clerk.accounts.dev#fragment",
  "https://user:private-value@fixture.clerk.accounts.dev",
  " https://fixture.clerk.accounts.dev ",
])(
  "explains invalid Clerk issuer configuration without echoing it: %s",
  (issuer) => {
    let error: unknown;
    try {
      parseConfig({ ...env, CLERK_ISSUER_URL: issuer });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain("Invalid configuration: CLERK_ISSUER_URL");
    expect(message).toContain("https://");
    expect(message).toContain("no trailing slash");
    expect(message).not.toContain("fixture.clerk.accounts.dev");
    expect(message).not.toContain("private-value");
    expect(message).not.toContain(env.CLERK_SECRET_KEY);
  },
);

test("reports other invalid fields alongside the Clerk issuer guidance", () => {
  expect(() =>
    parseConfig({ ...env, PORT: "0", CLERK_ISSUER_URL: "missing-scheme" }),
  ).toThrow("Invalid configuration: PORT, CLERK_ISSUER_URL");
});

test.each([
  ["FIREBASE_PROJECT_ID", "private-hosted-project", "must start with demo-"],
  ["FIRESTORE_EMULATOR_HOST", "http://127.0.0.1:8080", "127.0.0.1:PORT"],
  ["FIREBASE_STORAGE_EMULATOR_HOST", "", "127.0.0.1:PORT"],
])("identifies only the invalid emulator field: %s", (field, value, hint) => {
  let error: unknown;
  try {
    parseConfig({ ...env, [field]: value });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(Error);
  const message = (error as Error).message;
  expect(message).toContain(`Invalid emulator configuration: ${field}`);
  expect(message).toContain(hint);
  expect(message).not.toContain("private-hosted-project");
  for (const other of [
    "FIREBASE_PROJECT_ID",
    "FIRESTORE_EMULATOR_HOST",
    "FIREBASE_STORAGE_EMULATOR_HOST",
  ]) {
    if (other !== field) expect(message).not.toContain(other);
  }
});

test("hosted Firebase mode requires an explicit switch and empty emulator hosts", () => {
  const hosted = {
    ...env,
    USE_FIREBASE_EMULATORS: "false",
    FIREBASE_PROJECT_ID: "fixture-hosted-project",
    FIRESTORE_EMULATOR_HOST: "",
    FIREBASE_STORAGE_EMULATOR_HOST: "",
  };
  expect(parseConfig(hosted).USE_FIREBASE_EMULATORS).toBe(false);
  expect(() =>
    parseConfig({ ...hosted, FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" }),
  ).toThrow("Remove emulator hosts in real Firebase mode");
});

const hosted = {
  ...env,
  USE_FIREBASE_EMULATORS: "false",
  FIREBASE_PROJECT_ID: "fixture-hosted-project",
  FIRESTORE_EMULATOR_HOST: "",
  FIREBASE_STORAGE_EMULATOR_HOST: "",
};
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

test.each(["FIRESTORE_EMULATOR_HOST", "FIREBASE_STORAGE_EMULATOR_HOST"])(
  "hosted mode identifies the conflicting emulator setting: %s",
  (field) => {
    expect(() => parseConfig({ ...hosted, [field]: "127.0.0.1:9090" })).toThrow(
      `Remove emulator hosts in real Firebase mode: ${field}`,
    );
  },
);

test.each([privateKey, privateKey.replace(/\n/g, "\\n")])(
  "hosted mode accepts a valid RSA private key with real or escaped newlines",
  (value) => {
    expect(
      parseConfig({
        ...hosted,
        FIREBASE_CLIENT_EMAIL: "fixture@example.invalid",
        FIREBASE_PRIVATE_KEY: value,
      }).FIREBASE_PRIVATE_KEY,
    ).toBe(value);
  },
);

test.each([
  { FIREBASE_CLIENT_EMAIL: "fixture@example.invalid" },
  { FIREBASE_PRIVATE_KEY: privateKey },
])("hosted mode rejects incomplete service-account credentials", (values) => {
  expect(() => parseConfig({ ...hosted, ...values })).toThrow(
    "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must be set together",
  );
});

test("hosted mode reports host conflicts and an invalid private key together, without values", () => {
  const invalidKey = "0123456789abcdef0123456789abcdef01234567";
  let error: unknown;
  try {
    parseConfig({
      ...hosted,
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
      FIREBASE_CLIENT_EMAIL: "private-identity@example.invalid",
      FIREBASE_PRIVATE_KEY: invalidKey,
    });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(Error);
  const message = (error as Error).message;
  expect(message).toContain("FIRESTORE_EMULATOR_HOST");
  expect(message).toContain("FIREBASE_STORAGE_EMULATOR_HOST");
  expect(message).toContain("FIREBASE_PRIVATE_KEY");
  expect(message).toContain("private_key_id");
  expect(message).not.toContain(invalidKey);
  expect(message).not.toContain("private-identity@example.invalid");
});

test("hosted mode rejects a valid non-RSA key before SDK initialization", () => {
  const { privateKey: nonRsaKey } = generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  expect(() =>
    parseConfig({
      ...hosted,
      FIREBASE_CLIENT_EMAIL: "fixture@example.invalid",
      FIREBASE_PRIVATE_KEY: nonRsaKey,
    }),
  ).toThrow("FIREBASE_PRIVATE_KEY");
});

test("voice configuration defaults to and accepts only the requested Realtime model", () => {
  expect(parseConfig(env).OPENAI_REALTIME_MODEL).toBe("gpt-realtime-2.1");
  expect(
    parseConfig({ ...env, OPENAI_REALTIME_MODEL: "gpt-realtime-2.1" })
      .OPENAI_REALTIME_MODEL,
  ).toBe("gpt-realtime-2.1");
  expect(() =>
    parseConfig({ ...env, OPENAI_REALTIME_MODEL: "gpt-live-1" }),
  ).toThrow("OPENAI_REALTIME_MODEL");
});
