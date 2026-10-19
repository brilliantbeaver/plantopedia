import type { z } from "zod";
export interface Transaction {
  get<T>(path: string, schema: z.ZodType<T>): Promise<T | null>;
  set(path: string, value: Readonly<Record<string, unknown>>): void;
  delete(path: string): void;
  vector(path: string, values: readonly number[]): void;
}
export interface Repository {
  get<T>(path: string, schema: z.ZodType<T>): Promise<T | null>;
  list<T>(
    path: string,
    schema: z.ZodType<T>,
    limit?: number,
    after?: string,
  ): Promise<T[]>;
  /** Newest saved records first; creation time, never random document ID order. */
  recent<T>(path: string, schema: z.ZodType<T>, limit: number): Promise<T[]>;
  transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T>;
  removeTree(path: string): Promise<void>;
  nearest(
    path: string,
    vector: readonly number[],
    limit: number,
  ): Promise<{ id: string; distance: number }[]>;
}
export async function* scanRecords<T extends { id: string }>(
  repository: Repository,
  path: string,
  schema: z.ZodType<T>,
) {
  let cursor: string | undefined;
  for (;;) {
    const page = await repository.list(path, schema, 100, cursor);
    for (const record of page) yield record;
    if (page.length < 100) return;
    const next = page.at(-1)?.id;
    if (!next || next === cursor) throw new Error("invalid_cursor");
    cursor = next;
  }
}
export interface PhotoStorage {
  /** Read-only check of bucket availability; never writes a test photo. */
  check(): Promise<void>;
  /** Create immutable bytes; an identical retry succeeds, different bytes conflict. */
  put(key: string, bytes: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  removePrefix(prefix: string): Promise<void>;
}
