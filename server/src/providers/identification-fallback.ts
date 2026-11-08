import type { IdentificationFallback } from "@plantopedia/contracts";
import type {
  AnimalIdentificationProvider,
  IdentificationProvider,
} from "../application/ports.js";
import { AppError } from "../application/errors.js";

// Only upstream failures qualify. Local validation, auth, budget and storage failures
// never reach this adapter and must not trigger another billable provider.
function reason(error: unknown): IdentificationFallback["reason"] | null {
  if (!(error instanceof AppError)) return null;
  if (["provider_quota", "provider_credit"].includes(error.code))
    return "credit_or_quota";
  if (
    ["identification_unavailable", "identification_outcome_unknown"].includes(
      error.code,
    )
  )
    return error.status === 504 ? "timeout" : "unavailable";
  if (error.code === "provider_contract") return "invalid_response";
  if (error.code === "identification_failed") return "unavailable";
  return null;
}

export function withPlantFallback(
  primary: IdentificationProvider,
  fallback: IdentificationProvider,
): IdentificationProvider {
  return {
    async identify(images, locale) {
      try {
        return await primary.identify(images, locale);
      } catch (error) {
        const why = reason(error);
        if (!why) throw error;
        const result = await fallback.identify(images, locale);
        return { ...result, fallback: { from: "plantnet", reason: why } };
      }
    },
  };
}

export function withAnimalFallback(
  primary: AnimalIdentificationProvider,
  fallback: AnimalIdentificationProvider,
): AnimalIdentificationProvider {
  return {
    async identify(bytes, operationId) {
      try {
        return await primary.identify(bytes, operationId);
      } catch (error) {
        const why = reason(error);
        if (!why) throw error;
        const result = await fallback.identify(bytes, operationId);
        return {
          ...result,
          fallback: { from: "kindwise_insect_v1", reason: why },
        };
      }
    },
  };
}
