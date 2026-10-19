import server, { runtime } from "./server.js";
import { memoryService } from "./application/memory.js";
import { accountService } from "./application/accounts.js";
import { plantService } from "./application/plants.js";
import { watchManagedParent } from "./runtime/managed-parent.js";

// Standalone development/persistent-host lifecycle. Vercel imports server.ts.
const { config, dependencies, voiceSocket } = runtime;
const memory = memoryService(dependencies);
const accounts = accountService(dependencies);
const plants = plantService(dependencies);
let indexing = false;
let backgroundWork: Promise<unknown> = Promise.resolve();
const indexTimer = setInterval(() => {
  if (indexing || runtime.isDraining()) return;
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
  if (!runtime.beginDrain()) return;
  voiceSocket.close();
  clearInterval(indexTimer);
  const drained = new Promise<void>((resolve) => server.close(() => resolve()));
  const timer = setTimeout(() => process.exit(1), 9000);
  timer.unref();
  let cleanupFailed = false;
  try {
    await dependencies.voice.shutdown();
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
  await dependencies.tracer.flush();
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
