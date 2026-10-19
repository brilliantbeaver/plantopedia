const { fork } = require("node:child_process");
const { join } = require("node:path");

// Expo's interactive Ctrl+C calls process.exit() without awaiting async hooks.
// Keep the API's shutdown deadline in a separate process that outlives Expo.
function superviseApi({
  projectRoot,
  entry = join(projectRoot, "server/src/index.ts"),
  env = process.env,
  shutdownTimeoutMs = 10000,
}) {
  // The parent can disappear before this module has even finished loading.
  if (!process.connected) return;

  const child = fork(entry, [], {
    cwd: projectRoot,
    execArgv: ["--import", "tsx"],
    env: { ...env, PLANTOPEDIA_MANAGED_API: "true" },
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
  let stopping = false;
  let deadline;
  function stop() {
    if (stopping) return;
    stopping = true;
    child.kill("SIGTERM");
    // Keep this timer referenced: it must survive the Expo IPC disconnect,
    // even if the API is stuck and cannot run its own shutdown handlers.
    deadline = setTimeout(() => child.kill("SIGKILL"), shutdownTimeoutMs);
  }
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  process.on("SIGHUP", stop);
  process.once("disconnect", stop);
  child.once("error", () => {
    console.error("[Plantopedia] The local API process could not start.");
    process.exit(1);
  });
  child.once("exit", (code) => {
    clearTimeout(deadline);
    process.exit(code ?? 1);
  });
  if (!process.connected) stop();
}

if (require.main === module) superviseApi({ projectRoot: process.cwd() });

module.exports = { superviseApi };
