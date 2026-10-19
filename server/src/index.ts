import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { loadConfig } from "./config/load-env.js";
import { createFirebase } from "./storage/firebase.js";
import { createIdentity } from "./http/identity.js";
import { createApp } from "./http/app.js";
import { createPlantnet } from "./providers/plantnet.js";
import { createResearch } from "./providers/research.js";
import { createAssistant } from "./providers/openai.js";
import { createVoice } from "./providers/voice.js";
import { fakeProviders } from "./providers/fakes.js";
import { createTracer } from "./telemetry/tracer.js";
import { memoryService } from "./application/memory.js";
import { accountService } from "./application/accounts.js";
import { plantService } from "./application/plants.js";
import { watchManagedParent } from "./runtime/managed-parent.js";

import { attachVoiceSocket } from "./http/voice-socket.js";

const config = loadConfig();
const data = createFirebase(config);
const providers = config.ALLOW_LIVE_PROVIDERS
  ? {
      identification: createPlantnet(config),
      research: createResearch(config),
      assistant: createAssistant(config),
      voice: createVoice(config),
    }
  : fakeProviders();
const tracer = createTracer(config);
const dependencies = {
  ...data,
  ...providers,
  identity: createIdentity(config),
  tracer,
  now: () => new Date(),
  id: randomUUID,
  embeddingModel: config.OPENAI_EMBEDDING_MODEL,
  embeddingDimensions: config.OPENAI_EMBEDDING_DIMENSIONS,
};
const browserOrigins = { allowedOrigins: config.WEB_ALLOWED_ORIGINS };
const app = createApp(dependencies, browserOrigins);
const memory = memoryService(dependencies);
const accounts = accountService(dependencies);
const plants = plantService(dependencies);
let indexing = false;
let backgroundWork: Promise<unknown> = Promise.resolve();
const indexTimer = setInterval(() => {
  if (indexing || draining) return;
  indexing = true;
  backgroundWork = Promise.allSettled([
    accounts.processBatch(),
    plants.processDeletions(),
    memory.processBatch(),
  ])
    .catch(() => undefined)
    .finally(() => {
      indexing = false;
    });
}, 5000);
indexTimer.unref();
let draining = false;
const server = createServer((req, res) => {
  if (draining) {
    res.writeHead(503);
    res.end();
    return;
  }
  app(req, res);
});
const voiceSocket = attachVoiceSocket(server, dependencies, browserOrigins);
server.requestTimeout = 25000;
server.headersTimeout = 10000;
server.listen(config.PORT, config.SERVER_HOST, () => {
  console.log(
    JSON.stringify({
      service: "plantopedia-api",
      port: config.PORT,
      providers: config.ALLOW_LIVE_PROVIDERS ? "live" : "fake",
      storage: config.USE_FIREBASE_EMULATORS ? "emulator" : "firebase",
    }),
  );
});
async function shutdown() {
  if (draining) return;
  draining = true;
  voiceSocket.close();
  clearInterval(indexTimer);
  const drained = new Promise<void>((resolve) => server.close(() => resolve()));
  const timer = setTimeout(() => process.exit(1), 9000);
  timer.unref();
  let cleanupFailed = false;
  try {
    await providers.voice.shutdown();
  } catch {
    cleanupFailed = true;
    console.error(
      JSON.stringify({
        service: "plantopedia-api",
        code: "voice_cleanup_unknown",
      }),
    );
  }
  await Promise.race([
    Promise.allSettled([drained, backgroundWork]),
    new Promise((resolve) => setTimeout(resolve, 7000)),
  ]);
  await tracer.flush();
  server.closeAllConnections();
  process.exit(cleanupFailed ? 1 : 0);
}
process.on("SIGTERM", () => {
  void shutdown();
});
process.on("SIGINT", () => {
  void shutdown();
});
watchManagedParent(() => {
  void shutdown();
});
