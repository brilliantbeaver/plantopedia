import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AppState, AccessibilityInfo } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GardenData } from "@plantopedia/contracts";
import { PreferencesProvider } from "../../src/theme/preferences";
import {
  ProgressBootstrap,
  ProgressScreen,
  ProgressSummary,
  DailyQuest,
} from "../../src/features/rewards/Progress";
import {
  startProgress,
  nextMidnight,
  calendarDay,
} from "../../src/features/rewards/rules";
import { profileApi } from "../fixtures/profile-api";
import { gardenData } from "../../src/services/garden-data";

const initialAppState = AppState.currentState;
const mockDocs = new Map<string, unknown>();
const mockApi = profileApi("rewards_a", mockDocs);
const mockPush = jest.fn();
let mockOwner = "rewards_a";
const mockSettle = jest.fn();
jest.mock("../../src/features/rewards/service", () => {
  const actual = jest.requireActual("../../src/features/rewards/service");
  return {
    ...actual,
    settleRewards: (...args: unknown[]) => {
      mockSettle(...args);
      return actual.settleRewards(...args);
    },
  };
});
jest.mock("../../src/features/garden/actions", () => ({
  recoverGardenActions: async () => {},
}));
jest.mock("../../src/services/session", () => ({
  useSessionApi: () => ({ owner: mockOwner, kind: "cloud", api: mockApi }),
}));
jest.mock("../../src/theme/use-reduced-motion", () => ({
  useReducedMotion: () => true,
}));
jest.mock("../../src/services/preference-storage", () => ({
  preferenceStorage: { get: async () => null, set: async () => {} },
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

function show(child: React.ReactNode, data?: GardenData) {
  const query = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  });
  if (data) query.setQueryData([mockOwner, "garden-metadata"], data);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PreferencesProvider>
      <QueryClientProvider client={query}>{children}</QueryClientProvider>
    </PreferencesProvider>
  );
  return { query, ...render(child, { wrapper }) };
}
function state(extra: Partial<ReturnType<typeof startProgress>> = {}) {
  return GardenData.parse({
    progress: { ...startProgress(Date.now(), "UTC"), ...extra },
  });
}
beforeEach(() => {
  mockDocs.clear();
  mockSettle.mockClear();
  mockPush.mockClear();
  mockOwner = "rewards_a";
});
afterEach(() => {
  AppState.currentState = initialAppState;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test("loading and unavailable progress never invent zero rewards or a level", async () => {
  const original = mockApi.request;
  mockApi.request = jest.fn(() => new Promise(() => {}));
  const pending = show(<ProgressScreen />);
  expect(screen.getByText("Loading…")).toBeTruthy();
  expect(screen.queryByText(/Level 1/)).toBeNull();
  expect(screen.queryByText("0 Pollen")).toBeNull();
  pending.unmount();
  pending.query.clear();
  mockApi.request = original;
  const empty = show(<ProgressScreen />, GardenData.parse({}));
  expect(screen.getByText(/Your progress is not available yet/)).toBeTruthy();
  expect(screen.queryByText(/Level 1/)).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("Level 1 · 0/100 XP");
  empty.unmount();
  empty.query.clear();
});

test("a failed progress query exposes retry without a fabricated level or reward balance", async () => {
  const original = mockApi.request;
  mockApi.request = jest.fn(async () => {
    throw new Error("offline");
  });
  const view = show(<ProgressScreen />);
  await screen.findByText(/Your progress is not available yet/);
  expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  expect(screen.queryByText(/Level 1/)).toBeNull();
  expect(screen.queryByText("0 Pollen")).toBeNull();
  view.unmount();
  view.query.clear();
  mockApi.request = original;
});

test("completed daily quest explains credit and leads to the journey, not repeating search", () => {
  const p = startProgress(Date.now(), "UTC");
  const view = show(<DailyQuest />, state({ questDays: [p.day.key] }));
  expect(
    screen.getByText(/You explored a bee-visited plant today/),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Search plants" })).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Your journey" }));
  expect(mockPush).toHaveBeenCalledWith("/journey");
  view.unmount();
  view.query.clear();
});

