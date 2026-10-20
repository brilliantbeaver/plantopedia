import { spawnSync } from "node:child_process";
import { readFile, readdir, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const sentinel = "PLANTOPEDIA_PRIVATE_SENTINEL_9e41c78";
const env = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  TMPDIR: process.env.TMPDIR,
  CI: "1",
  NODE_ENV: "production",
  EXPO_NO_DOTENV: "1",
  EXPO_PUBLIC_API_BASE_URL: "https://api.example.invalid",
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
    "pk_test_Zml4dHVyZS5jbGVyay5hY2NvdW50cy5kZXYk",
  EXPO_PUBLIC_CLERK_PROXY_URL: "https://api.example.invalid/__clerk",
  PLANTNET_API_KEY: sentinel,
  OPENAI_API_KEY: sentinel,
  TAVILY_API_KEY: sentinel,
  FIREBASE_PRIVATE_KEY: sentinel,
  LANGSMITH_API_KEY: sentinel,
  CLERK_SECRET_KEY: sentinel,
};
await mkdir("artifacts", { recursive: true });
const result = spawnSync(
  process.execPath,
  [
    "node_modules/expo/bin/cli",
    "export",
    "--platform",
    "all",
    "--no-bytecode",
    "--output-dir",
    "artifacts/web",
    "--source-maps",
  ],
  { env, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
);
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status || 1);
}
async function scan(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if (item.isDirectory()) await scan(path);
    else {
      if (
        item.name.startsWith(".env") ||
        /service.?account|\.pem$|\.key$/i.test(item.name)
      )
        throw new Error("Private file in export");
      const data = await readFile(path);
      if (data.includes(sentinel))
        throw new Error("Private sentinel found in export");
      if (item.name.endsWith(".map")) {
        const map = JSON.parse(data.toString("utf8"));
        if (
          map.sources?.some((source) =>
            /(?:^|\/)node_modules\/(?:braces|node-forge)\//.test(source),
          )
        )
          throw new Error(
            "Unpatched build-only dependency entered an app bundle",
          );
      }
    }
  }
}
await scan("artifacts/web");
const config = spawnSync(
  process.execPath,
  ["node_modules/expo/bin/cli", "config", "--type", "public", "--json"],
  { env, encoding: "utf8" },
);
if (
  config.status !== 0 ||
  config.stdout.includes(sentinel) ||
  config.stderr.includes(sentinel)
)
  throw new Error("Public config privacy check failed");
console.log(
  "iOS/Android/web JavaScript bundles, source maps and public Expo config contain no private sentinel; app source maps contain neither braces nor node-forge. Native/EAS archives remain separate release checks.",
);
