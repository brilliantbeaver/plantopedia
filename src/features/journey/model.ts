import type { UserProgress } from "@plantopedia/contracts";

/** Recorded app activity, not knowledge or ecological impact. Undefined inputs
 * mean unavailable data; never turn them into a fresh journey. Checkpoints are
 * independent: deleting a saved plant may reopen only the save checkpoint.
 */
export function journeyState(
  progress: UserProgress | null | undefined,
  savedCount: number | undefined,
) {
  if (progress === undefined || savedCount === undefined) return undefined;
  const discovered = Object.entries(progress?.claims ?? {}).some(
    ([key, value]) => key.startsWith("discovery:") && value > 0,
  );
  const days = Math.min(3, new Set(progress?.careDays ?? []).size);
  const done = [discovered, savedCount > 0, days >= 3];
  return {
    done,
    days,
    completed: done.filter(Boolean).length,
    next: done.findIndex((value) => !value),
  };
}
