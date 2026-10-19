/* global __dirname */
const { fork } = require("node:child_process");
const { join } = require("node:path");
const { startLocalApi } = require("../../../scripts/dev-api.cjs");
const projectRoot = join(__dirname, "../../..");

void startLocalApi(
  {
    projectRoot,
    origin: `http://127.0.0.1:${process.env.FIXTURE_PORT}`,
  },
  {
    log: () => {},
    spawn: () => {
      const child = fork(join(__dirname, "dev-api-supervisor.cjs"), [], {
        execArgv: [],
        env: {
          FIXTURE_PORT: process.env.FIXTURE_PORT,
          FIXTURE_MODE: process.env.FIXTURE_MODE,
          FIXTURE_SHUTDOWN_TIMEOUT_MS: process.env.FIXTURE_SHUTDOWN_TIMEOUT_MS,
        },
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      });
      process.send({ childPid: child.pid });
      return child;
    },
  },
).then(() => {
  process.send({ ready: true });
  if (process.env.FIXTURE_EXIT_STYLE === "interactive") {
    process.on("message", () => {
      // Match Expo's raw-mode Ctrl+C path: a synthetic signal immediately
      // followed by process.exit(), which cannot await signal listeners.
      process.emit("SIGINT");
      process.exit(0);
    });
  }
});
