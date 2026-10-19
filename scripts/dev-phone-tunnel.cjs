const { spawn } = require("node:child_process");
const { devNull } = require("node:os");

// A separate IPC owner survives Expo's synchronous process.exit() and closes
// the tunnel even when the terminal or Metro parent disappears.
function superviseTunnel(origin, spawnProcess = spawn) {
  if (!process.connected) return;
  const child = spawnProcess(
    "cloudflared",
    [
      "tunnel",
      "--config",
      devNull,
      "--no-autoupdate",
      "--protocol",
      "http2",
      "--metrics",
      "127.0.0.1:0",
      "--url",
      origin,
      "--logformat",
      "json",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let stopping = false;
  let deadline;
  let reported = false;
  let buffer = "";
  const send = (message) => {
    if (process.connected) process.send(message, () => {});
  };
  const inspect = (chunk) => {
    // Never relay arbitrary provider output or machine details to the UI/log.
    buffer = (buffer + chunk.toString()).slice(-16384);
    const match = buffer.match(
      /https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com\b/,
    );
    if (match && !reported) {
      reported = true;
      send({ type: "origin", origin: match[0] });
    }
  };
  child.stdout.on("data", inspect);
  child.stderr.on("data", inspect);
  function stop() {
    if (stopping) return;
    stopping = true;
    child.kill("SIGTERM");
    deadline = setTimeout(() => child.kill("SIGKILL"), 5000);
  }
  process.once("disconnect", stop);
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  process.on("SIGHUP", stop);
  child.once("error", (error) => {
    send({
      type: "error",
      code:
        error.code === "ENOENT" ? "cloudflared_missing" : "tunnel_start_failed",
    });
    process.exitCode = 1;
  });
  child.once("close", (code) => {
    clearTimeout(deadline);
    process.exit(code ?? 1);
  });
  if (!process.connected) stop();
}

if (require.main === module) superviseTunnel(process.argv[2]);
module.exports = { superviseTunnel };
