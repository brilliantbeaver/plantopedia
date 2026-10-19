/* global __dirname */
const { join } = require("node:path");
const { superviseApi } = require("../../../scripts/dev-api-supervisor.cjs");

superviseApi({
  projectRoot: join(__dirname, "../../.."),
  entry: join(__dirname, "dev-api-server.mjs"),
  shutdownTimeoutMs: Number(process.env.FIXTURE_SHUTDOWN_TIMEOUT_MS || 10000),
});
