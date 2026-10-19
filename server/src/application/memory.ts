import { z } from "zod";
import {
  Id,
  MemoryItem,
  Observation,
  type PlantDetail,
} from "@plantopedia/contracts";
import type { Auth } from "../http/identity.js";
import type { Dependencies } from "./ports.js";
import type { Transaction } from "../storage/repository.js";
import {
  active,
  hash,
  liveRecord,
  path,
  plant,
  stamp,
  tombstone,
} from "./core.js";
import { AppError } from "./errors.js";
const Work = z.object({
  id: Id,
  owner: Id,
  plantId: Id,
  observationId: Id,
  revision: z.number(),
  state: z.enum(["pending", "working"]),
  leaseUntil: z.number(),
  attempt: z.string().default(""),
});
export function queueObservationMemory(
  auth: Auth,
  observation: Observation,
  tx: Transaction,
) {
  const id = hash({
    owner: auth.uid,
    plantId: observation.plantId,
    id: observation.id,
    revision: observation.revision,
  });
  tx.set(`memory_work/${id}`, {
    id,
    owner: auth.uid,
    plantId: observation.plantId,
    observationId: observation.id,
    revision: observation.revision,
    state: "pending",
    leaseUntil: 0,
  });
}
export function memoryService(deps: Dependencies) {
  async function valid(auth: Auth, item: MemoryItem) {
    if (item.excluded) return false;
    await active(deps, auth);
    if (item.plantId) await plant(deps, auth, item.plantId);
    for (const source of item.sources) {
      if (
        await deps.repository.get(
          path(auth, `memory_exclusions/${hash(source.path)}`),
          z.object({ excluded: z.literal(true) }),
        )
      )
        return false;
      const record = await liveRecord(
        deps,
        auth,
        source.path,
        z.object({ revision: z.number() }),
      );
      if (record.revision !== source.revision) return false;
    }
    return true;
  }
  async function visible(auth: Auth, detail: PlantDetail) {
    const observations: Observation[] = [];
    for (const observation of detail.observations) {
      const excluded = await deps.repository.get(
        path(
          auth,
          `memory_exclusions/${hash(`plants/${detail.plant.id}/observations/${observation.id}`)}`,
        ),
        z.object({ excluded: z.literal(true) }),
      );
      if (!excluded) observations.push(observation);
    }
    return { ...detail, observations };
  }
  async function nearest(auth: Auth, query: string) {
    await active(deps, auth);
    const embedding = await deps.assistant.embed(query);
    const matches = await deps.repository.nearest(
      path(auth, "memory_items"),
      embedding,
      8,
    );
    const results: MemoryItem[] = [];
    for (const match of matches) {
      const item = await deps.repository.get(
        path(auth, `memory_items/${Id.parse(match.id)}`),
        MemoryItem.extend({
          embeddingModel: z.string(),
          embeddingDimensions: z.number(),
        }),
      );
      try {
        if (
          item &&
          item.embeddingModel === deps.embeddingModel &&
          item.embeddingDimensions === deps.embeddingDimensions &&
          (await valid(auth, item))
        )
          results.push(item);
      } catch (error) {
        if (!(error instanceof AppError && [404, 410].includes(error.status)))
          throw error;
      }
    }
    return results;
  }
  async function forget(auth: Auth, id: string) {
    await deps.repository.transaction(async (tx) => {
      const item = await liveRecord(
        deps,
        auth,
        `memory_items/${Id.parse(id)}`,
        MemoryItem,
        tx,
      );
      for (const source of item.sources)
        tx.set(path(auth, `memory_exclusions/${hash(source.path)}`), {
          excluded: true,
        });
      await tombstone(deps, auth, `memory_items/${id}`, tx);
    });
  }
  async function processBatch() {
    const jobs = await deps.repository.list("memory_work", Work, 3);
    for (const job of jobs) {
      const auth = { uid: job.owner, sessionId: "memory-indexer" };
      const jobPath = `memory_work/${job.id}`;
      const attempt = deps.id();
      try {
        const claimed = await deps.repository.transaction(async (tx) => {
          await plant(deps, auth, job.plantId, tx);
          const current = await tx.get(jobPath, Work);
          if (!current) return false;
          if (current.state === "working") {
            if (current.leaseUntil > deps.now().getTime()) return false;
            throw new AppError(409, "embedding_outcome_unknown");
          }
          tx.set(jobPath, {
            ...current,
            state: "working",
            attempt,
            leaseUntil: deps.now().getTime() + 30000,
          });
          return true;
        });
        if (!claimed) continue;
        const sourcePath = `plants/${job.plantId}/observations/${job.observationId}`;
        const observation = await liveRecord(
          deps,
          auth,
          sourcePath,
          Observation,
        );
        if (observation.revision !== job.revision)
          throw new AppError(409, "source_changed");
        if (
          await deps.repository.get(
            path(auth, `memory_exclusions/${hash(sourcePath)}`),
            z.object({ excluded: z.literal(true) }),
          )
        )
          throw new AppError(410, "source_excluded");
        const vector = z
          .array(z.number().finite())
          .length(deps.embeddingDimensions)
          .parse(await deps.assistant.embed(observation.text));
        await deps.repository.transaction(async (tx) => {
          const current = await tx.get(jobPath, Work);
          if (!current || current.attempt !== attempt)
            throw new AppError(409, "stale_attempt");
          await plant(deps, auth, job.plantId, tx);
          const source = await liveRecord(
            deps,
            auth,
            sourcePath,
            Observation,
            tx,
          );
          if (
            source.revision !== job.revision ||
            (await tx.get(
              path(auth, `memory_exclusions/${hash(sourcePath)}`),
              z.object({ excluded: z.literal(true) }),
            ))
          )
            throw new AppError(409, "source_changed");
          const id = hash(sourcePath).slice(0, 32);
          const item: MemoryItem = {
            ...stamp(deps, id),
            plantId: job.plantId,
            text: source.text,
            kind: "user_fact",
            sources: [{ path: sourcePath, revision: source.revision }],
            excluded: false,
          };
          tx.set(path(auth, `memory_items/${id}`), {
            ...item,
            embeddingModel: deps.embeddingModel,
            embeddingDimensions: vector.length,
            contentHash: hash(source.text),
          });
          tx.vector(path(auth, `memory_items/${id}`), vector);
          tx.delete(jobPath);
        });
      } catch (error) {
        await deps.repository.transaction(async (tx) => {
          const current = await tx.get(jobPath, Work);
          if (
            !current ||
            (current.attempt &&
              current.attempt !== attempt &&
              !(
                error instanceof AppError &&
                error.code === "embedding_outcome_unknown" &&
                current.leaseUntil <= deps.now().getTime()
              ))
          )
            return;
          tx.delete(jobPath);
          if (!(error instanceof AppError && [404, 410].includes(error.status)))
            tx.set(`memory_failures/${job.id}`, {
              ...job,
              code: error instanceof AppError ? error.code : "index_failed",
            });
        });
      }
    }
  }
  return { valid, visible, nearest, forget, processBatch };
}
