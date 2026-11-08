import { fireEvent, render, screen } from "@testing-library/react-native";
import { PreferencesProvider } from "../../src/theme/preferences";
import Login from "../../src/app/login";
import { WelcomeScreen } from "../../src/features/auth/WelcomeScreen";

let mockReturnTo: string | undefined;
let mockSignedIn = false;
const mockReplace = jest.fn();
const mockRedirect = jest.fn();
const mockSignIn = jest.fn((_props: unknown) => null);
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ returnTo: mockReturnTo }),
  useRouter: () => ({ replace: mockReplace }),
  Redirect: (props: unknown) => {
    mockRedirect(props);
    return null;
  },
}));
jest.mock("@clerk/expo", () => ({
  useAuth: () => ({ isSignedIn: mockSignedIn }),
}));
jest.mock("../../src/config/public-env", () => ({
  publicConfig: {
    success: true,
    data: { clerkPublishableKey: "pk_test_fixture" },
  },
}));
jest.mock("../../src/features/auth/sign-in", () => ({
  SignIn: (props: unknown) => mockSignIn(props),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSignedIn = false;
  mockReturnTo = undefined;
});
test.each(["/search?q=sunflower", "/species/ncsu_helianthus_annuus"])(
  "Continue exploring preserves %s even after a full-page login reload",
  (route) => {
    mockReturnTo = route;
    render(
      <PreferencesProvider>
        <WelcomeScreen />
      </PreferencesProvider>,
    );
    fireEvent.press(screen.getByRole("button", { name: "Continue exploring" }));
    expect(mockReplace).toHaveBeenCalledWith(route);
  },
);
test("canceling login for a locked feature leads to public browsing", () => {
  mockReturnTo = "/scan";
  render(
    <PreferencesProvider>
      <WelcomeScreen />
    </PreferencesProvider>,
  );
  fireEvent.press(screen.getByRole("button", { name: "Continue exploring" }));
  expect(mockReplace).toHaveBeenCalledWith("/explore");
});
test("successful login resumes the selected plant and rejects external destinations", () => {
  mockSignedIn = true;
  mockReturnTo = "/species/ncsu_helianthus_annuus";
  const view = render(
    <PreferencesProvider>
      <Login />
    </PreferencesProvider>,
  );
  expect(mockRedirect).toHaveBeenLastCalledWith({ href: mockReturnTo });
  mockReturnTo = "//evil.invalid";
  view.rerender(
    <PreferencesProvider>
      <Login />
    </PreferencesProvider>,
  );
  expect(mockRedirect).toHaveBeenLastCalledWith({ href: "/plants" });
});

test("the homepage authentication form and successful login share the dashboard return target", () => {
  const view = render(
    <PreferencesProvider>
      <Login defaultReturnTo="/explore" />
    </PreferencesProvider>,
  );
  expect(mockSignIn).toHaveBeenLastCalledWith({ returnTo: "/explore" });
  mockSignedIn = true;
  view.rerender(
    <PreferencesProvider>
      <Login defaultReturnTo="/explore" />
    </PreferencesProvider>,
  );
  expect(mockRedirect).toHaveBeenLastCalledWith({ href: "/explore" });
});
test("continuing from a direct login URL opens /explore and cannot loop back to authentication", () => {
  render(
    <PreferencesProvider>
      <Login />
    </PreferencesProvider>,
  );
  fireEvent.press(screen.getByRole("button", { name: "Continue exploring" }));
  expect(mockReplace).toHaveBeenCalledWith("/explore");
});