test("avatar names, shortfalls and XP rules expose the real reward model", () => {
  const view = show(
    <ProgressScreen />,
    state({ balance: 25, xp: 25, careDays: ["1", "2", "3", "4"] }),
  );
  expect(screen.getByRole("button", { name: "Buy: Sunshine" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Buy: Meadow" })).toBeDisabled();
  expect(screen.getByText("Earn 35 more Pollen to unlock")).toBeTruthy();
  expect(screen.getByText("3/3")).toBeTruthy();
  expect(
    screen.getByRole("progressbar", { name: "XP toward your next level" }).props
      .accessibilityValue.now,
  ).toBe(25);
  expect(
    screen.getByText(/Further rewards today add Pollen only/),
  ).toBeTruthy();
  expect(
    screen.getByText(/Extra planting check-ins are recorded without Pollen/),
  ).toBeTruthy();
  view.unmount();
  view.query.clear();
});

test("reduced-motion reward feedback dismisses and does not announce another owner's balance", async () => {
  jest.useFakeTimers();
  const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
  const view = show(<ProgressSummary />, state());
  await act(async () => {});
  await act(async () => {
    view.query.setQueryData(
      [mockOwner, "garden-metadata"],
      state({ balance: 5, lifetime: 5 }),
    );
    await jest.advanceTimersByTimeAsync(1);
  });
  expect(
    screen.getByText("+5 Pollen", { includeHiddenElements: true }),
  ).toBeTruthy();
  expect(announce).toHaveBeenCalledWith("+5 Pollen");
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3000);
  });
  expect(
    screen.queryByText("+5 Pollen", { includeHiddenElements: true }),
  ).toBeNull();
  mockOwner = "rewards_b";
  view.query.setQueryData(
    [mockOwner, "garden-metadata"],
    state({ balance: 200, lifetime: 200 }),
  );
  view.rerender(<ProgressSummary />);
  expect(announce).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByText(/\+195/, { includeHiddenElements: true }),
  ).toBeNull();
  view.unmount();
  view.query.clear();
});

test("foreground midnight settles a new day without app switching and cleans up its timer", async () => {
  jest.useFakeTimers();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const boundary = nextMidnight(Date.parse("2026-11-07T12:00:00Z"), zone);
  jest.setSystemTime(boundary - 1000);
  AppState.currentState = "active";
  const progress = startProgress(Date.now(), zone);
  const data = GardenData.parse({
    progress: { ...progress, questDays: [progress.day.key] },
  });
  await gardenData.update(mockOwner, mockApi, () => data);
  const view = show(<ProgressBootstrap />, data);
  await act(async () => {});
  expect(mockSettle).toHaveBeenCalledTimes(2);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1001);
  });
  const saved = await gardenData.read(mockOwner, mockApi);
  expect(saved.progress!.day.key).toBe(calendarDay(boundary, zone));
  expect(saved.progress!.questDays).not.toContain(saved.progress!.day.key);
  expect(mockSettle).toHaveBeenCalledTimes(4);
  view.unmount();
  view.query.clear();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(86_400_000);
  });
  expect(mockSettle).toHaveBeenCalledTimes(4);
});

test("failed rollover settlement uses a bounded retry rather than spinning", async () => {
  jest.useFakeTimers();
  AppState.currentState = "active";
  const original = mockApi.request;
  mockApi.request = jest.fn(async () => {
    throw new Error("offline");
  });
  const view = show(<ProgressBootstrap />);
  await act(async () => {});
  expect(mockSettle).toHaveBeenCalledTimes(1);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(59_999);
  });
  expect(mockSettle).toHaveBeenCalledTimes(1);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1);
  });
  expect(mockSettle).toHaveBeenCalledTimes(2);
  view.unmount();
  view.query.clear();
  mockApi.request = original;
});
