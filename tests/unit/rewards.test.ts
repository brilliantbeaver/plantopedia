import {
  startProgress,
  applyRewards,
  nextMidnight,
  advanceDay,
  purchase,
  type RewardAction,
} from "../../src/features/rewards/rules.js";
const now = Date.parse("2026-03-08T08:00:00Z"),
  zone = "America/Los_Angeles";
const event = (
  id: string,
  kind: RewardAction["kind"],
  speciesId = "ncsu_helianthus_annuus",
  time = now,
): RewardAction => ({
  id,
  kind,
  speciesId,
  plantId: "p1",
  careKey: "catalog_sunflower",
  createdAt: new Date(time).toISOString(),
  acknowledged: true,
});
test("cross-path discovery, alias resolution, replays and purchases preserve independent XP", () => {
  let p = startProgress(now, zone);
  p = applyRewards(
    p,
    [
      event("scan1", "discovery"),
      event("search1", "discovery", "sunflower"),
      event("readd", "discovery"),
    ],
    now,
    zone,
  ).progress;
  expect(p.balance).toBe(25);
  expect(p.xp).toBe(25);
  expect(p.questDays).toHaveLength(1);
  p = purchase(p, "sunshine");
  expect(p.balance).toBe(0);
  expect(p.lifetime).toBe(25);
  expect(p.xp).toBe(25);
  expect(() => purchase(p, "meadow")).toThrow("insufficient_pollen");
  expect(applyRewards(p, [event("scan1", "discovery")], now, zone).earned).toBe(
    0,
  );
});
test("planting is capped and distinct care/photo claims cannot be replayed or farmed", () => {
  let p = startProgress(now, zone);
  const actions = [
    "ncsu_helianthus_annuus",
    "ncsu_echinacea_purpurea",
    "ncsu_asclepias_syriaca",
    "ncsu_ginkgo_biloba",
  ].map((id, i) => event(`plant${i}`, "planting", id));
  p = applyRewards(p, actions, now, zone).progress;
  expect(p.balance).toBe(150);
  expect(p.level).toBe(2);
  expect(p.xp).toBe(0);
  p = applyRewards(
    p,
    [
      event("bonus1", "photo_bonus"),
      event("bonus2", "photo_bonus"),
      event("care1", "care"),
      { ...event("care2", "care"), plantId: "recreated" },
    ],
    now,
    zone,
  ).progress;
  expect(p.balance).toBe(160);
  expect(p.level).toBe(2);
  expect(p.xp).toBe(0);
  p = applyRewards(
    p,
    [event("tomorrow", "care", undefined, now + 86400000)],
    now + 86400000,
    zone,
  ).progress;
  expect(p.balance).toBe(165);
  expect(p.xp).toBe(5);
});
test("calendar midnight handles DST and pinned travel zone, rollback never reopens a day", () => {
  expect(nextMidnight(now, zone) - now).toBe(23 * 3600000);
  const fall = Date.parse("2026-11-01T07:00:00Z");
  expect(nextMidnight(fall, zone) - fall).toBe(25 * 3600000);
  let p = startProgress(now, zone);
  p = advanceDay(p, now + 1000, "Asia/Tokyo");
  expect(p.day.zone).toBe(zone);
  const boundary = p.day.boundary;
  p = advanceDay(p, boundary, "Asia/Tokyo");
  expect(p.day.zone).toBe("Asia/Tokyo");
  const current = p.day.key;
  p = advanceDay(p, now, zone);
  expect(p.day.key).toBe(current);
  expect(p.watermark).toBe(boundary);
});
test("historical and unacknowledged actions do not earn, and exactly one daily quest completes", () => {
  const p = startProgress(now, zone);
  const r = applyRewards(
    p,
    [
      event("old", "discovery", undefined, now - 1),
      { ...event("pending", "planting"), acknowledged: false },
      event("new", "discovery"),
      event("other", "discovery", "ncsu_echinacea_purpurea"),
    ],
    now,
    zone,
  );
  expect(r.earned).toBe(30);
  expect(r.progress.questDays).toHaveLength(1);
  expect(JSON.parse(JSON.stringify(r.progress))).toEqual(r.progress);
});
test("region-inappropriate planting remains a check-in without a planting reward", () => {
  const result = applyRewards(
    startProgress(now, zone),
    [
      {
        ...event("invasive", "planting", "ncsu_wisteria_sinensis"),
        plantingEligible: false,
      },
    ],
    now,
    zone,
  );
  expect(result.progress.balance).toBe(0);
  expect(result.progress.milestones).toEqual([]);
});
test("different selection intents share one photo evidence claim, while unacknowledged intents cannot win it", () => {
  const result = applyRewards(
    startProgress(now, zone),
    [
      {
        ...event("failed_intent", "discovery"),
        evidenceKey: "photo_1",
        acknowledged: false,
      },
      {
        ...event("confirmed_intent", "discovery", "ncsu_echinacea_purpurea"),
        evidenceKey: "photo_1",
      },
      { ...event("later_correction", "discovery"), evidenceKey: "photo_1" },
    ],
    now,
    zone,
  );
  expect(result.progress.balance).toBe(25);
  expect(result.progress.claims["discovery:ncsu_echinacea_purpurea"]).toBe(5);
  expect(
    result.progress.claims["discovery:ncsu_helianthus_annuus"],
  ).toBeUndefined();
});

test.each([true, undefined])(
  "unverified wisteria never earns planting points from legacy eligible=%s receipts",
  (plantingEligible) => {
    const result = applyRewards(
      startProgress(now, zone),
      [
        {
          ...event("legacy_wisteria", "planting", "ncsu_wisteria_sinensis"),
          plantingEligible,
        },
      ],
      now,
      zone,
    );
    expect(result.earned).toBe(0);
    expect(
      result.progress.claims["planting:ncsu_wisteria_sinensis"],
    ).toBeUndefined();
  },
);
