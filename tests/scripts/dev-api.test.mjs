import { test } from "node:test";
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { localApiOrigin, startLocalApi } from "../../scripts/dev-api.cjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const cli = fileURLToPath(
  new URL("../../node_modules/expo/bin/cli", import.meta.url),
);
const argv = [process.execPath, cli, "start"];
const localEnv = {
  NODE_ENV: "development",
  EXPO_PUBLIC_API_BASE_URL: "http://127.0.0.1:3001",
  PORT: "3001",
};
const quiet = () => {};

test("only local Expo development startup selects the matching API port", () => {
  assert.equal(localApiOrigin(root, localEnv, argv), "http://127.0.0.1:3001");
  assert.equal(
    localApiOrigin(root, localEnv, argv.slice(0, 2)),
    "http://127.0.0.1:3001",
  );
  assert.equal(
    localApiOrigin(
      root,
      {
        ...localEnv,
        EXPO_PUBLIC_API_BASE_URL: "http://localhost:3099/",
        PORT: "3099",
      },
      argv,
    ),
    "http://localhost:3099",
  );
  assert.equal(
    localApiOrigin(root, localEnv, [
      process.execPath,
      `${root}/node_modules/.bin/expo`,
      "start",
      "--web",
    ]),
    "http://127.0.0.1:3001",
  );
});

test("exports, config, CI, production, tests, hosted APIs and opt-out never start an API", () => {
  for (const command of [
    "export",
    "export:embed",
    "config",
    "prebuild",
    "run:ios",
  ]) {
    assert.equal(
      localApiOrigin(root, localEnv, [process.execPath, cli, command]),
      null,
    );
  }
  for (const values of [
    { NODE_ENV: "production" },
    { NODE_ENV: "test" },
    { CI: "1" },
    { CI: "true" },
    { EAS_BUILD: "true" },
    { PLANTOPEDIA_AUTO_START_API: "false" },
    { EXPO_PUBLIC_API_BASE_URL: "https://api.example.invalid" },
    { EXPO_PUBLIC_API_BASE_URL: "https://localhost:3001" },
  ])
    assert.equal(localApiOrigin(root, { ...localEnv, ...values }, argv), null);
  assert.equal(
    localApiOrigin(root, localEnv, [
      process.execPath,
      import.meta.filename,
      "start",
    ]),
    null,
  );
  assert.equal(localApiOrigin(root, {}, []), null);
});

test("local configuration mismatches fail early without disclosing supplied values", () => {
  assert.throws(
    () => localApiOrigin(root, { ...localEnv, PORT: "3002" }, argv),
    /same port/,
  );
  assert.throws(
    () =>
      localApiOrigin(root, { ...localEnv, SERVER_HOST: "192.168.2.56" }, argv),
    /loopback/,
  );
  assert.throws(
    () =>
      localApiOrigin(
        root,
        { ...localEnv, PLANTOPEDIA_AUTO_START_API: "yes" },
        argv,
      ),
    /true or false/,
  );
  for (const url of [
    "secret-value",
    "http://private:secret@localhost:3001",
    "http://localhost:3001/v1",
    "http://localhost:3001?token=secret",
  ]) {
    assert.throws(
      () =>
        localApiOrigin(
          root,
          { ...localEnv, EXPO_PUBLIC_API_BASE_URL: url },
          argv,
        ),
      (error) =>
        !error.message.includes("secret") &&
        /EXPO_PUBLIC_API_BASE_URL/.test(error.message),
    );
  }
});

async function listener(t, handler) {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function closed(origin) {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${origin}/health`, { signal: AbortSignal.timeout(200) });
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.cause?.code === "ECONNREFUSED")
        return;
    }
    await delay(40);
  }
  assert.fail("API listener was left running");
}
async function fixture(t, mode = "ready") {
  const port = await freePort();
  let child;
  t.after(async () => {
    if (child?.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGKILL");
      await exited;
    }
  });
  return {
    origin: `http://127.0.0.1:${port}`,
    spawn: () => {
      child = fork(
        new URL("./fixtures/dev-api-supervisor.cjs", import.meta.url),
        [],
        {
          execArgv: [],
          env: {
            FIXTURE_MODE: mode,
            FIXTURE_PORT: String(port),
            PLANTOPEDIA_MANAGED_API: "true",
          },
          stdio: ["ignore", "ignore", "ignore", "ipc"],
        },
      );
      return child;
    },
  };
}

