import { GardenData } from "@plantopedia/contracts";
import { profileApi } from "../fixtures/profile-api";
import { gardenData } from "../../src/services/garden-data";
import { searchHistory } from "../../src/services/search-history";
import {
  rewardDiscovery,
  buyAvatar,
  settleRewards,
} from "../../src/features/rewards/service";
import { RequestError } from "../../src/services/api";

test("concurrent profile updates from two devices rebase rather than dropping saved activity", async () => {
  const docs = new Map<string, unknown>();
  const firstDevice = profileApi("user_a", docs);
  const secondDevice = profileApi("user_a", docs);
  await Promise.all([
    gardenData.update("user_a", firstDevice, (d) => ({
      ...d,
      region: "us_nc",
    })),
    gardenData.update("user_a", secondDevice, (d) => ({
      ...d,
      uploadConsent: true,
    })),
  ]);
  const freshDevice = profileApi("user_a", docs);
  expect(await gardenData.read("user_a", freshDevice)).toEqual(
    GardenData.parse({ region: "us_nc", uploadConsent: true }),
  );
  expect(await gardenData.read("user_b", profileApi("user_b", docs))).toEqual(
    GardenData.parse({}),
  );
});

test("simultaneous discoveries and avatar purchases spend profile Pollen only once", async () => {
  const docs = new Map<string, unknown>();
  const api = profileApi("user_a", docs);
  await settleRewards("user_a", api);
  await Promise.all(
    Array.from({ length: 8 }, () =>
      rewardDiscovery(
        "user_a",
        api,
        "ncsu_helianthus_annuus",
        "catalog_sunflower",
      ),
    ),
  );
  expect((await gardenData.read("user_a", api)).progress?.balance).toBe(25);
  await Promise.all([
    buyAvatar("user_a", api, "sunshine"),
    buyAvatar("user_a", api, "sunshine"),
  ]);
  const saved = await gardenData.read("user_a", profileApi("user_a", docs));
  expect(saved.actions).toHaveLength(1);
  expect(saved.progress?.balance).toBe(0);
  expect(saved.progress?.unlocked).toEqual(["sprout", "sunshine"]);
});

test("clearing search history waits for an in-flight save and remains empty on a fresh device", async () => {
  const docs = new Map<string, unknown>();
  const api = profileApi("user_a", docs);
  const request = api.request;
  let resume!: () => void;
  const hold = new Promise<void>((resolve) => {
    resume = resolve;
  });
  const calls: string[] = [];
  api.request = async (route, schema, options) => {
    calls.push(options?.method ?? "GET");
    if (options?.method === "POST") await hold;
    return request(route, schema, options);
  };
  const saving = searchHistory.record(api, "sunflower");
  const clearing = searchHistory.clear(api);
  await Promise.resolve();
  await Promise.resolve();
  expect(calls).not.toContain("DELETE");
  resume();
  await Promise.all([saving, clearing]);
  expect(calls).toEqual(["POST", "DELETE"]);
  expect((await searchHistory.read(profileApi("user_a", docs))).items).toEqual(
    [],
  );
});

test("a failed garden write is surfaced instead of pretending to save locally", async () => {
  const api = profileApi("user_a", new Map());
  const request = api.request;
  api.request = async (route, schema, options) => {
    if (options?.method === "PUT")
      throw new RequestError(503, "database_unavailable", true);
    return request(route, schema, options);
  };
  await expect(
    gardenData.update("user_a", api, (d) => ({ ...d, region: "us_nc" })),
  ).rejects.toThrow("database_unavailable");
  expect((await gardenData.read("user_a", api)).region).toBeUndefined();
});
