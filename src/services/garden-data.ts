import { GardenData, GardenState } from "@plantopedia/contracts";
import { RequestError, type ApiClient } from "./api";
export { GardenData, GardenAction } from "@plantopedia/contracts";

// Serialize transforms for one session. A server revision also protects against
// simultaneous updates from another tab or device; never overwrite stale data.
const pending = new WeakMap<ApiClient, Promise<unknown>>();
export const gardenData = {
  async read(_owner: string, api: ApiClient) {
    return (await api.request("/me/garden", GardenState)).data;
  },
  async update(
    _owner: string,
    api: ApiClient,
    change: (data: GardenData) => GardenData,
  ): Promise<GardenData> {
    const previous = pending.get(api) ?? Promise.resolve();
    const work = previous
      .catch(() => undefined)
      .then(async () => {
        for (let attempt = 0; ; attempt++) {
          const state = await api.request("/me/garden", GardenState);
          const data = GardenData.parse(change(state.data));
          if (JSON.stringify(data) === JSON.stringify(state.data)) return data;
          try {
            return (
              await api.request("/me/garden", GardenState, {
                method: "PUT",
                body: { revision: state.revision, data },
              })
            ).data;
          } catch (error) {
            if (
              !(error instanceof RequestError) ||
              error.code !== "revision_conflict" ||
              attempt >= 3
            )
              throw error;
          }
        }
      });
    pending.set(api, work);
    try {
      return await work;
    } finally {
      if (pending.get(api) === work) pending.delete(api);
    }
  },
};
