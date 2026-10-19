import { z } from "zod";
import { Candidate, providerLanguage } from "@plantopedia/contracts";
import type { Config } from "../config/env.js";
import type { IdentificationProvider } from "../application/ports.js";
import { AppError } from "../application/errors.js";

const Response = z.object({
  version: z.union([z.string(), z.number()]).optional(),
  results: z.array(
    z.object({
      score: z.number().finite().min(0).max(1),
      species: z.object({
        scientificNameWithoutAuthor: z.string().min(1),
        scientificNameAuthorship: z.string().optional(),
        commonNames: z.array(z.string()).optional(),
        gbif: z.object({ id: z.union([z.string(), z.number()]) }).optional(),
      }),
    }),
  ),
});
export function createPlantnet(config: Config): IdentificationProvider {
  return {
    async identify(images, locale) {
      const url = new URL(
        `https://my-api.plantnet.org/v2/identify/${config.PLANTNET_PROJECT}`,
      );
      url.searchParams.set("api-key", config.PLANTNET_API_KEY);
      url.searchParams.set("lang", providerLanguage(locale));
      url.searchParams.set("nb-results", "3");
      const form = new FormData();
      for (const image of images) {
        form.append(
          "images",
          new Blob([new Uint8Array(image.bytes)], { type: "image/jpeg" }),
          "plant.jpg",
        );
        form.append("organs", image.organ);
      }
      let response: globalThis.Response;
      try {
        response = await fetch(url, {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(18000),
        });
      } catch {
        throw new AppError(504, "identification_unavailable", false);
      }
      // Never propagate fetch exceptions or URLs: the API credential is a query parameter.
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const rejected = z.object({ message: z.string() }).safeParse(body);
        if (
          response.status === 404 &&
          rejected.success &&
          /species not found|no species|not a plant/i.test(
            rejected.data.message,
          )
        )
          return { candidates: [], version: "unknown" };
        throw new AppError(
          response.status === 429 ? 429 : 502,
          response.status === 429 ? "provider_quota" : "identification_failed",
          false,
        );
      }
      const parsed = Response.safeParse(await response.json());
      if (!parsed.success) throw new AppError(502, "provider_contract");
      return {
        candidates: parsed.data.results
          .slice(0, 3)
          .map((item) =>
            Candidate.parse({
              scientificName: item.species.scientificNameWithoutAuthor,
              authorship: item.species.scientificNameAuthorship ?? "",
              commonNames: item.species.commonNames ?? [],
              score: item.score,
              taxonId: item.species.gbif ? String(item.species.gbif.id) : null,
            }),
          )
          .sort((a, b) => b.score - a.score),
        version: String(parsed.data.version ?? "unknown"),
      };
    },
  };
}
