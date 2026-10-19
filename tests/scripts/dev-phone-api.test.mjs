import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter, once } from "node:events";
import { fork } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const {
  phoneApiOrigin,
  launchTunnel,
  startPhoneApi,
  verifyPhoneApi,
} = require("../../scripts/dev-phone-api.cjs");
const root = resolve(import.meta.dirname, "../..");
const argv = [
  process.execPath,
  resolve(root, "node_modules/expo/bin/cli"),
  "start",
];
const base = {
  EXPO_PUBLIC_API_BASE_URL: "http://127.0.0.1:3001",
  PLANTOPEDIA_PHONE_API: "true",
};
const publicOrigin = "https://plant-test.trycloudflare.com";

test("phone tunnels require an explicit opt-in and a real local Expo start", () => {
  assert.equal(phoneApiOrigin(root, base, argv), base.EXPO_PUBLIC_API_BASE_URL);
  for (const changes of [
    { PLANTOPEDIA_PHONE_API: "false" },
    { PLANTOPEDIA_PHONE_API: undefined },
    { NODE_ENV: "production" },
    { NODE_ENV: "test" },
    { CI: "true" },
    { EAS_BUILD: "true" },
    { PLANTOPEDIA_AUTO_START_API: "false" },
    { EXPO_PUBLIC_API_BASE_URL: "https://api.example.com" },
  ])
    assert.equal(phoneApiOrigin(root, { ...base, ...changes }, argv), null);
  assert.equal(
    phoneApiOrigin(root, base, [...argv.slice(0, 2), "export"]),
    null,
  );
  assert.equal(
    phoneApiOrigin(root, base, [process.execPath, "other-script"]),
    null,
  );
  assert.throws(
    () => phoneApiOrigin(root, { ...base, PLANTOPEDIA_PHONE_API: "yes" }, argv),
    /true or false/,
  );
});

test("only the verified ephemeral URL reaches the bundle; the local API gets its exact native origin", async () => {
  const env = { ...base, WEB_ALLOWED_ORIGINS: "https://web.example.com" };
  const events = [];
  const origin = await startPhoneApi({
    origin: base.EXPO_PUBLIC_API_BASE_URL,
    env,
    tunnel: () => ({
      ready: Promise.resolve(publicOrigin),
      stop() {
        events.push("stop");
      },
    }),
    startApi: async () => {
      events.push("api");
      assert.equal(env.EXPO_PUBLIC_API_BASE_URL, base.EXPO_PUBLIC_API_BASE_URL);
      assert.equal(
        env.WEB_ALLOWED_ORIGINS,
        `https://web.example.com,${publicOrigin}`,
      );
    },
    verify: async (value) => {
      events.push("verify");
      assert.equal(value, publicOrigin);
    },
  });
  assert.deepEqual(events, ["api", "verify"]);
  assert.equal(origin, publicOrigin);
  assert.equal(env.EXPO_PUBLIC_API_BASE_URL, publicOrigin);
});

test("failed API verification closes the tunnel and leaves the original configuration intact", async () => {
  const env = { ...base };
  let stopped = false;
  await assert.rejects(
    startPhoneApi({
      origin: base.EXPO_PUBLIC_API_BASE_URL,
      env,
      tunnel: () => ({
        ready: Promise.resolve(publicOrigin),
        stop() {
          stopped = true;
        },
      }),
      startApi: async () => {},
      verify: async () => {
        throw new Error("offline");
      },
    }),
    /offline/,
  );
  assert.equal(stopped, true);
  assert.deepEqual(env, base);
});

test("the tunnel health probe verifies unauthenticated private requests are denied", async () => {
  const requests = [];
  await verifyPhoneApi(publicOrigin, async (url, options) => {
    requests.push(url);
    assert.equal(options.redirect, "error");
    return url.endsWith("/health")
      ? {
          ok: true,
          json: async () => ({ service: "plantopedia-api", status: "ok" }),
        }
      : {
          status: 401,
          headers: new Headers({ "access-control-allow-origin": publicOrigin }),
        };
  });
  assert.deepEqual(requests, [
    `${publicOrigin}/health`,
    `${publicOrigin}/v1/me/preferences`,
  ]);
  await assert.rejects(
    verifyPhoneApi(publicOrigin, async (url) =>
      url.endsWith("/health")
        ? {
            ok: true,
            json: async () => ({ service: "plantopedia-api", status: "ok" }),
          }
        : { status: 200 },
    ),
    /authentication_check_failed/,
  );
});

test("an existing API with a stale origin is rejected before publishing a broken phone endpoint", async () => {
  await assert.rejects(
    verifyPhoneApi(publicOrigin, async (url, options) => {
      if (url.endsWith("/health"))
        return {
          ok: true,
          json: async () => ({ service: "plantopedia-api", status: "ok" }),
        };
      assert.deepEqual(options.headers, { Origin: publicOrigin });
      return { status: 401, headers: new Headers() };
    }),
    /phone_api_origin_missing.*Stop the separately running/,
  );
});

test("an unreachable or wrong service never becomes the app endpoint", async () => {
  let attempts = 0;
  await assert.rejects(
    verifyPhoneApi(
      publicOrigin,
      async () => {
        attempts++;
        return { ok: true, json: async () => ({ service: "unrelated" }) };
      },
      async () => {},
    ),
    /unreachable/,
  );
  assert.equal(attempts, 20);
});

test("the tunnel supervisor never inherits app credentials and ignores untrusted origin messages", async () => {
  const child = new EventEmitter();
  child.connected = true;
  child.disconnect = () => {
    child.connected = false;
  };
  const handle = launchTunnel(
    base.EXPO_PUBLIC_API_BASE_URL,
    {
      PATH: "/fixture/bin",
      HOME: "/fixture",
      OPENAI_API_KEY: "private-sentinel",
      FIREBASE_PRIVATE_KEY: "private-sentinel",
      CLERK_SECRET_KEY: "private-sentinel",
    },
    (_file, args, options) => {
      assert.deepEqual(args, [base.EXPO_PUBLIC_API_BASE_URL]);
      assert.deepEqual(options.env, { PATH: "/fixture/bin", HOME: "/fixture" });
      return child;
    },
  );
  let resolved = false;
  handle.ready.then(() => {
    resolved = true;
  });
  child.emit("message", { type: "origin", origin: "https://attacker.example" });
  await Promise.resolve();
  assert.equal(resolved, false);
  child.emit("message", { type: "origin", origin: publicOrigin });
  assert.equal(await handle.ready, publicOrigin);
  handle.stop();
  assert.equal(child.connected, false);
});

test(
  "a tunnel that ignores SIGTERM is still closed after its Expo IPC owner disappears",
  { timeout: 12000 },
  async () => {
    const directory = await mkdtemp(
      resolve(tmpdir(), "plantopedia-tunnel-owner-"),
    );
    const pidFile = resolve(directory, "child.pid");
    const supervisor = fork(
      resolve(root, "tests/scripts/fixtures/phone-tunnel-supervisor.cjs"),
      [],
      {
        env: { ...process.env, TUNNEL_TEST_PID_FILE: pidFile },
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      },
    );
    try {
      const [message] = await once(supervisor, "message");
      assert.equal(message.type, "origin");
      const pid = Number(await readFile(pidFile, "utf8"));
      const closed = once(supervisor, "exit");
      supervisor.disconnect();
      await closed;
      assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
    } finally {
      if (supervisor.exitCode === null && supervisor.signalCode === null)
        supervisor.kill("SIGTERM");
      await rm(directory, { recursive: true, force: true });
    }
  },
);
