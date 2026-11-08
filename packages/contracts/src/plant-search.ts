import { z } from "zod";

const PublicUrl = z.url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
});
export const PlantSearchQuery = z.object({
  q: z.string().trim().min(1).max(120),
  lang: z.enum(["en", "fr", "es", "de", "zh-Hans", "ja", "ko"]).default("en"),
});
export const PlantSearchHit = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/),
  title: z.string().min(1).max(300),
  scientificName: z.string().max(200).optional(),
  description: z.string().max(1500),
  url: PublicUrl,
  image: z
    .object({
      url: PublicUrl,
      sourceUrl: PublicUrl,
      credit: z.string().max(300).optional(),
      plantVerified: z.literal(true).optional(),
    })
    .optional(),
});
export type PlantSearchHit = z.infer<typeof PlantSearchHit>;
export const PlantSearchResults = z.object({
  results: z.array(PlantSearchHit).max(8),
  provider: z.enum(["plantnet", "tavily", "openai"]),
});
export type PlantSearchResults = z.infer<typeof PlantSearchResults>;
