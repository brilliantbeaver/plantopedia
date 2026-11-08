import { z } from "zod";
import { PollinatorSighting } from "./pollinators.js";

export const UserProgress = z.object({
  activatedAt: z.string(),
  balance: z.number().int().nonnegative().default(0),
  lifetime: z.number().int().nonnegative().default(0),
  level: z.number().int().min(1).default(1),
  xp: z.number().int().min(0).max(99).default(0),
  day: z.object({ key: z.string(), zone: z.string(), boundary: z.number() }),
  watermark: z.number(),
  levelDays: z.array(z.string()).default([]),
  claims: z.record(z.string(), z.number()).default({}),
  evidence: z.array(z.string()).default([]),
  unlocked: z.array(z.string()).default(["sprout"]),
  equipped: z.string().default("sprout"),
  questDays: z.array(z.string()).default([]),
  careDays: z.array(z.string()).default([]),
  milestones: z.array(z.string()).default([]),
});
export type UserProgress = z.infer<typeof UserProgress>;

export const GardenAction = z.object({
  id: z.string(),
  kind: z.enum(["planting", "care", "discovery", "animal", "photo_bonus"]),
  speciesId: z.string(),
  plantId: z.string().nullable(),
  createdAt: z.string(),
  acknowledged: z.boolean(),
  evidenceKey: z.string().optional(),
  selection: z
    .object({
      identificationId: z.string(),
      candidateIndex: z.number().int().nonnegative(),
      revision: z.number().int().positive(),
      scientificName: z.string(),
    })
    .optional(),
  plantingEligible: z.boolean().optional(),
  careKey: z.string().optional(),
  photoUri: z.string().optional(),
  text: z.string().max(8000).default(""),
});
export type GardenAction = z.infer<typeof GardenAction>;

export const GardenData = z
  .object({
    actions: z.array(GardenAction).default([]),
    catalogSaves: z
      .record(z.string(), z.object({ id: z.string(), createdAt: z.string() }))
      .default({}),
    region: z.enum(["us_nc", "other"]).optional(),
    progress: UserProgress.optional(),
    version: z.literal(1).default(1),
    sightings: z.array(PollinatorSighting).default([]),
    uploadConsent: z.boolean().default(false),
  })
  .strict();
export type GardenData = z.infer<typeof GardenData>;
export const GardenState = z.object({
  revision: z.number().int().nonnegative(),
  data: GardenData,
});
export const UpdateGarden = GardenState.strict();

export const RecordSearch = z
  .object({
    query: z.string().trim().min(1).max(500),
    scope: z.enum(["catalog", "garden"]).default("catalog"),
  })
  .strict();
export const SearchHistory = z.object({
  items: z.array(RecordSearch.extend({ searchedAt: z.iso.datetime() })).max(10),
});
export type SearchHistory = z.infer<typeof SearchHistory>;
