import { expect, jest, test } from "@jest/globals";
import request from "supertest";
import sharp from "sharp";
import { z } from "zod";
import { AppError } from "../src/application/errors.js";
import { createApp } from "../src/http/app.js";
import { firebaseOperation } from "../src/storage/availability.js";
import { fixtures } from "./fixtures.js";

test.each([
  ["database", 7, false],
  ["database", 5, false],
  ["database", 14, true],
  ["photo_storage", 404, false],
  ["photo_storage", 403, false],
  ["photo_storage", 503, true],
] as const)(
  "%s failures (%s) keep cloud diagnostics private",
  async (service, code, retryable) => {
    await expect(
      firebaseOperation(service, async () => {
        throw Object.assign(new Error("PRIVATE_DIAGNOSTIC_SENTINEL"), { code });
      }),
    ).rejects.toMatchObject({
      status: 503,
      code: `${service}_unavailable`,
      retryable,
    });
  },
);

test("application conflicts, corrupt records and unknown bugs keep their original errors", async () => {
  const schema = z.string().safeParse(42);
  if (schema.success) throw new Error("invalid fixture");
  const errors = [
    new AppError(409, "photo_content_conflict"),
    schema.error,
    new Error("bug"),
  ];
  for (const error of errors) {
    await expect(
      firebaseOperation("database", async () => {
        throw error;
      }),
    ).rejects.toBe(error);
  }
});

test.each(["database", "photoStorage", "both", "neither"])(
  "readiness reports both dependencies when %s fails; liveness remains independent",
  async (failure) => {
    const { deps } = fixtures();
    if (failure === "database" || failure === "both")
      deps.repository.get = async () => {
        throw new AppError(503, "database_unavailable");
      };
    if (failure === "photoStorage" || failure === "both")
      deps.photos.check = async () => {
        throw new AppError(503, "photo_storage_unavailable");
      };
    const app = createApp(deps);
    const response = await request(app).get("/ready");
    expect(response.status).toBe(failure === "neither" ? 200 : 503);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.checks).toEqual({
      database: ["database", "both"].includes(failure)
        ? "unavailable"
        : "ready",
      photoStorage: ["photoStorage", "both"].includes(failure)
        ? "unavailable"
        : "ready",
    });
    expect((await request(app).get("/health")).status).toBe(200);
  },
);

test("database outages during authentication are service failures, not sign-in failures", async () => {
  const { deps } = fixtures();
  deps.repository.get = () =>
    firebaseOperation("database", async () => {
      throw Object.assign(new Error("PRIVATE_DIAGNOSTIC_SENTINEL"), {
        code: 7,
      });
    });
  const response = await request(createApp(deps))
    .post("/v1/plants")
    .set("Authorization", "Bearer user_a")
    .send({});
  expect(response.status).toBe(503);
  expect(response.body.code).toBe("database_unavailable");
  expect(JSON.stringify(response.body)).not.toContain(
    "PRIVATE_DIAGNOSTIC_SENTINEL",
  );
});

test("a missing bucket fails upload explicitly and the same photo retry recovers after setup", async () => {
  const { deps, files } = fixtures();
  const now = Date.parse("2026-10-18T12:00:00Z");
  deps.now = () => new Date(now);
  const app = createApp(deps);
  const capturedAt = new Date(now).toISOString();
  const post = (route: string, key: string) =>
    request(app)
      .post(route)
      .set("Authorization", "Bearer user_a")
      .set("Idempotency-Key", key);
  expect(
    (
      await post("/v1/plants", "create_a").send({
        id: "plant_a",
        nickname: "Hydrangea",
        place: "",
        ownership: "observed",
        capturedAt,
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await post("/v1/plants/plant_a/observations", "observe_a").send({
        id: "observation_a",
        text: "Flowers",
        capturedAt,
      })
    ).status,
  ).toBe(200);
  const put = deps.photos.put;
  deps.photos.put = jest
    .fn<typeof put>()
    .mockImplementationOnce(() =>
      firebaseOperation("photo_storage", async () => {
        throw Object.assign(new Error("Bucket does not exist"), { code: 404 });
      }),
    )
    .mockImplementation(put);
  const bytes = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#228844" },
  })
    .jpeg()
    .toBuffer();
  const upload = () =>
    post("/v1/plants/plant_a/photos", "photo_a")
      .field("id", "photo_a")
      .field("observationId", "observation_a")
      .field("capturedAt", capturedAt)
      .attach("image", bytes, {
        filename: "plant.jpg",
        contentType: "image/jpeg",
      });
  const failed = await upload();
  expect(failed.status).toBe(503);
  expect(failed.body.code).toBe("photo_storage_unavailable");
  expect(files.size).toBe(0);
  const recovered = await upload();
  expect(recovered.status).toBe(200);
  expect((await upload()).body.id).toBe(recovered.body.id);
  expect(files.size).toBe(1);
});
