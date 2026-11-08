import { z } from "zod";

export const IdentificationFallback = z.object({
  from: z.enum(["plantnet", "kindwise_insect_v1"]),
  reason: z.enum([
    "credit_or_quota",
    "timeout",
    "invalid_response",
    "unavailable",
  ]),
});
export type IdentificationFallback = z.infer<typeof IdentificationFallback>;
export const PlantIdentificationProvider = z.enum([
  "plantnet",
  "openai_vision",
]);
