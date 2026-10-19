import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import express from "express";
import { loadConfig } from "./config/load-env.js";
import { createFirebase } from "./storage/firebase.js";
import { createIdentity } from "./http/identity.js";
import { createApp } from "./http/app.js";
import { attachVoiceSocket } from "./http/voice-socket.js";
import { createPlantnet } from "./providers/plantnet.js";
import { createResearch } from "./providers/research.js";
import { createAssistant } from "./providers/openai.js";
import { createVoice } from "./providers/voice.js";
import { fakeProviders } from "./providers/fakes.js";
import { createTracer } from "./telemetry/tracer.js";

// Vercel detects this conventional entrypoint by its direct Express import.
// Importing it constructs the HTTP/WebSocket server without owning a port,
// background worker, process signal handler, or process exit.
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
const dependencies = {
  ...data,
  ...providers,
  identity: createIdentity(config),
  tracer: createTracer(config),
  now: () => new Date(),
  id: randomUUID,
  embeddingModel: config.OPENAI_EMBEDDING_MODEL,
  embeddingDimensions: config.OPENAI_EMBEDDING_DIMENSIONS,
};
const browserOrigins = { allowedOrigins: config.WEB_ALLOWED_ORIGINS };
const app = createApp(dependencies, browserOrigins, express());
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

export const runtime = {
  config,
  dependencies,
  voiceSocket,
  isDraining: () => draining,
  beginDrain() {
    if (draining) return false;
    draining = true;
    return true;
  },
};

// Export the HTTP server so Vercel retains its voice WebSocket upgrade handler.
export default server;
