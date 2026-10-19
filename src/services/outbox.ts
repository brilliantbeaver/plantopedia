import { readPhotoFile } from "../platform/photo-file";
import { fetch } from "expo/fetch";
import {
  CreatePlant,
  CreateObservation,
  Id,
  Photo,
  type Locale,
} from "@plantopedia/contracts";
import { local, type Draft } from "./local";
import type { ApiClient } from "./api";
import { RequestError, responseError, connectionError } from "./api";
import { publicConfig } from "../config/public-env";
import { assertMetadataFree } from "../features/capture/metadata";
const running = new Set<string>();
export async function syncDraft(
  api: ApiClient,
  initial: Draft,
  locale: Locale,
  sameUser: () => boolean,
): Promise<Draft> {
  const key = `${initial.owner}/${initial.id}`;
  if (running.has(key)) throw new Error("operation_in_progress");
  running.add(key);
  let draft = initial;
  async function save(stage: Draft["stage"]) {
    draft = { ...draft, stage, failure: null };
    await local.save(draft);
  }
  function authorized() {
    if (!sameUser()) throw new Error("account_changed");
  }
  try {
    authorized();
    if (draft.failure === "record_deleted")
      throw new RequestError(410, "record_deleted", false);
    if (!draft.submittedAt) {
      CreatePlant.parse({
        id: draft.id,
        nickname: draft.nickname,
        ownership: draft.ownership,
        place: draft.place,
        capturedAt: draft.capturedAt,
      });
      CreateObservation.parse({
        id: draft.observationId,
        text: draft.text,
        capturedAt: draft.capturedAt,
      });
      Id.parse(draft.photoId);
      draft = { ...draft, submittedAt: new Date().toISOString() };
      await local.save(draft);
    }
    if (draft.stage === "draft") {
      await api.createPlant(
        {
          id: draft.id,
          nickname: draft.nickname,
          ownership: draft.ownership,
          place: draft.place,
          capturedAt: draft.capturedAt,
        },
        `plant_${draft.id}`,
      );
      await save("plant");
    }
    authorized();
    if (draft.stage === "plant") {
      await api.observe(
        draft.id,
        {
          id: draft.observationId,
          text: draft.text,
          capturedAt: draft.capturedAt,
        },
        `observation_${draft.id}`,
      );
      await save("observation");
    }
    authorized();
    if (draft.stage === "observation") {
      if (!draft.derivative || !publicConfig.success)
        throw new Error("image_not_prepared");
      const { file, bytes } = await readPhotoFile(draft.derivative);
      assertMetadataFree(bytes);
      const form = new FormData();
      form.append("image", file, "plant.jpg");
      form.append("id", draft.photoId);
      form.append("observationId", draft.observationId);
      form.append("capturedAt", draft.capturedAt);
      const token = await api.token();
      authorized();
      if (!token) throw new RequestError(401, "unauthorized", false);
      const response = await fetch(
        `${publicConfig.data.apiBaseUrl}/v1/plants/${draft.id}/photos`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Idempotency-Key": `photo_${draft.id}`,
          },
          body: form,
          signal: AbortSignal.timeout(25000),
        },
      ).catch((error: unknown) => {
        throw connectionError(error);
      });
      if (!response.ok) throw await responseError(response);
      Photo.parse(await response.json());
      await save("photo");
    }
    // Saving is independent of identification. A deliberate Identify tap runs its own operation.
    await save("complete");
    return draft;
  } catch (error) {
    if (
      draft.stage === "draft" &&
      error instanceof RequestError &&
      error.status === 422 &&
      error.code === "invalid_plant_input"
    ) {
      // Only this typed pre-write server rejection makes edits safe. Network
      // errors, lost acknowledgments and generic 422s retain the snapshot.
      const { submittedAt: _, ...editable } = draft;
      draft = editable;
    }
    draft = {
      ...draft,
      failure:
        error instanceof RequestError && error.status === 410
          ? "record_deleted"
          : error instanceof RequestError
            ? error.code
            : "sync_failed",
    };
    await local.save(draft);
    throw error;
  } finally {
    running.delete(key);
  }
}
