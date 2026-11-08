import { createHash } from "node:crypto";
import { tavily } from "@tavily/core";
import { z } from "zod";
import {
  PlantSearchHit,
  PlantSearchResults,
  providerLanguage,
} from "@plantopedia/contracts";
import type { Locale } from "@plantopedia/contracts";
import type { Config } from "../config/env.js";
import { AppError } from "../application/errors.js";
import { createOpenAIResearch } from "./openai-research.js";
import { searchFailure, SearchFailure } from "./search-support.js";
import {
  createPlantPhotoFilter,
  type PlantPhotoFilter,
} from "./plant-search-images.js";

export interface PlantSearchProvider {
  search(query: string, locale: Locale): Promise<PlantSearchResults>;
}
type Search = (query: string, locale: Locale) => Promise<PlantSearchHit[]>;
const Species = z.object({
  id: z.string(),
  scientificNameWithoutAuthor: z.string().min(1),
  commonNames: z.array(z.string()).default([]),
  gbifId: z.number().nullish(),
  powoId: z.string().nullish(),
  images: z
    .array(
      z.object({
        author: z.string().optional(),
        license: z.string().optional(),
        citation: z.string().optional(),
        url: z.object({ m: z.url() }),
      }),
    )
    .optional(),
});
const identifier = (url: string) =>
  `web_${createHash("sha256").update(url).digest("hex").slice(0, 24)}`;
function validHits(values: unknown[]) {
  const unique = new Map<string, PlantSearchHit>();
  for (const value of values) {
    let hit = PlantSearchHit.safeParse(value);
    if (!hit.success && value && typeof value === "object") {
      // A malformed optional photo must not erase a useful text result.
      hit = PlantSearchHit.safeParse({ ...value, image: undefined });
    }
    if (hit.success) unique.set(hit.data.url, hit.data);
  }
  if (values.length && !unique.size)
    throw new SearchFailure("invalid_response");
  return [...unique.values()].slice(0, 8);
}

// Both empty and failed providers advance the chain. Cache only successful
// public results, never identity, history, errors, or empty responses.
export function withPlantSearchFallback(
  providers: { name: PlantSearchResults["provider"]; search: Search }[],
  filterPhotos?: PlantPhotoFilter,
): PlantSearchProvider {
  const cache = new Map<string, { until: number; value: PlantSearchResults }>();
  const pending = new Map<string, Promise<PlantSearchResults>>();
  return {
    async search(query, locale) {
      const key = `${locale}:${query.trim().toLocaleLowerCase()}`;
      const saved = cache.get(key);
      if (saved && saved.until > Date.now()) return saved.value;
      const running = pending.get(key);
      if (running) return running;
      const work = (async () => {
        let failed = false;
        for (const provider of providers) {
          try {
            const results = validHits(await provider.search(query, locale));
            if (!results.length) continue;
            const value = PlantSearchResults.parse({
              results: filterPhotos
                ? await filterPhotos(results, query)
                : results.map(({ image: _image, ...text }) => text),
              provider: provider.name,
            });
            if (cache.size >= 200) cache.delete(cache.keys().next().value!);
            cache.set(key, { until: Date.now() + 5 * 60_000, value });
            return value;
          } catch (error) {
            failed = true;
            console.warn(
              JSON.stringify({
                service: "plantopedia-plant-search",
                provider: provider.name,
                reason: searchFailure(error).reason,
              }),
            );
          }
        }
        if (failed) throw new AppError(502, "search_unavailable", true);
        return { results: [], provider: providers.at(-1)!.name };
      })();
      pending.set(key, work);
      try {
        return await work;
      } finally {
        pending.delete(key);
      }
    },
  };
}

