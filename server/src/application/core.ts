import { createHash } from "node:crypto";
import { z } from "zod";
import {
  Id,
  Plant,
  Preferences,
  defaultPreferences,
} from "@plantopedia/contracts";
import type { Auth } from "../http/identity.js";
import type { Transaction, Repository } from "../storage/repository.js";
import type { Dependencies } from "./ports.js";
import { AppError, requireValue } from "./errors.js";

export const User = z.object({
  status: z.enum(["active", "deleting", "deleted"]),
  preferences: Preferences,
});
const Tombstone = z.object({ id: Id, deletedAt: z.string() });
const Operation = z.object({
  hash: z.string(),
  type: z.string(),
  state: z.enum(["complete", "running", "unknown"]),
  resultPath: z.string().nullable(),
  attempt: z.string(),
  leaseUntil: z.number(),
  stage: z.enum(["reserved", "dispatched", "complete"]),
});
export const path = (auth: Pick<Auth, "uid">, suffix = "") =>
  `users/${Id.parse(auth.uid)}${suffix ? `/${suffix}` : ""}`;
export const hash = (input: unknown) =>
  createHash("sha256").update(JSON.stringify(input)).digest("hex");
export const stamp = (deps: Dependencies, id = deps.id()) => ({
  id,
  schemaVersion: 1 as const,
  revision: 1,
  createdAt: deps.now().toISOString(),
  updatedAt: deps.now().toISOString(),
});
export async function active(
  deps: Dependencies,
  auth: Auth,
  tx: Pick<Repository, "get"> = deps.repository,
): Promise<z.infer<typeof User> | null> {
  if (
    await tx.get(
      `deleted_users/${hash(auth.uid)}`,
      z.object({ status: z.string() }),
    )
  )
    throw new AppError(410, "account_deleted");
  const user = await tx.get(path(auth), User);
  if (user && user.status !== "active")
    throw new AppError(410, "account_deleted");
  return user;
}
export async function liveRecord<T>(
  deps: Dependencies,
  auth: Auth,
  suffix: string,
  schema: z.ZodType<T>,
  tx: Pick<Repository, "get"> = deps.repository,
): Promise<T> {
  await active(deps, auth, tx);
  if (await tx.get(path(auth, `tombstones/${hash(suffix)}`), Tombstone))
    throw new AppError(410, "record_deleted");
  return requireValue(await tx.get(path(auth, suffix), schema));
}
export async function plant(
  deps: Dependencies,
  auth: Auth,
  id: string,
  tx: Pick<Repository, "get"> = deps.repository,
) {
  return liveRecord(deps, auth, `plants/${Id.parse(id)}`, Plant, tx);
}
export function checkRevision(actual: number, expected: number) {
  if (actual !== expected) throw new AppError(409, "revision_conflict");
}
export async function write<T>(
  deps: Dependencies,
  auth: Auth,
  key: string,
  type: string,
  payload: unknown,
  schema: z.ZodType<T>,
  mutation: (tx: Transaction) => Promise<{ resultPath: string; result: T }>,
  guard?: (tx: Transaction) => Promise<void>,
): Promise<T> {
  const opPath = path(auth, `operations/${Id.parse(key)}`);
  const digest = hash({ type, payload });
  return deps.repository.transaction(async (tx) => {
    const user = await active(deps, auth, tx);
    if (guard) await guard(tx);
    const op = await tx.get(opPath, Operation);
    if (op) {
      if (op.hash !== digest) throw new AppError(409, "idempotency_conflict");
      if (op.state === "complete" && op.resultPath) {
        const suffix = op.resultPath.slice(path(auth).length + 1);
        return liveRecord(deps, auth, suffix, schema, tx);
      }
      throw new AppError(409, "operation_in_progress", true);
    }
    const { resultPath, result } = await mutation(tx);
    if (!user)
      tx.set(path(auth), { status: "active", preferences: defaultPreferences });
    tx.set(opPath, {
      hash: digest,
      type,
      state: "complete",
      resultPath,
      attempt: deps.id(),
      leaseUntil: 0,
      stage: "complete",
    });
    return result;
  });
}
export async function tombstone(
  deps: Dependencies,
  auth: Auth,
  suffix: string,
  tx: Transaction,
): Promise<void> {
  tx.set(path(auth, `tombstones/${hash(suffix)}`), {
    id: hash(suffix),
    deletedAt: deps.now().toISOString(),
  });
  tx.delete(path(auth, suffix));
}
export async function external<T>(
  deps: Dependencies,
  auth: Auth,
  key: string,
  type: "identification" | "photo",
  payload: unknown,
  schema: z.ZodType<T>,
  prepare: (tx: Transaction) => Promise<void>,
  execute: () => Promise<T>,
  finalize: (tx: Transaction, result: T) => Promise<string>,
): Promise<T> {
  const opPath = path(auth, `operations/${Id.parse(key)}`);
  const digest = hash({ type, payload });
  const attempt = deps.id();
  const existing = await deps.repository.transaction(async (tx) => {
    await active(deps, auth, tx);
    await prepare(tx);
    const op = await tx.get(opPath, Operation);
    if (op && op.hash !== digest)
      throw new AppError(409, "idempotency_conflict");
    if (op?.state === "complete" && op.resultPath)
      return liveRecord(
        deps,
        auth,
        op.resultPath.slice(path(auth).length + 1),
        schema,
        tx,
      );
    if (
      op?.state === "unknown" ||
      (type === "identification" &&
        op?.stage === "dispatched" &&
        op.leaseUntil < deps.now().getTime())
    )
      throw new AppError(409, "provider_outcome_unknown");
    if (op && op.leaseUntil > deps.now().getTime())
      throw new AppError(409, "operation_in_progress", true);
    tx.set(opPath, {
      hash: digest,
      type,
      state: "running",
      resultPath: null,
      attempt,
      leaseUntil: deps.now().getTime() + 30000,
      stage: "dispatched",
    });
    return null;
  });
  if (existing) return existing;
  let result: T;
  try {
    result = await execute();
  } catch (error) {
    if (type === "identification")
      await deps.repository.transaction(async (tx) => {
        const op = await tx.get(opPath, Operation);
        if (op?.attempt === attempt)
          tx.set(opPath, { ...op, state: "unknown" });
      });
    else {
      // Photo writes are immutable: replaying these exact bytes is safe even
      // after a lost Storage acknowledgment. Once this attempt has stopped,
      // let Retry resume immediately instead of waiting for its 30s lease.
      await deps.repository
        .transaction(async (tx) => {
          const op = await tx.get(opPath, Operation);
          if (op?.attempt === attempt && op.state === "running")
            tx.set(opPath, { ...op, leaseUntil: 0 });
        })
        .catch(() => undefined);
    }
    throw error;
  }
  return deps.repository.transaction(async (tx) => {
    await active(deps, auth, tx);
    await prepare(tx);
    const op = requireValue(await tx.get(opPath, Operation));
    if (op.attempt !== attempt) throw new AppError(409, "stale_attempt");
    const resultPath = await finalize(tx, result);
    tx.set(opPath, {
      ...op,
      state: "complete",
      stage: "complete",
      resultPath,
      leaseUntil: 0,
    });
    return result;
  });
}
