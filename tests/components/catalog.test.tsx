import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "../../src/theme/preferences";
import { searchHistory } from "../../src/services/search-history";
import { SpeciesContent } from "../../src/features/catalog/SpeciesContent";
import { profileApi } from "../fixtures/profile-api";
import { findSpecies, searchCatalog } from "../../src/features/catalog/catalog";
import { gardenData } from "../../src/services/garden-data";
import { searchPlants } from "../../src/services/plant-search";
import { Linking } from "react-native";
import SearchPlants from "../../src/app/search";
import { PlantDetail, type AnimalIdentification } from "@plantopedia/contracts";
import type { ApiClient } from "../../src/services/api";
import type { Draft } from "../../src/services/local-schema";
import {
  recordGardenAction,
  recoverGardenActions,
  saveSpecies,
} from "../../src/features/garden/actions";
import {
  stagePhotoDiscovery,
  stageAnimalDiscovery,
  settleRewards,
} from "../../src/features/rewards/service";

jest.mock("../../src/services/plant-search", () => ({
  searchPlants: jest.fn(async () => ({ results: [], provider: "tavily" })),
}));
const mockDocs = new Map<string, unknown>();
const mockPush = jest.fn();
let mockRouteQuery: string | undefined;
let mockDrafts: Draft[] = [];
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    canGoBack: () => false,
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({ q: mockRouteQuery }),
}));
jest.mock("../../src/services/feature-storage", () => ({
  featureStorage: {
    read: async (o: string, k: string) => mockDocs.get(`${o}/${k}`) ?? null,
    update: async (o: string, k: string, f: (v: unknown) => unknown) => {
      const v = f(mockDocs.get(`${o}/${k}`) ?? null);
      mockDocs.set(`${o}/${k}`, v);
      return v;
    },
  },
}));
jest.mock("../../src/services/local", () => ({
  local: { save: jest.fn(async () => {}), drafts: async () => mockDrafts },
}));
const OWNER = "user_fixture";
const mockApi = profileApi(OWNER, mockDocs);
let mockKind = "cloud";
jest.mock("../../src/services/session", () => ({
  useSessionApi: () => ({
    api: mockApi,
    owner: "user_fixture",
    kind: mockKind,
  }),
}));
let mockId = 0;
jest.mock("expo-crypto", () => ({ randomUUID: () => `species_${++mockId}` }));
beforeEach(() => {
  jest
    .mocked(searchPlants)
    .mockReset()
    .mockResolvedValue({ results: [], provider: "tavily" });
  mockRouteQuery = undefined;
  mockDocs.clear();
  mockKind = "cloud";
  mockDrafts = [];
  mockPush.mockClear();
});
test.each(["us_nc", "other", undefined] as const)(
  "Chinese wisteria planting remains recorded without incentives in region %s",
  async (region) => {
    await gardenData.update(OWNER, mockApi, (d) => ({ ...d, region }));
    const id = await recordGardenAction(
      OWNER,
      mockApi,
      findSpecies("wisteria")!,
      "planting",
      "Actually planted",
    );
    const data = await gardenData.read(OWNER, mockApi);
    expect(data.actions[0]?.acknowledged).toBe(true);
    expect(data.actions[0]?.plantingEligible).toBe(false);
    expect(data.progress?.balance).toBe(0);
    expect(data.progress?.milestones).toEqual([]);
    expect((await mockApi.plant(id)).observations).toHaveLength(1);
  },
);

test("recovery does not award a previously eligible pending wisteria planting", async () => {
  const profile = findSpecies("wisteria")!;
  const plant = await saveSpecies(OWNER, mockApi, profile);
  await settleRewards(OWNER, mockApi);
  await gardenData.update(OWNER, mockApi, (d) => ({
    ...d,
    actions: [
      {
        id: `planting_${profile.species.id}`,
        kind: "planting",
        speciesId: profile.species.id,
        plantId: plant.id,
        createdAt: new Date().toISOString(),
        acknowledged: false,
        plantingEligible: true,
        text: "Actually planted",
      },
    ],
  }));
  await recoverGardenActions(OWNER, mockApi, () => true);
  await settleRewards(OWNER, mockApi);
  const data = await gardenData.read(OWNER, mockApi);
  expect(data.actions[0]?.acknowledged).toBe(true);
  expect(data.actions[0]?.plantingEligible).toBe(false);
  expect(data.progress?.balance).toBe(0);
});

