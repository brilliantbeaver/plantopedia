import { describe, test, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/http/app.js";
import { fixtures } from "./fixtures.js";
import { companionService } from "../src/application/companion.js";
const date = "2026-10-18T12:00:00.000Z";
function setup() {
  const fixture = fixtures();
  return { ...fixture, app: createApp(fixture.deps) };
}
let context: ReturnType<typeof setup>;
beforeEach(() => {
  context = setup();
});
async function plant(id = "plant_a", user = "user_a") {
  return request(context.app)
    .post("/v1/plants")
    .set("Authorization", `Bearer ${user}`)
    .set("Idempotency-Key", `create_${id}`)
    .send({
      id,
      nickname: "Tree beside the library",
      ownership: "observed",
      place: "Library",
      capturedAt: date,
    });
}
const get = (route: string, user = "user_a") =>
  request(context.app).get(route).set("Authorization", `Bearer ${user}`);
const post = (
  route: string,
  body: unknown,
  key = "operation_a",
  user = "user_a",
) =>
  request(context.app)
    .post(route)
    .set("Authorization", `Bearer ${user}`)
    .set("Idempotency-Key", key)
    .send(body);
describe("authenticated durable plant journey without Java or paid providers", () => {
  test("signatures/identities are a boundary; missing and unknown identities fail", async () => {
    expect((await request(context.app).get("/v1/plants")).status).toBe(401);
    expect((await get("/v1/plants", "forged")).status).toBe(401);
  });
  test("save, lost acknowledgment replay, restart and same-species specimens", async () => {
    const first = await plant();
    expect(first.status).toBe(200);
    const replay = await plant();
    expect(replay.body.id).toBe(first.body.id);
    await plant("plant_b");
    const restarted = createApp(context.deps);
    const saved = await request(restarted)
      .get("/v1/plants")
      .set("Authorization", "Bearer user_a");
    expect(saved.body.items.map((item: { id: string }) => item.id)).toEqual([
      "plant_a",
      "plant_b",
    ]);
    expect(
      saved.body.items.every(
        (item: { verification: string }) => item.verification === "uncertain",
      ),
    ).toBe(true);
  });
  test("concurrent idempotency and changed payload", async () => {
    const results = await Promise.all([plant(), plant()]);
    expect(results.map((result) => result.status)).toEqual([200, 200]);
    expect((await get("/v1/plants")).body.items).toHaveLength(1);
    expect(
      (
        await post(
          "/v1/plants",
          {
            id: "plant_a",
            nickname: "Changed",
            ownership: "observed",
            place: "Library",
            capturedAt: date,
          },
          "create_plant_a",
        )
      ).status,
    ).toBe(409);
  });
  test("foreign records, images, conversations and session controls do not leak", async () => {
    await plant();
    expect((await get("/v1/plants/plant_a", "user_b")).status).toBe(404);
    expect(
      (await get("/v1/photos/photo_a?plantId=plant_a", "user_b")).status,
    ).toBe(404);
    expect(
      (
        await post(
          "/v1/conversations",
          { id: "chat_a", plantId: "plant_a", photoId: null, locale: "en" },
          "chat_b",
          "user_b",
        )
      ).status,
    ).toBe(404);
    expect((await get("/v1/voice/turns/turn_a", "user_b")).status).toBe(404);
  });
  test("photo pipeline strips metadata, identifies conservatively and requires selection", async () => {
    await plant();
    await post(
      "/v1/plants/plant_a/observations",
      { id: "observation_a", text: "Split leaves", capturedAt: date },
      "observe_a",
    );
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#228844" },
    })
      .withExif({
        IFD0: { ImageDescription: "PRIVATE_METADATA_SENTINEL" },
        IFD3: {
          GPSLatitudeRef: "N",
          GPSLatitude: "37/1 25/1 0/1",
          GPSLongitudeRef: "W",
          GPSLongitude: "122/1 10/1 0/1",
        },
      })
      .jpeg()
      .toBuffer();
    expect((await sharp(png).metadata()).exif).toBeDefined();
    const upload = await request(context.app)
      .post("/v1/plants/plant_a/photos")
      .set("Authorization", "Bearer user_a")
      .set("Idempotency-Key", "upload_a")
      .field("id", "photo_a")
      .field("observationId", "observation_a")
      .field("capturedAt", date)
      .attach("image", png, {
        filename: "plant.jpg",
        contentType: "image/jpeg",
      });
    expect(upload.status).toBe(200);
    const identified = await post(
      "/v1/plants/plant_a/identifications",
      { photoIds: ["photo_a"], organs: ["leaf"], locale: "ko" },
      "identify_a",
    );
    expect(identified.status).toBe(200);
    expect(identified.body.language).toBe("en");
    const detail = await get("/v1/plants/plant_a");
    expect(detail.body.plant.verification).toBe("uncertain");
    const selected = await post(
      "/v1/plants/plant_a/identification-selection",
      {
        revision: detail.body.plant.revision,
        identificationId: identified.body.id,
        candidateIndex: 0,
      },
      "select_a",
    );
    expect(selected.body.verification).toBe("user_confirmed");
    const correction = {
      revision: selected.body.revision,
      identificationId: identified.body.id,
      candidateIndex: null,
      scientificName: "Monstera deliciosa",
    };
    const corrected = await post(
      "/v1/plants/plant_a/identification-selection",
      correction,
      "correct_a",
    );
    expect(corrected.status).toBe(200);
    expect(corrected.body.verification).toBe("user_corrected");
    expect(corrected.body.revision).toBe(selected.body.revision + 1);
    const replay = await post(
      "/v1/plants/plant_a/identification-selection",
      correction,
      "correct_a",
    );
    expect(replay.body.revision).toBe(corrected.body.revision);
    const afterCorrection = await get("/v1/plants/plant_a");
    expect(afterCorrection.body.selections).toHaveLength(2);
    expect(afterCorrection.body.identifications[0].photoIds).toEqual([
      "photo_a",
    ]);
    expect(afterCorrection.body.identifications[0].candidates).toEqual(
      identified.body.candidates,
    );
    expect(
      (await sharp([...context.files.values()][0]).metadata()).exif,
    ).toBeUndefined();
    expect(
      [...context.files.values()][0]?.includes(
        Buffer.from("PRIVATE_METADATA_SENTINEL"),
      ),
    ).toBe(false);
  });
  test("retrieves prior observation and the correct specimen across owners", async () => {
    await plant();
    await plant("other");
    await post(
      "/v1/plants/plant_a/observations",
      {
        id: "note_a",
        text: "Tiny purple flowers beside the stairs",
        capturedAt: date,
      },
      "note_a",
    );
    const result = await post("/v1/search", { query: "purple flowers" });
    expect(
      result.body.items.map((item: { plant: { id: string } }) => item.plant.id),
    ).toEqual(["plant_a"]);
    expect(
      (
        await post(
          "/v1/search",
          { query: "purple flowers" },
          "search_b",
          "user_b",
        )
      ).body.items,
    ).toEqual([]);
  });
  test("proposals require explicit confirmation, cancellation persists, current auth is rechecked", async () => {
    await plant();
    await post(
      "/v1/conversations",
      { id: "chat_a", plantId: "plant_a", photoId: null, locale: "en" },
      "chat_a",
    );
    const companion = companionService(context.deps);
    const auth = { uid: "user_a", sessionId: "session_user_a" };
    const proposal = await companion.propose(auth, "chat_a", {
      type: "observation",
      plantId: "plant_a",
      text: "New bud",
    });
    expect((await get("/v1/plants/plant_a")).body.observations).toHaveLength(0);
    const result = await post(
      `/v1/action-proposals/${proposal.id}/confirm`,
      {},
      "confirm_a",
    );
    expect(result.status).toBe(200);
    await post(`/v1/action-proposals/${proposal.id}/confirm`, {}, "confirm_a");
    expect((await get("/v1/plants/plant_a")).body.observations).toHaveLength(1);
    const other = await companion.propose(auth, "chat_a", {
      type: "observation",
      plantId: "plant_a",
      text: "Do not save",
    });
    await post(`/v1/action-proposals/${other.id}/cancel`, {}, "cancel_a");
    expect(
      (await post(`/v1/action-proposals/${other.id}/confirm`, {}, "confirm_b"))
        .status,
    ).toBe(409);
    context.revoked.add(auth.sessionId);
    const tools = await companion.tools(auth, "chat_a");
    await expect(
      tools.execute("get_plant", { plantId: "plant_a" }),
    ).rejects.toMatchObject({ status: 401 });
  });
  test("deleted result replay returns 410 and cannot resurrect a tombstoned ID", async () => {
    await plant();
    expect(
      (
        await request(context.app)
          .delete("/v1/plants/plant_a")
          .set("Authorization", "Bearer user_a")
      ).status,
    ).toBe(200);
    expect((await plant()).status).toBe(410);
    expect(
      (
        await post(
          "/v1/plants",
          {
            id: "plant_a",
            nickname: "Return",
            ownership: "observed",
            capturedAt: date,
          },
          "new_key",
        )
      ).status,
    ).toBe(410);
    await plant("independent");
    expect(
      (await get("/v1/plants")).body.items.map(
        (item: { id: string }) => item.id,
      ),
    ).toEqual(["independent"]);
  });
  test("account deletion marker survives recursive cleanup and blocks old writes", async () => {
    await plant();
    const result = await request(context.app)
      .delete("/v1/me")
      .set("Authorization", "Bearer user_a");
    expect(result.status).toBe(200);
    expect((await plant()).status).toBe(410);
    expect(
      [...context.documents.keys()].some((key) =>
        key.startsWith("deleted_users/"),
      ),
    ).toBe(true);
  });
  test("an injected tracer preserves the successful save result", async () => {
    context.deps.tracer = {
      async run(_kind, work) {
        return work();
      },
      async flush() {
        throw new Error("offline");
      },
    };
    const app = createApp(context.deps);
    const result = await request(app)
      .post("/v1/plants")
      .set("Authorization", "Bearer user_a")
      .set("Idempotency-Key", "safe")
      .send({
        id: "safe",
        nickname: "Safe",
        ownership: "observed",
        capturedAt: date,
      });
    expect(result.status).toBe(200);
  });
});
