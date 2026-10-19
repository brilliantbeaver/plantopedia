import { fileURLToPath } from "node:url";
import { config as dotenv } from "dotenv";
import { parseConfig, type Config } from "./env.js";

export function loadConfig(): Config {
  if (process.env.NODE_ENV === "test")
    throw new Error("Local configuration loading is forbidden in tests");
  // Hosted deployments may omit this file; injected values always take priority.
  dotenv({
    path: fileURLToPath(new URL("../../../.env", import.meta.url)),
    override: false,
    quiet: true,
  });
  return parseConfig(process.env);
}
