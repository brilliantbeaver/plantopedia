import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { parseConfig } from "../src/config/env.js";
import { searchFailure } from "../src/providers/search-support.js";
import { fixtures } from "./fixtures.js";
import { companionService } from "../src/application/companion.js";
const search = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const create = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const clients: unknown[] = [];
jest.unstable_mockModule("@tavily/core", () => ({
  tavily: () => ({ search }),
}));
jest.unstable_mockModule("openai", () => ({
  default: class {
    constructor(options: unknown) {
      clients.push(options);
    }
    responses = { create };
  },
}));
const { createResearch } = await import("../src/providers/research.js");
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
});
const result = {
  title: "Hydrangea",
  url: "https://flora.example/hydrangea",
  content: "Native range includes Asia.",
};
const text = "Hydrangeas occur in Asia. [1]";
const cited = () => ({
  status: "completed",
  output: [
    { type: "web_search_call", status: "completed" },
    {
      type: "message",
      content: [
        {
          type: "output_text",
          text,
          annotations: [
            {
              type: "url_citation",
              title: result.title,
              url: result.url,
              start_index: text.indexOf("[1]"),
              end_index: text.length,
            },
          ],
        },
      ],
    },
  ],
});
let warnings: jest.SpiedFunction<typeof console.warn>;
beforeEach(() => {
  search.mockReset();
  create.mockReset();
  clients.length = 0;
  warnings = jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => warnings.mockRestore());

test("the Tavily request omits the seconds/milliseconds bug and avoids a second provider on success", async () => {
  search.mockResolvedValue({ results: [result] });
  const sources = await createResearch(config).search("Hydrangea native range");
  expect(search).toHaveBeenCalledWith("Hydrangea native range", {
    maxResults: 4,
    timeout: 4,
    searchDepth: "basic",
    includeAnswer: false,
  });
  expect(sources).toEqual([
    expect.objectContaining({
      title: result.title,
      url: result.url,
      excerpt: result.content,
    }),
  ]);
  expect(create).not.toHaveBeenCalled();
  expect(warnings).not.toHaveBeenCalled();
});
test("valid empty search results do not trigger another paid request", async () => {
  search.mockResolvedValue({ results: [] });
  expect(await createResearch(config).search("plants habitat")).toEqual([]);
  expect(create).not.toHaveBeenCalled();
});
test("a Tavily outage falls back once to a real hosted web search with cited evidence", async () => {
  search.mockRejectedValue(new Error("Request timed out after 4 seconds."));
  create.mockResolvedValue(cited());
  const sources = await createResearch(config).search("plants habitat");
  expect(sources[0]?.excerpt).toBe("Hydrangeas occur in Asia.");
  expect(create).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      model: config.OPENAI_BACKEND_MODEL,
      input: "plants habitat",
      store: false,
      tools: [{ type: "web_search", search_context_size: "low" }],
      tool_choice: "required",
      max_tool_calls: 1,
    }),
  );
  expect(clients).toContainEqual(
    expect.objectContaining({ timeout: 6500, maxRetries: 0 }),
  );
  expect(warnings).toHaveBeenCalledWith(
    JSON.stringify({
      service: "plantopedia-search",
      provider: "tavily",
      reason: "timeout",
    }),
  );
});
test.each([
  [401, "invalid API key", "credentials"],
  [432, "usage limit reached", "quota"],
  [433, "pay-as-you-go limit", "quota"],
  [429, "Too many requests", "rate_limit"],
  [429, "insufficient_quota", "quota"],
  [
    400,
    "fetch_timeout must be a positive number of seconds, at most 30.0",
    "request",
  ],
  [503, "service unavailable", "upstream"],
])(
  "provider status %s with message %s is safely classified as %s",
  (status, message, reason) => {
    const error = Object.assign(new Error(String(message)), { status });
    expect(searchFailure(error).reason).toBe(reason);
  },
);
test("SDK message-only failures remain classifiable without preserving raw exceptions", () => {
  expect(
    searchFailure(
      new Error(
        "fetch_timeout must be a positive number of seconds, at most 30.0",
      ),
    ).reason,
  ).toBe("request");
  expect(searchFailure(new Error("Invalid API key")).reason).toBe(
    "credentials",
  );
  expect(searchFailure(new Error("fetch failed: ECONNRESET")).reason).toBe(
    "network",
  );
});
test("both providers failing return a safe tool error and never log credentials or query text", async () => {
  const secret = "private-key-sentinel private-query-sentinel";
  search.mockRejectedValue(new Error(`Invalid API key ${secret}`));
  create.mockRejectedValue(Object.assign(new Error(secret), { status: 429 }));
  await expect(
    createResearch(config).search("public botanical topic"),
  ).rejects.toMatchObject({ code: "search_unavailable", status: 502 });
  expect(create).toHaveBeenCalledTimes(1);
  expect(search).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(warnings.mock.calls)).not.toContain("sentinel");
  expect(warnings.mock.calls).toHaveLength(2);
});
test.each(["missing_search", "missing_citations", "incomplete"])(
  "OpenAI %s is not accepted as sourced research",
  async (failure) => {
    search.mockRejectedValue(new Error("timeout"));
    const response = cited();
    if (failure === "missing_search") response.output.shift();
    if (failure === "missing_citations")
      response.output = [{ type: "web_search_call", status: "completed" }];
    if (failure === "incomplete") response.status = "incomplete";
    create.mockResolvedValue(response);
    await expect(
      createResearch(config).search("plants habitat"),
    ).rejects.toMatchObject({ code: "search_unavailable" });
  },
);
test("invalid Tavily rows are filtered and duplicate URLs use stable identifiers across calls", async () => {
  search.mockResolvedValue({
    results: [null, { ...result, url: "javascript:bad" }, result, result],
  });
  const research = createResearch(config);
  const first = await research.search("plants habitat");
  search.mockResolvedValue({
    results: [{ ...result, url: "https://flora.example/rose" }, result],
  });
  const second = await research.search("plants flowers");
  expect(first).toHaveLength(1);
  expect(first[0]?.id).toBe(second[1]?.id);
  expect(first[0]?.id).not.toBe(second[0]?.id);
});
test("malformed Tavily data falls back instead of pretending there are no results", async () => {
  search.mockResolvedValue({
    results: [
      { title: "Incomplete", url: "https://flora.example", content: null },
    ],
  });
  create.mockResolvedValue(cited());
  expect(await createResearch(config).search("plants habitat")).toHaveLength(1);
  expect(warnings.mock.calls[0]?.[0]).toContain("invalid_response");
});

