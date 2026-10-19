import { render, act } from "@testing-library/react-native";
import { SessionProvider, useSessionApi } from "../../src/services/session";
import type { VoiceTransport } from "../../src/platform/voice-contract";

let mockAuth = { userId: "user_a", getToken: async () => "token-a" };
const mockTransports: VoiceTransport[] = [];
jest.mock("@clerk/expo", () => ({ useAuth: () => mockAuth }));
jest.mock("../../src/services/local", () => ({
  local: { references: async () => [] },
}));
jest.mock("../../src/platform/live-voice", () => ({
  initialVoice: jest.requireActual("../../src/platform/voice-contract")
    .initialVoice,
  createLiveVoiceTransport: () => {
    const transport = {
      record: jest.fn(async () => {}),
      send: jest.fn(async () => {}),
      play: jest.fn(async () => {}),
      disconnect: jest.fn(async () => {}),
    };
    mockTransports.push(transport);
    return transport;
  },
}));
const captured: ReturnType<typeof useSessionApi>[] = [];
function Consumer() {
  captured.push(useSessionApi());
  return null;
}
function latest() {
  const value = captured.at(-1);
  if (!value) throw new Error("missing context");
  return value;
}

test("owner resources survive Clerk token-function refresh and are replaced and disposed on account switch", async () => {
  const initialToken = jest.fn(async () => "token-a");
  mockAuth = { userId: "user_a", getToken: initialToken };
  const view = render(
    <SessionProvider>
      <Consumer />
    </SessionProvider>,
  );
  const first = latest();
  expect(initialToken).not.toHaveBeenCalled();
  await expect(first.api.token()).resolves.toBe("token-a");
  mockAuth = { userId: "user_a", getToken: async () => "refreshed-a" };
  view.rerender(
    <SessionProvider>
      <Consumer />
    </SessionProvider>,
  );
  expect(latest().api).toBe(first.api);
  expect(latest().voice).toBe(first.voice);
  await expect(first.api.token()).resolves.toBe("refreshed-a");
  const nextToken = jest.fn(async () => "token-b");
  mockAuth = { userId: "user_b", getToken: nextToken };
  view.rerender(
    <SessionProvider>
      <Consumer />
    </SessionProvider>,
  );
  expect(latest().api).not.toBe(first.api);
  expect(latest().voice).not.toBe(first.voice);
  expect(latest().voice.owner).toBe("user_b");
  await expect(latest().api.token()).resolves.toBe("token-b");
  const nextCalls = nextToken.mock.calls.length;
  await expect(first.api.token()).rejects.toThrow();
  expect(nextToken).toHaveBeenCalledTimes(nextCalls);
  expect(mockTransports[0]?.disconnect).toHaveBeenCalled();
  await act(() => latest().release());
  expect(mockTransports[1]?.disconnect).toHaveBeenCalled();
});
