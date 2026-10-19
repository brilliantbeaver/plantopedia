import { afterEach, expect, jest, test } from "@jest/globals";
import express from "express";
import request from "supertest";
import { createClerkProxy } from "../src/http/clerk-proxy.js";

const config = {
  CLERK_PROXY_URL: "https://plantopedia-nine.vercel.app/__clerk",
  CLERK_PUBLISHABLE_KEY: `pk_live_${Buffer.from("clerk.plantopedia-nine.vercel.app$").toString("base64")}`,
  CLERK_SECRET_KEY: "server-only-fixture",
};
function app(vercel = false) {
  const server = express();
  server.use(createClerkProxy(config, vercel));
  server.use(express.json());
  server.post("/other", (req, res) => res.json(req.body));
  return server;
}
afterEach(() => jest.restoreAllMocks());

test("streams the original body and uses canonical origin and trusted Vercel IP", async () => {
  let received = "";
  const upstream = jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (_url, init) => {
      received = await new Response(init?.body).text();
      return new Response('{"ok":true}', {
        headers: { "content-type": "application/json" },
      });
    });
  const result = await request(app(true))
    .post("/__clerk/v1/client/sign_ins?__clerk_api_version=2026-10-15")
    .set("Content-Type", "application/x-www-form-urlencoded")
    .set("x-vercel-forwarded-for", "203.0.113.10")
    .set("x-forwarded-for", "198.51.100.99")
    .set("cf-connecting-ip", "198.51.100.98")
    .set("x-real-ip", "198.51.100.97")
    .set("x-forwarded-host", "attacker.invalid")
    .set("clerk-secret-key", "attacker-secret")
    .send("identifier=fixture%40example.com&strategy=email_code");
  expect(result.status).toBe(200);
  expect(received).toBe("identifier=fixture%40example.com&strategy=email_code");
  const [url, init] = upstream.mock.calls[0]!;
  expect(url).toBe(
    "https://frontend-api.clerk.dev/v1/client/sign_ins?__clerk_api_version=2026-10-15",
  );
  const headers = new Headers(init?.headers);
  expect(headers.get("Clerk-Proxy-Url")).toBe(config.CLERK_PROXY_URL);
  expect(headers.get("Clerk-Secret-Key")).toBe(config.CLERK_SECRET_KEY);
  expect(headers.get("x-forwarded-for")).toBe("203.0.113.10");
  expect(headers.has("cf-connecting-ip")).toBe(false);
  expect(headers.has("x-real-ip")).toBe(false);
  expect(init?.redirect).toBe("manual");
  expect(JSON.stringify(result.headers)).not.toContain(config.CLERK_SECRET_KEY);
});

test("preserves separate cookies and rewrites Clerk redirects to the proxy", async () => {
  const headers = new Headers({
    location: "https://frontend-api.clerk.dev/v1/client?_x=1",
  });
  headers.append("set-cookie", "first=1; Secure; HttpOnly; Path=/");
  headers.append("set-cookie", "second=2; Secure; HttpOnly; Path=/");
  jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(null, { status: 307, headers }));
  const result = await request(app()).get("/__clerk/v1/client");
  expect(result.status).toBe(307);
  expect(result.headers.location).toBe(
    `${config.CLERK_PROXY_URL}/v1/client?_x=1`,
  );
  expect(result.headers["set-cookie"]).toEqual(headers.getSetCookie());
});

test("does not turn a double-slash path into a request to an arbitrary host", async () => {
  const upstream = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("ok"));
  await request(app()).get("/__clerk//attacker.invalid/secret");
  expect(new URL(String(upstream.mock.calls[0]![0])).origin).toBe(
    "https://frontend-api.clerk.dev",
  );
});

test("other routes retain their body parser and similar prefixes are not proxied", async () => {
  const upstream = jest.spyOn(globalThis, "fetch");
  expect((await request(app()).post("/other").send({ value: 1 })).body).toEqual(
    { value: 1 },
  );
  expect((await request(app()).get("/__clerk-evil/v1/client")).status).toBe(
    404,
  );
  expect(upstream).not.toHaveBeenCalled();
});

test("upstream failures and missing trusted IP return a generic uncached error", async () => {
  const upstream = jest
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error(config.CLERK_SECRET_KEY));
  const failure = await request(app()).get("/__clerk/v1/client");
  expect(failure.status).toBe(502);
  expect(failure.body).toEqual({ error: "clerk_proxy_unavailable" });
  expect(failure.headers["cache-control"]).toBe("no-store");
  upstream.mockClear();
  expect((await request(app(true)).get("/__clerk/v1/client")).status).toBe(502);
  expect(upstream).not.toHaveBeenCalled();
});
