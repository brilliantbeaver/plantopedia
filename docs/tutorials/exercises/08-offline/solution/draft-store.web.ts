import { DraftSchema, type Draft } from "./draft-contract";
// Explicit preview adapter: these values disappear when the browser reloads.
const records = new Map<string, Draft>();
export const durable = false;
export async function loadDrafts(owner: string): Promise<Draft[]> {
  return [...records.values()].filter(draft => draft.owner === owner);
}
export async function saveDraft(raw: Draft) {
  const draft = DraftSchema.parse(raw);
  records.set(`${draft.owner}/${draft.id}`, draft);
}
