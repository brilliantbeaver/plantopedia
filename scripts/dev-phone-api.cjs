/* global __dirname */
const { fork } = require("node:child_process");
const { join } = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");
const { localApiOrigin, ensureDevelopmentApi } = require("./dev-api.cjs");

function phoneApiOrigin(projectRoot, env = process.env, argv = process.argv) {
  const local = localApiOrigin(projectRoot, env, argv);
  if (!local) return null;
  const enabled = env.PLANTOPEDIA_PHONE_API;
  if (enabled && !["true", "false"].includes(enabled))
    throw new Error("PLANTOPEDIA_PHONE_API must be true or false.");
  return enabled === "true" ? local : null;
}

function launchTunnel(origin, env = process.env, forkProcess = fork) {
  // The tunnel does not need any Firebase, Clerk or model-provider credentials.
  const tunnelEnv = Object.fromEntries(
    [
      "PATH",
      "HOME",
      "TMPDIR",
      "SystemRoot",
      "SSL_CERT_FILE",
      "SSL_CERT_DIR",
    ].flatMap((key) => (env[key] ? [[key, env[key]]] : [])),
  );
  const child = forkProcess(join(__dirname, "dev-phone-tunnel.cjs"), [origin], {
    env: tunnelEnv,
    execArgv: [],
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  let stopped = false;
  let established = false;
  const stop = () => {
    stopped = true;
    if (child.connected) child.disconnect();
  };
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      stop();
      reject(
        new Error(
          "Phone HTTPS tunnel timed out. Check the connection and restart Expo.",
        ),
      );
    }, 30000);
    const fail = (message) => {
      clearTimeout(timer);
      reject(new Error(message));
    };
    child.once("error", () => fail("Could not start the phone HTTPS tunnel."));
    child.once("exit", () => {
      if (established && !stopped)
        console.warn(
          "[Plantopedia] Phone HTTPS tunnel closed. Restart Expo to reconnect.",
        );
      fail("Phone HTTPS tunnel closed. Restart Expo to reconnect.");
    });
    child.on("message", (message) => {
      if (
        message?.type === "origin" &&
        /^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/.test(
          message.origin,
        )
      ) {
        clearTimeout(timer);
        established = true;
        resolve(message.origin);
      } else if (message?.type === "error") {
        fail(
          message.code === "cloudflared_missing"
            ? "Phone access requires cloudflared. Install it, then restart npx expo start. See notes/phone-capture-recovery.md."
            : "Could not establish the phone HTTPS tunnel. Check the connection and restart Expo.",
        );
        stop();
      }
    });
  });
  return { ready, stop };
}

async function verifyPhoneApi(origin, fetcher = fetch, wait = delay) {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const response = await fetcher(`${origin}/health`, {
        signal: AbortSignal.timeout(3000),
        redirect: "error",
      });
      const body = await response.json();
      if (
        response.ok &&
        body.service === "plantopedia-api" &&
        body.status === "ok"
      ) {
        const denied = await fetcher(`${origin}/v1/me/preferences`, {
          headers: { Origin: origin },
          signal: AbortSignal.timeout(3000),
          redirect: "error",
        });
        if (denied.status !== 401)
          throw new Error("phone_api_authentication_check_failed");
        if (denied.headers.get("access-control-allow-origin") !== origin)
          throw new Error(
            "phone_api_origin_missing: Stop the separately running local API and restart Expo so the new phone origin is configured.",
          );
        return;
      }
    } catch (error) {
      if (
        error.message === "phone_api_authentication_check_failed" ||
        error.message?.startsWith("phone_api_origin_missing:")
      )
        throw error;
    }
    await wait(500);
  }
  throw new Error(
    "The phone HTTPS API is unreachable. Check connectivity, then restart Expo.",
  );
}

async function startPhoneApi({
  origin,
  startApi,
  env = process.env,
  tunnel = launchTunnel,
  verify = verifyPhoneApi,
}) {
  const connection = tunnel(origin, env);
  const previousOrigins = env.WEB_ALLOWED_ORIGINS;
  try {
    const publicOrigin = await connection.ready;
    env.WEB_ALLOWED_ORIGINS = [
      ...new Set([
        ...(previousOrigins ?? "").split(",").filter(Boolean),
        publicOrigin,
      ]),
    ].join(",");
    // Keep the configured local origin until the normal API ownership guard
    // has started the server; the ephemeral HTTPS URL is only for this run.
    await startApi();
    await verify(publicOrigin);
    env.EXPO_PUBLIC_API_BASE_URL = publicOrigin;
    console.log(
      `[Plantopedia] Phone API ready: ${publicOrigin}. Reload Expo Go after each restart.`,
    );
    return publicOrigin;
  } catch (error) {
    connection.stop();
    if (previousOrigins === undefined) delete env.WEB_ALLOWED_ORIGINS;
    else env.WEB_ALLOWED_ORIGINS = previousOrigins;
    throw error;
  }
}

let startup;
async function ensureDevelopmentServices(projectRoot) {
  if (startup) return startup;
  const origin = phoneApiOrigin(projectRoot);
  if (!origin) return ensureDevelopmentApi(projectRoot);
  startup = startPhoneApi({
    origin,
    startApi: () => ensureDevelopmentApi(projectRoot),
  });
  return startup;
}
module.exports = {
  phoneApiOrigin,
  startPhoneApi,
  verifyPhoneApi,
  launchTunnel,
  ensureDevelopmentServices,
};
