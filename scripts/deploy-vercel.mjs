import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const root = fileURLToPath(new URL("..", import.meta.url));
const config = parse(readFileSync(new URL("../.env", import.meta.url)));
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
// Vercel's Express static builder snapshots public assets at upload time.
// Build first, then upload using the explicit secret exclusions in .vercelignore.
run("npm", ["run", "build:contracts"]);
run(process.execPath, ["scripts/build-vercel-web.mjs"], {
  ...system,
  CLERK_PUBLISHABLE_KEY: config.CLERK_PUBLISHABLE_KEY,
  CLERK_PROXY_URL: config.CLERK_PROXY_URL,
});
run(process.execPath, ["scripts/verify-vercel-web.mjs"], {
  ...system,
  CLERK_PUBLISHABLE_KEY: config.CLERK_PUBLISHABLE_KEY,
  CLERK_PROXY_URL: config.CLERK_PROXY_URL,
});
run("vercel", ["deploy", "--prod", "--skip-domain", ...process.argv.slice(2)], {
  ...system,
  ...(process.env.VERCEL_TOKEN || config.VERCEL_API_TOKEN
    ? { VERCEL_TOKEN: process.env.VERCEL_TOKEN || config.VERCEL_API_TOKEN }
    : {}),
});
