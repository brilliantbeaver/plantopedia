import { randomUUID } from "node:crypto";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { z } from "zod";
import {
  browserOriginAllowed,
  type BrowserOriginOptions,
} from "../config/browser-origins.js";
import {
  CreatePlant,
  Id,
  StartVoiceTurn,
  SyncStatus,
} from "@plantopedia/contracts";
import type { Dependencies } from "../application/ports.js";
import type { Auth } from "./identity.js";
import { plantService } from "../application/plants.js";
import { companionService } from "../application/companion.js";
import { memoryService } from "../application/memory.js";
import { accountService } from "../application/accounts.js";
import { AppError } from "../application/errors.js";
import { active } from "../application/core.js";
import { readinessCheck } from "./readiness.js";

export function createApp(
  deps: Dependencies,
  options: BrowserOriginOptions = {},
) {
  const app = express();
  const plants = plantService(deps);
  const companion = companionService(deps);
  const memory = memoryService(deps);
  const accounts = accountService(deps);
  app.disable("x-powered-by");
  app.use("/v1", (_req, res, next) => {
    res.set("Cache-Control", "private, no-store");
    res.vary("Authorization");
    next();
  });
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) =>
        callback(null, browserOriginAllowed(origin, options.allowedOrigins)),
    }),
  );
  app.use("/v1/voice/turns", express.json({ limit: "2mb" }));
  app.use(express.json({ limit: "150kb" }));
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "plantopedia-api" });
  });
  const checkDatabase = readinessCheck(() =>
    deps.repository.get("system/readiness", z.object({})),
  );
  const checkPhotos = readinessCheck(() => deps.photos.check());
  app.get("/ready", async (_req, res) => {
    res.set("Cache-Control", "no-store");
    const [database, photoStorage] = await Promise.all([
      checkDatabase(),
      checkPhotos(),
    ]);
    const ready =
      database.status === "ready" && photoStorage.status === "ready";
    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "unavailable",
      checks: { database: database.status, photoStorage: photoStorage.status },
      reasons: {
        ...(database.status === "unavailable"
          ? { database: database.reason }
          : {}),
        ...(photoStorage.status === "unavailable"
          ? { photoStorage: photoStorage.reason }
          : {}),
      },
    });
  });
  const identities = new WeakMap<Request, Auth>();
  app.use("/v1", async (req, _res, next) => {
    try {
      const bearer = req.headers.authorization;
      if (!bearer?.startsWith("Bearer "))
        throw new AppError(401, "unauthorized");
      const auth = await deps.identity.verify(bearer.slice(7));
      if (!(req.method === "DELETE" && req.path === "/me"))
        await active(deps, auth);
      identities.set(req, auth);
      next();
    } catch (error) {
      next(error);
    }
  });
  app.use(
    "/v1",
    rateLimit({
      windowMs: 60000,
      limit: 90,
      keyGenerator: (req) => identities.get(req)?.uid ?? "unauthenticated",
      standardHeaders: "draft-8",
      legacyHeaders: false,
      validate: { keyGeneratorIpFallback: false },
      handler: (_req, _res, next) =>
        next(new AppError(429, "rate_limited", true)),
    }),
  );
  const auth = (req: Request) => {
    const value = identities.get(req);
    if (!value) throw new AppError(401, "unauthorized");
    return value;
  };
  const id = (req: Request, name = "id") => Id.parse(req.params[name]);
  const key = (req: Request) => Id.parse(req.header("Idempotency-Key"));
  const json =
    (work: (req: Request) => Promise<unknown>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new AppError(504, "request_timeout", false)),
            25000,
          );
          timer.unref();
        });
        let value: unknown;
        try {
          value = await Promise.race([
            deps.tracer.run("request", () => work(req)),
            timeout,
          ]);
        } finally {
          clearTimeout(timer);
        }
        res.json(value);
      } catch (error) {
        next(error);
      }
    };
  app.get(
    "/v1/me/preferences",
    json((req) => companion.preferences(auth(req))),
  );
  app.patch(
    "/v1/me/preferences",
    json((req) => companion.preferences(auth(req), req.body)),
  );
  app.get(
    "/v1/plants",
    json((req) =>
      plants.list(auth(req), {
        query: "",
        ...(req.query.cursor ? { cursor: req.query.cursor } : {}),
      }),
    ),
  );
  app.post(
    "/v1/plants",
    json((req) => {
      // This error guarantees no plant operation was reserved or written.
      const parsed = CreatePlant.safeParse(req.body);
      if (!parsed.success) throw new AppError(422, "invalid_plant_input");
      return plants.create(auth(req), key(req), parsed.data);
    }),
  );
  app.get(
    "/v1/plants/:id",
    json((req) => plants.detail(auth(req), id(req))),
  );
  app.patch(
    "/v1/plants/:id",
    json((req) => plants.edit(auth(req), id(req), key(req), req.body)),
  );
  app.delete(
    "/v1/plants/:id",
    json(async (req) => {
      await plants.remove(auth(req), id(req));
      return { deleted: true };
    }),
  );
  app.get(
    "/v1/plants/:id/observations",
    json(async (req) => (await plants.detail(auth(req), id(req))).observations),
  );
  app.get(
    "/v1/plants/:id/identifications",
    json(
      async (req) => (await plants.detail(auth(req), id(req))).identifications,
    ),
  );
  app.post(
    "/v1/plants/:id/observations",
    json((req) => plants.observe(auth(req), id(req), key(req), req.body)),
  );
  const multipart = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 3, fieldSize: 200 },
  });
  app.post(
    "/v1/plants/:id/photos",
    multipart.single("image"),
    json((req) => {
      if (!req.file) throw new AppError(422, "image_required");
      if (!["image/jpeg", "image/png"].includes(req.file.mimetype))
        throw new AppError(422, "invalid_image");
      return plants.upload(
        auth(req),
        id(req),
        key(req),
        req.body,
        req.file.buffer,
      );
    }),
  );
  app.get("/v1/photos/:id", async (req, res, next) => {
    try {
      const result = await plants.photo(
        auth(req),
        id(req),
        Id.parse(req.query.plantId),
      );
      res
        .set("Cache-Control", "private, no-store")
        .type(result.metadata.mime)
        .send(result.bytes);
    } catch (error) {
      next(error);
    }
  });
  app.post(
    "/v1/plants/:id/identifications",
    json((req) => plants.identify(auth(req), id(req), key(req), req.body)),
  );
  app.post(
    "/v1/plants/:id/identification-selection",
    json((req) => plants.select(auth(req), id(req), key(req), req.body)),
  );
  app.post(
    "/v1/search",
    json((req) => companion.retrieve(auth(req), req.body)),
  );
  app.post(
    "/v1/sync/status",
    json(async (req) => {
      const input = SyncStatus.parse(req.body);
      const owner = auth(req);
      return {
        records: await Promise.all(
          input.records.map(async (item) => {
            try {
              const value =
                item.type === "plant"
                  ? (await plants.detail(owner, item.id)).plant
                  : item.type === "photo"
                    ? (
                        await plants.photo(
                          owner,
                          item.id,
                          Id.parse(item.plantId),
                        )
                      ).metadata
                    : item.type === "conversation"
                      ? await companion.conversation(owner, item.id)
                      : (await companion.listTasks(owner)).find(
                          (task) => task.id === item.id,
                        );
              return {
                ...item,
                exists: !!value,
                revision: value?.revision ?? null,
              };
            } catch (error) {
              if (
                error instanceof AppError &&
                [404, 410].includes(error.status)
              )
                return { ...item, exists: false, revision: null };
              throw error;
            }
          }),
        ),
      };
    }),
  );
  app.get(
    "/v1/conversations",
    json((req) => companion.listConversations(auth(req))),
  );
  app.post(
    "/v1/conversations",
    json((req) => companion.start(auth(req), key(req), req.body)),
  );
  app.get(
    "/v1/conversations/:id/messages",
    json((req) => companion.history(auth(req), id(req))),
  );
  app.post(
    "/v1/conversations/:id/messages",
    json((req) => companion.send(auth(req), id(req), key(req), req.body)),
  );
  app.delete(
    "/v1/conversations/:id",
    json(async (req) => {
      await companion.removeConversation(auth(req), id(req));
      return { deleted: true };
    }),
  );
  app.get(
    "/v1/conversations/:id/action-proposals",
    json((req) => companion.proposals(auth(req), id(req))),
  );
  app.post(
    "/v1/action-proposals/:id/confirm",
    json((req) => companion.confirm(auth(req), id(req), key(req))),
  );
  app.post(
    "/v1/action-proposals/:id/cancel",
    json((req) => companion.cancel(auth(req), id(req), key(req))),
  );
  app.get(
    "/v1/tasks",
    json((req) => companion.listTasks(auth(req))),
  );
  app.get(
    "/v1/memory-items",
    json((req) => companion.listMemory(auth(req))),
  );
  app.delete(
    "/v1/memory-items/:id",
    json(async (req) => {
      await memory.forget(auth(req), id(req));
      return { deleted: true };
    }),
  );
  app.post(
    "/v1/voice/turns",
    json(async (req) => {
      const input = StartVoiceTurn.parse(req.body);
      if (key(req) !== input.id)
        throw new AppError(422, "invalid_idempotency_key");
      const owner = auth(req);
      await companion.conversation(owner, input.conversationId);
      return deps.voice.start(owner, input, (prior, signal) =>
        companion.prepareVoice(owner, input, prior, signal),
      );
    }),
  );
  app.get(
    "/v1/voice/turns/:id",
    json((req) => deps.voice.status(auth(req), id(req))),
  );
  app.delete(
    "/v1/voice/turns/:id",
    json(async (req) => {
      await deps.voice.close(auth(req), id(req));
      return { cancelled: true };
    }),
  );
  app.delete(
    "/v1/me",
    json(async (req) => {
      await accounts.remove(auth(req));
      return { deleted: true };
    }),
  );
  app.use((_req, _res, next) => {
    next(new AppError(404, "not_found"));
  });
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const requestId = randomUUID();
      const safe =
        error instanceof AppError
          ? error
          : error instanceof z.ZodError
            ? new AppError(422, "validation_failed")
            : error instanceof multer.MulterError
              ? new AppError(413, "upload_limit")
              : z
                    .object({ type: z.literal("entity.parse.failed") })
                    .safeParse(error).success
                ? new AppError(400, "invalid_json")
                : z
                      .object({ type: z.literal("entity.too.large") })
                      .safeParse(error).success
                  ? new AppError(413, "body_too_large")
                  : new AppError(500, "internal_error");
      res.status(safe.status).json({
        code: safe.code,
        messageKey: `errors.${safe.code}`,
        retryable: safe.retryable,
        requestId,
      });
    },
  );
  return app;
}
