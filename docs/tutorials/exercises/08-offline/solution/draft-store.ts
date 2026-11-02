import { openDatabaseAsync } from "expo-sqlite";
import { DraftSchema, type Draft } from "./draft-contract";
const database = openDatabaseAsync("plantopedia-workshop.db").then(async db => {
  await db.execAsync("CREATE TABLE IF NOT EXISTS workshop_drafts (owner TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(owner,id))");
  return db;
});
export const durable = true;
export async function loadDrafts(owner: string): Promise<Draft[]> {
  const db = await database;
  const rows = await db.getAllAsync<{ value: string }>("SELECT value FROM workshop_drafts WHERE owner = ?", owner);
  return rows.map(row => DraftSchema.parse(JSON.parse(row.value)));
}
export async function saveDraft(raw: Draft) {
  const draft = DraftSchema.parse(raw);
  const db = await database;
  await db.runAsync("INSERT OR REPLACE INTO workshop_drafts(owner,id,value) VALUES (?,?,?)", draft.owner, draft.id, JSON.stringify(draft));
}
