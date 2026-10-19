import { generateKeyPairSync, sign } from "node:crypto";
import { test, expect } from "@jest/globals";
import { verifyIdentity } from "../src/http/identity.js";
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const jwtKey = publicKey.export({ type: "spki", format: "pem" }).toString();
const issuer = "https://fixture.clerk.accounts.dev";
const current = Math.floor(Date.now() / 1000);
function token(changes: Record<string, unknown> = {}, key = privateKey) {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT", kid: "fixture" }),
  ).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({
      iss: issuer,
      sub: "user_a",
      sid: "session_a",
      iat: current,
      nbf: current - 1,
      exp: current + 60,
      ...changes,
    }),
  ).toString("base64url");
  const data = `${header}.${claims}`;
  return `${data}.${sign("RSA-SHA256", Buffer.from(data), key).toString("base64url")}`;
}
test("real Clerk SDK verifies a locally signed token with a controlled public key", async () => {
  expect(await verifyIdentity(token(), { issuer, jwtKey })).toEqual({
    uid: "user_a",
    sessionId: "session_a",
  });
});
test("wrong signature, issuer, expiry, future validity and missing session are rejected", async () => {
  const foreign = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  }).privateKey;
  const invalid = [
    token({}, foreign),
    token({ iss: "https://foreign.example.invalid" }),
    token({ exp: current - 60 }),
    token({ nbf: current + 60 }),
    token({ sid: null }),
    "not.a.token",
  ];
  for (const value of invalid)
    await expect(
      verifyIdentity(value, { issuer, jwtKey }),
    ).rejects.toMatchObject({ status: 401, code: "unauthorized" });
});