test("an existing API is rejected without terminating it so every Expo session owns its API", async (t) => {
  const { origin } = await listener(t, (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(
        req.url === "/health"
          ? { service: "plantopedia-api", status: "ok" }
          : {
              status: "ready",
              checks: { database: "ready", photoStorage: "ready" },
            },
      ),
    );
  });
  await assert.rejects(
    startLocalApi(
      { projectRoot: root, origin },
      {
        spawn: () => assert.fail("must not replace an existing API"),
        log: quiet,
      },
    ),
    /already running.*Ctrl\+C/,
  );
  assert.equal((await fetch(`${origin}/health`)).status, 200);
});

test("an occupied unrelated port is reported without spawning or killing anything", async (t) => {
  const { origin } = await listener(t, (_req, res) =>
    res.end("unrelated service"),
  );
  await assert.rejects(
    startLocalApi(
      { projectRoot: root, origin },
      { spawn: () => assert.fail("occupied port"), log: quiet },
    ),
    /occupied/,
  );
  assert.equal((await fetch(origin)).status, 200);
});

test("a transient Firebase readiness failure can recover before Metro starts", async (t) => {
  const { origin, spawn } = await fixture(t, "transient");
  const controller = await startLocalApi(
    { projectRoot: root, origin },
    { spawn, log: quiet },
  );
  // Startup made three readiness probes, then this request is the fourth.
  assert.equal((await (await fetch(`${origin}/ready`)).json()).attempt, 4);
  await controller.stop();
});

test("cold startup waits for API readiness and shutdown closes only its child", async (t) => {
  const { origin, spawn } = await fixture(t);
  const controller = await startLocalApi(
    { projectRoot: root, origin },
    { spawn, log: quiet },
  );
  assert.equal(controller.owned, true);
  assert.equal((await fetch(`${origin}/ready`)).status, 200);
  await Promise.all([controller.stop(), controller.stop()]);
  await closed(origin);
});

test("an owned API survives dependency failure, then recovers without restarting Expo", async (t) => {
  const { origin, spawn } = await fixture(t, "unready");
  const messages = [];
  const controller = await startLocalApi(
    { projectRoot: root, origin },
    { spawn, log: (message) => messages.push(message) },
  );
  assert.equal(controller.owned, true);
  assert.match(messages.join("\n"), /WARNING.*database/);
  assert.equal((await fetch(`${origin}/health`)).status, 200);
  assert.equal((await fetch(`${origin}/ready`)).status, 503);
  await fetch(`${origin}/recover`, { method: "POST" });
  assert.equal((await fetch(`${origin}/ready`)).status, 200);
  await controller.stop();
  await closed(origin);
});

test("readiness diagnostics are allowlisted and give actionable guidance", async (t) => {
  for (const mode of ["permission_denied", "PRIVATE_DIAGNOSTIC_SENTINEL"]) {
    const { origin, spawn } = await fixture(t, mode);
    const messages = [];
    const controller = await startLocalApi(
      { projectRoot: root, origin },
      { spawn, log: (message) => messages.push(message) },
    );
    if (mode === "permission_denied")
      assert.match(messages.join("\n"), /service-account IAM/);
    assert.doesNotMatch(messages.join("\n"), /PRIVATE_DIAGNOSTIC_SENTINEL/);
    await controller.stop();
  }
});

test("cold startup also works with the installed Expo CLI fetch shim", async (t) => {
  const expoRequire = createRequire(
    new URL(
      "../../node_modules/expo/node_modules/@expo/cli/build/src/utils/fetch.js",
      import.meta.url,
    ),
  );
  const { fetch: expoFetch } = expoRequire("fetch-nodeshim");
  t.mock.method(globalThis, "fetch", expoFetch);
  const { origin, spawn } = await fixture(t);
  const controller = await startLocalApi(
    { projectRoot: root, origin },
    { spawn, log: quiet },
  );
  assert.equal(controller.owned, true);
  assert.equal((await fetch(`${origin}/ready`)).status, 200);
  await controller.stop();
  await closed(origin);
});

