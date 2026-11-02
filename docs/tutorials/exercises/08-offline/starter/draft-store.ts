export type Draft = { owner: string; id: string; nickname: string };
// TODO: open a separate workshop SQLite database and create an owner/id primary key.
// Bind SQL parameters. Resolve save only after the database write succeeds.
export const durable = false;
export async function loadDrafts(_owner: string): Promise<Draft[]> { return []; }
export async function saveDraft(_draft: Draft): Promise<void> { throw new Error("TODO: save a draft"); }
