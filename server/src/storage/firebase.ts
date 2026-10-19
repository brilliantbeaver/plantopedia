import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, FieldPath } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { z } from "zod";
import type { Config } from "../config/env.js";
import type { Repository, PhotoStorage } from "./repository.js";
import { AppError } from "../application/errors.js";
import { firebaseOperation } from "./availability.js";

export function createFirebase(config: Config): {
  repository: Repository;
  photos: PhotoStorage;
} {
  // Firebase Admin itself reads emulator flags. Only bootstrap calls this factory.
  if (config.USE_FIREBASE_EMULATORS) {
    process.env.FIRESTORE_EMULATOR_HOST = config.FIRESTORE_EMULATOR_HOST;
    process.env.FIREBASE_STORAGE_EMULATOR_HOST =
      config.FIREBASE_STORAGE_EMULATOR_HOST;
  }
  const credential =
    !config.USE_FIREBASE_EMULATORS &&
    config.FIREBASE_CLIENT_EMAIL &&
    config.FIREBASE_PRIVATE_KEY
      ? cert({
          projectId: config.FIREBASE_PROJECT_ID,
          clientEmail: config.FIREBASE_CLIENT_EMAIL,
          privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        })
      : undefined;
  const app = initializeApp(
    {
      projectId: config.FIREBASE_PROJECT_ID,
      storageBucket: config.FIREBASE_STORAGE_BUCKET,
      ...(credential ? { credential } : {}),
    },
    `plantopedia-${Date.now()}`,
  );
  const db = getFirestore(app, config.FIRESTORE_DATABASE_ID);
  const bucket = getStorage(app).bucket();
  const repository: Repository = {
    async get<T>(path: string, schema: z.ZodType<T>) {
      const snapshot = await firebaseOperation("database", () =>
        db.doc(path).get(),
      );
      return snapshot.exists ? schema.parse(snapshot.data()) : null;
    },
    async list<T>(
      path: string,
      schema: z.ZodType<T>,
      limit = 500,
      after?: string,
    ) {
      const query = db
        .collection(path)
        .orderBy(FieldPath.documentId())
        .limit(limit);
      const snapshot = await firebaseOperation("database", () =>
        (after ? query.startAfter(after) : query).get(),
      );
      return snapshot.docs.map((doc) => schema.parse(doc.data()));
    },
    async recent<T>(path: string, schema: z.ZodType<T>, limit: number) {
      const snapshot = await firebaseOperation("database", () =>
        db.collection(path).orderBy("createdAt", "desc").limit(limit).get(),
      );
      return snapshot.docs.map((doc) => schema.parse(doc.data()));
    },
    transaction: (work) =>
      firebaseOperation("database", () =>
        db.runTransaction(async (tx) => {
          const writes: (() => void)[] = [];
          const result = await work({
            async get<T>(path: string, schema: z.ZodType<T>) {
              const snapshot = await tx.get(db.doc(path));
              return snapshot.exists ? schema.parse(snapshot.data()) : null;
            },
            set: (path, value) => {
              writes.push(() => {
                tx.set(db.doc(path), { ...value });
              });
            },
            vector: (path, values) => {
              writes.push(() => {
                tx.update(db.doc(path), {
                  embedding: FieldValue.vector([...values]),
                });
              });
            },
            delete: (path) => {
              writes.push(() => {
                tx.delete(db.doc(path));
              });
            },
          });
          writes.forEach((write) => write());
          return result;
        }),
      ),
    async nearest(path, vector, limit) {
      const result = await firebaseOperation("database", () =>
        db
          .collection(path)
          .findNearest({
            vectorField: "embedding",
            queryVector: FieldValue.vector([...vector]),
            limit,
            distanceMeasure: "COSINE",
            distanceResultField: "distance",
            distanceThreshold: 0.5,
          })
          .get(),
      );
      return result.docs.map((doc) => ({
        id: doc.id,
        distance: z.number().parse(doc.get("distance")),
      }));
    },
    removeTree: async (path) => {
      await firebaseOperation("database", () =>
        db.recursiveDelete(db.doc(path)),
      );
    },
  };
  return {
    repository,
    photos: {
      async check() {
        // Listing an empty prefix verifies the configured bucket exists and
        // is reachable without creating or exposing any user records.
        await firebaseOperation("photo_storage", () =>
          bucket.getFiles({
            prefix: "__plantopedia_readiness__/",
            maxResults: 1,
            autoPaginate: false,
          }),
        );
      },
      async put(key, bytes, contentType) {
        return firebaseOperation("photo_storage", async () => {
          try {
            await bucket.file(key).save(bytes, {
              resumable: false,
              preconditionOpts: { ifGenerationMatch: 0 },
              metadata: { contentType, cacheControl: "private, no-store" },
            });
          } catch (error) {
            if (!z.object({ code: z.literal(412) }).safeParse(error).success)
              throw error;
            const [existing] = await bucket.file(key).download();
            if (!existing.equals(bytes))
              throw new AppError(409, "photo_content_conflict");
          }
        });
      },
      async get(key) {
        const [bytes] = await firebaseOperation("photo_storage", () =>
          bucket.file(key).download(),
        );
        return bytes;
      },
      async remove(key) {
        await firebaseOperation("photo_storage", () =>
          bucket.file(key).delete({ ignoreNotFound: true }),
        );
      },
      async removePrefix(prefix) {
        await firebaseOperation("photo_storage", () =>
          bucket.deleteFiles({ prefix, force: true }),
        );
      },
    },
  };
}