test("saved plants expose observation check-ins without opening care details", async () => {
  const profile = findSpecies("sunflower")!;
  await saveSpecies(OWNER, mockApi, profile);
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <SpeciesContent profile={profile} />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  expect(await screen.findByText("Notice what changed")).toBeTruthy();
  expect(
    screen.getAllByRole("button", { name: "I checked this plant" }),
  ).toHaveLength(1);
  expect(screen.getByText("Planting is optional")).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "I checked this plant" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Check-in saved" })).toBeTruthy(),
  );
  expect(
    (await gardenData.read(OWNER, mockApi)).progress?.careDays,
  ).toHaveLength(1);
  view.unmount();
  query.clear();
});

test("wisteria explains the reward exclusion before planting and never offers an unearnable photo bonus", async () => {
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <SpeciesContent profile={findSpecies("wisteria")!} />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  expect(screen.getByText(/logging it earns no planting Pollen/)).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "North Carolina, USA" }),
  ).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "I planted this" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Planted" })).toBeDisabled(),
  );
  expect(
    screen.queryByRole("button", { name: /Add a planting photo/ }),
  ).toBeNull();
  view.unmount();
  query.clear();
});

test("offline source catalog supports aliases and typos without inventing traits", () => {
  expect(searchCatalog("sunflwer")[0]?.species.commonName).toBe("Sunflower");
  expect(searchCatalog("Helianthus annuus")[0]?.species.id).toBe(
    findSpecies("common sunflower")?.species.id,
  );
  expect(searchCatalog("nonsensezzzz")).toEqual([]);
  for (const p of searchCatalog("a"))
    expect(p.traits.length).toBeGreaterThanOrEqual(3);
});
test("guests can search and open species with an immediate sign-in invitation and no saved history or rewards", async () => {
  mockKind = "guest";
  const calls = jest.spyOn(mockApi, "request");
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <SearchPlants />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  expect(
    screen.getByText(
      "Sign in to save searches and identify plants from photos.",
      { exact: false },
    ),
  ).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(mockPush).toHaveBeenCalledWith(
    expect.objectContaining({ pathname: "/login" }),
  );
  fireEvent.changeText(screen.getByLabelText("Search plants"), "sunflower");
  fireEvent.press(
    await screen.findByRole("button", { name: "Sunflower, Helianthus annuus" }),
  );
  await waitFor(() =>
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/species/[speciesId]",
      params: { speciesId: "ncsu_helianthus_annuus" },
    }),
  );
  expect(calls).not.toHaveBeenCalled();
  expect(mockDocs.size).toBe(0);
  view.unmount();
  query.clear();
  calls.mockRestore();
});
test("a guest species profile offers sign-in to save and never mounts personal queries", async () => {
  mockKind = "guest";
  const calls = jest.spyOn(mockApi, "request");
  const plants = jest.spyOn(mockApi, "plants");
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <SpeciesContent profile={findSpecies("sunflower")} />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(mockPush).toHaveBeenCalledWith(
    expect.objectContaining({ pathname: "/login" }),
  );
  expect(screen.queryByRole("button", { name: "Save plant" })).toBeNull();
  expect(screen.queryByRole("button", { name: "I planted this" })).toBeNull();
  expect(calls).not.toHaveBeenCalled();
  expect(plants).not.toHaveBeenCalled();
  view.unmount();
  query.clear();
  calls.mockRestore();
  plants.mockRestore();
});
test("signed-in text searches with no matches are saved without opening a result and can be cleared", async () => {
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <SearchPlants />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  fireEvent.changeText(screen.getByLabelText("Search plants"), "nonsensezzzz");
  await screen.findByText(/No results yet. Try another spelling/);
  await waitFor(async () =>
    expect((await searchHistory.read(mockApi)).items[0]?.query).toBe(
      "nonsensezzzz",
    ),
  );
  expect((await gardenData.read(OWNER, mockApi)).actions).toEqual([]);
  fireEvent.press(screen.getByRole("button", { name: "Clear search" }));
  await screen.findByRole("button", { name: "nonsensezzzz" });
  fireEvent.press(screen.getByRole("button", { name: "Clear search" }));
  await waitFor(async () =>
    expect((await searchHistory.read(mockApi)).items).toEqual([]),
  );
  view.unmount();
  query.clear();
});
test("rapid catalog queries show the latest typo match; opening records discovery without saving a specimen", async () => {
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <SearchPlants />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  const input = screen.getByLabelText("Search plants");
  fireEvent.changeText(input, "wisteria");
  fireEvent.changeText(input, "sunflwer");
  const match = await screen.findByRole("button", {
    name: "Sunflower, Helianthus annuus",
  });
  expect(
    screen.queryByRole("button", { name: /Chinese wisteria,/ }),
  ).toBeNull();
  expect((await gardenData.read(OWNER, mockApi)).actions).toEqual([]);
  fireEvent.press(match);
  await waitFor(() =>
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/species/[speciesId]",
      params: { speciesId: "ncsu_helianthus_annuus" },
    }),
  );
  expect((await mockApi.plants()).items).toEqual([]);
  expect((await gardenData.read(OWNER, mockApi)).progress?.balance).toBe(25);
  view.unmount();
  query.clear();
});
test("catalog profile shows visitors, care in one tap, and saves without a photo exactly once", async () => {
  const profile = findSpecies("sunflower")!;
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <SpeciesContent profile={profile} showPhoto />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  expect(screen.getByText("Bee")).toBeTruthy();
  expect(screen.getByText("Butterfly")).toBeTruthy();
  expect(screen.queryByText(profile.care.water!)).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "How to care" }));
  expect(screen.getByText(profile.care.water!)).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Save plant" }));
  await screen.findByRole("button", { name: "Already saved" });
  expect((await mockApi.plants()).items).toHaveLength(1);
  expect((await mockApi.plants()).items[0]?.coverPhotoId).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "I planted this" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Planted" })).toBeDisabled(),
  );
  expect(
    (await gardenData.read(OWNER, mockApi)).actions.filter(
      (a) => a.acknowledged,
    ),
  ).toHaveLength(1);
  expect(
    (await gardenData.read("user_other", profileApi("user_other", mockDocs)))
      .actions,
  ).toEqual([]);
  view.unmount();
  query.clear();
});

