import { beforeEach, afterEach, expect, jest, test } from "@jest/globals";
import request from "supertest";
import type { PlantSearchHit } from "@plantopedia/contracts";
import { parseConfig } from "../src/config/env.js";
import { fixtures } from "./fixtures.js";
import { createApp } from "../src/http/app.js";

const web = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const ai = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const vision = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.unstable_mockModule("@tavily/core", () => ({
  tavily: () => ({ search: web }),
}));
jest.unstable_mockModule("openai", () => ({
  default: class {
    responses = {
      create: (input: { text?: { format?: { name?: string } } }) =>
        input.text?.format?.name === "plant_photo_review"
          ? vision(input)
          : ai(input),
    };
  },
}));
const { createPlantSearch, withPlantSearchFallback } =
  await import("../src/providers/plant-search.js");
const config = parseConfig({
  NODE_ENV: "test",
  CLERK_SECRET_KEY: "fixture",
  CLERK_ISSUER_URL: "https://fixture.example.invalid",
  FIREBASE_PROJECT_ID: "demo-plantopedia",
  FIREBASE_STORAGE_BUCKET: "demo-bucket",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
  OPENAI_API_KEY: "private-key-sentinel",
  TAVILY_API_KEY: "private-tavily-sentinel",
  PLANTNET_API_KEY: "private-plantnet-sentinel",
});
const hit: PlantSearchHit = {
  id: "lavender",
  title: "Lavender",
  url: "https://flora.example/lavender",
  description: "Lavandula angustifolia",
  image: {
    url: "https://flora.example/lavender.jpg",
    sourceUrl: "https://flora.example/lavender",
  },
};
let fetcher: jest.SpiedFunction<typeof fetch>;
let warnings: jest.SpiedFunction<typeof console.warn>;
beforeEach(() => {
  web.mockReset();
  ai.mockReset();
  vision
    .mockReset()
    .mockResolvedValue({
      status: "completed",
      output_text: JSON.stringify({
        images: [{ index: 0, plantPhoto: true, relevant: true }],
      }),
    });
  fetcher = jest.spyOn(globalThis, "fetch");
  warnings = jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  fetcher.mockRestore();
  warnings.mockRestore();
});
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

test.each(["empty", "error", "invalid"])(
  "Pl@ntNet %s results fall through to Tavily and preserve a source-associated photo",
  async (state) => {
    if (state === "error") fetcher.mockRejectedValue(new Error("fetch failed"));
    else
      fetcher.mockResolvedValue(
        response(state === "empty" ? [] : { unexpected: true }),
      );
    web.mockResolvedValue({
      results: [
        {
          title: hit.title,
          url: hit.url,
          content: hit.description,
          images: [{ url: hit.image!.url }],
        },
      ],
      images: [{ url: "https://unrelated.example/image.jpg" }],
    });
    const result = await createPlantSearch(config).search("lavender", "en");
    expect(result.provider).toBe("tavily");
    expect(result.results[0]).toMatchObject({
      title: "Lavender",
      image: hit.image,
    });
    expect(web).toHaveBeenCalledWith(
      "lavender plant botanical species",
      expect.objectContaining({
        includeImages: true,
        includeImageDescriptions: true,
        timeout: 4,
      }),
    );
    expect(ai).not.toHaveBeenCalled();
  },
);
test("image-plan denial retries Pl@ntNet without images and keeps real species", async () => {
  web.mockResolvedValue({ results: [] });
  fetcher.mockResolvedValueOnce(response({}, 403)).mockResolvedValueOnce(
    response([
      {
        id: "1361975",
        scientificNameWithoutAuthor: "Ocimum basilicum",
        commonNames: ["Basil"],
        gbifId: 2927096,
        powoId: "452874-1",
      },
    ]),
  );
  const result = await createPlantSearch(config).search(
    "Ocimum basilicum",
    "en",
  );
  expect(result.provider).toBe("plantnet");
  expect(result.results[0]).toMatchObject({
    title: "Basil",
    scientificName: "Ocimum basilicum",
    url: "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:452874-1",
  });
  expect(
    new URL(String(fetcher.mock.calls[1]?.[0])).searchParams.has("images"),
  ).toBe(false);
  expect(web).toHaveBeenCalledTimes(1);
});
test.each(["empty", "error", "invalid"])(
  "Tavily %s results fall through to cited OpenAI web search",
  async (state) => {
    fetcher.mockResolvedValue(response([]));
    if (state === "error") web.mockRejectedValue(new Error("timeout"));
    else
      web.mockResolvedValue(
        state === "empty"
          ? { results: [] }
          : { results: [{ title: "Unsafe", url: "javascript:alert(1)" }] },
      );
    ai.mockResolvedValue({
      status: "completed",
      output: [
        { type: "web_search_call", status: "completed" },
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "Lavender is Lavandula. [1]",
              annotations: [
                {
                  type: "url_citation",
                  title: hit.title,
                  url: hit.url,
                  start_index: 22,
                  end_index: 25,
                },
              ],
            },
          ],
        },
      ],
    });
    const result = await createPlantSearch(config).search("lavender", "en");
    expect(result.provider).toBe("openai");
    expect(result.results[0]?.url).toBe(hit.url);
    expect(ai).toHaveBeenCalledTimes(1);
  },
);
test("all outages yield a retryable error without leaking credentials or the query", async () => {
  fetcher.mockRejectedValue(new Error("private-plantnet-sentinel lavender"));
  web.mockRejectedValue(new Error("private-tavily-sentinel lavender"));
  ai.mockRejectedValue(new Error("private-key-sentinel lavender"));
  await expect(
    createPlantSearch(config).search("lavender", "en"),
  ).rejects.toMatchObject({
    status: 502,
    code: "search_unavailable",
    retryable: true,
  });
  expect(JSON.stringify(warnings.mock.calls)).not.toMatch(/sentinel|lavender/);
});
test("empty results try every provider, and successful public searches coalesce and cache", async () => {
  const first = jest.fn(async () => [] as PlantSearchHit[]);
  const second = jest.fn(async () => [] as PlantSearchHit[]);
  const third = jest.fn(async () => [hit]);
  const search = withPlantSearchFallback([
    { name: "plantnet", search: first },
    { name: "tavily", search: second },
    { name: "openai", search: third },
  ]);
  const [a, b] = await Promise.all([
    search.search("lavender", "en"),
    search.search("lavender", "en"),
  ]);
  expect(a).toEqual(b);
  await search.search("LAVENDER", "en");
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
  expect(third).toHaveBeenCalledTimes(1);
  const empty = withPlantSearchFallback([
    { name: "plantnet", search: first },
    { name: "tavily", search: second },
  ]);
  expect((await empty.search("unknown", "en")).results).toEqual([]);
});
test("public text search needs no session and never writes guest history; personal endpoints remain private", async () => {
  const { deps, documents } = fixtures();
  deps.plantSearch = {
    search: async () => ({ results: [hit], provider: "tavily" }),
  };
  const app = createApp(deps);
  const result = await request(app)
    .get("/public/plants/search?q=lavender&lang=en")
    .expect(200);
  expect(result.body.results[0].image.url).toBe(hit.image!.url);
  expect(result.headers["cache-control"]).toBe("no-store");
  expect(documents.size).toBe(0);
  await request(app).get("/v1/me/search-history").expect(401);
  await request(app).get("/public/plants/search?q=").expect(422);
  await request(app)
    .get(`/public/plants/search?q=${"x".repeat(121)}`)
    .expect(422);
});

