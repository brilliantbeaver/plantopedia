import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
export function command(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) throw new Error(`Command failed: ${command}`);
  return result.stdout?.trim() ?? "";
}
// Export tracked committed files only, independent of the parent repository's EAS upload root.
export function exportApp(appDirectory) {
  if (command("git", ["status", "--porcelain", "--", "."], appDirectory))
    throw new Error("Commit Plantopedia changes before exporting.");
  const prefix = command(
    "git",
    ["rev-parse", "--show-prefix"],
    appDirectory,
  ).replace(/\/$/, "");
  const revision = command("git", ["rev-parse", "HEAD"], appDirectory);
  const repositoryRoot = command(
    "git",
    ["rev-parse", "--show-toplevel"],
    appDirectory,
  );
  const archive = spawnSync(
    "git",
    ["archive", prefix ? `${revision}:${prefix}` : revision],
    { cwd: repositoryRoot, maxBuffer: 30 * 1024 * 1024 },
  );
  if (archive.status !== 0)
    throw new Error("Could not export committed application.");
  // EAS computes the uploaded project path relative to this root. macOS /var
  // aliases /private/var; match the canonical cwd seen by the child process.
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "plantopedia-eas-")));
  command("tar", ["-xf", "-", "-C", directory], appDirectory, {
    input: archive.stdout,
  });
  return { directory, revision };
}
