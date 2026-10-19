import { renderHook } from "@testing-library/react-native";
// Exercise both platform implementations; Expo's lint resolver prefers .web.
/* eslint-disable import/no-duplicates */
import { useStartSignIn as useNativeSignIn } from "../../src/services/use-start-sign-in";
import { useStartSignIn as useWebSignIn } from "../../src/services/use-start-sign-in.web";
/* eslint-enable import/no-duplicates */

const mockOpenSignIn = jest.fn();
const mockStartHostedAuth = jest.fn();
jest.mock("@clerk/expo", () => ({
  useClerk: () => ({ openSignIn: mockOpenSignIn }),
}));
jest.mock("@clerk/expo/hosted-auth", () => ({
  useHostedAuth: () => ({ startHostedAuth: mockStartHostedAuth }),
}));

beforeEach(() => jest.resetAllMocks());

test("browser sign-in opens web UI with account creation without starting native hosted auth", async () => {
  const { result } = renderHook(useWebSignIn);
  await result.current();
  expect(mockOpenSignIn).toHaveBeenCalledWith({ withSignUp: true });
  expect(mockStartHostedAuth).not.toHaveBeenCalled();
});

test("native sign-in still waits for hosted authentication to complete", async () => {
  let complete!: (value: { createdSessionId: string }) => void;
  mockStartHostedAuth.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve;
    }),
  );
  const { result } = renderHook(useNativeSignIn);
  const pending = result.current();
  complete({ createdSessionId: "session_test" });
  await expect(pending).resolves.toEqual({ createdSessionId: "session_test" });
  expect(mockOpenSignIn).not.toHaveBeenCalled();
});

test("web UI launch errors propagate to the sign-in error handler", async () => {
  mockOpenSignIn.mockImplementation(() => {
    throw new Error("Unable to open sign-in");
  });
  const { result } = renderHook(useWebSignIn);
  await expect(result.current()).rejects.toThrow("Unable to open sign-in");
});
