import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Settings from "../../src/app/(tabs)/settings";
import { PreferencesProvider } from "../../src/theme/preferences";
import { defaultPreferences } from "@plantopedia/contracts";
const mockRequest = jest.fn();
const mockApi = { request: mockRequest };
jest.mock("../../src/services/session", () => ({
  useSessionApi: () => ({
    api: mockApi,
    owner: "settings_test",
    release: jest.fn(async () => {}),
  }),
}));
jest.mock("@clerk/expo", () => ({ useClerk: () => ({ signOut: jest.fn() }) }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true }),
}));
jest.mock("../../src/services/local", () => ({ local: {} }));
jest.mock("../../src/services/collection-history", () => ({
  collectionHistory: {},
}));
jest.mock("../../src/theme/use-reduced-motion", () => ({
  useReducedMotion: () => true,
}));
function show() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PreferencesProvider>
        <Settings />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => mockRequest.mockReset());
test("rapid voice edits save in order and coalesce to the latest preference", async () => {
  let release!: () => void;
  const writes: { voice: { voice: string } }[] = [];
  mockRequest.mockImplementation(async (_route, _schema, options) => {
    if (options?.method !== "PATCH") return defaultPreferences;
    writes.push(options.body);
    if (writes.length === 1)
      await new Promise<void>((done) => {
        release = done;
      });
    return options.body;
  });
  show();
  await act(async () => {});
  fireEvent.press(screen.getByRole("button", { name: "Cedar" }));
  fireEvent.press(screen.getByRole("button", { name: "Ash" }));
  fireEvent.press(screen.getByRole("button", { name: "Shimmer" }));
  expect(writes.map((value) => value.voice.voice)).toEqual(["cedar"]);
  await act(async () => {
    release();
  });
  expect(writes.map((value) => value.voice.voice)).toEqual([
    "cedar",
    "shimmer",
  ]);
  expect(screen.getByText("Settings saved")).toBeOnTheScreen();
});
test("failed preference saves are visible and retry the current choice", async () => {
  let fail = true;
  mockRequest.mockImplementation(async (_route, _schema, options) => {
    if (options?.method === "PATCH" && fail) throw new Error("offline");
    return options?.body ?? defaultPreferences;
  });
  show();
  await act(async () => {});
  fireEvent.press(screen.getByRole("button", { name: "Coral" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Retry saving settings" }),
    ).toBeOnTheScreen(),
  );
  fail = false;
  fireEvent.press(
    screen.getByRole("button", { name: "Retry saving settings" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Settings saved")).toBeOnTheScreen(),
  );
  expect(mockRequest.mock.calls.at(-1)?.[2].body.voice.voice).toBe("coral");
});
