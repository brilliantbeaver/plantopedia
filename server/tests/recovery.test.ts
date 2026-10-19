import { describe, test, expect } from "@jest/globals";
import request from "supertest";
import sharp from "sharp";
import { fixtures } from "./fixtures.js";
import { plantService } from "../src/application/plants.js";
import { companionService } from "../src/application/companion.js";
import { createApp } from "../src/http/app.js";
const auth = { uid: "user_a", sessionId: "session_user_a" };
const date = "2026-10-18T12:00:00.000Z";
test("typed invalid plant input rejects before operation reservation and permits corrected reuse", async () => {
  const { deps, documents } = fixtures();
  const app = createApp(deps);
  const input = {
    id: "plant",
    nickname: "x".repeat(121),
    ownership: "observed",
    capturedAt: date,
  };
  const invalid = await request(app)
    .post("/v1/plants")
    .set("Authorization", "Bearer user_a")
    .set("Idempotency-Key", "create_attempt")
    .send(input);
  expect(invalid.status).toBe(422);
  expect(invalid.body.code).toBe("invalid_plant_input");
  expect(
    [...documents.keys()].some(
      (key) => key.includes("/operations/") || key.includes("/plants/"),
    ),
  ).toBe(false);
  const corrected = await request(app)
    .post("/v1/plants")
    .set("Authorization", "Bearer user_a")
    .set("Idempotency-Key", "create_attempt")
    .send({ ...input, nickname: "Corrected tree" });
  expect(corrected.status).toBe(200);
  expect(corrected.body.nickname).toBe("Corrected tree");
});
async function setup() {
  const fixture = fixtures();
  const plants = plantService(fixture.deps);
  await plants.create(auth, "create", {
    id: "plant_a",
    nickname: "Tree",
    ownership: "owned",
    capturedAt: date,
  });
  for (const [id, text] of [
    ["a_note", "Old green leaves"],
    ["z_note", "Purple flowers"],
  ])
    await plants.observe(auth, "plant_a", `observe_${id}`, {
      id,
      text,
      capturedAt: date,
    });
  return { ...fixture, plants, companion: companionService(fixture.deps) };
}
async function image(color: string) {
  return sharp({
    create: { width: 8, height: 8, channels: 3, background: color },
  })
    .png()
    .toBuffer();
}
describe("recovery and evidence regressions", () => {
  test("photo IDs are immutable across new operation keys", async () => {
    const data = await setup();
    const first = await image("green");
    const second = await image("red");
    const input = { id: "photo_a", observationId: "a_note", capturedAt: date };
    await data.plants.upload(auth, "plant_a", "upload_a", input, first);
    const saved = Buffer.from([...data.files.values()][0] ?? []);
    await expect(
      data.plants.upload(auth, "plant_a", "upload_b", input, second),
    ).rejects.toMatchObject({ code: "photo_content_conflict" });
    expect([...data.files.values()][0]).toEqual(saved);
    expect(
      (await data.plants.upload(auth, "plant_a", "upload_a", input, first)).id,
    ).toBe("photo_a");
  });
  test("recall returns the photograph attached to the matched observation, not the first image", async () => {
    const data = await setup();
    const bytes = await image("green");
    await data.plants.upload(
      auth,
      "plant_a",
      "old_image",
      { id: "a_photo", observationId: "a_note", capturedAt: date },
      bytes,
    );
    await data.plants.upload(
      auth,
      "plant_a",
      "new_image",
      { id: "z_photo", observationId: "z_note", capturedAt: date },
      bytes,
    );
    // Recreate the HTTP application over the same persistent repository fixture.
    const restarted = createApp(data.deps);
    const response = await request(restarted)
      .post("/v1/search")
      .set("Authorization", "Bearer user_a")
      .send({
        query: "Purple flowers",
      });
    expect(response.status).toBe(200);
    const found = response.body;
    expect(found.items[0]).toMatchObject({
      photoId: "z_photo",
      observations: [{ id: "z_note" }],
    });
  });
  test("deletion survives a failed object cleanup and resumes with a fresh service", async () => {
    const data = await setup();
    const remove = data.deps.photos.removePrefix;
    data.deps.photos.removePrefix = async () => {
      throw new Error("unavailable");
    };
    await expect(data.plants.remove(auth, "plant_a")).rejects.toThrow(
      "unavailable",
    );
    await expect(data.plants.detail(auth, "plant_a")).rejects.toMatchObject({
      status: 410,
    });
    expect(
      [...data.documents.keys()].some((key) =>
        key.startsWith("deletion_work/"),
      ),
    ).toBe(true);
    data.deps.photos.removePrefix = remove;
    await plantService(data.deps).processDeletions();
    expect(
      [...data.documents.keys()].some((key) =>
        key.startsWith("deletion_work/"),
      ),
    ).toBe(false);
    expect(
      [...data.documents.keys()].some((key) =>
        key.startsWith("users/user_a/plants/plant_a/"),
      ),
    ).toBe(false);
    await expect(
      data.plants.create(auth, "new_create", {
        id: "plant_a",
        nickname: "Return",
        ownership: "observed",
        capturedAt: date,
      }),
    ).rejects.toMatchObject({ status: 410 });
  });
  test("general public search excludes arbitrary private prompt text and tools have object schemas", async () => {
    const data = await setup();
    await data.companion.start(auth, "chat", {
      id: "chat",
      plantId: null,
      photoId: null,
      locale: "en",
    });
    let transmitted = "";
    data.deps.research.search = async (query) => {
      transmitted = query;
      return [];
    };
    const toolkit = await data.companion.tools(auth, "chat");
    await toolkit.execute("search_web", {
      query: "private address 123 Secret Street watering",
    });
    expect(transmitted).toBe("plants botanical care");
    expect(
      toolkit.definitions.every((tool) => tool.parameters.type === "object"),
    ).toBe(true);
    await expect(
      toolkit.execute("propose_observation", {
        type: "observation",
        plantId: "foreign",
        text: "bad",
        confirmed: true,
      }),
    ).rejects.toThrow();
  });
  test("malformed and oversized JSON produce safe intentional errors", async () => {
    const { deps } = await setup();
    const app = createApp(deps);
    const malformed = await request(app)
      .post("/v1/plants")
      .set("Content-Type", "application/json")
      .send("{ secret-sentinel");
    expect(malformed.status).toBe(400);
    expect(JSON.stringify(malformed.body)).not.toContain("secret-sentinel");
    const oversized = await request(app)
      .post("/v1/plants")
      .send({ value: "x".repeat(160000) });
    expect(oversized.status).toBe(413);
  });
});

