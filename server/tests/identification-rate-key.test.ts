import { expect, test } from "@jest/globals";
import { identificationRateKey } from "../src/http/identification-rate-key.js";

const request = (forwarded: string | string[], peer = "::ffff:127.0.0.1") => ({
  headers: {
    "x-forwarded-for": forwarded,
    forwarded: "for=203.0.113.8",
    "x-real-ip": "203.0.113.9",
  },
  socket: { remoteAddress: peer },
});
test("only the actual Vercel runtime uses a single valid platform-overwritten address", () => {
  expect(identificationRateKey(request("203.0.113.1"), true)).toBe(
    "203.0.113.1",
  );
  expect(identificationRateKey(request("203.0.113.2"), true)).toBe(
    "203.0.113.2",
  );
  expect(identificationRateKey(request("203.0.113.1"), false)).toBe(
    "127.0.0.1",
  );
  expect(identificationRateKey(request("203.0.113.2"), false)).toBe(
    "127.0.0.1",
  );
});
test.each([
  "203.0.113.1, 198.51.100.2",
  "garbage",
  ["203.0.113.1", "198.51.100.2"],
])("malformed/ambiguous proxy headers fall back to the peer", (header) => {
  expect(identificationRateKey(request(header), true)).toBe("127.0.0.1");
});
test("IPv6 rotates within a subnet cannot evade the limiter; unrelated subnets stay separate", () => {
  expect(identificationRateKey(request("2001:db8:1234:5600::1"), true)).toBe(
    identificationRateKey(request("2001:db8:1234:5601::2"), true),
  );
  expect(
    identificationRateKey(request("2001:db8:1234:5600::1"), true),
  ).not.toBe(identificationRateKey(request("2001:db8:1234:5700::2"), true));
});
