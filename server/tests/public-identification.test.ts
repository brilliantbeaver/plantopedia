import { jest } from "@jest/globals";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/http/app.js";
import { fixtures } from "./fixtures.js";
import { withAnimalFallback } from "../src/providers/identification-fallback.js";
import { AppError } from "../src/application/errors.js";
import { accountService } from "../src/application/accounts.js";
const result = {
  id: "operation_123",
  provider: "test_only",
  scientificName: "Apis mellifera",
  commonName: "Honey bee",
  speciesId: "animal:test:bee",
  score: 0.9,
  verdict: "pollinator" as const,
  canSting: "yes" as const,
  plants: ["ncsu_helianthus_annuus"],
  fact: null,
  sourceUrl: null,
};
test("spoofed proxy headers cannot evade authenticated image rate limiting or produce proxy validation errors", async () => {
  const priorVercel = process.env.VERCEL;
  delete process.env.VERCEL;
  const f = fixtures();
  const app = createApp(f.deps);
  const errors = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    for (let i = 1; i <= 6; i++) {
      const reply = await request(app)
        .post("/v1/identify/bug")
        .auth("user_a", { type: "bearer" })
        .set("X-Forwarded-For", `203.0.113.${i}`)
        .set("Forwarded", `for=203.0.113.${i}`)
        .send({});
      expect(reply.status).toBe(i <= 5 ? 503 : 429);
    }
    expect(errors).not.toHaveBeenCalled();
  } finally {
    errors.mockRestore();
    if (priorVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = priorVercel;
  }
});
test("fallback result is replayed from its durable receipt without rebilling either provider", async () => {
  const f = fixtures();
  const primary = jest.fn(async () => {
    throw new AppError(429, "provider_quota");
  });
  const fallback = jest.fn(async () => ({
    ...result,
    provider: "openai_vision:gpt-6.1-sol",
    verdict: "uncertain" as const,
    speciesId: null,
    score: 0,
  }));
  f.deps.publicIdentification = {
    dailyLimit: 2,
    animal: withAnimalFallback({ identify: primary }, { identify: fallback }),
  };
  const body = { image: await image(), operationId: "fallback_receipt_123" };
  const first = await request(createApp(f.deps))
    .post("/v1/identify/bug")
    .auth("user_a", { type: "bearer" })
    .send(body);
  const replay = await request(createApp(f.deps))
    .post("/v1/identify/bug")
    .auth("user_a", { type: "bearer" })
    .send(body);
  expect(first.status).toBe(200);
  expect(first.body.identification.fallback).toEqual({
    from: "kindwise_insect_v1",
    reason: "credit_or_quota",
  });
  expect(replay.body).toEqual(first.body);
  expect(primary).toHaveBeenCalledTimes(1);
  expect(fallback).toHaveBeenCalledTimes(1);
});
async function image() {
  return (
    await sharp({
      create: { width: 12, height: 12, channels: 3, background: "yellow" },
    })
      .jpeg()
      .toBuffer()
  ).toString("base64");
}
test("image relay is disabled by default and anonymous routes never unlock providers", async () => {
  const f = fixtures(),
    app = createApp(f.deps);
  expect(
    (
      await request(app)
        .post("/v1/identify/bug")
        .auth("user_a", { type: "bearer" })
        .send({})
    ).status,
  ).toBe(503);
  expect((await request(app).get("/v1/plants")).status).toBe(401);
  expect((await request(app).post("/v1/identify/bug").send({})).status).toBe(
    401,
  );
  expect(
    (await request(app).post("/public/identify/bug").send({})).status,
  ).toBe(401);
});
test("global durable budget, immutable operation keys and replay protection apply across clients", async () => {
  const f = fixtures();
  const identify = jest.fn(async () => result);
  f.deps.publicIdentification = { dailyLimit: 1, animal: { identify } };
  const app = createApp(f.deps);
  const body = {
    image: await image(),
    operationId: "operation_123",
    locale: "en",
  };
  const first = await request(app)
    .post("/v1/identify/bug")
    .auth("user_a", { type: "bearer" })
    .send(body);
  expect(first.status).toBe(200);
  const retry = await request(createApp(f.deps))
    .post("/v1/identify/bug")
    .auth("user_a", { type: "bearer" })
    .send(body);
  expect(retry.status).toBe(200);
  expect(identify).toHaveBeenCalledTimes(1);
  expect(
    (
      await request(createApp(f.deps))
        .post("/v1/identify/bug")
        .auth("user_a", { type: "bearer" })
        .send({ ...body, operationId: "new_device_123" })
    ).status,
  ).toBe(429);
  const metadata = await sharp(identify.mock.calls[0]![0]).metadata();
  expect(metadata.exif).toBeUndefined();
  expect(
    [...f.documents.values()].some((v) =>
      JSON.stringify(v).includes(body.image),
    ),
  ).toBe(false);
});
test("uncertain upstream acknowledgment cannot automatically bill a second identification", async () => {
  const f = fixtures();
  const identify = jest.fn(async () => {
    throw new Error("lost_reply");
  });
  f.deps.publicIdentification = { dailyLimit: 5, animal: { identify } };
  const body = { image: await image(), operationId: "lost_reply_123" };
  expect(
    (
      await request(createApp(f.deps))
        .post("/v1/identify/bug")
        .auth("user_a", { type: "bearer" })
        .send(body)
    ).status,
  ).toBe(500);
  expect(
    (
      await request(createApp(f.deps))
        .post("/v1/identify/bug")
        .auth("user_a", { type: "bearer" })
        .send(body)
    ).status,
  ).toBe(409);
  expect(identify).toHaveBeenCalledTimes(1);
});
test("malformed image and extra location fields are rejected before the provider", async () => {
  const f = fixtures();
  const identify = jest.fn(async () => result);
  f.deps.publicIdentification = { dailyLimit: 2, animal: { identify } };
  const app = createApp(f.deps);
  expect(
    (
      await request(app)
        .post("/v1/identify/bug")
        .auth("user_a", { type: "bearer" })
        .send({ image: "junk", operationId: "test_test", latitude: 4 })
    ).status,
  ).toBe(422);
  expect(identify).not.toHaveBeenCalled();
});

