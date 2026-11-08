import { z } from "zod";
import {
  AnimalIdentification,
  Candidate,
  PlantIdentificationProvider,
  IdentificationFallback,
} from "@plantopedia/contracts";
import { readPhotoFile } from "../../platform/photo-file";
import { bytesToBase64 } from "../voice/pcm";
import { assertMetadataFree } from "./metadata";
import { RequestError, type ApiClient } from "../../services/api";

export async function identifyPhoto(
  api: ApiClient,
  mode: "plant" | "bug",
  uri: string,
  operationId: string,
  locale: string,
  signal?: AbortSignal,
) {
  const { bytes } = await readPhotoFile(uri);
  assertMetadataFree(bytes);
  if (bytes.length > 2000000)
    throw new RequestError(413, "image_too_large", false);
  return api.request(
    `/identify/${mode}`,
    z.union([
      z.object({
        mode: z.literal("bug"),
        identification: AnimalIdentification,
      }),
      z.object({
        mode: z.literal("plant"),
        candidates: z.array(Candidate),
        provider: PlantIdentificationProvider.optional(),
        providerVersion: z.string().optional(),
        fallback: IdentificationFallback.optional(),
      }),
    ]),
    {
      method: "POST",
      body: { operationId, image: bytesToBase64(bytes), locale },
      signal: AbortSignal.any([
        signal ?? new AbortController().signal,
        AbortSignal.timeout(50000),
      ]),
    },
  );
}
