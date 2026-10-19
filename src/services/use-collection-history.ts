import { useEffect, useState } from "react";
import { collectionHistory } from "./collection-history";

/** A per-account hint for the home screen, never a replacement for server data. */
export function useCollectionHistory(
  owner: string,
  hasPlants: boolean | undefined,
) {
  const [stored, setStored] = useState<{
    owner: string;
    value: boolean | null;
  } | null>(null);
  useEffect(() => {
    if (hasPlants !== undefined) {
      void collectionHistory.write(owner, hasPlants).catch(() => undefined);
      return;
    }
    let active = true;
    void collectionHistory
      .read(owner)
      .then((value) => {
        if (active) setStored({ owner, value });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [owner, hasPlants]);
  return hasPlants ?? (stored?.owner === owner ? stored.value : null);
}
