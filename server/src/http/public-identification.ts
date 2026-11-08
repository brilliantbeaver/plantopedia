import type { Express, Request } from "express";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import {
  AnimalIdentification,
  Candidate,
  PublicIdentificationRequest,
  PlantIdentificationProvider,
  IdentificationFallback,
} from "@plantopedia/contracts";
import type { Dependencies } from "../application/ports.js";
import { AppError } from "../application/errors.js";
import { identificationRateKey } from "./identification-rate-key.js";
import type { Auth } from "./identity.js";
import { active, path as userPath } from "../application/core.js";
const Reply = z.union([
  z.object({
    mode: z.literal("plant"),
    candidates: z.array(Candidate),
    provider: PlantIdentificationProvider.optional(),
    providerVersion: z.string().optional(),
    fallback: IdentificationFallback.optional(),
  }),
  z.object({ mode: z.literal("bug"), identification: AnimalIdentification }),
]);
const Receipt = z.object({
  hash: z.string(),
  status: z.enum(["pending", "complete", "uncertain"]),
  expires: z.number(),
  reply: Reply.optional(),
});
// Keep the old URL closed as well: signed-out clients must never reach providers.
export function mountPublicIdentification(
  app: Express,
  deps: Dependencies,
  authenticate: (req: Request) => Auth,
) {
  let concurrent = 0;
  app.post(
    ["/v1/identify/:mode", "/public/identify/:mode"],
    rateLimit({
      windowMs: 60000,
      limit: 5,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      keyGenerator: (req) => identificationRateKey(req),
    }),
    express.json({ limit: "2900kb" }),
    async (req, res, next) => {
      res.set("Cache-Control", "no-store");
      let acquired = false;
      try {
        const auth = authenticate(req);
        await active(deps, auth);
        if (
          !deps.publicIdentification ||
          deps.publicIdentification.dailyLimit < 1
        )
          throw new AppError(503, "identification_unavailable");
        if (!["plant", "bug"].includes(String(req.params.mode)))
          throw new AppError(404, "not_found");
        if (concurrent >= 2) throw new AppError(429, "identification_busy");
        concurrent++;
        acquired = true;
        const input = PublicIdentificationRequest.safeParse(req.body);
        if (!input.success) throw new AppError(422, "invalid_image");
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(input.data.image))
          throw new AppError(422, "invalid_image");
        const bytes = Buffer.from(input.data.image, "base64");
        if (bytes.length > 2000000) throw new AppError(413, "image_too_large");
        let cleaned: Buffer;
        try {
          cleaned = await sharp(bytes, { limitInputPixels: 20000000 })
            .rotate()
            .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();
        } catch {
          throw new AppError(422, "invalid_image");
        }
        const hash = createHash("sha256")
          .update(cleaned)
          .update(String(req.params.mode))
          .digest("hex");
        const key = createHash("sha256")
          .update(input.data.operationId)
          .digest("hex");
        const path = userPath(auth, `imageIdentifications/${key}`);
        const now = deps.now().getTime();
        const prior = await deps.repository.get(path, Receipt);
        if (prior) {
          if (prior.hash !== hash)
            throw new AppError(409, "operation_conflict");
          if (
            prior.status === "complete" &&
            prior.reply &&
            prior.expires > now
          ) {
            res.json(prior.reply);
            return;
          }
          throw new AppError(409, "identification_outcome_unknown");
        }
        {
          const budgetPath = `publicIdentificationBudget/${new Date(now).toISOString().slice(0, 10)}`;
          await deps.repository.transaction(async (tx) => {
            await active(deps, auth, tx);
            if (await tx.get(path, Receipt))
              throw new AppError(409, "identification_outcome_unknown");
            const budget = await tx.get(
              budgetPath,
              z.object({ count: z.number() }),
            );
            if ((budget?.count ?? 0) >= deps.publicIdentification!.dailyLimit)
              throw new AppError(429, "provider_budget");
            tx.set(budgetPath, { count: (budget?.count ?? 0) + 1 });
            tx.set(path, {
              hash,
              status: "pending",
              expires: now + 7 * 86400000,
            });
          });
          let reply: z.infer<typeof Reply>;
          try {
            const plantResult =
              req.params.mode === "plant"
                ? await deps.identification.identify(
                    [{ bytes: cleaned, organ: "auto" }],
                    input.data.locale,
                  )
                : null;
            reply =
              req.params.mode === "bug"
                ? {
                    mode: "bug",
                    identification:
                      await deps.publicIdentification.animal.identify(
                        cleaned,
                        input.data.operationId,
                      ),
                  }
                : {
                    mode: "plant",
                    candidates: plantResult!.candidates,
                    provider: plantResult!.provider ?? "plantnet",
                    providerVersion: plantResult!.version,
                    fallback: plantResult!.fallback,
                  };
            reply = Reply.parse(reply);
          } catch (error) {
            await deps.repository.transaction(async (tx) => {
              await active(deps, auth, tx);
              tx.set(path, {
                hash,
                status: "uncertain",
                expires: now + 7 * 86400000,
              });
            });
            throw error;
          }
          await deps.repository.transaction(async (tx) => {
            await active(deps, auth, tx);
            tx.set(path, {
              hash,
              status: "complete",
              expires: now + 7 * 86400000,
              reply,
            });
          });
          res.json(reply);
        }
      } catch (error) {
        next(error);
      } finally {
        if (acquired) concurrent--;
      }
    },
  );
}
