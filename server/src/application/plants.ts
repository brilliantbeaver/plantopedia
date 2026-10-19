import { createHash } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import {
  CreateObservation,
  CreatePlant,
  EditPlant,
  Identify,
  Id,
  Identification,
  IdentificationSelection,
  Observation,
  Photo,
  Plant,
  Search,
  SelectIdentification,
  Conversation,
  Message,
  Task,
  MemoryItem,
  Proposal,
  lowEvidence,
  normalizeSearch,
  providerLanguage,
} from "@plantopedia/contracts";
import type { Auth } from "../http/identity.js";
import type { Dependencies } from "./ports.js";
import {
  active,
  checkRevision,
  external,
  hash,
  liveRecord,
  path,
  plant,
  stamp,
  tombstone,
  write,
} from "./core.js";
import { AppError, requireValue } from "./errors.js";
import { queueObservationMemory } from "./memory.js";
import { scanRecords } from "../storage/repository.js";
const DeletionJob = z.object({ id: Id, owner: Id, plantId: Id });

export function plantService(deps: Dependencies) {
  async function detail(auth: Auth, id: string) {
    const record = await plant(deps, auth, id);
    const [observations, photos, identifications, selections] =
      await Promise.all([
        deps.repository.list(
          path(auth, `plants/${id}/observations`),
          Observation,
        ),
        deps.repository.list(path(auth, `plants/${id}/photos`), Photo),
        deps.repository.list(
          path(auth, `plants/${id}/identifications`),
          Identification,
        ),
        deps.repository.list(
          path(auth, `plants/${id}/selections`),
          IdentificationSelection,
        ),
      ]);
    return {
      plant: record,
      observations: observations.sort((a, b) =>
        b.capturedAt.localeCompare(a.capturedAt),
      ),
      photos,
      identifications,
      selections,
    };
  }
  async function list(auth: Auth, input: unknown) {
    await active(deps, auth);
    const filter = Search.parse(input);
    const all = await deps.repository.list(path(auth, "plants"), Plant, 501);
    const term = normalizeSearch(filter.query);
    const matching = all
      .slice(0, 500)
      .filter(
        (record) =>
          (!filter.ownership || record.ownership === filter.ownership) &&
          (!filter.after || record.createdAt >= filter.after) &&
          (!filter.before || record.createdAt <= filter.before) &&
          (!filter.cursor || record.id > filter.cursor) &&
          (!term ||
            normalizeSearch(
              [
                record.nickname,
                record.scientificName,
                record.commonName,
                record.place,
              ].join(" "),
            ).includes(term)),
      );
    const items = matching.slice(0, filter.limit);
    return {
      items,
      nextCursor:
        matching.length > filter.limit ? (items.at(-1)?.id ?? null) : null,
      limited: all.length > 500,
    };
  }
  async function create(auth: Auth, key: string, raw: unknown) {
    const input = CreatePlant.parse(raw);
    return write(deps, auth, key, "create_plant", input, Plant, async (tx) => {
      if (await tx.get(path(auth, `plants/${input.id}`), Plant))
        throw new AppError(409, "record_exists");
      const marker = await tx.get(
        path(auth, `tombstones/${hash(`plants/${input.id}`)}`),
        z.object({ deletedAt: z.string() }),
      );
      if (marker) throw new AppError(410, "record_deleted");
      const result: Plant = {
        ...stamp(deps, input.id),
        nickname: input.nickname,
        ownership: input.ownership,
        place: input.place,
        lifecycle: "saved",
        verification: "uncertain",
        scientificName: null,
        commonName: null,
        coverPhotoId: null,
        identificationId: null,
      };
      const resultPath = path(auth, `plants/${input.id}`);
      tx.set(resultPath, result);
      return { resultPath, result };
    });
  }
  async function edit(auth: Auth, id: string, key: string, raw: unknown) {
    const input = EditPlant.parse(raw);
    return write(
      deps,
      auth,
      key,
      "edit_plant",
      { id, input },
      Plant,
      async (tx) => {
        const current = await plant(deps, auth, id, tx);
        checkRevision(current.revision, input.revision);
        const { revision: _, ...changes } = input;
        const result = Plant.parse({
          ...current,
          ...changes,
          revision: current.revision + 1,
          updatedAt: deps.now().toISOString(),
        });
        const resultPath = path(auth, `plants/${id}`);
        tx.set(resultPath, result);
        return { resultPath, result };
      },
      async (tx) => {
        await plant(deps, auth, id, tx);
      },
    );
  }
  async function observe(auth: Auth, id: string, key: string, raw: unknown) {
    const input = CreateObservation.parse(raw);
    return write(
      deps,
      auth,
      key,
      "observation",
      { id, input },
      Observation,
      async (tx) => {
        const resultPath = path(auth, `plants/${id}/observations/${input.id}`);
        if (await tx.get(resultPath, Observation))
          throw new AppError(409, "record_exists");
        if (
          await tx.get(
            path(
              auth,
              `tombstones/${hash(`plants/${id}/observations/${input.id}`)}`,
            ),
            z.object({ deletedAt: z.string() }),
          )
        )
          throw new AppError(410, "record_deleted");
        const result: Observation = {
          ...stamp(deps, input.id),
          plantId: id,
          text: input.text,
          capturedAt: input.capturedAt,
          kind: "user_observation",
        };
        tx.set(resultPath, result);
        queueObservationMemory(auth, result, tx);
        return { resultPath, result };
      },
      async (tx) => {
        await plant(deps, auth, id, tx);
      },
    );
  }
  const objectKey = (auth: Auth, plantId: string, photoId: string) =>
    `${path(auth, `plants/${plantId}/photos/${photoId}`)}.jpg`;
  async function upload(
    auth: Auth,
    id: string,
    key: string,
    raw: unknown,
    buffer: Buffer,
  ) {
    const input = z
      .object({
        id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
        observationId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
        capturedAt: z.iso.datetime({ offset: true }),
      })
      .strict()
      .parse(raw);
    if (buffer.length > 2 * 1024 * 1024)
      throw new AppError(413, "image_too_large");
    let bytes: Buffer;
    let width: number;
    let height: number;
    try {
      const image = sharp(buffer, {
        limitInputPixels: 24_000_000,
        failOn: "warning",
      });
      const format = (await image.metadata()).format;
      if (format !== "jpeg" && format !== "png")
        throw new Error("unsupported_image");
      const result = await image
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
      bytes = result.data;
      width = result.info.width;
      height = result.info.height;
    } catch {
      throw new AppError(422, "invalid_image");
    }
    const digest = createHash("sha256").update(buffer).digest("hex");
    return external(
      deps,
      auth,
      key,
      "photo",
      { id, input, digest },
      Photo,
      async (tx) => {
        await plant(deps, auth, id, tx);
        await liveRecord(
          deps,
          auth,
          `plants/${id}/observations/${input.observationId}`,
          Observation,
          tx,
        );
        if (
          await tx.get(
            path(auth, `tombstones/${hash(`plants/${id}/photos/${input.id}`)}`),
            z.object({ deletedAt: z.string() }),
          )
        )
          throw new AppError(410, "record_deleted");
        const existing = await tx.get(
          path(auth, `plants/${id}/photos/${input.id}`),
          Photo,
        );
        if (
          existing &&
          (existing.hash !== digest ||
            existing.observationId !== input.observationId)
        )
          throw new AppError(409, "photo_content_conflict");
      },
      async () => {
        await deps.photos.put(
          objectKey(auth, id, input.id),
          bytes,
          "image/jpeg",
        );
        return Photo.parse({
          ...stamp(deps, input.id),
          plantId: id,
          observationId: input.observationId,
          mime: "image/jpeg",
          width,
          height,
          bytes: bytes.length,
          hash: digest,
          capturedAt: input.capturedAt,
        });
      },
      async (tx, result) => {
        const current = await plant(deps, auth, id, tx);
        const resultPath = path(auth, `plants/${id}/photos/${input.id}`);
        if (await tx.get(resultPath, Photo))
          throw new AppError(409, "record_exists");
        tx.set(resultPath, result);
        if (!current.coverPhotoId)
          tx.set(path(auth, `plants/${id}`), {
            ...current,
            coverPhotoId: result.id,
            revision: current.revision + 1,
            updatedAt: deps.now().toISOString(),
          });
        return resultPath;
      },
    );
  }
  async function photo(auth: Auth, photoId: string, plantId: string) {
    await plant(deps, auth, plantId);
    const metadata = await liveRecord(
      deps,
      auth,
      `plants/${plantId}/photos/${photoId}`,
      Photo,
    );
    return {
      metadata,
      bytes: await deps.photos.get(objectKey(auth, plantId, photoId)),
    };
  }
  async function identify(auth: Auth, id: string, key: string, raw: unknown) {
    const input = Identify.parse(raw);
    const resultId = hash({ key, id }).slice(0, 32);
    await plant(deps, auth, id);
    const images = await Promise.all(
      input.photoIds.map(async (photoId, index) => ({
        bytes: (await photo(auth, photoId, id)).bytes,
        organ: input.organs[index] ?? "auto",
      })),
    );
    return external(
      deps,
      auth,
      key,
      "identification",
      { id, input },
      Identification,
      async (tx) => {
        await plant(deps, auth, id, tx);
        for (const photoId of input.photoIds)
          await liveRecord(
            deps,
            auth,
            `plants/${id}/photos/${photoId}`,
            Photo,
            tx,
          );
      },
      async () => {
        const result = await deps.tracer.run("identification", () =>
          deps.identification.identify(images, input.locale),
        );
        return Identification.parse({
          ...stamp(deps, resultId),
          plantId: id,
          photoIds: input.photoIds,
          candidates: result.candidates,
          provider: "plantnet",
          providerVersion: result.version,
          status: result.candidates.length ? "ready" : "no_match",
          needsMoreEvidence: lowEvidence(result.candidates),
          language: providerLanguage(input.locale),
        });
      },
      async (tx, result) => {
        const resultPath = path(
          auth,
          `plants/${id}/identifications/${result.id}`,
        );
        tx.set(resultPath, result);
        return resultPath;
      },
    );
  }
  async function select(auth: Auth, id: string, key: string, raw: unknown) {
    const input = SelectIdentification.parse(raw);
    return write(
      deps,
      auth,
      key,
      "select_identification",
      { id, input },
      Plant,
      async (tx) => {
        const current = await plant(deps, auth, id, tx);
        checkRevision(current.revision, input.revision);
        const evidence = await liveRecord(
          deps,
          auth,
          `plants/${id}/identifications/${input.identificationId}`,
          Identification,
          tx,
        );
        const candidate =
          input.candidateIndex === null
            ? null
            : requireValue(
                evidence.candidates[input.candidateIndex],
                "candidate_not_found",
              );
        const scientificName =
          candidate?.scientificName ?? input.scientificName;
        if (!scientificName)
          throw new AppError(422, "scientific_name_required");
        for (const photoId of evidence.photoIds)
          await liveRecord(
            deps,
            auth,
            `plants/${id}/photos/${photoId}`,
            Photo,
            tx,
          );
        const selectionId = hash(key).slice(0, 32);
        tx.set(
          path(auth, `plants/${id}/selections/${selectionId}`),
          IdentificationSelection.parse({
            ...stamp(deps, selectionId),
            plantId: id,
            identificationId: evidence.id,
            scientificName,
            candidateIndex: input.candidateIndex,
            supersedesRevision: current.revision,
            verification: candidate ? "user_confirmed" : "user_corrected",
          }),
        );
        const result: Plant = {
          ...current,
          scientificName,
          commonName: candidate?.commonNames[0] ?? null,
          verification: candidate ? "user_confirmed" : "user_corrected",
          identificationId: evidence.id,
          revision: current.revision + 1,
          updatedAt: deps.now().toISOString(),
        };
        const resultPath = path(auth, `plants/${id}`);
        tx.set(resultPath, result);
        return { resultPath, result };
      },
      async (tx) => {
        await plant(deps, auth, id, tx);
      },
    );
  }
  async function remove(auth: Auth, id: string) {
    Id.parse(id);
    const jobId = hash({ owner: auth.uid, plantId: id });
    await deps.repository.transaction(async (tx) => {
      await active(deps, auth, tx);
      await tombstone(deps, auth, `plants/${id}`, tx);
      tx.set(`deletion_work/${jobId}`, {
        id: jobId,
        owner: auth.uid,
        plantId: id,
      });
    });
    await cleanup(auth, id, jobId);
  }
  async function cleanup(auth: Auth, id: string, jobId: string) {
    await deps.voice.closeUser(auth.uid);
    await deps.photos.removePrefix(`${path(auth, `plants/${id}`)}/`);
    await deps.repository.removeTree(path(auth, `plants/${id}`));
    for await (const item of scanRecords(
      deps.repository,
      path(auth, "tasks"),
      Task,
    ))
      if (item.plantId === id)
        await deps.repository.transaction(async (tx) =>
          tombstone(deps, auth, `tasks/${item.id}`, tx),
        );
    for await (const item of scanRecords(
      deps.repository,
      path(auth, "memory_items"),
      MemoryItem,
    ))
      if (item.plantId === id)
        await deps.repository.transaction(async (tx) =>
          tombstone(deps, auth, `memory_items/${item.id}`, tx),
        );
    for await (const item of scanRecords(
      deps.repository,
      path(auth, "action_proposals"),
      Proposal,
    ))
      if (item.action.plantId === id)
        await deps.repository.transaction(async (tx) =>
          tombstone(deps, auth, `action_proposals/${item.id}`, tx),
        );
    for await (const item of scanRecords(
      deps.repository,
      path(auth, "conversations"),
      Conversation,
    )) {
      let affected = item.plantId === id;
      for await (const message of scanRecords(
        deps.repository,
        path(auth, `conversations/${item.id}/messages`),
        Message,
      ))
        if (message.evidence.some((reference) => reference.plantId === id))
          affected = true;
      if (affected) {
        await deps.repository.transaction(async (tx) =>
          tombstone(deps, auth, `conversations/${item.id}`, tx),
        );
        await deps.repository.removeTree(
          path(auth, `conversations/${item.id}`),
        );
      }
    }
    await deps.repository.transaction(async (tx) => {
      tx.delete(`deletion_work/${jobId}`);
    });
  }
  async function processDeletions() {
    const jobs = await deps.repository.list("deletion_work", DeletionJob, 5);
    await Promise.allSettled(
      jobs.map((job) =>
        cleanup({ uid: job.owner, sessionId: "cleanup" }, job.plantId, job.id),
      ),
    );
  }
  return {
    detail,
    list,
    create,
    edit,
    observe,
    upload,
    photo,
    identify,
    select,
    remove,
    processDeletions,
    objectKey,
  };
}
