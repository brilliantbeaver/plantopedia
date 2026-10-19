const { fork } = require("node:child_process");
const { realpathSync } = require("node:fs");
const { join } = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");

function localApiOrigin(projectRoot, env = process.env, argv = process.argv) {
  if (
    (env.NODE_ENV && env.NODE_ENV !== "development") ||
    (env.CI && !["0", "false"].includes(env.CI)) ||
    env.EAS_BUILD === "true" ||
    (argv[2] !== undefined && argv[2] !== "start")
  )
    return null;
  // Metro config also runs in tests, export, EAS and other Node programs.
  // Require the actual installed Expo CLI, including its .bin symlink.
  try {
    if (
      realpathSync(argv[1]) !==
      realpathSync(join(projectRoot, "node_modules/expo/bin/cli"))
    )
      return null;
  } catch {
    return null;
  }
  if (env.PLANTOPEDIA_AUTO_START_API === "false") return null;
  if (
    env.PLANTOPEDIA_AUTO_START_API &&
    env.PLANTOPEDIA_AUTO_START_API !== "true"
  ) {
    throw new Error("PLANTOPEDIA_AUTO_START_API must be true or false.");
  }
  let url;
  try {
    url = new URL(env.EXPO_PUBLIC_API_BASE_URL);
  } catch {
    throw new Error(
      "Set EXPO_PUBLIC_API_BASE_URL before starting Expo. See .env.example.",
    );
  }
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    return null;
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["", "/"].includes(url.pathname)
  ) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL must be an API origin without credentials, paths or query parameters.",
    );
  }
  if (Number(url.port || 80) !== Number(env.PORT || 3001)) {
    throw new Error(
      "Local EXPO_PUBLIC_API_BASE_URL and API PORT must use the same port.",
    );
  }
  if (
    env.SERVER_HOST &&
    !["127.0.0.1", "localhost", "0.0.0.0", "::"].includes(env.SERVER_HOST)
  ) {
    throw new Error(
      "Local API startup requires a SERVER_HOST reachable through loopback. Use a hosted HTTPS API or manage the API separately.",
    );
  }
  return url.origin;
}

