import { searchPlants } from "../../src/services/plant-search";
const original = global.fetch;
const originalUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.example";
  global.fetch = jest
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], provider: "tavily" }),
    });
});
afterEach(() => {
  global.fetch = original;
  process.env.EXPO_PUBLIC_API_BASE_URL = originalUrl;
});
test("text search calls the public endpoint with encoded text and no account credentials", async () => {
  await expect(searchPlants("lavender & mint", "en")).resolves.toEqual({
    results: [],
    provider: "tavily",
  });
  expect(global.fetch).toHaveBeenCalledWith(
    "https://api.example/public/plants/search?q=lavender%20%26%20mint&lang=en",
    expect.objectContaining({ signal: expect.anything() }),
  );
  const options = jest.mocked(global.fetch).mock.calls[0]?.[1];
  expect(options?.headers).toBeUndefined();
});
test("upstream errors and unsafe image URLs cannot masquerade as successful results", async () => {
  jest
    .mocked(global.fetch)
    .mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({
        code: "search_unavailable",
        messageKey: "errors.search_unavailable",
        retryable: true,
        requestId: "request",
      }),
    } as Response);
  await expect(searchPlants("lavender", "en")).rejects.toMatchObject({
    code: "search_unavailable",
    retryable: true,
  });
  jest
    .mocked(global.fetch)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        provider: "tavily",
        results: [
          {
            id: "bad",
            title: "Plant",
            description: "",
            url: "javascript:alert(1)",
          },
        ],
      }),
    } as Response);
  await expect(searchPlants("lavender", "en")).rejects.toMatchObject({
    code: "provider_contract",
  });
});