test("unrelated scientific prefixes do not hijack common-name searches", async () => {
  fetcher.mockResolvedValue(
    response([
      {
        id: "123",
        scientificNameWithoutAuthor: "Rosenbergiodendron densiflorum",
        commonNames: [],
      },
    ]),
  );
  web.mockResolvedValue({
    results: [
      {
        title: "Rose",
        url: "https://flora.example/rose",
        content: "Rosa flowers",
      },
    ],
  });
  const result = await createPlantSearch(config).search("rose", "en");
  expect(result.provider).toBe("tavily");
  expect(result.results[0]?.title).toBe("Rose");
});
test("a completed, empty hosted web search ends the fallback chain with an honest no-match", async () => {
  fetcher.mockResolvedValue(response([]));
  web.mockResolvedValue({ results: [] });
  ai.mockResolvedValue({
    status: "completed",
    output: [{ type: "web_search_call", status: "completed" }],
  });
  expect(
    (await createPlantSearch(config).search("unknownplantzz", "en")).results,
  ).toEqual([]);
});
test("web photos enrich a Pl@ntNet taxon only when their source names that scientific species", async () => {
  fetcher.mockResolvedValue(
    response([
      {
        id: "1361975",
        scientificNameWithoutAuthor: "Ocimum basilicum",
        commonNames: ["Basil"],
        gbifId: 2927096,
      },
    ]),
  );
  web.mockResolvedValue({
    results: [
      {
        title: "Basil",
        url: hit.url,
        content: "Ocimum basilicum is sweet basil.",
        images: [{ url: hit.image!.url }],
      },
      {
        title: "Unrelated flower",
        url: "https://flora.example/wrong",
        content: "Lavender",
        images: [{ url: "https://flora.example/wrong.jpg" }],
      },
    ],
  });
  const result = await createPlantSearch(config).search(
    "Ocimum basilicum",
    "en",
  );
  expect(result.provider).toBe("plantnet");
  expect(result.results[0]?.image).toEqual({
    ...hit.image,
    plantVerified: true,
  });
});

test("malformed data cannot become a false no-match, and malformed optional photos preserve text", async () => {
  fetcher.mockResolvedValue(response([]));
  web.mockResolvedValue({
    results: [{ title: "Unsafe", url: "javascript:bad", content: "Invalid" }],
  });
  ai.mockResolvedValue({
    status: "completed",
    output: [{ type: "web_search_call", status: "completed" }],
  });
  await expect(
    createPlantSearch(config).search("unknownplantzz", "en"),
  ).rejects.toMatchObject({ code: "search_unavailable" });
  web.mockResolvedValue({
    results: [
      {
        title: "Lavender",
        url: hit.url,
        content: "Lavandula",
        images: [{ url: "https://[invalid" }],
      },
    ],
  });
  const result = await createPlantSearch(config).search("lavender", "en");
  expect(result.results[0]).toMatchObject({ title: "Lavender", url: hit.url });
  expect(result.results[0]?.image).toBeUndefined();
});
