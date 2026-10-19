import { DatabaseSync } from "node:sqlite";
import { beforeEach, test, expect, jest } from "@jest/globals";
import { Draft } from "../../src/services/local-schema.js";
const sqlite = new DatabaseSync(":memory:");
const files = new Set<string>();
class File {
  uri: string;
  constructor(...parts: (string | { uri: string })[]) {
    this.uri = parts
      .map((part) => (typeof part === "string" ? part : part.uri))
      .join("/");
  }
  get exists() {
    return files.has(this.uri);
  }
  delete() {
    files.delete(this.uri);
  }
  copy(target: File) {
    files.add(target.uri);
  }
}
class Directory extends File {
  create() {}
  override get exists() {
    return [...files].some((uri) => uri.startsWith(`${this.uri}/`));
  }
  override delete() {
    for (const uri of files)
      if (uri.startsWith(`${this.uri}/`)) files.delete(uri);
  }
}
jest.unstable_mockModule("expo-file-system", () => ({
  File,
  Directory,
  Paths: { document: "file:///private" },
}));
jest.unstable_mockModule("expo-sqlite", () => ({
  openDatabaseAsync: async () => ({
    execAsync: async (sql: string) => sqlite.exec(sql),
    runAsync: async (sql: string, ...args: string[]) =>
      sqlite.prepare(sql).run(...args),
    getAllAsync: async (sql: string, ...args: string[]) =>
      sqlite.prepare(sql).all(...args),
    getFirstAsync: async (sql: string, ...args: string[]) =>
      sqlite.prepare(sql).get(...args),
    withTransactionAsync: async (work: () => Promise<void>) => {
      sqlite.exec("BEGIN");
      try {
        await work();
        sqlite.exec("COMMIT");
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  }),
}));
const { local } = await import("../../src/services/local.js");
beforeEach(() => {
  sqlite.exec("DELETE FROM drafts; DELETE FROM cache;");
  files.clear();
});
function draft(id: string, owner: string, stage: Draft["stage"]) {
  const value = Draft.parse({
    id,
    owner,
    observationId: `note_${id}`,
    photoId: `photo_${id}`,
    capturedAt: "2026-10-18T12:00:00Z",
    original: `file:///private/originals/${owner}/${id}`,
    derivative: `file:///derivatives/${owner}/${id}`,
    width: 100,
    height: 100,
    nickname: id,
    place: "",
    text: "",
    ownership: "observed",
    stage,
    failure: null,
  });
  files.add(value.original);
  if (value.derivative) files.add(value.derivative);
  return value;
}
test("remote deletion quarantines pending originals, purges acknowledged originals, and preserves new/foreign evidence", async () => {
  const pending = draft("pending", "user_a", "observation");
  const acknowledged = draft("saved", "user_a", "complete");
  const independent = draft("new", "user_a", "draft");
  const foreign = draft("saved", "user_b", "complete");
  for (const value of [pending, acknowledged, independent, foreign])
    await local.save(value);
  await local.reconcileDeleted("user_a", "pending");
  await local.reconcileDeleted("user_a", "saved");
  expect(files.has(pending.original)).toBe(true);
  expect(
    (await local.drafts("user_a")).find((value) => value.id === "pending")
      ?.failure,
  ).toBe("record_deleted");
  expect(files.has(acknowledged.original)).toBe(false);
  expect(files.has(independent.original)).toBe(true);
  expect(files.has(foreign.original)).toBe(true);
  expect((await local.references("user_a")).includes("new")).toBe(false);
});
test("explicit account deletion removes only that owner files and drafts", async () => {
  await local.save(draft("saved", "user_a", "complete"));
  await local.save(draft("saved", "user_b", "complete"));
  await local.purgeOwner("user_a");
  expect(await local.drafts("user_a")).toEqual([]);
  expect((await local.drafts("user_b")).map((value) => value.id)).toEqual([
    "saved",
  ]);
  expect([...files].some((uri) => uri.includes("/user_a/"))).toBe(false);
  expect([...files].some((uri) => uri.includes("/user_b/"))).toBe(true);
});
