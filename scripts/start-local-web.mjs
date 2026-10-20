import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";
import { localWebEnvironment } from "./local-web-env.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
try {
  const read = (name) =>
    parse(readFileSync(new URL(`../${name}`, import.meta.url)));
  const env = localWebEnvironment(
    read(".env"),
    read(".env.clerk.local"),
    process.env,
  );
  console.log(
    "Starting local web + API with Clerk Development. Firebase/provider settings come from .env plus .env.clerk.local overrides.",
  );
  const child = spawn(
    process.execPath,
    ["node_modules/expo/bin/cli", "start", "--web", "--localhost", "--clear"],
    {
      cwd: root,
      env,
      stdio: "inherit",
    },
  );
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"])
    process.on(signal, () => child.kill(signal));
  child.on("error", () => {
    console.error("Could not start Expo.");
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
} catch (error) {
  console.error(
    error.code === "ENOENT"
      ? "Create .env.clerk.local with your Clerk Development pk_test_ and sk_test_ keys. See notes/clerk-local-and-google.md."
      : error.message,
  );
  process.exitCode = 1;
}
