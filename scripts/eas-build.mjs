import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { exportApp } from "./export-app.mjs";
const args = process.argv.slice(2);
if (
  !["build", "build:inspect", "submit"].includes(args[0]) ||
  args.includes("--local")
)
  throw new Error(
    "Use build, build:inspect, or submit with EAS cloud; local native compilation is not part of this workflow.",
  );
const appDirectory = fileURLToPath(new URL("..", import.meta.url));
const { directory, revision } = exportApp(appDirectory);
// Root .env is never copied or read. Hosted EAS environments supply the public configuration.
const names = [
  "PATH",
  "HOME",
  "TMPDIR",
  "USER",
  "SHELL",
  "CI",
  "EXPO_TOKEN",
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
];
const env = Object.fromEntries(
  names.flatMap((name) =>
    process.env[name] === undefined ? [] : [[name, process.env[name]]],
  ),
);
env.EXPO_NO_DOTENV = "1";
env.EAS_NO_VCS = "1";
env.EAS_PROJECT_ROOT = directory;
console.log(`Using isolated Plantopedia source ${revision} in ${directory}`);
for (const commandArgs of [["ci"], ["run", "build:contracts"]]) {
  const result = spawnSync("npm", commandArgs, {
    cwd: directory,
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const result = spawnSync("npx", ["eas-cli@24.8.0", ...args], {
  cwd: directory,
  env,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