test("dependency warnings never conceal an API process that dies during readiness", async (t) => {
  const { origin, spawn } = await fixture(t, "exit-during-readiness");
  await assert.rejects(
    startLocalApi({ projectRoot: root, origin }, { spawn, log: quiet }),
    /stopped during startup/,
  );
  await closed(origin);
});

test("startup exits and timeouts are actionable and do not leave children", async (t) => {
  for (const mode of ["exit", "hang"]) {
    const { origin, spawn } = await fixture(t, mode);
    await assert.rejects(
      startLocalApi(
        { projectRoot: root, origin, startupTimeoutMs: 600 },
        { spawn, log: quiet },
      ),
      mode === "exit" ? /could not start/ : /Timed out/,
    );
    await closed(origin);
  }
});

test("a failed spawn rejects promptly instead of hanging in cleanup", async () => {
  const origin = `http://127.0.0.1:${await freePort()}`;
  await assert.rejects(
    startLocalApi(
      { projectRoot: root, origin },
      {
        spawn: () =>
          fork("missing.cjs", {
            execPath: "/plantopedia-nonexistent-node",
            silent: true,
          }),
        log: quiet,
      },
    ),
    /could not start/,
  );
});

async function parentFixture(t, options = {}) {
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  let supervisorPid;
  const parent = fork(
    new URL("./fixtures/dev-api-parent.cjs", import.meta.url),
    [],
    {
      env: {
        FIXTURE_PORT: String(port),
        FIXTURE_SHUTDOWN_TIMEOUT_MS: "300",
        ...options,
      },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    },
  );
  t.after(async () => {
    if (parent.exitCode === null && parent.signalCode === null) {
      const exited = once(parent, "exit");
      parent.kill("SIGKILL");
      await exited;
    }
    // This only cleans up fixture processes if an assertion fails.
    if (supervisorPid) {
      try {
        process.kill(supervisorPid, "SIGTERM");
      } catch {}
    }
  });
  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("fixture startup timeout")),
      6000,
    );
    parent.on("message", (message) => {
      if (message.childPid) supervisorPid = message.childPid;
      if (message.ready) {
        clearTimeout(timeout);
        resolve();
      }
    });
    parent.once("error", reject);
    parent.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  return { parent, origin, ready, supervisorPid: () => supervisorPid };
}

async function processGone(pid) {
  assert.ok(pid, "supervisor was started");
  for (let i = 0; i < 100; i++) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code === "ESRCH") return;
      throw error;
    }
    await delay(20);
  }
  assert.fail("API supervisor was left running");
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGKILL"]) {
  test(`Expo parent ${signal} stops its API and supervisor`, async (t) => {
    const { parent, origin, ready, supervisorPid } = await parentFixture(t);
    await ready;
    assert.equal((await fetch(`${origin}/health`)).status, 200);
    const exited = once(parent, "exit");
    parent.kill(signal);
    await exited;
    await closed(origin);
    await processGone(supervisorPid());
  });
}

for (const blocked of [false, true]) {
  test(`Expo interactive Ctrl+C stops ${blocked ? "a blocked" : "a healthy"} API after immediate process.exit`, async (t) => {
    const { parent, origin, ready, supervisorPid } = await parentFixture(t, {
      FIXTURE_EXIT_STYLE: "interactive",
    });
    await ready;
    if (blocked) await fetch(`${origin}/block`);
    const exited = once(parent, "exit");
    parent.send({ ctrlC: true });
    await exited;
    await closed(origin);
    await processGone(supervisorPid());
  });
}

test("Ctrl+C during API readiness does not leave an API or supervisor", async (t) => {
  const { parent, origin, supervisorPid } = await parentFixture(t, {
    FIXTURE_MODE: "slow-readiness",
  });
  let started = false;
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(`${origin}/health`);
      started = true;
      break;
    } catch {
      await delay(20);
    }
  }
  assert.ok(started, "API reached startup readiness checks");
  const exited = once(parent, "exit");
  parent.kill("SIGINT");
  await exited;
  await closed(origin);
  await processGone(supervisorPid());
});
