import type { Config } from "../config/env.js";
import type { ResearchProvider } from "../application/ports.js";
import { AppError } from "../application/errors.js";
import { createTavilyResearch } from "./tavily.js";
import { createOpenAIResearch } from "./openai-research.js";
import { searchFailure } from "./search-support.js";

export function createResearch(config: Config): ResearchProvider {
  const providers = [
    { name: "tavily", client: createTavilyResearch(config) },
    { name: "openai", client: createOpenAIResearch(config) },
  ];
  return {
    async search(query) {
      for (const provider of providers) {
        try {
          // A legitimate empty result is not a service outage and is not retried.
          return await provider.client.search(query);
        } catch (error) {
          console.warn(
            JSON.stringify({
              service: "plantopedia-search",
              provider: provider.name,
              reason: searchFailure(error).reason,
            }),
          );
        }
      }
      throw new AppError(502, "search_unavailable", true);
    },
  };
}
