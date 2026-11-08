import { findSpecies, UserProgress } from "@plantopedia/contracts";
export { UserProgress } from "@plantopedia/contracts";

export const rewardRules = {
  discovery: 5,
  animal: 10,
  planting: 25,
  pollinatorPlanting: 50,
  photo_bonus: 5,
  care: 5,
  quest: 20,
  plantingDailyLimit: 3,
  xpPerLevel: 100,
} as const;
export const avatarItems = [
  { id: "sprout", tier: "basic", cost: 0, color: "#166534" },
  { id: "sunshine", tier: "basic", cost: 25, color: "#8A5500" },
  { id: "meadow", tier: "rare", cost: 60, color: "#6D28A0" },
  { id: "pollen", tier: "mythical", cost: 120, color: "#8A5500" },
] as const;
export const questDefinitions = [
  { id: "daily_discovery", kind: "daily", predicate: "bee_plant" },
  { id: "first_planting", kind: "milestone", predicate: "pollinator_planting" },
  { id: "three_care_days", kind: "milestone", predicate: "care_days" },
] as const;
export type RewardAction = {
  id: string;
  kind: "discovery" | "animal" | "planting" | "care" | "photo_bonus";
  speciesId: string;
  plantId: string | null;
  plantingEligible?: boolean | undefined;
  careKey?: string | undefined;
  createdAt: string;
  acknowledged: boolean;
  evidenceKey?: string | undefined;
};
const formats = new Map<string, Intl.DateTimeFormat>();
export function calendarDay(time: number, zone: string) {
  let format = formats.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formats.set(zone, format);
  }
  const parts = format.formatToParts(new Date(time));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function nextMidnight(time: number, zone: string) {
  const day = calendarDay(time, zone);
  let low = Math.floor(time),
    high = low + 36 * 60 * 60 * 1000;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (calendarDay(mid, zone) === day) low = mid;
    else high = mid;
  }
  return high;
}
export function startProgress(now: number, zone: string): UserProgress {
  return UserProgress.parse({
    activatedAt: new Date(now).toISOString(),
    day: {
      key: calendarDay(now, zone),
      zone,
      boundary: nextMidnight(now, zone),
    },
    watermark: now,
  });
}
export function advanceDay(
  progress: UserProgress,
  now: number,
  zone: string,
): UserProgress {
  const p = UserProgress.parse(progress);
  const effective = Math.max(now, p.watermark);
  p.watermark = effective;
  if (effective >= p.day.boundary)
    p.day = {
      key: calendarDay(effective, zone),
      zone,
      boundary: nextMidnight(effective, zone),
    };
  return p;
}
export function applyRewards(
  progress: UserProgress,
  actions: RewardAction[],
  now: number,
  zone: string,
) {
  const p = advanceDay(progress, now, zone);
  let earned = 0;
  let leveled = false;
  function award(key: string, amount: number) {
    if (key in p.claims) return false;
    p.claims[key] = amount;
    p.balance += amount;
    p.lifetime += amount;
    earned += amount;
    if (!p.levelDays.includes(p.day.key)) {
      const total = p.xp + amount;
      if (total >= rewardRules.xpPerLevel) {
        p.level += 1;
        p.xp = 0;
        p.levelDays.push(p.day.key);
        leveled = true;
      } else p.xp = total;
    }
    return true;
  }
  for (const action of actions) {
    if (!action.acknowledged || action.createdAt < p.activatedAt) continue;
    // Process only new durable receipts; later clock changes never reinterpret old actions.
    const actionKey = `action:${action.id}`;
    if (actionKey in p.claims) continue;
    p.claims[actionKey] = 0;
    const plant = findSpecies(action.speciesId);
    const evidenceKey = action.evidenceKey ?? action.id;
    if (
      action.kind === "discovery" &&
      (plant || /^plant:gbif:[0-9]+$/.test(action.speciesId)) &&
      !p.evidence.includes(evidenceKey)
    ) {
      award(
        `discovery:${plant?.species.id ?? action.speciesId}`,
        rewardRules.discovery,
      );
      p.evidence.push(evidenceKey);
      if (plant?.visitors.includes("bee") && !p.questDays.includes(p.day.key)) {
        award(`quest:${p.day.key}`, rewardRules.quest);
        p.questDays.push(p.day.key);
      }
    }
    if (
      action.kind === "animal" &&
      action.speciesId.startsWith("animal:") &&
      !p.evidence.includes(action.id)
    ) {
      award(`animal:${action.speciesId}`, rewardRules.animal);
      p.evidence.push(action.id);
    }
    if (
      action.kind === "planting" &&
      plant &&
      // Local suitability for this flagged invasive species is not verified.
      plant.species.scientificName !== "Wisteria sinensis" &&
      action.plantingEligible !== false
    ) {
      const count = Object.keys(p.claims).filter((k) =>
        k.startsWith(`plantday:${p.day.key}:`),
      ).length;
      if (
        count < rewardRules.plantingDailyLimit &&
        award(
          `planting:${plant.species.id}`,
          plant.pollinatorValue === "supported"
            ? rewardRules.pollinatorPlanting
            : rewardRules.planting,
        )
      ) {
        p.claims[`plantday:${p.day.key}:${plant.species.id}`] = 0;
        if (
          plant.pollinatorValue === "supported" &&
          !p.milestones.includes("first_planting")
        )
          p.milestones.push("first_planting");
      }
    }
    if (
      action.kind === "photo_bonus" &&
      plant &&
      `planting:${plant.species.id}` in p.claims
    )
      award(`photo_bonus:${plant.species.id}`, rewardRules.photo_bonus);
    if (action.kind === "care" && action.plantId) {
      // Catalog-origin saves retain a canonical key even after deletion/recreation.
      const careIdentity = action.careKey ?? action.plantId;
      if (
        award(`care:${careIdentity}:${p.day.key}`, rewardRules.care) &&
        !p.careDays.includes(p.day.key)
      )
        p.careDays.push(p.day.key);
      if (p.careDays.length >= 3 && !p.milestones.includes("three_care_days"))
        p.milestones.push("three_care_days");
    }
  }
  return { progress: UserProgress.parse(p), earned, leveled };
}
export function purchase(progress: UserProgress, itemId: string): UserProgress {
  const item = avatarItems.find((x) => x.id === itemId);
  if (!item) throw new Error("unknown_item");
  if (progress.unlocked.includes(itemId))
    return { ...progress, equipped: itemId };
  if (progress.balance < item.cost) throw new Error("insufficient_pollen");
  return UserProgress.parse({
    ...progress,
    balance: progress.balance - item.cost,
    unlocked: [...progress.unlocked, itemId],
    equipped: itemId,
  });
}