test("interrupted photo selection recovers only its acknowledged revision and never credits a correction twice", async () => {
  const plant = await mockApi.createPlant(
    {
      id: "photo_plant",
      nickname: "Test",
      ownership: "observed",
      place: "",
      capturedAt: new Date().toISOString(),
    },
    "photo_create",
  );
  const stamp = {
    schemaVersion: 1,
    revision: 1,
    createdAt: plant.createdAt,
    updatedAt: plant.updatedAt,
  };
  const detail = PlantDetail.parse({
    plant,
    observations: [],
    photos: [],
    selections: [],
    identifications: [
      {
        ...stamp,
        id: "id_first",
        plantId: plant.id,
        photoIds: ["same_photo"],
        provider: "plantnet",
        providerVersion: "test",
        status: "ready",
        needsMoreEvidence: false,
        language: "en",
        candidates: [
          {
            scientificName: "Helianthus annuus",
            commonNames: ["Sunflower"],
            score: 0.95,
            taxonId: "3119190",
            authorship: "",
          },
        ],
      },
    ],
  });
  const receipt = await stagePhotoDiscovery(OWNER, mockApi, detail, {
    identificationId: "id_first",
    candidateIndex: 0,
    revision: 1,
  });
  const read = jest.fn(async () => detail);
  const api = { ...mockApi, plant: read } as ApiClient;
  await recoverGardenActions(OWNER, api, () => true);
  expect((await gardenData.read(OWNER, mockApi)).progress?.balance).toBe(0);
  // A durable server selection exists, but the local acknowledgment was lost.
  detail.selections.push({
    ...stamp,
    id: "selection_1",
    plantId: plant.id,
    identificationId: "id_first",
    candidateIndex: 0,
    scientificName: "Helianthus annuus",
    supersedesRevision: 1,
    verification: "user_confirmed",
  });
  await recoverGardenActions(OWNER, api, () => true);
  await recoverGardenActions(OWNER, api, () => true);
  expect(
    (await gardenData.read(OWNER, mockApi)).actions.find(
      (a) => a.id === receipt,
    )?.acknowledged,
  ).toBe(true);
  expect((await gardenData.read(OWNER, mockApi)).progress?.balance).toBe(25);
  // Re-identifying the same evidence under a different supported species is not new discovery.
  detail.identifications[0]!.id = "id_corrected";
  detail.identifications[0]!.candidates[0]!.scientificName =
    "Echinacea purpurea";
  await stagePhotoDiscovery(OWNER, mockApi, detail, {
    identificationId: "id_corrected",
    candidateIndex: 0,
    revision: 2,
  });
  detail.selections.push({
    ...stamp,
    id: "selection_2",
    plantId: plant.id,
    identificationId: "id_corrected",
    candidateIndex: 0,
    scientificName: "Echinacea purpurea",
    supersedesRevision: 2,
    verification: "user_confirmed",
  });
  await recoverGardenActions(OWNER, api, () => true);
  expect((await gardenData.read(OWNER, mockApi)).progress?.balance).toBe(25);
});

