import { identifyPhoto } from "../../src/features/capture/public-identification";
import { apiClient } from "../../src/services/api";
const mockRead = jest.fn();
const mockFetch = jest.fn();
jest.mock("../../src/platform/photo-file", () => ({
  readPhotoFile: (...args: unknown[]) => mockRead(...args),
}));
jest.mock("../../src/config/public-env", () => ({
  publicConfig: {
    success: true,
    data: {
      apiBaseUrl: "https://fixture.invalid",
      clerkPublishableKey: "pk_test_fixture",
    },
  },
}));
const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = mockFetch;
  jest.clearAllMocks();
});
afterEach(() => {
  global.fetch = originalFetch;
});
test("an authenticated image request rejects metadata before any transmission", async () => {
  mockRead.mockResolvedValue({
    bytes: new Uint8Array([
      255, 216, 255, 225, 0, 8, 69, 120, 105, 102, 0, 0, 255, 217,
    ]),
  });
  await expect(
    identifyPhoto(
      apiClient(async () => "token"),
      "bug",
      "fixture",
      "operation_123",
      "en",
    ),
  ).rejects.toThrow("metadata_detected");
  expect(mockFetch).not.toHaveBeenCalled();
});
test("a cleaned image uses the authenticated relay and sends no coordinates or client owner", async () => {
  mockRead.mockResolvedValue({
    bytes: new Uint8Array([255, 216, 255, 219, 0, 2, 255, 218, 0, 2, 255, 217]),
  });
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ mode: "plant", candidates: [] }),
  });
  await identifyPhoto(
    apiClient(async () => "token"),
    "plant",
    "fixture",
    "operation_123",
    "en",
  );
  const [url, options] = mockFetch.mock.calls[0]!;
  expect(url).toBe("https://fixture.invalid/v1/identify/plant");
  expect(options.headers).toEqual({
    Authorization: "Bearer token",
    "Content-Type": "application/json",
  });
  expect(Object.keys(JSON.parse(options.body)).sort()).toEqual([
    "image",
    "locale",
    "operationId",
  ]);
});
test("a missing session stops image transmission", async () => {
  mockRead.mockResolvedValue({
    bytes: new Uint8Array([255, 216, 255, 219, 0, 2, 255, 218, 0, 2, 255, 217]),
  });
  await expect(
    identifyPhoto(
      apiClient(async () => null),
      "bug",
      "fixture",
      "operation_123",
      "en",
    ),
  ).rejects.toThrow("unauthorized");
  expect(mockFetch).not.toHaveBeenCalled();
});
