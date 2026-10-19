import { z } from "zod";
import { apiClient } from "../../src/services/api";
const mockPhoneLoopback = jest.fn();
jest.mock("../../src/config/public-env", () => ({
  publicConfig: {
    success: true,
    data: { apiBaseUrl: "http://127.0.0.1:3001" },
  },
}));
jest.mock("../../src/platform/api-endpoint", () => ({
  phoneApiUnreachable: () => mockPhoneLoopback(),
}));
const originalFetch = global.fetch;
beforeEach(() => {
  mockPhoneLoopback.mockReturnValue(true);
  global.fetch = jest.fn();
});
afterEach(() => {
  global.fetch = originalFetch;
});
const probe = () =>
  apiClient(async () => "fixture").request(
    "/probe",
    z.object({ ok: z.boolean() }),
  );

test("successful loopback requests remain usable on an iOS simulator connected to LAN Metro", async () => {
  jest.mocked(global.fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true }),
  } as Response);
  expect(await probe()).toEqual({ ok: true });
});
test("a failed phone loopback request yields actionable configuration guidance", async () => {
  jest
    .mocked(global.fetch)
    .mockRejectedValue(new TypeError("Network request failed"));
  await expect(probe()).rejects.toMatchObject({
    code: "phone_api_unreachable",
    retryable: false,
  });
});
test("server errors remain distinct from device connectivity failures", async () => {
  jest.mocked(global.fetch).mockResolvedValue({
    ok: false,
    status: 503,
    json: async () => ({
      code: "database_unavailable",
      messageKey: "errors.database_unavailable",
      requestId: "fixture",
      retryable: false,
    }),
  } as Response);
  await expect(probe()).rejects.toMatchObject({
    code: "database_unavailable",
    status: 503,
  });
});
test("ordinary network failures do not claim the phone has a loopback configuration problem", async () => {
  mockPhoneLoopback.mockReturnValue(false);
  const failure = new TypeError("offline");
  jest.mocked(global.fetch).mockRejectedValue(failure);
  await expect(probe()).rejects.toBe(failure);
});

test("caller cancellation retains its abort instead of claiming a phone configuration failure", async () => {
  const controller = new AbortController();
  const failure = new Error("cancelled");
  controller.abort(failure);
  jest.mocked(global.fetch).mockRejectedValue(failure);
  await expect(
    apiClient(async () => "fixture").request("/probe", z.unknown(), {
      signal: controller.signal,
    }),
  ).rejects.toBe(failure);
});
