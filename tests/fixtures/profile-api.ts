import { z } from "zod";
import {
  CreateObservation,
  CreatePlant,
  GardenData,
  GardenState,
  Observation,
  Plant,
  PlantDetail,
  RecordSearch,
  SearchHistory,
  UpdateGarden,
  findSpecies,
  normalizeSearch,
} from "@plantopedia/contracts";
import {
  apiClient,
  RequestError,
  type ApiClient,
} from "../../src/services/api";

/** An HTTP boundary fixture for component tests; durable behavior is tested in server/tests/profile.test.ts. */
export function profileApi(
  owner: string,
  documents: Map<string, unknown>,
): ApiClient {
  const key = (name: string) => `${owner}/${name}`;
  const stamp = (id: string) => ({
    id,
    schemaVersion: 1 as const,
    revision: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const details = () =>
    z.array(PlantDetail).parse(documents.get(key("plants")) ?? []);
  return {
    ...apiClient(async () => owner),
    async request<T>(route: string, schema: z.ZodType<T>, options = {}) {
      const opts = options as { method?: string; body?: unknown };
      if (route === "/me/garden") {
        const state = GardenState.parse(
          documents.get(key("garden")) ?? {
            revision: 0,
            data: GardenData.parse({}),
          },
        );
        if (opts.method === "PUT") {
          const input = UpdateGarden.parse(opts.body);
          if (input.revision !== state.revision)
            throw new RequestError(409, "revision_conflict", false);
          const next = { revision: state.revision + 1, data: input.data };
          documents.set(key("garden"), JSON.parse(JSON.stringify(next)));
          return schema.parse(next);
        }
        return schema.parse(state);
      }
      if (route === "/me/search-history") {
        const history = SearchHistory.parse(
          documents.get(key("history")) ?? { items: [] },
        );
        if (opts.method === "POST") {
          const input = RecordSearch.parse(opts.body);
          history.items = [
            { ...input, searchedAt: new Date().toISOString() },
            ...history.items.filter(
              (entry) =>
                entry.scope !== input.scope ||
                normalizeSearch(entry.query) !== normalizeSearch(input.query),
            ),
          ].slice(0, 10);
        }
        if (opts.method === "DELETE") history.items = [];
        documents.set(key("history"), JSON.parse(JSON.stringify(history)));
        return schema.parse(history);
      }
      throw new RequestError(404, "not_found", false);
    },
    plants: async () => ({
      items: details().map((d) => d.plant),
      limited: false,
      nextCursor: null,
    }),
    async plant(id) {
      const result = details().find((d) => d.plant.id === id);
      if (!result) throw new RequestError(404, "not_found", false);
      return result;
    },
    async createPlant(raw) {
      const input = CreatePlant.parse(raw);
      const species = findSpecies(input.speciesId ?? "");
      const all = details();
      const existing = all.find((d) => d.plant.id === input.id);
      if (existing) return existing.plant;
      const plant = Plant.parse({
        ...stamp(input.id),
        ...input,
        lifecycle: "saved",
        verification: "uncertain",
        scientificName: species?.species.scientificName ?? null,
        commonName: species?.species.commonName ?? null,
        identificationId: null,
        coverPhotoId: null,
      });
      documents.set(key("plants"), [
        ...all,
        {
          plant,
          photos: [],
          observations: [],
          identifications: [],
          selections: [],
        },
      ]);
      return plant;
    },
    async observe(id, raw) {
      const input = CreateObservation.parse(raw);
      const all = details();
      const detail = all.find((d) => d.plant.id === id);
      if (!detail) throw new RequestError(404, "not_found", false);
      const observation =
        detail.observations.find((o) => o.id === input.id) ??
        Observation.parse({
          ...stamp(input.id),
          ...input,
          plantId: id,
          kind: input.kind ?? "user_observation",
        });
      if (!detail.observations.some((o) => o.id === input.id))
        detail.observations.push(observation);
      documents.set(key("plants"), all);
      return observation;
    },
  };
}