test("overlapping different uploads for one photo cannot replace bytes or detach metadata", async () => {
  const data = await setup();
  const original = data.deps.photos.put;
  let entered: () => void = () => {};
  const waiting = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  data.deps.photos.put = async (key, bytes, mime) => {
    if (++calls === 1) {
      entered();
      await gate;
    }
    await original(key, bytes, mime);
  };
  const input = { id: "photo", observationId: "a_note", capturedAt: date };
  const firstBytes = await image("green");
  const secondBytes = await image("red");
  const first = data.plants
    .upload(auth, "plant_a", "first", input, firstBytes)
    .catch((error: unknown) => error);
  await waiting;
  const second = await data.plants.upload(
    auth,
    "plant_a",
    "second",
    input,
    secondBytes,
  );
  const committed = Buffer.from([...data.files.values()][0] ?? []);
  release();
  await expect(first).resolves.toMatchObject({
    code: "photo_content_conflict",
  });
  expect(
    (await data.plants.photo(auth, "photo", "plant_a")).metadata.hash,
  ).toBe(second.hash);
  expect([...data.files.values()][0]).toEqual(committed);
});
test("text-only evidence has no fabricated photo in lexical search or get_plant", async () => {
  const data = await setup();
  await data.plants.upload(
    auth,
    "plant_a",
    "upload",
    { id: "old_photo", observationId: "a_note", capturedAt: date },
    await image("green"),
  );
  await data.plants.observe(auth, "plant_a", "latest", {
    id: "new_note",
    text: "New text only",
    capturedAt: "2026-10-19T12:00:00.000Z",
  });
  expect(
    (await data.companion.retrieve(auth, { query: "New text only" })).items[0]
      ?.photoId,
  ).toBeNull();
  await data.companion.start(auth, "chat", {
    id: "chat",
    plantId: null,
    photoId: null,
    locale: "en",
  });
  const tools = await data.companion.tools(auth, "chat");
  await tools.execute("get_plant", { plantId: "plant_a" });
  expect(
    tools.evidence.find((item) => item.observationId === "new_note")?.photoId,
  ).toBeNull();
});
test("conversation deletion preserves confirmed actions and idempotently cancels only pending proposals", async () => {
  const data = await setup();
  await data.companion.start(auth, "chat", {
    id: "chat",
    plantId: "plant_a",
    photoId: null,
    locale: "en",
  });
  const saved = await data.companion.propose(auth, "chat", {
    type: "observation",
    plantId: "plant_a",
    text: "Approved note",
  });
  await data.companion.confirm(auth, saved.id, "confirm");
  const pending = await data.companion.propose(auth, "chat", {
    type: "observation",
    plantId: "plant_a",
    text: "Unapproved",
  });
  await data.companion.removeConversation(auth, "chat");
  await data.companion.removeConversation(auth, "chat");
  expect(
    (await data.plants.detail(auth, "plant_a")).observations.some(
      (item) => item.text === "Approved note",
    ),
  ).toBe(true);
  expect(
    data.documents.get(`users/user_a/action_proposals/${pending.id}`),
  ).toMatchObject({ status: "canceled" });
});
