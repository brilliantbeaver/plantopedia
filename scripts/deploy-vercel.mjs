import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const root = fileURLToPath(new URL("..", import.meta.url));
const envFile = new URL("../.env", import.meta.url);
const config = existsSync(envFile) ? parse(readFileSync(envFile)) : {};
const system = Object.fromEntries(
  ["PATH", "HOME", "TMPDIR", "SystemRoot"].flatMap((key) =>
    process.env[key] === undefined ? [] : [[key, process.env[key]]],
  ),
);
function run(command, args, env = system) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// Both Git and CLI use the same cloud build and Vercel environment variables.
// Native API dependencies are packaged on Linux rather than the developer's OS.
run("vercel", ["deploy", "--prod", "--skip-domain", ...process.argv.slice(2)], {
  ...system,
  ...(process.env.VERCEL_TOKEN || config.VERCEL_API_TOKEN
    ? { VERCEL_TOKEN: process.env.VERCEL_TOKEN || config.VERCEL_API_TOKEN }
    : {}),
});