test("interrupted animal credit recovers a persisted result without resubmitting an image", async () => {
  await stageAnimalDiscovery(OWNER, mockApi, "bug_recovery");
  const result: AnimalIdentification = {
    id: "bug_recovery",
    provider: "test_only",
    scientificName: "Apis mellifera",
    commonName: "Honey bee",
    speciesId: "animal:test:bee",
    score: 0.95,
    verdict: "pollinator",
    canSting: "yes",
    plants: [],
    fact: null,
    sourceUrl: null,
  };
  // Simulates a process kill after local.save(result), before progress commit.
  mockDrafts = [{ id: "bug_recovery", animalResult: result } as Draft];
  const api = mockApi;
  await recoverGardenActions(OWNER, api, () => true);
  await recoverGardenActions(OWNER, api, () => true);
  expect((await gardenData.read(OWNER, mockApi)).progress?.balance).toBe(10);
  expect(
    (await gardenData.read("other_owner", profileApi("other_owner", mockDocs)))
      .progress,
  ).toBeUndefined();
});

test("resuming a search updates the field and results when route parameters arrive after mount", async () => {
  mockKind = "guest";
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const page = () => (
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <SearchPlants />
      </QueryClientProvider>
    </PreferencesProvider>
  );
  const view = render(page());
  mockRouteQuery = "sunflower";
  view.rerender(page());
  await screen.findByRole("button", { name: "Sunflower, Helianthus annuus" });
  expect(screen.getByPlaceholderText("Search plants")).toHaveDisplayValue(
    "sunflower",
  );
  mockRouteQuery = "wisteria";
  view.rerender(page());
  await screen.findByRole("button", {
    name: "Chinese wisteria, Wisteria sinensis",
  });
  expect(
    screen.queryByRole("button", { name: "Sunflower, Helianthus annuus" }),
  ).toBeNull();
  expect(screen.getAllByRole("button", { name: "Sign in" })).toHaveLength(1);
  expect(mockDocs.size).toBe(0);
  view.unmount();
  query.clear();
});

test("a guest search with no results still has exactly one Sign in control", async () => {
  mockKind = "guest";
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <SearchPlants />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  fireEvent.changeText(
    screen.getByPlaceholderText("Search plants"),
    "lavender",
  );
  await screen.findByText(
    "No results yet. Try another spelling or a scientific name.",
  );
  expect(screen.getAllByRole("button", { name: /^Sign in/ })).toHaveLength(1);
  expect(
    screen.queryByRole("button", { name: "Sign in to scan a photo" }),
  ).toBeNull();
  expect(mockDocs.size).toBe(0);
  view.unmount();
  query.clear();
});

