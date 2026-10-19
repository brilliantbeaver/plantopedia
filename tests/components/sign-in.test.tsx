import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { PreferencesProvider } from "../../src/theme/preferences";
/* eslint-disable import/no-duplicates */
import { SignIn } from "../../src/features/auth/sign-in";
import { SignIn as WebSignIn } from "../../src/features/auth/sign-in.web";
/* eslint-enable import/no-duplicates */
const ok = () => Promise.resolve({ error: null });
const mockSignIn = {
  status: "complete",
  password: jest.fn(ok),
  create: jest.fn(ok),
  reset: jest.fn(ok),
  finalize: jest.fn(ok),
  emailCode: { sendCode: jest.fn(ok), verifyCode: jest.fn(ok) },
  resetPasswordEmailCode: {
    sendCode: jest.fn(ok),
    verifyCode: jest.fn(ok),
    submitPassword: jest.fn(ok),
  },
};
const mockSignUp = {
  status: "complete",
  password: jest.fn(ok),
  reset: jest.fn(ok),
  finalize: jest.fn(ok),
  verifications: { sendEmailCode: jest.fn(ok), verifyEmailCode: jest.fn(ok) },
};
const mockOpenSignIn = jest.fn();
jest.mock("@clerk/expo", () => ({
  useSignIn: () => ({ signIn: mockSignIn }),
  useSignUp: () => ({ signUp: mockSignUp }),
  useClerk: () => ({ openSignIn: mockOpenSignIn }),
}));
jest.mock("../../src/services/preference-storage", () => ({
  preferenceStorage: { get: async () => null, set: async () => {} },
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockSignIn.status = "complete";
  mockSignUp.status = "complete";
});
function native() {
  const screen = render(
    <PreferencesProvider>
      <SignIn />
    </PreferencesProvider>,
  );
  fireEvent.press(screen.getByText("Sign in or create an account"));
  return screen;
}
test("native sign-in calls Clerk directly and activates only a complete session", async () => {
  const screen = native();
  fireEvent.changeText(screen.getByLabelText("Email"), "fixture@example.com");
  fireEvent.changeText(screen.getByLabelText("Password"), "fixture-password");
  fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(mockSignIn.finalize).toHaveBeenCalledTimes(1));
  expect(mockSignIn.password).toHaveBeenCalledWith({
    emailAddress: "fixture@example.com",
    password: "fixture-password",
  });
  expect(mockOpenSignIn).not.toHaveBeenCalled();
});
test("signup verifies the email code before activating the new session", async () => {
  const screen = native();
  fireEvent.press(screen.getByRole("button", { name: "Create account" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Password").props.autoComplete).toBe(
      "new-password",
    ),
  );
  fireEvent.changeText(screen.getByLabelText("Email"), "fixture@example.com");
  fireEvent.changeText(screen.getByLabelText("Password"), "fixture-password");
  fireEvent.press(screen.getByRole("button", { name: "Create account" }));
  await screen.findByLabelText("Verification code");
  await waitFor(() =>
    expect(mockSignUp.verifications.sendEmailCode).toHaveBeenCalledTimes(1),
  );
  expect(mockSignUp.finalize).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText("Verification code"), "123456");
  fireEvent.press(screen.getByRole("button", { name: "Verify code" }));
  await waitFor(() => expect(mockSignUp.finalize).toHaveBeenCalledTimes(1));
  expect(mockSignUp.verifications.verifyEmailCode).toHaveBeenCalledWith({
    code: "123456",
  });
});
test("email-code sign-in rejects unfinished verification", async () => {
  const screen = native();
  fireEvent.changeText(screen.getByLabelText("Email"), "fixture@example.com");
  fireEvent.press(
    screen.getByRole("button", { name: "Sign in with an email code" }),
  );
  await screen.findByLabelText("Verification code");
  mockSignIn.status = "needs_second_factor";
  fireEvent.changeText(screen.getByLabelText("Verification code"), "123456");
  fireEvent.press(screen.getByRole("button", { name: "Verify code" }));
  await screen.findByText(/Additional verification may be required/);
  expect(mockSignIn.finalize).not.toHaveBeenCalled();
});
test("password reset verifies the code before accepting a new password", async () => {
  const screen = native();
  fireEvent.press(screen.getByRole("button", { name: "Forgot password?" }));
  await waitFor(() => expect(screen.queryByLabelText("Password")).toBeNull());
  fireEvent.changeText(screen.getByLabelText("Email"), "fixture@example.com");
  fireEvent.press(screen.getByRole("button", { name: "Reset password" }));
  await screen.findByLabelText("Verification code");
  mockSignIn.status = "needs_new_password";
  fireEvent.changeText(screen.getByLabelText("Verification code"), "123456");
  fireEvent.press(screen.getByRole("button", { name: "Verify code" }));
  await screen.findByLabelText("New password");
  expect(
    mockSignIn.resetPasswordEmailCode.submitPassword,
  ).not.toHaveBeenCalled();
  fireEvent.changeText(
    screen.getByLabelText("New password"),
    "replacement-fixture-password",
  );
  mockSignIn.status = "complete";
  fireEvent.press(screen.getByRole("button", { name: "Save password" }));
  await waitFor(() => expect(mockSignIn.finalize).toHaveBeenCalledTimes(1));
});
test("Clerk validation errors do not activate a session", async () => {
  mockSignIn.password.mockResolvedValueOnce({
    error: { errors: [{ message: "Password is too short" }] },
  } as never);
  const screen = native();
  fireEvent.changeText(screen.getByLabelText("Email"), "fixture@example.com");
  fireEvent.changeText(screen.getByLabelText("Password"), "short");
  fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByText("Password is too short");
  expect(mockSignIn.finalize).not.toHaveBeenCalled();
});
test("web sign-in opens the Clerk modal with account creation", () => {
  const screen = render(
    <PreferencesProvider>
      <WebSignIn />
    </PreferencesProvider>,
  );
  fireEvent.press(
    screen.getByRole("button", { name: "Sign in or create an account" }),
  );
  expect(mockOpenSignIn).toHaveBeenCalledWith({ withSignUp: true });
});

test("invalid email cannot start authentication and a sent code has a resend cooldown", async () => {
  const screen = native();
  fireEvent.changeText(screen.getByLabelText("Email"), "invalid");
  fireEvent.press(
    screen.getByRole("button", { name: "Sign in with an email code" }),
  );
  expect(mockSignIn.emailCode.sendCode).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText("Email"), "fixture@example.com");
  fireEvent.press(
    screen.getByRole("button", { name: "Sign in with an email code" }),
  );
  const resend = await screen.findByRole("button", { name: /Resend code/ });
  expect(resend.props.accessibilityState.disabled).toBe(true);
  fireEvent.press(resend);
  expect(mockSignIn.emailCode.sendCode).toHaveBeenCalledTimes(1);
});
