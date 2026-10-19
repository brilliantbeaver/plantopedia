import type { PlantDetail } from "@plantopedia/contracts";
import type { Draft } from "./local-schema";
export { Draft } from "./local-schema";
// Web is UI preview only. Native SQLite/files provide the durable device implementation.
const drafts = new Map<string, Draft>();
const cache = new Map<string, PlantDetail>();
export const local = {
  async purgeOwner(owner: string) {
    for (const key of drafts.keys())
      if (key.startsWith(`${owner}/`)) drafts.delete(key);
    for (const key of cache.keys())
      if (key.startsWith(`${owner}/`)) cache.delete(key);
  },
  async retain(_owner: string, _id: string, uri: string) {
    return uri;
  },
  async save(draft: Draft) {
    drafts.set(`${draft.owner}/${draft.id}`, draft);
  },
  async drafts(owner: string) {
    return [...drafts.values()].filter((item) => item.owner === owner);
  },
  async cache(owner: string, detail: PlantDetail) {
    cache.set(`${owner}/${detail.plant.id}`, detail);
  },
  async cached(owner: string, id: string): Promise<unknown> {
    return cache.get(`${owner}/${id}`) ?? null;
  },
  async references(owner: string) {
    return [
      ...new Set(
        [...cache.keys()]
          .filter((key) => key.startsWith(`${owner}/`))
          .map((key) => key.slice(owner.length + 1))
          .concat(
            [...drafts.values()]
              .filter(
                (draft) => draft.owner === owner && draft.stage !== "draft",
              )
              .map((draft) => draft.id),
          ),
      ),
    ];
  },
  async reconcileDeleted(owner: string, id: string) {
    const pending = drafts.get(`${owner}/${id}`);
    if (pending && pending.stage !== "complete")
      drafts.set(`${owner}/${id}`, { ...pending, failure: "record_deleted" });
    else drafts.delete(`${owner}/${id}`);
    cache.delete(`${owner}/${id}`);
  },
  async purge(owner: string, id: string) {
    drafts.delete(`${owner}/${id}`);
    cache.delete(`${owner}/${id}`);
  },
};
