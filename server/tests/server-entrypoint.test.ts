import { once } from "node:events";
import { Server } from "node:http";
import { afterAll, expect, jest, test } from "@jest/globals";
import request from "supertest";
import WebSocket from "ws";
import { parseConfig } from "../src/config/env.js";
import { fixtures } from "./fixtures.js";

const fixture = fixtures();
const config = parseConfig({
  NODE_ENV: "production",
  USE_FIREBASE_EMULATORS: "false",
  FIREBASE_PROJECT_ID: "entrypoint-test",
  FIREBASE_STORAGE_BUCKET: "entrypoint-test.invalid",
  CLERK_SECRET_KEY: "unused-test-secret",
  CLERK_ISSUER_URL: "https://clerk.example.com",
  CLERK_PUBLISHABLE_KEY: `pk_live_${Buffer.from("clerk.example.com$").toString("base64")}`,
  CLERK_PROXY_URL: "https://example.com/__clerk",
});
jest.unstable_mockModule("../src/config/load-env.js", () => ({
  loadConfig: () => config,
}));
jest.unstable_mockModule("../src/storage/firebase.js", () => ({
  createFirebase: () => ({
    repository: fixture.deps.repository,
    photos: fixture.deps.photos,
  }),
}));
jest.unstable_mockModule("../src/http/identity.js", () => ({
  createIdentity: () => fixture.deps.identity,
}));

const listen = jest.spyOn(Server.prototype, "listen");
const interval = jest.spyOn(globalThis, "setInterval");
const initialSignals = [
  process.listenerCount("SIGTERM"),
  process.listenerCount("SIGINT"),
];
// Exercise the actual Vercel entrypoint with fake external dependencies only.
// The Express routes, HTTP server and voice WebSocket handler remain real.
const { default: server, runtime } = await import("../src/server.js");
const importListenCount = listen.mock.calls.length;
const importWorkerTimers = interval.mock.calls.filter(
  (call) => call[1] === 5000,
).length;
listen.mockRestore();
interval.mockRestore();

afterAll(async () => {
  runtime.voiceSocket.close();
  await runtime.dependencies.voice.shutdown();
  server.closeAllConnections();
  if (server.listening)
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

test("import exports a host-owned HTTP server without standalone lifecycle effects", () => {
  expect(server).toBeInstanceOf(Server);
  expect(importListenCount).toBe(0);
  expect(importWorkerTimers).toBe(0);
  expect([
    process.listenerCount("SIGTERM"),
    process.listenerCount("SIGINT"),
  ]).toEqual(initialSignals);
  expect(server.listenerCount("upgrade")).toBe(1);
});

test("exported server preserves health, readiness, security headers and Clerk boundary", async () => {
  const health = await request(server).get("/health");
  expect(health.status).toBe(200);
  expect(health.body).toEqual({ status: "ok", service: "plantopedia-api" });
  expect(health.headers["x-powered-by"]).toBeUndefined();
  expect((await request(server).get("/ready")).status).toBe(200);
  const unauthorized = await request(server).get("/v1/plants");
  expect(unauthorized.status).toBe(401);
  expect(unauthorized.headers["cache-control"]).toBe("private, no-store");
  const authorized = await request(server)
    .get("/v1/plants")
    .set("Authorization", "Bearer user_a");
  expect(authorized.status).toBe(200);
  expect(authorized.body.items).toEqual([]);
});

test("entrypoint routes Clerk before API JSON parsing and bearer authentication", async () => {
  const upstream = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("ok"));
  try {
    const response = await request(server)
      .post("/__clerk/v1/client/sign_ins")
      .set("Content-Type", "application/json")
      .send('{"identifier":"fixture@example.com"}');
    expect(response.status).toBe(200);
    expect(await new Response(upstream.mock.calls[0]![1]?.body).text()).toBe(
      '{"identifier":"fixture@example.com"}',
    );
  } finally {
    upstream.mockRestore();
  }
});

test("exported HTTP server retains WebSocket upgrades and refuses an unauthenticated session", async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("address");
  const ws = new WebSocket(`ws://127.0.0.1:${address.port}/v1/voice/session`);
  try {
    await once(ws, "open");
    const message = once(ws, "message");
    const closed = once(ws, "close");
    ws.send(
      JSON.stringify({
        type: "authenticate",
        token: "forged",
        conversationId: "chat_a",
        locale: "en",
      }),
    );
    expect(JSON.parse(String((await message)[0]))).toEqual({
      type: "error",
      code: "unauthorized",
    });
    await closed;
  } finally {
    ws.terminate();
  }
});

test("standalone drain control rejects new HTTP work and is idempotent", async () => {
  expect(runtime.beginDrain()).toBe(true);
  expect(runtime.beginDrain()).toBe(false);
  expect(runtime.isDraining()).toBe(true);
  expect((await request(server).get("/health")).status).toBe(503);
});