test("live guest results show representative images, source links, and a single sign-in without writing history", async () => {
  mockKind = "guest";
  mockRouteQuery = "lavender";
  jest.mocked(searchPlants).mockResolvedValue({
    provider: "tavily",
    results: [
      {
        id: "lavender",
        title: "Lavender · Botanical garden",
        description: "Lavandula angustifolia",
        url: "https://garden.example/lavender",
        image: {
          url: "https://garden.example/lavender.jpg",
          plantVerified: true,
          sourceUrl: "https://garden.example/lavender",
        },
      },
    ],
  });
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <SearchPlants />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  const result = await screen.findByRole("link", {
    name: /Lavender · Botanical garden/,
  });
  expect(screen.getByLabelText(/Reference photo.*Lavender/)).toBeTruthy();
  expect(screen.getAllByRole("button", { name: /^Sign in/ })).toHaveLength(1);
  fireEvent.press(result);
  expect(open).toHaveBeenCalledWith("https://garden.example/lavender");
  fireEvent(screen.getByLabelText(/Reference photo.*Lavender/), "error");
  expect(screen.queryByLabelText(/Reference photo.*Lavender/)).toBeNull();
  expect(
    screen.getByRole("link", { name: /Lavender · Botanical garden/ }),
  ).toBeTruthy();
  expect(mockDocs.size).toBe(0);
  view.unmount();
  query.clear();
  open.mockRestore();
});

test("a search outage shows retry instead of no matches; retry recovers while sign-in stays singular", async () => {
  mockKind = "guest";
  mockRouteQuery = "lavender";
  jest
    .mocked(searchPlants)
    .mockRejectedValueOnce(new Error("outage"))
    .mockResolvedValueOnce({
      provider: "openai",
      results: [
        {
          id: "lavender",
          title: "Lavender recovered",
          description: "Botanical evidence",
          url: "https://flora.example/lavender",
        },
      ],
    });
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <SearchPlants />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  await screen.findByText(
    "Live search is temporarily unavailable. Please try again.",
  );
  expect(screen.queryByText(/No results yet/)).toBeNull();
  expect(screen.getAllByRole("button", { name: /^Sign in/ })).toHaveLength(1);
  fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  await screen.findByText("Lavender recovered");
  expect(screen.queryByText(/Live search is temporarily/)).toBeNull();
  view.unmount();
  query.clear();
});

test("an older live response cannot replace a newer query or repopulate a cleared search", async () => {
  mockKind = "guest";
  mockRouteQuery = "lavender";
  let finish:
    ((value: Awaited<ReturnType<typeof searchPlants>>) => void) | undefined;
  jest
    .mocked(searchPlants)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue({
      provider: "tavily",
      results: [
        {
          id: "basil",
          title: "Sweet basil",
          description: "Ocimum basilicum",
          url: "https://flora.example/basil",
        },
      ],
    });
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <SearchPlants />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  fireEvent.changeText(screen.getByLabelText("Search plants"), "basil");
  await screen.findByText("Sweet basil");
  finish?.({
    provider: "tavily",
    results: [
      {
        id: "lavender",
        title: "Old lavender",
        description: "Lavandula",
        url: "https://flora.example/lavender",
      },
    ],
  });
  await waitFor(() => expect(screen.queryByText("Old lavender")).toBeNull());
  fireEvent.press(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.queryByText("Sweet basil")).toBeNull();
  view.unmount();
  query.clear();
});

test("an unverified remote photo is never rendered even if its URL looks botanical", async () => {
  mockKind = "guest";
  mockRouteQuery = "lavender";
  jest.mocked(searchPlants).mockResolvedValue({
    provider: "tavily",
    results: [
      {
        id: "unverified",
        title: "Lavender source",
        description: "Useful text without a verified image",
        url: "https://flora.example/lavender",
        image: {
          url: "https://flora.example/lavender.jpg",
          sourceUrl: "https://flora.example/lavender",
        },
      },
    ],
  });
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <SearchPlants />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  await screen.findByText("Lavender source");
  expect(screen.queryByLabelText(/Reference photo.*Lavender/)).toBeNull();
  expect(screen.getAllByRole("button", { name: /^Sign in/ })).toHaveLength(1);
  view.unmount();
  query.clear();
});
