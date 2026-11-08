import { render, screen, fireEvent } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "../../src/theme/preferences";
import Home from "../../src/app/index";
import Explore from "../../src/app/(tabs)/explore";
import Plants from "../../src/app/(tabs)/plants";
import Ask from "../../src/app/(tabs)/ask";
import { CaptureScreen } from "../../src/features/capture/CaptureScreen";
import { ProgressScreen } from "../../src/features/rewards/Progress";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRedirect = jest.fn();
let mockKind = "guest";
const mockCameraPermissions = jest.fn();
const mockApi = { plants: jest.fn(), request: jest.fn() };
jest.mock("expo-camera", () => ({
  CameraView: () => null,
  useCameraPermissions: () => mockCameraPermissions(),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    canGoBack: () => false,
    replace: mockReplace,
  }),
  Redirect: (props: unknown) => {
    mockRedirect(props);
    return null;
  },
  useLocalSearchParams: () => ({}),
}));
jest.mock("../../src/services/session", () => ({
  useSessionApi: () => ({ owner: "guest_local", kind: mockKind, api: mockApi }),
}));
jest.mock("@clerk/expo", () => ({ useAuth: () => ({ isSignedIn: false }) }));
jest.mock("../../src/config/public-env", () => ({
  publicConfig: {
    success: true,
    data: { clerkPublishableKey: "pk_test_fixture" },
  },
}));
jest.mock("../../src/features/auth/sign-in", () => ({
  SignIn: () => {
    const { Text } = jest.requireActual("react-native");
    return <Text>Authentication form</Text>;
  },
}));
jest.mock("../../src/services/local", () => ({ local: { drafts: jest.fn() } }));

function show(children: React.ReactNode) {
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  // Stale guest data from an earlier version must never become a personal UI.
  query.setQueryData(["guest_local", "plants"], {
    items: [{ id: "legacy", nickname: "Legacy sunflower" }],
  });
  query.setQueryData(["guest_local", "garden-metadata"], {
    progress: { balance: 55 },
    actions: [],
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>{children}</QueryClientProvider>
    </PreferencesProvider>,
  );
  return { query, ...view };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockKind = "guest";
});

test("guest home presents authentication directly and continues to /explore without private queries", () => {
  const view = show(<Home />);
  expect(screen.getByText("Meet your plant companion.")).toBeTruthy();
  expect(screen.getAllByText("Authentication form")).toHaveLength(1);
  expect(screen.queryByPlaceholderText("Try sunflower")).toBeNull();
  expect(screen.queryByText("Recent discoveries")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Continue exploring" }));
  expect(mockReplace).toHaveBeenCalledWith("/explore");
  expect(mockApi.plants).not.toHaveBeenCalled();
  expect(mockApi.request).not.toHaveBeenCalled();
  view.unmount();
  view.query.clear();
});
test("guest /explore foregrounds search and one sign-in without displaying or loading a device garden", () => {
  const view = show(<Explore />);
  expect(screen.getByText("Exploring as a guest")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "Sign in" })).toHaveLength(1);
  expect(screen.queryByText("Recent discoveries")).toBeNull();
  expect(screen.queryByText("Legacy sunflower")).toBeNull();
  expect(screen.queryByText(/55 Pollen/)).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/login",
    params: { returnTo: "/explore" },
  });
  fireEvent.changeText(
    screen.getByPlaceholderText("Try sunflower"),
    "sunflower",
  );
  fireEvent.press(screen.getByRole("button", { name: "Search plants" }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/search",
    params: { q: "sunflower" },
  });
  expect(mockApi.plants).not.toHaveBeenCalled();
  expect(mockApi.request).not.toHaveBeenCalled();
  view.unmount();
  view.query.clear();
});

test("signed-in home resolves to /explore instead of mounting authentication", () => {
  mockKind = "cloud";
  const view = show(<Home />);
  expect(mockRedirect).toHaveBeenCalledWith({ href: "/explore" });
  expect(screen.queryByText("Exploring as a guest")).toBeNull();
  view.unmount();
  view.query.clear();
});
test.each([
  ["garden", <Plants key="Plants" />, "/plants"],
  ["scan", <CaptureScreen key="CaptureScreen" />, "/scan"],
  ["chat", <Ask key="Ask" />, "/ask"],
  ["rewards", <ProgressScreen key="ProgressScreen" />, "/progress"],
] as const)(
  "a guest direct link to %s shows sign-in before private queries or permissions mount",
  (_name, page, returnTo) => {
    const view = show(page);
    expect(screen.getAllByRole("button", { name: "Sign in" })).toHaveLength(1);
    fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/login",
      params: { returnTo },
    });
    expect(mockApi.plants).not.toHaveBeenCalled();
    expect(mockApi.request).not.toHaveBeenCalled();
    expect(mockCameraPermissions).not.toHaveBeenCalled();
    view.unmount();
    view.query.clear();
  },
);