test("a valid image cannot be identified anonymously or replayed across accounts", async () => {
  const f = fixtures();
  const identify = jest.fn(async () => result);
  f.deps.publicIdentification = { dailyLimit: 5, animal: { identify } };
  const app = createApp(f.deps);
  const body = { image: await image(), operationId: "same_operation_123" };
  expect((await request(app).post("/v1/identify/bug").send(body)).status).toBe(
    401,
  );
  expect(
    (await request(app).post("/public/identify/bug").send(body)).status,
  ).toBe(401);
  expect(identify).not.toHaveBeenCalled();
  expect(
    (
      await request(app)
        .post("/v1/identify/bug")
        .auth("user_a", { type: "bearer" })
        .send(body)
    ).status,
  ).toBe(200);
  const other = await request(app)
    .post("/v1/identify/bug")
    .auth("user_b", { type: "bearer" })
    .send(body);
  expect(other.status).toBe(200);
  expect(identify).toHaveBeenCalledTimes(2);
  expect(
    [...f.documents.keys()].some((key) =>
      key.startsWith("users/user_a/imageIdentifications/"),
    ),
  ).toBe(true);
  expect(
    [...f.documents.keys()].filter((key) =>
      key.includes("/imageIdentifications/"),
    ),
  ).toHaveLength(2);
});

test("a provider failure after account deletion cannot recreate private identification history", async () => {
  const f = fixtures();
  f.deps.publicIdentification = {
    dailyLimit: 5,
    animal: {
      async identify() {
        await accountService(f.deps).remove({
          uid: "user_a",
          sessionId: "session_user_a",
        });
        throw new Error("provider_failed_after_deletion");
      },
    },
  };
  const reply = await request(createApp(f.deps))
    .post("/v1/identify/bug")
    .auth("user_a", { type: "bearer" })
    .send({ image: await image(), operationId: "deleted_owner_123" });
  expect(reply.status).toBe(410);
  expect(
    [...f.documents.keys()].some((key) => key.startsWith("users/user_a/")),
  ).toBe(false);
});
