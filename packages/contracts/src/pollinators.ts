import { z } from "zod";
import { IdentificationFallback } from "./identification-provenance.js";
export const SpeciesReference = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/),
  scientificName: z.string(),
  commonName: z.string(),
  aliases: z.array(z.string()),
});
export type SpeciesReference = z.infer<typeof SpeciesReference>;
export const EcologyVerdict = z.enum([
  "pollinator",
  "not_pollinator",
  "uncertain",
]);
export const PlantSpeciesProfile = z.object({
  species: SpeciesReference,
  lifeCycleType: z.enum([
    "annual",
    "biennial",
    "perennial",
    "mixed",
    "unknown",
  ]),
  pollinatorValue: z.enum(["supported", "none", "unknown"]),
  visitors: z.array(
    z.enum(["bee", "butterfly", "hummingbird", "moth", "beetle"]),
  ),
  traits: z.array(
    z.object({
      kind: z.enum(["leaf", "flower", "height", "bloom", "habit"]),
      text: z.string(),
    }),
  ),
  care: z.object({
    water: z.string().optional(),
    waterNeed: z.enum(["low", "medium", "high"]).optional(),
    sun: z.string().optional(),
    fertilizer: z.string().optional(),
  }),
  caution: z.string().optional(),
  sourceUrl: z.url(),
  image: z
    .object({
      uri: z.string(),
      creator: z.string(),
      license: z.string(),
      licenseUrl: z.url(),
      sourceUrl: z.url(),
    })
    .optional(),
});
export type PlantSpeciesProfile = z.infer<typeof PlantSpeciesProfile>;
export const AnimalIdentification = z.object({
  id: z.string(),
  provider: z.string(),
  fallback: IdentificationFallback.optional(),
  scientificName: z.string().nullable(),
  commonName: z.string().nullable(),
  speciesId: z.string().nullable(),
  score: z.number().min(0).max(1),
  verdict: EcologyVerdict,
  canSting: z.enum(["yes", "possible", "unknown"]),
  plants: z.array(z.string()),
  fact: z.string().nullable(),
  sourceUrl: z.url().nullable(),
});
export type AnimalIdentification = z.infer<typeof AnimalIdentification>;
export const PollinatorSighting = z.object({
  id: z.string(),
  photoUri: z.string(),
  capturedAt: z.string(),
  identification: AnimalIdentification.nullable(),
  saved: z.boolean(),
});
export type PollinatorSighting = z.infer<typeof PollinatorSighting>;

export const PublicIdentificationRequest = z
  .object({
    operationId: z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/),
    image: z.string().min(4).max(2800000),
    locale: z
      .enum(["en", "fr", "es", "de", "zh-Hans", "ja", "ko"])
      .default("en"),
  })
  .strict();
