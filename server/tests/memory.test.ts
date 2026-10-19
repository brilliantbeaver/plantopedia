import { describe, test, expect, jest } from "@jest/globals";
import { MemoryItem, Observation } from "@plantopedia/contracts";
import { fixtures } from "./fixtures.js";
import { plantService } from "../src/application/plants.js";
import { companionService } from "../src/application/companion.js";
import { memoryService } from "../src/application/memory.js";
const auth = { uid: "user_a", sessionId: "session_user_a" };
const date = "2026-10-18T12:00:00.000Z";
async function setup() {
  const data = fixtures();
  const plants = plantService(data.deps);
  await plants.create(auth, "create", {
    id: "plant_a",
    nickname: "Library tree",
    ownership: "observed",
    capturedAt: date,
  });
  await plants.observe(auth, "plant_a", "note", {
    id: "note_a",
    text: "Purple buds beside the stairs",
    capturedAt: date,
  });
  return { ...data, plants, memory: memoryService(data.deps) };
}
describe("source-linked memory integrity", () => {
  test("indexes actual observation sources, not generated personal facts", async () => {
    const data = await setup();
    await data.memory.processBatch();
    const records = await data.deps.repository.list(
      "users/user_a/memory_items",
      MemoryItem,
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      kind: "user_fact",
      sources: [{ path: "plants/plant_a/observations/note_a", revision: 1 }],
    });
    expect(
      [...data.documents.keys()].filter((key) =>
        key.startsWith("memory_work/"),
      ),
    ).toHaveLength(0);
  });
  test("rehydrates fixture IDs and excludes another owner and stale source revisions", async () => {
    const data = await setup();
    await data.memory.processBatch();
    const records = await data.deps.repository.list(
      "users/user_a/memory_items",
      MemoryItem,
    );
    const id = records[0]?.id;
    if (!id) throw new Error("fixture");
    data.deps.repository.nearest = async () => [{ id, distance: 0.1 }];
    expect(
      await data.memory.nearest(auth, "Tree with violet flowers"),
    ).toHaveLength(1);
    expect(
      await data.memory.nearest(
        { uid: "user_b", sessionId: "session_user_b" },
        "Tree with violet flowers",
      ),
    ).toEqual([]);
    const source = data.documents.get(
      "users/user_a/plants/plant_a/observations/note_a",
    );
    const parsed = Observation.parse(source);
    data.documents.set("users/user_a/plants/plant_a/observations/note_a", {
      ...parsed,
      revision: 2,
      text: "Corrected evidence",
    });
    expect(await data.memory.nearest(auth, "Tree with violet flowers")).toEqual(
      [],
    );
  });
  test("forget excludes original source from future assistant context and re-indexing", async () => {
    const data = await setup();
    await data.memory.processBatch();
    const item = (
      await data.deps.repository.list("users/user_a/memory_items", MemoryItem)
    )[0];
    if (!item) throw new Error("fixture");
    await data.memory.forget(auth, item.id);
    const visible = await data.memory.visible(
      auth,
      await data.plants.detail(auth, "plant_a"),
    );
    expect(visible.observations).toEqual([]);
    const companion = companionService(data.deps);
    expect(
      (await companion.retrieve(auth, { query: "Purple buds" })).items,
    ).toEqual([]);
  });
  test("delete while embedding is in flight cannot resurrect private memory", async () => {
    const data = await setup();
    let release: (value: number[]) => void = () => {};
    const embedding = new Promise<number[]>((resolve) => {
      release = resolve;
    });
    data.deps.assistant.embed = () => embedding;
    const processing = data.memory.processBatch();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await data.plants.remove(auth, "plant_a");
    release(Array.from({ length: 1536 }, () => 0));
    await processing;
    expect(
      await data.deps.repository.list("users/user_a/memory_items", MemoryItem),
    ).toEqual([]);
  });
  test("index failure preserves the acknowledged observation and does not loop billing", async () => {
    const data = await setup();
    const embed = jest
      .fn<() => Promise<number[]>>()
      .mockRejectedValue(new Error("provider timeout with secret sentinel"));
    data.deps.assistant.embed = embed;
    await data.memory.processBatch();
    await data.memory.processBatch();
    expect(embed).toHaveBeenCalledTimes(1);
    expect(
      (await data.plants.detail(auth, "plant_a")).observations,
    ).toHaveLength(1);
    expect(JSON.stringify([...data.documents.entries()])).not.toContain(
      "secret sentinel",
    );
  });
});

test("identical observation IDs on different specimens retain distinct indexing jobs and source paths", async () => {
  const data = await setup();
  await data.plants.create(auth, "second", {
    id: "plant_b",
    nickname: "Second tree",
    ownership: "observed",
    capturedAt: date,
  });
  await data.plants.observe(auth, "plant_b", "second_note", {
    id: "note_a",
    text: "Other specimen",
    capturedAt: date,
  });
  expect(
    [...data.documents.keys()].filter((key) => key.startsWith("memory_work/")),
  ).toHaveLength(2);
  await data.memory.processBatch();
  const records = await data.deps.repository.list(
    "users/user_a/memory_items",
    MemoryItem,
  );
  expect(
    records.flatMap((item) => item.sources.map((source) => source.path)).sort(),
  ).toEqual([
    "plants/plant_a/observations/note_a",
    "plants/plant_b/observations/note_a",
  ]);
});
