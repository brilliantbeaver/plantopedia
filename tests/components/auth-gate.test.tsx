import { render } from "@testing-library/react-native";
import { Platform } from "react-native";
import RootLayout from "../../src/app/_layout";

let mockAuth = {
  isLoaded: false,
  isSignedIn: false,
  userId: null as string | null,
};
const mockStack = jest.fn(() => null);
const mockSignIn = jest.fn(() => null);
const mockProvider = jest.fn();
const originalLocation = Object.getOwnPropertyDescriptor(window, "location");
jest.mock("expo-router", () => ({ Stack: () => mockStack() }));
jest.mock("@clerk/expo", () => ({
  useAuth: () => mockAuth,
  ClerkProvider: (props: { children: React.ReactNode }) => {
    mockProvider(props);
    return props.children;
  },
}));
jest.mock("@clerk/expo/token-cache", () => ({ tokenCache: undefined }));
jest.mock("../../src/features/auth/sign-in", () => ({
  SignIn: () => mockSignIn(),
}));
jest.mock("../../src/config/public-env", () => ({
  publicConfig: {
    success: true,
    data: { clerkPublishableKey: "pk_test_fixture" },
  },
}));
jest.mock("../../src/services/session", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../../src/services/preference-storage", () => ({
  preferenceStorage: { get: async () => null, set: async () => {} },
}));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, "OS", "web");
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { hostname: "plantopedia-nine.vercel.app" },
  });
  mockAuth = { isLoaded: false, isSignedIn: false, userId: null };
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalLocation)
    Object.defineProperty(window, "location", originalLocation);
  else Reflect.deleteProperty(window, "location");
});

test("route screens, including the login redirect, mount only after session activation", () => {
  const screen = render(<RootLayout />);
  expect(mockProvider).toHaveBeenLastCalledWith(
    expect.objectContaining({
      signInUrl: "/login",
      signUpUrl: "/login",
      signInFallbackRedirectUrl: "/plants",
      signUpFallbackRedirectUrl: "/plants",
    }),
  );
  expect(mockStack).not.toHaveBeenCalled();
  expect(mockSignIn).not.toHaveBeenCalled();

  mockAuth = { isLoaded: true, isSignedIn: false, userId: null };
  screen.rerender(<RootLayout />);
  expect(mockSignIn).toHaveBeenCalled();
  expect(mockStack).not.toHaveBeenCalled();

  mockAuth = { isLoaded: true, isSignedIn: true, userId: "user_fixture" };
  screen.rerender(<RootLayout />);
  expect(mockStack).toHaveBeenCalled();

  mockStack.mockClear();
  mockSignIn.mockClear();
  mockAuth = { isLoaded: true, isSignedIn: false, userId: null };
  screen.rerender(<RootLayout />);
  expect(mockStack).not.toHaveBeenCalled();
  expect(mockSignIn).toHaveBeenCalled();
});
