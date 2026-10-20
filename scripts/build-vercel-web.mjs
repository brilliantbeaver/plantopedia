import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
const proxyUrl = process.env.CLERK_PROXY_URL;
if (!publishableKey?.startsWith("pk_live_") || !proxyUrl) {
  throw new Error(
    "Vercel web build requires production Clerk public key and proxy URL.",
  );
}
const proxy = new URL(proxyUrl);
if (proxy.protocol !== "https:" || proxy.pathname !== "/__clerk")
  throw new Error("Expected the production HTTPS /__clerk proxy.");

// Only public app configuration and the operating environment reach Expo.
// Server secrets stay in the parent build/API environment.
const env = Object.fromEntries(
  ["PATH", "HOME", "TMPDIR", "SystemRoot"].flatMap((key) =>
    process.env[key] === undefined ? [] : [[key, process.env[key]]],
  ),
);
Object.assign(env, {
  NODE_ENV: "production",
  CI: "1",
  EXPO_NO_DOTENV: "1",
  EXPO_PUBLIC_API_BASE_URL: proxy.origin,
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey,
  EXPO_PUBLIC_CLERK_PROXY_URL: proxyUrl,
});
const result = spawnSync(
  process.execPath,
  [
    "node_modules/expo/bin/cli",
    "export",
    "--clear",
    "--platform",
    "web",
    "--output-dir",
    "server/public",
  ],
  { cwd: root, env, stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
