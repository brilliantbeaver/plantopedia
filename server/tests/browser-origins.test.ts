import { expect, test } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/http/app.js";
import { fixtures } from "./fixtures.js";

test.each([
  ["https://phone-preview.example", true],
  ["http://192.168.2.56:8081", true],
  ["http://localhost:8081", true],
  ["https://phone-preview.example.attacker.invalid", false],
  ["http://192.168.2.57:8081", false],
  ["null", false],
])(
  "CORS matches the exact configured browser origin %s",
  async (origin, allowed) => {
    const app = createApp(fixtures().deps, {
      allowedOrigins: [
        "https://phone-preview.example",
        "http://192.168.2.56:8081",
      ],
    });
    const preflight = await request(app)
      .options("/v1/plants")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "authorization");
    expect(preflight.headers["access-control-allow-origin"]).toBe(
      allowed ? origin : undefined,
    );
    const response = await request(app).get("/v1/plants").set("Origin", origin);
    expect(response.status).toBe(401);
  },
);

test("a LAN browser origin requires explicit configuration", async () => {
  const response = await request(createApp(fixtures().deps))
    .get("/health")
    .set("Origin", "http://192.168.2.56:8081");
  expect(response.headers["access-control-allow-origin"]).toBeUndefined();
});
