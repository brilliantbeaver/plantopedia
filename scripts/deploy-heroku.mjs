import { spawnSync } from "node:child_process";
const app = process.argv[2];
if (!app || !/^[a-z][a-z0-9-]{2,29}$/.test(app))
  throw new Error("Usage: npm run deploy:api -- <heroku-app-name>");
function run(command, args, capture = false, cwd = process.cwd()) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: capture ? "pipe" : "inherit",
    encoding: "utf8",
  });
  if (result.status !== 0)
    throw new Error(`Deployment command failed: ${command}`);
  return result.stdout?.trim() ?? "";
}
const changes = run("git", ["status", "--porcelain", "--", "."], true);
if (changes) throw new Error("Commit Plantopedia changes before deploying.");
const root = run("git", ["rev-parse", "--show-toplevel"], true);
const source = run("git", ["rev-parse", "HEAD"], true);
const commit = run(
  "git",
  ["subtree", "split", "--prefix=mobile-apps/experiments/plantopedia", "HEAD"],
  true,
  root,
);
console.log(`Deploying committed Plantopedia subtree from ${source}`);
run("git", ["push", `https://git.heroku.com/${app}.git`, `${commit}:main`]);
