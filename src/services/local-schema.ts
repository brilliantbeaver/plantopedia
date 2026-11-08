import { z } from "zod";
import { Id, Ownership, AnimalIdentification } from "@plantopedia/contracts";
export const Draft = z.object({
  mode: z.enum(["plant", "bug"]).default("plant"),
  guestIdentificationKey: z.string().optional(),
  animalResult: AnimalIdentification.optional(),
  id: Id,
  owner: Id,
  observationId: Id,
  photoId: Id,
  capturedAt: z.string(),
  original: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  derivative: z.string().nullable(),
  nickname: z.string(),
  place: z.string(),
  text: z.string(),
  ownership: Ownership,
  stage: z.enum([
    "draft",
    "plant",
    "observation",
    "photo",
    "identified",
    "complete",
  ]),
  failure: z.string().nullable(),
  submittedAt: z.string().optional(),
});
export type Draft = z.infer<typeof Draft>;
