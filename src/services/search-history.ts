import { SearchHistory } from "@plantopedia/contracts";
import type { ApiClient } from "./api";

// A clear waits for this session's earlier saves so a slow request cannot
// immediately put a just-cleared search back into the history.
const pending = new WeakMap<ApiClient, Promise<SearchHistory>>();
function write(api: ApiClient, work: () => Promise<SearchHistory>) {
  const previous = pending.get(api) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(work);
  pending.set(api, next);
  return next.finally(() => {
    if (pending.get(api) === next) pending.delete(api);
  });
}
export const searchHistory = {
  read: (api: ApiClient) => api.request("/me/search-history", SearchHistory),
  record: (api: ApiClient, query: string) =>
    write(api, () =>
      api.request("/me/search-history", SearchHistory, {
        method: "POST",
        body: { query, scope: "catalog" },
      }),
    ),
  clear: (api: ApiClient) =>
    write(api, () =>
      api.request("/me/search-history", SearchHistory, { method: "DELETE" }),
    ),
};
