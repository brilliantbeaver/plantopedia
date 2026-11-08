import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "../../src/theme/preferences";
import { BugDraft, BugResult } from "../../src/features/pollinators/BugDraft";
import { GardenSightings } from "../../src/features/pollinators/GardenSightings";
import { ProgressScreen } from "../../src/features/rewards/Progress";
import { CandidateCard } from "../../src/components/CandidateCard";
import { gardenData } from "../../src/services/garden-data";
import { profileApi } from "../fixtures/profile-api";
import { startProgress } from "../../src/features/rewards/rules";
import type { Draft } from "../../src/services/local-schema";
const mockDocs = new Map<string, unknown>();
const mockPush = jest.fn();
const mockApi = profileApi("user_fixture", mockDocs);
const mockIdentify = jest.fn();
const mockSave = jest.fn(async () => {});
jest.mock("../../src/services/feature-storage", () => ({
  featureStorage: {
    read: async (o: string, k: string) => mockDocs.get(`${o}/${k}`) ?? null,
    update: async (o: string, k: string, f: (v: unknown) => unknown) => {
      const value = f(mockDocs.get(`${o}/${k}`) ?? null);
      mockDocs.set(`${o}/${k}`, value);
      return value;
    },
  },
}));
jest.mock("../../src/services/session", () => ({
  useSessionApi: () => ({ owner: "user_fixture", kind: "cloud", api: mockApi }),
}));
jest.mock("../../src/services/local", () => ({
  local: { save: (...args: unknown[]) => mockSave(...args) },
}));
jest.mock("../../src/features/capture/public-identification", () => ({
  identifyPhoto: (...args: unknown[]) => mockIdentify(...args),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));
jest.mock("../../src/services/preference-storage", () => ({
  preferenceStorage: { get: async () => null, set: async () => {} },
}));
const result = {
  id: "bug1",
  provider: "test_only",
  scientificName: "Apis mellifera",
  commonName: "Honey bee",
  speciesId: "animal:test:bee",
  score: 0.95,
  verdict: "pollinator" as const,
  canSting: "yes" as const,
  plants: ["ncsu_helianthus_annuus"],
  fact: null,
  sourceUrl: null,
};
const draft: Draft = {
  id: "bug1",
  owner: "user_fixture",
  mode: "bug",
  observationId: "unused",
  photoId: "photo1",
  capturedAt: new Date().toISOString(),
  original: "file:original",
  derivative: "file:cleaned",
  width: 100,
  height: 100,
  nickname: "",
  place: "",
  text: "",
  ownership: "observed",
  stage: "draft",
  failure: null,
};
function show(children: React.ReactNode) {
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>{children}</QueryClientProvider>
    </PreferencesProvider>,
  );
  return { query, ...view };
}
beforeEach(() => {
  mockDocs.clear();
  jest.clearAllMocks();
});
test("OpenAI animal fallback is visibly unverified and uncertain without a fake percentage", () => {
  show(
    <BugResult
      result={{
        ...result,
        provider: "openai_vision:gpt-6.1-sol",
        verdict: "uncertain",
        speciesId: null,
        score: 0,
        plants: [],
        canSting: "possible",
      }}
    />,
  );
  expect(
    screen.getByText("OpenAI visual fallback · unverified best guess"),
  ).toBeTruthy();
  expect(screen.getByText("Not sure")).toBeTruthy();
  expect(screen.getByText("May sting — admire from a distance")).toBeTruthy();
  expect(screen.queryByText("0%")).toBeNull();
});
test("OpenAI plant fallback uses a best-guess label instead of a zero confidence meter", () => {
  show(
    <CandidateCard
      candidate={{
        scientificName: "Helianthus annuus",
        commonNames: ["Sunflower"],
        authorship: "",
        score: 0,
        taxonId: null,
        assessment: "visual_guess",
      }}
      onSelect={() => {}}
    />,
  );
  expect(
    screen.getByText("OpenAI visual fallback · unverified best guess"),
  ).toBeTruthy();
  expect(screen.getByText("Best guess")).toBeTruthy();
  expect(screen.queryByText("0%")).toBeNull();
});
test("bug identification requires explicit consent, preserves evidence, and rewards the resolved species once", async () => {
  await gardenData.update("user_fixture", mockApi, (d) => ({
    ...d,
    progress: startProgress(Date.now() - 1000, "UTC"),
  }));
  mockIdentify.mockResolvedValue({ mode: "bug", identification: result });
  const change = jest.fn();
  const view = show(
    <BugDraft
      draft={draft}
      onChange={change}
      onClose={jest.fn()}
      onRetake={jest.fn()}
    />,
  );
  await screen.findByText(/Identification sends this cleaned photo/);
  expect(mockIdentify).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Allow this image to be identified" }),
    ).toBeEnabled(),
  );
  fireEvent.press(
    screen.getByRole("button", { name: "Allow this image to be identified" }),
  );
  await waitFor(() =>
    expect(change).toHaveBeenCalledWith(
      expect.objectContaining({ animalResult: result }),
    ),
  );
  expect(mockIdentify).toHaveBeenCalledWith(
    mockApi,
    "bug",
    "file:cleaned",
    "bug1",
    "en",
    expect.anything(),
  );
  expect(
    (await gardenData.read("user_fixture", mockApi)).progress?.balance,
  ).toBe(10);
  expect(
    (await gardenData.read("other_user", profileApi("other_user", mockDocs)))
      .progress,
  ).toBeUndefined();
  view.unmount();
  view.query.clear();
});
test("uncertain local sighting saves without classification, a fake plant, or points", async () => {
  const close = jest.fn();
  const view = show(
    <BugDraft
      draft={draft}
      onChange={jest.fn()}
      onClose={close}
      onRetake={jest.fn()}
    />,
  );
  fireEvent.press(
    await screen.findByRole("button", {
      name: "Save sighting · identify later",
    }),
  );
  await waitFor(() => expect(close).toHaveBeenCalled());
  const data = await gardenData.read("user_fixture", mockApi);
  expect(data.sightings[0]?.identification).toBeNull();
  expect((await mockApi.plants()).items).toEqual([]);
  expect(data.progress?.balance).toBe(0);
  expect(mockIdentify).not.toHaveBeenCalled();
  view.unmount();
  view.query.clear();
  const collection = show(<GardenSightings />);
  await screen.findByText("Not sure");
  fireEvent(
    screen.getByRole("button", { name: "Not sure · Details" }),
    "accessibilityAction",
    { nativeEvent: { actionName: "delete" } },
  );
  expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
  collection.unmount();
  collection.query.clear();
});
test.each([
  ["pollinator", "Pollinator"],
  ["not_pollinator", "Not a pollinator"],
  ["uncertain", "Not sure"],
] as const)(
  "%s verdict is explicit with linked plants and sting safety",
  (verdict, label) => {
    const view = show(<BugResult result={{ ...result, verdict }} />);
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText("Can sting — admire from a distance")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Plants it visits" }));
    fireEvent.press(screen.getByRole("button", { name: "Sunflower" }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/species/[speciesId]",
      params: { speciesId: "ncsu_helianthus_annuus" },
    });
    view.unmount();
    view.query.clear();
  },
);
test("avatar purchase is persistent and spends only Pollen", async () => {
  await gardenData.update("user_fixture", mockApi, (d) => ({
    ...d,
    progress: {
      ...startProgress(Date.now(), "UTC"),
      balance: 25,
      lifetime: 25,
      xp: 25,
    },
  }));
  const view = show(<ProgressScreen />);
  await screen.findByText("25 Pollen");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Buy: Sunshine" })).toBeEnabled(),
  );
  fireEvent.press(screen.getByRole("button", { name: "Buy: Sunshine" })!);
  await waitFor(async () =>
    expect(
      (await gardenData.read("user_fixture", mockApi)).progress?.equipped,
    ).toBe("sunshine"),
  );
  const p = (await gardenData.read("user_fixture", mockApi)).progress!;
  expect(p.balance).toBe(0);
  expect(p.xp).toBe(25);
  expect(p.lifetime).toBe(25);
  view.unmount();
  view.query.clear();
});
