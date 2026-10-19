import { test, expect, jest } from "@jest/globals";
import { parseConfig } from "../src/config/env.js";
const emitted: unknown[] = [];
let clients = 0;
let failTransport = false;
jest.unstable_mockModule("langsmith", () => ({
  Client: class {
    constructor() {
      clients++;
    }
  },
}));
jest.unstable_mockModule("langsmith/run_trees", () => ({
  RunTree: class {
    constructor(options: Record<string, unknown>) {
      const { client: _, parent_run: __, ...safe } = options;
      emitted.push(safe);
    }
    async postRun() {
      emitted.push({ posted: true });
      if (failTransport) throw new Error("PRIVATE_SENTINEL");
    }
    async end(...args: unknown[]) {
      emitted.push({ end: args });
    }
    async patchRun() {
      emitted.push({ patched: true });
      if (failTransport) throw new Error("PRIVATE_SENTINEL");
    }
  },
}));
const { createTracer } = await import("../src/telemetry/tracer.js");
const base = {
  NODE_ENV: "test",
  CLERK_SECRET_KEY: "fixture",
  CLERK_ISSUER_URL: "https://fixture.example.invalid",
  FIREBASE_PROJECT_ID: "demo-plantopedia",
  FIREBASE_STORAGE_BUCKET: "demo-bucket",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
};
test("disabled manual tracing constructs no SDK client or spans", async () => {
  const count = clients;
  const tracer = createTracer(parseConfig(base));
  expect(await tracer.run("request", async () => 123)).toBe(123);
  await tracer.flush();
  expect(clients).toBe(count);
  expect(emitted).toEqual([]);
});
test("nested success and exception payloads never reach tracing and creation precedes patch", async () => {
  const tracer = createTracer(
    parseConfig({
      ...base,
      LANGSMITH_TRACING: "true",
      LANGSMITH_API_KEY: "synthetic-fixture-key",
    }),
  );
  await expect(
    tracer.run("PRIVATE_SENTINEL", () =>
      tracer.run("request", async () => {
        throw new Error("PRIVATE_SENTINEL");
      }),
    ),
  ).rejects.toThrow("PRIVATE_SENTINEL");
  const result = await tracer.run("request", async () => ({
    secret: { nested: "PRIVATE_SENTINEL" },
  }));
  expect(result.secret.nested).toBe("PRIVATE_SENTINEL");
  await tracer.flush();
  expect(JSON.stringify(emitted)).not.toContain("PRIVATE_SENTINEL");
  expect(
    emitted.findIndex((item) => JSON.stringify(item).includes("posted")),
  ).toBeLessThan(
    emitted.findIndex((item) => JSON.stringify(item).includes("patched")),
  );
});

test("actual span-post/patch failures fail open without serializing private exceptions", async () => {
  failTransport = true;
  try {
    const tracer = createTracer(
      parseConfig({
        ...base,
        LANGSMITH_TRACING: "true",
        LANGSMITH_API_KEY: "synthetic-fixture-key",
      }),
    );
    expect(await tracer.run("request", async () => ({ saved: true }))).toEqual({
      saved: true,
    });
    await expect(tracer.flush()).resolves.toBeUndefined();
    expect(JSON.stringify(emitted)).not.toContain("PRIVATE_SENTINEL");
  } finally {
    failTransport = false;
  }
});
