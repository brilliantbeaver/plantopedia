import {
  defaultPreferences,
  GardenData,
  GardenState,
  normalizeSearch,
  RecordSearch,
  SearchHistory,
  UpdateGarden,
} from "@plantopedia/contracts";
import type { Auth } from "../http/identity.js";
import type { Dependencies } from "./ports.js";
import { active, checkRevision, path } from "./core.js";

export function profileService(deps: Dependencies) {
  const gardenPath = (auth: Auth) => path(auth, "profile/garden");
  const historyPath = (auth: Auth) => path(auth, "profile/search-history");

  async function garden(auth: Auth) {
    await active(deps, auth);
    return (
      (await deps.repository.get(gardenPath(auth), GardenState)) ?? {
        revision: 0,
        data: GardenData.parse({}),
      }
    );
  }
  async function updateGarden(auth: Auth, raw: unknown) {
    const input = UpdateGarden.parse(raw);
    return deps.repository.transaction(async (tx) => {
      const user = await active(deps, auth, tx);
      const current = await tx.get(gardenPath(auth), GardenState);
      checkRevision(current?.revision ?? 0, input.revision);
      const next = { revision: input.revision + 1, data: input.data };
      if (!user)
        tx.set(path(auth), {
          status: "active",
          preferences: defaultPreferences,
        });
      // JSON strips optional undefined values before passing data to Firestore.
      tx.set(gardenPath(auth), JSON.parse(JSON.stringify(next)));
      return next;
    });
  }
  async function searchHistory(auth: Auth) {
    await active(deps, auth);
    return (
      (await deps.repository.get(historyPath(auth), SearchHistory)) ?? {
        items: [],
      }
    );
  }
  async function recordSearch(auth: Auth, raw: unknown) {
    const input = RecordSearch.parse(raw);
    return deps.repository.transaction(async (tx) => {
      const user = await active(deps, auth, tx);
      const current = await tx.get(historyPath(auth), SearchHistory);
      const entry = { ...input, searchedAt: deps.now().toISOString() };
      const next = SearchHistory.parse({
        items: [
          entry,
          ...(current?.items ?? []).filter(
            (item) =>
              item.scope !== input.scope ||
              normalizeSearch(item.query) !== normalizeSearch(input.query),
          ),
        ].slice(0, 10),
      });
      if (!user)
        tx.set(path(auth), {
          status: "active",
          preferences: defaultPreferences,
        });
      tx.set(historyPath(auth), next);
      return next;
    });
  }
  async function clearSearchHistory(auth: Auth) {
    return deps.repository.transaction(async (tx) => {
      await active(deps, auth, tx);
      const empty = { items: [] };
      tx.set(historyPath(auth), empty);
      return empty;
    });
  }
  return {
    garden,
    updateGarden,
    searchHistory,
    recordSearch,
    clearSearchHistory,
  };
}
