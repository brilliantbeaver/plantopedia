import type { ApiClient } from "../../services/api";
import type { Draft } from "../../services/local-schema";
import {
  photoFileExists,
  retainPreparedPhoto,
} from "../../platform/photo-file";
import { prepareImage } from "./prepare";

export async function resumeDraftPhoto(
  api: ApiClient,
  draft: Draft,
): Promise<Draft> {
  if (["photo", "identified", "complete"].includes(draft.stage)) return draft;
  if (draft.derivative && photoFileExists(draft.derivative))
    return {
      ...draft,
      derivative: await retainPreparedPhoto(draft.derivative, draft.original),
    };

  if (draft.stage === "observation") {
    // A prior upload can succeed while its acknowledgement is lost. Recover
    // the saved photo before trying to recreate an expired cached derivative.
    const detail = await api.plant(draft.id);
    if (
      detail.photos.some(
        (photo) =>
          photo.id === draft.photoId &&
          photo.observationId === draft.observationId &&
          photo.capturedAt === draft.capturedAt,
      )
    )
      return { ...draft, stage: "photo", failure: null };
  }
  // The same photo and operation IDs are retained: if an uncertain old upload
  // used different bytes, server idempotency still prevents an overwrite.
  return { ...draft, derivative: await prepareImage(draft.original) };
}
