import request from "supertest";
import { GardenData } from "@plantopedia/contracts";
import { createApp } from "../src/http/app.js";
import { fixtures } from "./fixtures.js";

test("profile history and garden endpoints require a verified session", async () => {
  const f = fixtures();
  const app = createApp(f.deps);
  for (const route of ["/v1/me/search-history", "/v1/me/garden"])
    for (const token of [undefined, "invalid"])
      expect(
        (
          await request(app)
            .get(route)
            .set(token ? { Authorization: `Bearer ${token}` } : {})
        ).status,
      ).toBe(401);
  expect(
    (
      await request(app)
        .post("/v1/me/search-history")
        .send({ query: "sunflower" })
    ).status,
  ).toBe(401);
  expect(
    (await request(app).put("/v1/me/garden").send({ revision: 0, data: {} }))
      .status,
  ).toBe(401);
  expect((await request(app).delete("/v1/me/search-history")).status).toBe(401);
  expect(f.documents.size).toBe(0);
});

test("searches including no matches survive API restart and are private to the signed-in profile", async () => {
  const f = fixtures();
  const app = createApp(f.deps);
  expect(
    (
      await request(app)
        .post("/v1/me/search-history")
        .auth("user_a", { type: "bearer" })
        .send({ query: "sunflower" })
    ).status,
  ).toBe(200);
  const noMatch = await request(app)
    .post("/v1/search")
    .auth("user_a", { type: "bearer" })
    .send({ query: "not-in-my-garden" });
  expect(noMatch.status).toBe(200);
  expect(noMatch.body.items).toEqual([]);
  const restarted = createApp(f.deps);
  const history = await request(restarted)
    .get("/v1/me/search-history")
    .auth("user_a", { type: "bearer" });
  expect(
    history.body.items.map((item: { query: string }) => item.query),
  ).toEqual(["not-in-my-garden", "sunflower"]);
  expect(history.body.items[0].scope).toBe("garden");
  expect(history.headers["cache-control"]).toBe("private, no-store");
  expect(
    (
      await request(restarted)
        .get("/v1/me/search-history")
        .auth("user_b", { type: "bearer" })
    ).body.items,
  ).toEqual([]);
  expect(
    (
      await request(restarted)
        .post("/v1/me/search-history")
        .auth("user_b", { type: "bearer" })
        .send({ query: "steal", owner: "user_a" })
    ).status,
  ).toBe(422);
  expect(
    (
      await request(restarted)
        .delete("/v1/me/search-history")
        .auth("user_b", { type: "bearer" })
    ).status,
  ).toBe(200);
  expect(
    (
      await request(restarted)
        .get("/v1/me/search-history")
        .auth("user_a", { type: "bearer" })
    ).body.items,
  ).toHaveLength(2);
});

test("history deduplicates completed searches, bounds recents, and clears durably", async () => {
  const f = fixtures();
  const app = createApp(f.deps);
  for (let i = 0; i < 12; i++)
    expect(
      (
        await request(app)
          .post("/v1/me/search-history")
          .auth("user_a", { type: "bearer" })
          .send({ query: `flower ${i}` })
      ).status,
    ).toBe(200);
  const repeat = await request(app)
    .post("/v1/me/search-history")
    .auth("user_a", { type: "bearer" })
    .send({ query: "  FLOWER 3  " });
  expect(repeat.body.items).toHaveLength(10);
  expect(repeat.body.items[0].query).toBe("FLOWER 3");
  expect(
    repeat.body.items.some(
      (item: { query: string }) => item.query === "flower 3",
    ),
  ).toBe(false);
  expect(
    (
      await request(app)
        .post("/v1/me/search-history")
        .auth("user_a", { type: "bearer" })
        .send({ query: "   " })
    ).status,
  ).toBe(422);
  expect(
    (
      await request(app)
        .delete("/v1/me/search-history")
        .auth("user_a", { type: "bearer" })
    ).status,
  ).toBe(200);
  expect(
    (
      await request(createApp(f.deps))
        .get("/v1/me/search-history")
        .auth("user_a", { type: "bearer" })
    ).body.items,
  ).toEqual([]);
});

test("garden activity persists per profile and stale writes cannot discard another device's history", async () => {
  const f = fixtures();
  const app = createApp(f.deps);
  const initial = await request(app)
    .get("/v1/me/garden")
    .auth("user_a", { type: "bearer" });
  expect(initial.body.revision).toBe(0);
  const data = GardenData.parse({
    region: "us_nc",
    actions: [
      {
        id: "discovery_1",
        kind: "discovery",
        speciesId: "sunflower",
        plantId: null,
        createdAt: f.deps.now().toISOString(),
        acknowledged: true,
      },
    ],
  });
  const saved = await request(app)
    .put("/v1/me/garden")
    .auth("user_a", { type: "bearer" })
    .send({ revision: 0, data });
  expect(saved.status).toBe(200);
  expect(saved.body.revision).toBe(1);
  const stale = await request(app)
    .put("/v1/me/garden")
    .auth("user_a", { type: "bearer" })
    .send({ revision: 0, data: GardenData.parse({}) });
  expect(stale.status).toBe(409);
  expect(stale.body.code).toBe("revision_conflict");
  const freshDevice = await request(createApp(f.deps))
    .get("/v1/me/garden")
    .auth("user_a", { type: "bearer" });
  expect(freshDevice.body).toEqual(saved.body);
  expect(
    (await request(app).get("/v1/me/garden").auth("user_b", { type: "bearer" }))
      .body.data.actions,
  ).toEqual([]);
  expect(
    (
      await request(app)
        .put("/v1/me/garden")
        .auth("user_b", { type: "bearer" })
        .send({ revision: 0, data, owner: "user_a" })
    ).status,
  ).toBe(422);
});

test("account deletion removes saved profile data and prevents old sessions from rebuilding it", async () => {
  const f = fixtures();
  const app = createApp(f.deps);
  await request(app)
    .post("/v1/me/search-history")
    .auth("user_a", { type: "bearer" })
    .send({ query: "sunflower" });
  await request(app)
    .put("/v1/me/garden")
    .auth("user_a", { type: "bearer" })
    .send({ revision: 0, data: GardenData.parse({ region: "us_nc" }) });
  expect(
    (await request(app).delete("/v1/me").auth("user_a", { type: "bearer" }))
      .status,
  ).toBe(200);
  expect(
    [...f.documents.keys()].some((key) => key.startsWith("users/user_a/")),
  ).toBe(false);
  expect(
    (
      await request(app)
        .post("/v1/me/search-history")
        .auth("user_a", { type: "bearer" })
        .send({ query: "again" })
    ).status,
  ).toBe(410);
  expect(
    (
      await request(app)
        .put("/v1/me/garden")
        .auth("user_a", { type: "bearer" })
        .send({ revision: 0, data: {} })
    ).status,
  ).toBe(410);
});