export function createPlantSearch(config: Config): PlantSearchProvider {
  const client = tavily({ apiKey: config.TAVILY_API_KEY });
  const openai = createOpenAIResearch(config, true);
  let imagesUnavailableUntil = 0;
  const plantnet: Search = async (query, locale) => {
    const url = new URL("https://my-api.plantnet.org/v2/species");
    for (const [key, value] of Object.entries({
      "api-key": config.PLANTNET_API_KEY,
      prefix: query,
      lang: providerLanguage(locale),
      page: "1",
      pageSize: "6",
    }))
      url.searchParams.set(key, value);
    const images = Date.now() >= imagesUnavailableUntil;
    if (images) url.searchParams.set("images", "true");
    let response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (images && [401, 402, 403].includes(response.status)) {
      // Image illustrations require Pro. Preserve text search on other plans.
      imagesUnavailableUntil = Date.now() + 60 * 60_000;
      url.searchParams.delete("images");
      response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    }
    if (!response.ok)
      throw Object.assign(new SearchFailure("upstream"), {
        status: response.status,
      });
    const parsed = z.array(Species).safeParse(await response.json());
    if (!parsed.success) throw new SearchFailure("invalid_response");
    const normalized = query.trim().toLocaleLowerCase();
    return validHits(
      parsed.data
        .filter((species) => {
          const scientific =
            species.scientificNameWithoutAuthor.toLocaleLowerCase();
          // A scientific prefix such as "rose" can match Rosenbergiodendron.
          // Common names must match a whole name, or defer to web search.
          return (
            scientific === normalized ||
            scientific.startsWith(`${normalized} `) ||
            species.commonNames.some(
              (name) => name.toLocaleLowerCase() === normalized,
            )
          );
        })
        .map((species) => {
          const source = species.powoId
            ? `https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:${species.powoId}`
            : species.gbifId
              ? `https://www.gbif.org/species/${species.gbifId}`
              : `https://identify.plantnet.org/k-world-flora/species/${encodeURIComponent(species.scientificNameWithoutAuthor)}/data`;
          const photo = species.images?.find((image) =>
            image.url.m.startsWith("https://"),
          );
          return {
            id: `plantnet_${species.id}`,
            title:
              species.commonNames[0] || species.scientificNameWithoutAuthor,
            scientificName: species.scientificNameWithoutAuthor,
            description: species.commonNames.slice(1, 5).join(" · "),
            url: source,
            ...(photo
              ? {
                  image: {
                    url: photo.url.m,
                    sourceUrl: source,
                    credit:
                      photo.citation ||
                      `${photo.author || "Pl@ntNet"} · ${photo.license || "Pl@ntNet"}`,
                  },
                }
              : {}),
          };
        }),
    );
  };
  const web: Search = async (query) => {
    const result = await client.search(
      `${query} plant botanical species`.slice(0, 200),
      {
        maxResults: 4,
        timeout: 4,
        searchDepth: "basic",
        includeAnswer: false,
        includeImages: true,
        includeImageDescriptions: true,
      },
    );
    if (!Array.isArray(result.results))
      throw new SearchFailure("invalid_response");
    return validHits(
      result.results.map((item) => {
        // Per-result images are explicitly associated with the source page.
        // Never attach an unrelated global image to a botanical result.
        const photo = item?.images?.find((image) =>
          image.url?.startsWith("https://"),
        );
        return {
          id: identifier(item?.url || ""),
          title: item?.title?.slice(0, 300),
          description: item?.content?.slice(0, 1500) || "",
          url: item?.url,
          ...(photo ? { image: { url: photo.url, sourceUrl: item.url } } : {}),
        };
      }),
    );
  };
  return withPlantSearchFallback(
    [
      {
        name: "plantnet",
        search: async (query, locale) => {
          const hits = await plantnet(query, locale);
          if (!hits.length || hits.every((hit) => hit.image)) return hits;
          try {
            const sources = await web(query, locale);
            return hits.map((hit) => {
              if (hit.image || !hit.scientificName) return hit;
              const name = hit.scientificName.toLocaleLowerCase();
              const source = sources.find(
                (source) =>
                  source.image &&
                  `${source.title} ${source.description}`
                    .toLocaleLowerCase()
                    .includes(name),
              );
              return source?.image ? { ...hit, image: source.image } : hit;
            });
          } catch {
            // Optional image enrichment must never discard valid botanical results.
            return hits;
          }
        },
      },
      { name: "tavily", search: web },
      {
        name: "openai",
        search: async (query) =>
          (await openai.search(`${query} plant botanical species`)).map(
            (source) => ({
              id: source.id,
              title: source.title,
              description: source.excerpt,
              url: source.url,
            }),
          ),
      },
    ],
    createPlantPhotoFilter(config),
  );
}
