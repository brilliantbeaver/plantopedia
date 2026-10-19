import { expect, test } from "@jest/globals";
import { loopbackApiOnRemoteDevice } from "../../src/config/device-api.js";

test("a phone on LAN or a Metro tunnel cannot use its own loopback for the Mac API", () => {
  expect(
    loopbackApiOnRemoteDevice("http://127.0.0.1:3001", "192.168.2.56:8081"),
  ).toBe(true);
  expect(
    loopbackApiOnRemoteDevice("http://localhost:3001", "example.exp.direct"),
  ).toBe(true);
  expect(
    loopbackApiOnRemoteDevice("http://[::1]:3001", "192.168.2.56:8081"),
  ).toBe(true);
});
test("hosted HTTPS and actual local simulator connections remain usable", () => {
  expect(
    loopbackApiOnRemoteDevice("https://api.example.com", "192.168.2.56:8081"),
  ).toBe(false);
  expect(
    loopbackApiOnRemoteDevice("http://127.0.0.1:3001", "localhost:8081"),
  ).toBe(false);
  expect(loopbackApiOnRemoteDevice("http://127.0.0.1:3001", undefined)).toBe(
    false,
  );
});
