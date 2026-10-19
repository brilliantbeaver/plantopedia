import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { Id, Locale } from "@plantopedia/contracts";
import { companionService } from "../application/companion.js";
import type {
  Dependencies,
  LiveVoiceConnection,
} from "../application/ports.js";
import { active } from "../application/core.js";
import { AppError } from "../application/errors.js";
import {
  browserOriginAllowed,
  type BrowserOriginOptions,
} from "../config/browser-origins.js";

const Hello = z
  .object({
    type: z.literal("authenticate"),
    token: z.string().min(1).max(16000),
    conversationId: Id,
    locale: Locale,
  })
  .strict();
export function attachVoiceSocket(
  server: Server,
  deps: Dependencies,
  options: BrowserOriginOptions = {},
) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 40000,
    perMessageDeflate: false,
  });
  const companion = companionService(deps);
  let draining = false;
  server.on("upgrade", (request, socket, head) => {
    const origin = request.headers.origin;
    if (
      draining ||
      request.url !== "/v1/voice/session" ||
      wss.clients.size >= 64 ||
      !browserOriginAllowed(origin, options.allowedOrigins)
    ) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (client) =>
      wss.emit("connection", client),
    );
  });
  wss.on("connection", (client: WebSocket) => {
    let connection: LiveVoiceConnection | undefined;
    let authenticating = false;
    let closed = false;
    let alive = true;
    const controller = new AbortController();
    function close() {
      if (closed) return;
      closed = true;
      controller.abort();
      clearTimeout(deadline);
      clearInterval(heartbeat);
      connection?.close();
      client.close();
      const force = setTimeout(() => client.terminate(), 1000);
      force.unref();
    }
    function emit(event: unknown) {
      if (closed || client.readyState !== WebSocket.OPEN) return;
      if (client.bufferedAmount > 512000) {
        close();
        return;
      }
      client.send(JSON.stringify(event));
    }
    const deadline = setTimeout(close, 10000);
    deadline.unref();
    const heartbeat = setInterval(() => {
      if (!alive) close();
      else {
        alive = false;
        client.ping();
      }
    }, 20000);
    heartbeat.unref();
    client.on("pong", () => {
      alive = true;
    });
    client.on("error", close);
    client.on("close", close);
    client.on("message", (data, binary) => {
      void (async () => {
        if (closed || binary) {
          close();
          return;
        }
        const event: unknown = JSON.parse(data.toString());
        if (connection) {
          connection.receive(event);
          return;
        }
        if (authenticating) throw new AppError(401, "unauthorized");
        authenticating = true;
        const hello = Hello.parse(event);
        const auth = await deps.identity.verify(hello.token);
        if (!(await deps.identity.active(auth)))
          throw new AppError(401, "unauthorized");
        await active(deps, auth);
        await companion.conversation(auth, hello.conversationId);
        controller.signal.throwIfAborted();
        if (client.readyState !== WebSocket.OPEN) {
          close();
          return;
        }
        if (!deps.voice.connect)
          throw new AppError(503, "voice_requires_live_mode");
        connection = deps.voice.connect(
          auth,
          (id, prior, signal) =>
            companion.prepareLiveVoice(
              auth,
              {
                id,
                conversationId: hello.conversationId,
                locale: hello.locale,
              },
              prior,
              signal,
            ),
          emit,
          close,
        );
        clearTimeout(deadline);
      })().catch((error: unknown) => {
        emit({
          type: "error",
          code:
            error instanceof AppError ? error.code : "voice_connection_lost",
        });
        close();
      });
    });
  });
  return {
    close() {
      draining = true;
      for (const client of wss.clients) client.terminate();
      wss.close();
    },
  };
}
