import type { Express } from "express";
import { rateLimit } from "express-rate-limit";
import { PlantSearchQuery, PlantSearchResults } from "@plantopedia/contracts";
import type { Dependencies } from "../application/ports.js";
import { AppError } from "../application/errors.js";
import { identificationRateKey } from "./identification-rate-key.js";

export function mountPlantSearch(app: Express, deps: Dependencies) {
  app.get(
    "/public/plants/search",
    rateLimit({
      windowMs: 60_000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      keyGenerator: (req) => identificationRateKey(req),
      validate: { keyGeneratorIpFallback: false },
      handler: (_req, _res, next) =>
        next(new AppError(429, "rate_limited", true)),
    }),
    async (req, res, next) => {
      res.set("Cache-Control", "no-store");
      try {
        const input = PlantSearchQuery.parse(req.query);
        if (!deps.plantSearch)
          throw new AppError(503, "search_unavailable", true);
        res.json(
          PlantSearchResults.parse(
            await deps.plantSearch.search(input.q, input.lang),
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );
}
