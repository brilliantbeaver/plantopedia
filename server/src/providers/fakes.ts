import type {
  AssistantProvider,
  IdentificationProvider,
  ResearchProvider,
  VoiceProvider,
} from "../application/ports.js";
import { AppError } from "../application/errors.js";
// Deliberately recognizable synthetic responses. No fallback from a failed live request.
export function fakeProviders(): {
  identification: IdentificationProvider;
  research: ResearchProvider;
  assistant: AssistantProvider;
  voice: VoiceProvider;
} {
  return {
    identification: {
      async identify() {
        return {
          candidates: [
            {
              scientificName: "Monstera deliciosa",
              authorship: "Liebm.",
              commonNames: ["Swiss cheese plant (demo)"],
              score: 0.72,
              taxonId: null,
            },
            {
              scientificName: "Rhaphidophora tetrasperma",
              authorship: "",
              commonNames: ["Mini monstera (demo)"],
              score: 0.21,
              taxonId: null,
            },
          ],
          version: "synthetic-demo",
        };
      },
    },
    research: {
      async search() {
        return [];
      },
    },
    assistant: {
      async respond(input) {
        const result = await input.execute("search_my_plants", {
          query: input.text,
        });
        return `Demo response — no AI provider was contacted. Your saved evidence: ${JSON.stringify(result)}`.slice(
          0,
          16000,
        );
      },
      async embed() {
        return Array.from({ length: 1536 }, () => 0);
      },
      async inspect() {
        return "Demo mode cannot interpret a photograph.";
      },
    },
    voice: {
      async start() {
        throw new AppError(503, "voice_requires_live_mode");
      },
      async status() {
        throw new AppError(404, "not_found");
      },
      async close() {},
      async closeUser() {},
      async shutdown() {},
    },
  };
}
