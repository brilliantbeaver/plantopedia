import { database } from "./local";

// Synchronous transforms inside a serialized database transaction: no remote IO
// while holding the lock. One document holds each feature's atomic invariants.
export const featureStorage = {
  async read(owner: string, key: string): Promise<unknown> {
    const db = await database();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM feature_state WHERE owner = ? AND key = ?",
      owner,
      key,
    );
    return row ? (JSON.parse(row.value) as unknown) : null;
  },
  async update(
    owner: string,
    key: string,
    change: (value: unknown) => unknown,
  ) {
    const db = await database();
    let value: unknown;
    await db.withExclusiveTransactionAsync(async (tx) => {
      const row = await tx.getFirstAsync<{ value: string }>(
        "SELECT value FROM feature_state WHERE owner = ? AND key = ?",
        owner,
        key,
      );
      value = change(row ? (JSON.parse(row.value) as unknown) : null);
      await tx.runAsync(
        "INSERT OR REPLACE INTO feature_state(owner,key,value) VALUES (?,?,?)",
        owner,
        key,
        JSON.stringify(value),
      );
    });
    return value;
  },
};
