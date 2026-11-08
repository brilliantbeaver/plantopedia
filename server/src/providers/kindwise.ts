import { z } from "zod";
import { AnimalIdentification } from "@plantopedia/contracts";
import { AppError } from "../application/errors.js";
import type { AnimalIdentificationProvider } from "../application/ports.js";
const Response = z.object({
  status: z.literal("COMPLETED"),
  result: z.object({
    is_insect: z.object({ binary: z.boolean(), probability: z.number() }),
    classification: z.object({
      suggestions: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          probability: z.number().min(0).max(1),
          details: z
            .object({
              common_names: z.array(z.string()).optional(),
              rank: z.string().optional(),
            })
            .optional(),
        }),
      ),
    }),
  }),
});
// Only this curated, explicitly sourced relationship is currently supported.
const sunflowerSource =
  "https://extension.oregonstate.edu/catalog/em-9866-grow-your-own-sunflowers";
export function createKindwise(apiKey: string): AnimalIdentificationProvider {
  return {
    async identify(bytes, operationId) {
      let response: globalThis.Response;
      try {
        response = await fetch(
          "https://insect.kindwise.com/api/v1/identification?details=common_names,rank",
          {
            method: "POST",
            headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              images: [`data:image/jpeg;base64,${bytes.toString("base64")}`],
              similar_images: false,
            }),
            signal: AbortSignal.timeout(18000),
          },
        );
      } catch {
        throw new AppError(504, "identification_outcome_unknown");
      }
      if (!response.ok)
        throw new AppError(
          [402, 429].includes(response.status) ? 429 : 502,
          [402, 429].includes(response.status)
            ? "provider_quota"
            : "identification_unavailable",
        );
      const result = Response.safeParse(
        await response.json().catch(() => null),
      );
      if (!result.success) throw new AppError(502, "provider_contract");
      const suggestions = result.data.result.classification.suggestions;
      const top = suggestions[0];
      // Conservative display policy, not a calibrated probability of correctness.
      const resolved =
        !!top &&
        result.data.result.is_insect.binary &&
        result.data.result.is_insect.probability >= 0.8 &&
        top.details?.rank === "species" &&
        top.probability >= 0.8 &&
        top.probability - (suggestions[1]?.probability ?? 0) >= 0.2;
      const honeyBee = resolved && top.name === "Apis mellifera";
      const stingingTaxon = (name: string) =>
        /^(Apis|Bombus|Vespula|Vespa|Polistes) /u.test(name);
      const possibleSting = suggestions.some(
        (s) => s.probability >= 0.15 && stingingTaxon(s.name),
      );
      return AnimalIdentification.parse({
        id: operationId,
        provider: "kindwise_insect_v1",
        scientificName: top?.name ?? null,
        commonName: top?.details?.common_names?.[0] ?? null,
        speciesId: resolved ? `animal:kindwise:${top.id}` : null,
        score: top?.probability ?? 0,
        verdict: honeyBee ? "pollinator" : "uncertain",
        canSting:
          resolved && stingingTaxon(top.name)
            ? "yes"
            : possibleSting
              ? "possible"
              : "unknown",
        plants: honeyBee ? ["ncsu_helianthus_annuus"] : [],
        fact: honeyBee
          ? "Honey bees visit sunflower flowers for nectar and pollen."
          : null,
        sourceUrl: honeyBee ? sunflowerSource : null,
      });
    },
  };
}
