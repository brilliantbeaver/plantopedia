import { tavily } from "@tavily/core";
import type { Config } from "../config/env.js";
import type { ResearchProvider } from "../application/ports.js";
import {
  SearchFailure,
  searchFailure,
  searchSources,
} from "./search-support.js";
export function createTavilyResearch(config: Config): ResearchProvider {
  const client = tavily({ apiKey: config.TAVILY_API_KEY });
  return {
    async search(query) {
      try {
        const result = await client.search(query.slice(0, 500), {
          maxResults: 4,
          // SDK request timeout is in seconds. Do not send fetch_timeout:
          // it is a separate provider-side seconds value, not milliseconds.
          // Leave room for one fallback inside the 12-second voice tool budget.
          timeout: 4,
          searchDepth: "basic",
          includeAnswer: false,
        });
        if (!Array.isArray(result.results))
          throw new SearchFailure("invalid_response");
        return searchSources(
          result.results.map((item) => ({
            title: item?.title,
            url: item?.url,
            excerpt: item?.content,
          })),
        );
      } catch (error) {
        throw searchFailure(error);
      }
    },
  };
}
