import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Repository, PhotoStorage } from "../src/storage/repository.js";
import type { Dependencies } from "../src/application/ports.js";
import { fakeProviders } from "../src/providers/fakes.js";
import { AppError } from "../src/application/errors.js";
export function fixtures() {
  const documents = new Map<string, unknown>();
  const files = new Map<string, Buffer>();
  let tail = Promise.resolve();
  const repository: Repository = {
    async get(path, schema) {
      const data = documents.get(path);
      return data === undefined ? null : schema.parse(structuredClone(data));
    },
    async list(path, schema, limit = 500, after) {
      return [...documents.keys()]
        .filter(
          (key) =>
            key.startsWith(`${path}/`) &&
            (!after || key.slice(path.length + 1) > after) &&
            key.slice(path.length + 1).split("/").length === 1,
        )
        .sort()
        .slice(0, limit)
        .map((key) => schema.parse(structuredClone(documents.get(key))));
    },
    async recent(path, schema, limit) {
      const records = await repository.list(
        path,
        z.object({ id: z.string(), createdAt: z.string() }).passthrough(),
        Number.MAX_SAFE_INTEGER,
      );
      return records
        .sort(
          (a, b) =>
            b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
        )
        .slice(0, limit)
        .map((item) => schema.parse(item));
    },
    async transaction(work) {
      const prior = tail;
      let release: () => void = () => {};
      tail = new Promise((resolve) => {
        release = resolve;
      });
      await prior;
      const writes = new Map<string, unknown>();
      const deletes = new Set<string>();
      try {
        const result = await work({
          get: repository.get,
          set: (path, value) => {
            writes.set(path, structuredClone(value));
          },
          vector: (path, values) => {
            const current = z
              .record(z.string(), z.unknown())
              .parse(writes.get(path) ?? documents.get(path));
            writes.set(path, { ...current, embedding: [...values] });
          },
          delete: (path) => {
            deletes.add(path);
          },
        });
        deletes.forEach((path) => documents.delete(path));
        writes.forEach((value, path) => documents.set(path, value));
        return result;
      } finally {
        release();
      }
    },
    async nearest() {
      return [];
    },
    async removeTree(path) {
      for (const key of documents.keys())
        if (key === path || key.startsWith(`${path}/`)) documents.delete(key);
    },
  };
  const photos: PhotoStorage = {
    async check() {},
    async put(key, bytes) {
      const prior = files.get(key);
      if (prior && !prior.equals(bytes))
        throw new AppError(409, "photo_content_conflict");
      files.set(key, Buffer.from(bytes));
    },
    async get(key) {
      const value = files.get(key);
      if (!value) throw new AppError(404, "not_found");
      return value;
    },
    async remove(key) {
      files.delete(key);
    },
    async removePrefix(prefix) {
      for (const key of files.keys())
        if (key.startsWith(prefix)) files.delete(key);
    },
  };
  const revoked = new Set<string>();
  const deps: Dependencies = {
    repository,
    photos,
    ...fakeProviders(),
    identity: {
      async verify(token) {
        if (!["user_a", "user_b"].includes(token))
          throw new AppError(401, "unauthorized");
        return { uid: token, sessionId: `session_${token}` };
      },
      async active(auth) {
        return !revoked.has(auth.sessionId);
      },
      async deleteUser(uid) {
        revoked.add(`session_${uid}`);
      },
    },
    tracer: { run: (_kind, work) => work(), async flush() {} },
    now: () => new Date("2026-10-18T12:00:00.000Z"),
    id: randomUUID,
    embeddingModel: "fake",
    embeddingDimensions: 1536,
  };
  return { deps, documents, files, revoked };
}
