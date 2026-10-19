import { expect, test } from "@jest/globals";
import { setTimeout as delay } from "node:timers/promises";
import request from "supertest";
import { readinessCheck } from "../src/http/readiness.js";
import { createApp } from "../src/http/app.js";
import { firebaseOperation } from "../src/storage/availability.js";
import { fixtures } from "./fixtures.js";

test("timed-out and concurrent polls share the pending SDK request; late completion recovers", async () => {
  let finish!: () => void;
  let calls = 0;
  const check = readinessCheck(() => {
    calls++;
    return new Promise<void>((resolve) => {
      finish = resolve;
    });
  }, 10);
  // Keep the test alive while the production response timers are unref'd.
  const keepAlive = delay(100);
  const first = await Promise.all([check(), check(), check()]);
  expect(first).toEqual(
    Array(3).fill({ status: "unavailable", reason: "timeout" }),
  );
  expect(await check()).toEqual({ status: "unavailable", reason: "timeout" });
  expect(calls).toBe(1);
  const recovering = check();
  finish();
  expect(await recovering).toEqual({ status: "ready" });
  const next = check();
  await Promise.resolve();
  finish();
  expect(await next).toEqual({ status: "ready" });
  expect(calls).toBe(2);
  await keepAlive;
});

test.each([
  ["database", 16, "credentials"],
  ["photo_storage", "app/invalid-credential", "credentials"],
  ["database", 7, "permission_denied"],
  ["database", 5, "not_found"],
  ["database", 4, "timeout"],
  ["photo_storage", 403, "permission_denied"],
  ["photo_storage", 404, "not_found"],
  ["photo_storage", 429, "rate_limited"],
  ["photo_storage", 503, "upstream"],
  ["photo_storage", "ETIMEDOUT", "timeout"],
  ["photo_storage", "ENOTFOUND", "network"],
] as const)(
  "readiness exposes safe %s/%s reason %s and recovers",
  async (service, code, reason) => {
    const { deps } = fixtures();
    let failing = true;
    const work = async () => {
      if (failing)
        await firebaseOperation(service, async () => {
          throw Object.assign(new Error("PRIVATE_DIAGNOSTIC_SENTINEL"), {
            code,
          });

          test("unexpected SDK failures remain private and a later probe can recover", async () => {
            let failing = true;
            const check = readinessCheck(() => {
              if (failing) throw new Error("PRIVATE_DIAGNOSTIC_SENTINEL");
              return Promise.resolve();
            });
            expect(await check()).toEqual({
              status: "unavailable",
              reason: "unknown",
            });
            failing = false;
            expect(await check()).toEqual({ status: "ready" });
          });
        });
      return null;
    };
    if (service === "database") deps.repository.get = work;
    else
      deps.photos.check = async () => {
        await work();
      };
    const app = createApp(deps);
    const response = await request(app).get("/ready");
    expect(response.status).toBe(503);
    expect(response.body.reasons).toEqual({
      [service === "database" ? "database" : "photoStorage"]: reason,
    });
    expect(JSON.stringify(response.body)).not.toContain(
      "PRIVATE_DIAGNOSTIC_SENTINEL",
    );
    failing = false;
    const recovered = await request(app).get("/ready");
    expect(recovered.status).toBe(200);
    expect(recovered.body.reasons).toEqual({});
  },
);