test("voice research keeps the public-query boundary through fallback and retains source links in chat history", async () => {
  const { deps } = fixtures();
  deps.research = createResearch(config);
  const companion = companionService(deps);
  const auth = { uid: "user_a", sessionId: "session_user_a" };
  await companion.start(auth, "chat_create", {
    id: "chat",
    plantId: null,
    photoId: null,
    locale: "en",
  });
  const prepared = await companion.prepareLiveVoice(
    auth,
    { id: "voice_turn", conversationId: "chat", locale: "en" },
    [],
    new AbortController().signal,
  );
  search.mockRejectedValue(new Error("timeout"));
  create.mockResolvedValue(cited());
  await prepared.execute("search_web", {
    query: "private address 123 Secret Street watering",
  });
  expect(search.mock.calls[0]?.[0]).toBe("plants botanical care");
  expect(create.mock.calls[0]?.[0]).toMatchObject({
    input: "plants botanical care",
  });
  expect(JSON.stringify(create.mock.calls)).not.toContain("Secret Street");
  await prepared.complete(
    "How should I water my plant?",
    "Here is the sourced advice.",
  );
  const messages = await companion.history(auth, "chat");
  expect(messages.find((item) => item.role === "assistant")?.sources).toEqual([
    expect.objectContaining({ url: result.url, title: result.title }),
  ]);
});
