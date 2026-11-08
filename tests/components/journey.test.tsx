import { act, render, screen, fireEvent } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "../../src/theme/preferences";
import { JourneyScreen, JourneyHero } from "../../src/features/journey/Journey";
import { startProgress } from "../../src/features/rewards/rules";
const mockPush = jest.fn();
const mockApi = { plants: jest.fn(), request: jest.fn() };
let mockKind = "guest";
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, canGoBack: () => true, back: jest.fn() }),
}));
jest.mock("../../src/services/session", () => ({
  useSessionApi: () => ({
    kind: mockKind,
    owner: "journey_test",
    api: mockApi,
  }),
}));
function show(
  page = <JourneyScreen />,
  seeded = false,
  plants: { id: string; speciesId?: string; scientificName?: string }[] = [
    { id: "1", speciesId: "ncsu_helianthus_annuus" },
  ],
  complete = false,
) {
  const query = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
    },
  });
  if (seeded) {
    const p = startProgress(Date.now(), "UTC");
    p.claims["discovery:sunflower"] = 5;
    if (complete) p.careDays = ["2026-11-01", "2026-11-03", "2026-11-05"];
    query.setQueryData(["journey_test", "garden-metadata"], { progress: p });
    query.setQueryData(["journey_test", "plants"], { items: plants });
  }
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>{page}</QueryClientProvider>
    </PreferencesProvider>,
  );
  return { ...view, query };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockKind = "guest";
  mockApi.request.mockReturnValue(new Promise(() => {}));
  mockApi.plants.mockReturnValue(new Promise(() => {}));
});
test("guest can see the path and practice without any private request", () => {
  const v = show();
  expect(screen.getByText("Your adventure starts here")).toBeOnTheScreen();
  expect(screen.getByText("Notice what changes")).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(mockApi.request).not.toHaveBeenCalled();
  expect(mockApi.plants).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/login",
    params: { returnTo: "/journey" },
  });
  v.unmount();
  v.query.clear();
});
test("loading hero does not fabricate a fresh checkpoint or score", () => {
  mockKind = "cloud";
  const v = show(<JourneyHero />);
  expect(
    screen.getByText("Finding your place in the journey…"),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/0\/3/)).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "See my journey" }));
  expect(mockPush).toHaveBeenCalledWith("/journey");
  v.unmount();
  v.query.clear();
});
test("recorded discoveries and saved plants lead to observation, not planting", () => {
  mockKind = "cloud";
  const v = show(<JourneyScreen />, true);
  expect(screen.getByRole("progressbar").props.accessibilityValue.now).toBe(2);
  fireEvent.press(
    screen.getByRole("button", { name: "Visit my saved plants" }),
  );
  expect(mockPush).toHaveBeenCalledWith("/plants");
  v.unmount();
  v.query.clear();
});
test("failed metadata keeps practice available without claiming zero progress", async () => {
  mockKind = "cloud";
  mockApi.request.mockRejectedValue(new Error("offline"));
  const v = show();
  await screen.findByText(
    "Your saved journey is unavailable. You can still explore and practice below.",
  );
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Refresh journey" }),
  ).toBeOnTheScreen();
  v.unmount();
  v.query.clear();
});

test("a saved plant outside the curated guide offers a playable check-in alternative", () => {
  mockKind = "cloud";
  const v = show(<JourneyScreen />, true, [
    {
      id: "scanned",
      speciesId: "plant:gbif:123",
      scientificName: "Unknown plant",
    },
  ]);
  expect(screen.getByRole("progressbar").props.accessibilityValue.now).toBe(2);
  expect(
    screen.getByText(
      "Some saved plants do not have check-ins yet. Choose a plant with an “I checked this plant” button to record these days.",
    ),
  ).toBeOnTheScreen();
  fireEvent.press(
    screen.getByRole("button", { name: "Choose a plant for check-ins" }),
  );
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/search",
    params: { q: "sunflower" },
  });
  expect(mockPush).not.toHaveBeenCalledWith("/plants");
  v.unmount();
  v.query.clear();
});

test("a saved plant with a recognized scientific name is a check-in destination", () => {
  mockKind = "cloud";
  const v = show(<JourneyHero />, true, [
    {
      id: "scanned",
      speciesId: "plant:gbif:123",
      scientificName: "Helianthus annuus",
    },
  ]);
  fireEvent.press(
    screen.getByRole("button", { name: "Visit my saved plants" }),
  );
  expect(mockPush).toHaveBeenCalledWith("/plants");
  v.unmount();
  v.query.clear();
});

test("completed journeys invite an open search instead of repeating the starter plant", () => {
  mockKind = "cloud";
  const v = show(
    <JourneyHero />,
    true,
    [{ id: "1", speciesId: "ncsu_helianthus_annuus" }],
    true,
  );
  fireEvent.press(
    screen.getByRole("button", { name: "Explore another plant" }),
  );
  expect(mockPush).toHaveBeenCalledWith("/search");
  v.unmount();
  v.query.clear();
});

test("a cached journey warns when its refresh fails", async () => {
  mockKind = "cloud";
  mockApi.request.mockRejectedValue(new Error("offline"));
  const v = show(<JourneyHero />, true);
  await act(async () => {
    await v.query.refetchQueries({
      queryKey: ["journey_test", "garden-metadata"],
    });
  });
  await screen.findByText(
    "Your saved journey is unavailable. You can still explore and practice below.",
  );
  expect(
    screen.getByRole("button", { name: "Refresh journey" }),
  ).toBeOnTheScreen();
  expect(screen.getByText("2/3 checkpoints complete")).toBeOnTheScreen();
  v.unmount();
  v.query.clear();
});
