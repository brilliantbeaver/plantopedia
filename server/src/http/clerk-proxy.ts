import { isIP } from "node:net";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { clerkFrontendApiProxy } from "@clerk/backend/proxy";
import type { RequestHandler } from "express";
import type { Config } from "../config/env.js";

type ProxyConfig = Pick<
  Config,
  "CLERK_PROXY_URL" | "CLERK_PUBLISHABLE_KEY" | "CLERK_SECRET_KEY"
>;

// Mount before body parsers: Clerk receives the original request stream.
// Use the configured origin, never client-supplied Host/forwarded headers.
export function createClerkProxy(
  config: ProxyConfig,
  vercel = process.env.VERCEL === "1",
): RequestHandler {
  const proxy = config.CLERK_PROXY_URL ? new URL(config.CLERK_PROXY_URL) : null;
  return async (req, res, next) => {
    if (
      !proxy ||
      (req.path !== "/__clerk" && !req.path.startsWith("/__clerk/"))
    ) {
      next();
      return;
    }
    try {
      // Vercel overwrites this header at ingress. Other hosts use the socket;
      // accepting arbitrary forwarding headers would let clients spoof their IP.
      const ip = vercel
        ? req.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
        : req.socket.remoteAddress;
      if (!ip || !isIP(ip)) throw new Error("Missing trusted client IP");
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) {
        if (
          value === undefined ||
          /^(host|forwarded|cf-connecting-ip|x-real-ip|clerk-secret-key|clerk-proxy-url)$/.test(
            name,
          ) ||
          name.startsWith("x-forwarded-") ||
          name.startsWith("x-vercel-")
        )
          continue;
        for (const item of Array.isArray(value) ? value : [value])
          headers.append(name, item);
      }
      headers.set("x-forwarded-for", ip);
      headers.set("x-forwarded-host", proxy.host);
      headers.set("x-forwarded-proto", proxy.protocol.slice(0, -1));
      const hasBody = req.method !== "GET" && req.method !== "HEAD";
      const init: RequestInit & { duplex?: "half" } = {
        method: req.method,
        headers,
        ...(hasBody
          ? {
              body: Readable.toWeb(req) as ReadableStream<Uint8Array>,
              duplex: "half" as const,
            }
          : {}),
      };
      const response = await clerkFrontendApiProxy(
        new Request(`${proxy.origin}${req.originalUrl}`, init),
        {
          proxyPath: proxy.pathname,
          publishableKey: config.CLERK_PUBLISHABLE_KEY,
          secretKey: config.CLERK_SECRET_KEY,
          fapiUrl: "https://frontend-api.clerk.dev",
        },
      );
      // SDK upstream errors may contain diagnostic details; keep those private.
      if (response.status >= 500) {
        await response.body?.cancel();
        throw new Error("Clerk upstream unavailable");
      }
      res.status(response.status);
      response.headers.forEach((value, name) => {
        if (name !== "set-cookie") res.setHeader(name, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader("set-cookie", cookies);
      if (req.method === "HEAD" || !response.body) {
        await response.body?.cancel();
        res.end();
      } else {
        await pipeline(
          Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>),
          res,
        );
      }
    } catch {
      if (res.headersSent) res.destroy();
      else
        res
          .status(502)
          .set("Cache-Control", "no-store")
          .json({ error: "clerk_proxy_unavailable" });
    }
  };
}