async function health(origin, timeoutMs = 1000) {
  let response;
  try {
    response = await fetch(`${origin}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "error",
    });
  } catch (error) {
    // Expo replaces global fetch with fetch-nodeshim, whose connection error
    // carries code directly; Node's native fetch nests it under cause.
    if (error.code === "ECONNREFUSED" || error.cause?.code === "ECONNREFUSED")
      return false;
    throw new Error(
      "Cannot check the local API. Check its address, listener and /health endpoint.",
    );
  }
  const body = await response.json().catch(() => null);
  if (
    !response.ok ||
    body?.service !== "plantopedia-api" ||
    body?.status !== "ok"
  ) {
    throw new Error(
      "The configured API port is occupied by a different or unhealthy service. Stop that service or correct PORT and EXPO_PUBLIC_API_BASE_URL.",
    );
  }
  return true;
}

async function checkReadiness(origin) {
  let response, body;
  try {
    response = await fetch(`${origin}/ready`, {
      signal: AbortSignal.timeout(6500),
      redirect: "error",
    });
    body = await response.json();
  } catch {
    throw new Error(
      "The local API did not become ready. Check its /ready endpoint and Firebase configuration.",
    );
  }
  if (
    !response.ok ||
    body?.status !== "ready" ||
    body?.checks?.database !== "ready" ||
    body?.checks?.photoStorage !== "ready"
  ) {
    const reasons = {
      credentials: "check the server service-account credentials",
      permission_denied:
        "check service-account IAM (Storage needs object-list access)",
      not_found:
        "check FIRESTORE_DATABASE_ID or provision the exact FIREBASE_STORAGE_BUCKET",
      timeout:
        "Firebase exceeded the five-second probe deadline; check connectivity and retry /ready",
      rate_limited: "check Firebase quota and billing",
      network: "check DNS and the server's connection to Firebase",
      upstream: "Firebase reported a temporary service failure",
      unknown: "check Firebase setup and server connectivity",
    };
    const unavailable = ["database", "photoStorage"]
      .filter((name) => body?.checks?.[name] !== "ready")
      .map((name) => {
        const reason = body?.reasons?.[name];
        const guidance = Object.hasOwn(reasons, reason)
          ? reasons[reason]
          : reasons.unknown;
        return `${name}: ${guidance}`;
      });
    return unavailable.join("; ") || "readiness response unavailable";
  }
  return null;
}

async function ready(origin, log) {
  // Dependency readiness is separate from process liveness. Never tear down
  // a working API/Metro just because Firebase is temporarily unavailable.
  let problem;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      problem = await checkReadiness(origin);
      if (!problem) return true;
    } catch {
      problem = "the /ready endpoint could not be checked";
    }
    if (attempt < 2) {
      log("Waiting for API dependencies; checking readiness again…");
      await delay(250);
    }
  }
  log(
    `WARNING: API dependencies unavailable (${problem}). Expo will continue and the API will stay running. Check ${origin}/ready; Retry affected actions after Firebase is available.`,
  );
  return false;
}

async function startLocalApi(
  { projectRoot, origin, env = process.env, startupTimeoutMs = 15000 },
  {
    spawn = () =>
      fork(join(projectRoot, "scripts/dev-api-supervisor.cjs"), [], {
        cwd: projectRoot,
        execArgv: [],
        env,
        stdio: ["ignore", "inherit", "inherit", "ipc"],
      }),
    log = (message) => console.log(`[Plantopedia] ${message}`),
  } = {},
) {
  if (await health(origin)) {
    throw new Error(
      "A local API is already running. Stop it in its original terminal, then restart Expo so Ctrl+C can stop both servers. To manage the API separately, set PLANTOPEDIA_AUTO_START_API=false.",
    );
  }
  log("Starting the local API for this Expo session…");
  const child = spawn();
  let stopped = false;
  let failed = false;
  let started = false;
  let stopPromise;
  // Exit handlers can only do synchronous work. The supervisor owns the
  // asynchronous wait and force-kill deadline, including during startup.
  const stopOnExit = () => {
    if (child.pid && child.exitCode === null && child.signalCode === null)
      child.kill("SIGTERM");
  };
  process.once("exit", stopOnExit);
  child.once("error", () => {
    process.removeListener("exit", stopOnExit);
    failed = true;
  });
  child.once("exit", () => {
    process.removeListener("exit", stopOnExit);
    failed = true;
    if (started && !stopped)
      log(
        "The local API stopped. Restart Expo to reconnect; check the API startup error above.",
      );
  });
  function stop() {
    if (stopPromise) return stopPromise;
    stopped = true;
    stopPromise = new Promise((resolve) => {
      if (!child.pid || child.exitCode !== null || child.signalCode !== null)
        return resolve();
      const timer = setTimeout(() => child.kill("SIGKILL"), 11000);
      timer.unref();
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
      child.kill("SIGTERM");
    });
    return stopPromise;
  }
  try {
    const deadline = Date.now() + startupTimeoutMs;
    while (true) {
      if (failed)
        throw new Error(
          "The local API could not start. Fix the server error above; run npm ci and npm run build:contracts if dependencies are missing.",
        );
      if (Date.now() >= deadline)
        throw new Error(
          "Timed out starting the local API. Check server configuration and retry Expo.",
        );
      if (await health(origin)) break;
      await delay(100);
    }
    const dependenciesReady = await ready(origin, log);
    if (failed || !(await health(origin)))
      throw new Error(
        "The local API stopped during startup. Check the server error above.",
      );
    started = true;
    log(
      dependenciesReady
        ? "Local API ready (database and photo storage). It will stop with Expo."
        : "Local API running with unavailable dependencies. It will stop with Expo.",
    );
    return { owned: true, stop };
  } catch (error) {
    await stop();
    throw error;
  }
}

let startup;
async function ensureDevelopmentApi(projectRoot) {
  const origin = localApiOrigin(projectRoot);
  if (!origin) return;
  if (!startup) {
    startup = startLocalApi({ projectRoot, origin });
  }
  await startup;
}

module.exports = { localApiOrigin, startLocalApi, ensureDevelopmentApi };
