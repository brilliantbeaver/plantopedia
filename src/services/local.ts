import { openDatabaseAsync } from "expo-sqlite";
import { Directory, File, Paths } from "expo-file-system";
import { Id, type PlantDetail } from "@plantopedia/contracts";
import { Draft } from "./local-schema";
export { Draft } from "./local-schema";
const database = openDatabaseAsync("plantopedia.db").then(async (db) => {
  await db.execAsync(
    "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS drafts (owner TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(owner,id)); CREATE TABLE IF NOT EXISTS cache (owner TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(owner,id)); PRAGMA user_version = 1;",
  );
  return db;
});
export const local = {
  async purgeOwner(owner: string) {
    Id.parse(owner);
    for (const draft of await local.drafts(owner))
      await local.purge(owner, draft.id);
    const directory = new Directory(Paths.document, "originals", owner);
    if (directory.exists) directory.delete();
    const db = await database;
    await db.runAsync("DELETE FROM cache WHERE owner = ?", owner);
  },
  async retain(owner: string, id: string, uri: string) {
    Id.parse(owner);
    Id.parse(id);
    const directory = new Directory(Paths.document, "originals", owner);
    directory.create({ intermediates: true, idempotent: true });
    const destination = new File(directory, id);
    // SDK 57 copy is asynchronous: never hand a partial/missing original to the decoder.
    await new File(uri).copy(destination);
    return destination.uri;
  },
  async save(draft: Draft) {
    const value = Draft.parse(draft);
    const db = await database;
    await db.runAsync(
      "INSERT OR REPLACE INTO drafts(owner,id,value) VALUES (?,?,?)",
      value.owner,
      value.id,
      JSON.stringify(value),
    );
  },
  async drafts(owner: string) {
    const db = await database;
    const rows = await db.getAllAsync<{ value: string }>(
      "SELECT value FROM drafts WHERE owner = ?",
      owner,
    );
    return rows.map((row) => Draft.parse(JSON.parse(row.value)));
  },
  async cache(owner: string, detail: PlantDetail) {
    const db = await database;
    await db.runAsync(
      "INSERT OR REPLACE INTO cache(owner,id,value) VALUES (?,?,?)",
      owner,
      detail.plant.id,
      JSON.stringify(detail),
    );
  },
  async cached(owner: string, id: string): Promise<unknown> {
    const db = await database;
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM cache WHERE owner = ? AND id = ?",
      owner,
      id,
    );
    return row ? (JSON.parse(row.value) as unknown) : null;
  },
  async references(owner: string) {
    const db = await database;
    const cached = await db.getAllAsync<{ id: string }>(
      "SELECT id FROM cache WHERE owner = ?",
      owner,
    );
    const acknowledged = (await local.drafts(owner))
      .filter((draft) => draft.stage !== "draft")
      .map((draft) => draft.id);
    return [...new Set([...cached.map((row) => row.id), ...acknowledged])];
  },
  async reconcileDeleted(owner: string, id: string) {
    const pending = (await local.drafts(owner)).find(
      (draft) => draft.id === id && draft.stage !== "complete",
    );
    if (pending) {
      await local.save({ ...pending, failure: "record_deleted" });
      const db = await database;
      await db.runAsync(
        "DELETE FROM cache WHERE owner = ? AND id = ?",
        owner,
        id,
      );
    } else await local.purge(owner, id);
  },
  async purge(owner: string, id: string) {
    const db = await database;
    const rows = await local.drafts(owner);
    for (const row of rows.filter((item) => item.id === id)) {
      const original = new File(row.original);
      if (original.exists) original.delete();
      if (row.derivative) {
        const file = new File(row.derivative);
        if (file.exists) file.delete();
      }
    }
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "DELETE FROM drafts WHERE owner = ? AND id = ?",
        owner,
        id,
      );
      await db.runAsync(
        "DELETE FROM cache WHERE owner = ? AND id = ?",
        owner,
        id,
      );
    });
  },
};
