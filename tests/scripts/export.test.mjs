import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { exportApp, command } from "../../scripts/export-app.mjs";
test("EAS source export excludes parent projects and ignored credentials, and rejects uncommitted source", () => {
  const root = mkdtempSync(join(tmpdir(), "plantopedia-export-test-"));
  let output;
  try {
    const app = join(root, "mobile-apps/experiments/plantopedia");
    mkdirSync(app, { recursive: true });
    writeFileSync(join(root, "unrelated.txt"), "must stay outside upload");
    writeFileSync(join(app, ".gitignore"), ".env\n");
    writeFileSync(join(app, "package.json"), '{"name":"plantopedia"}\n');
    command("git", ["init", "--quiet"], root);
    command("git", ["add", "."], root);
    command(
      "git",
      [
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "fixture",
      ],
      root,
    );
    writeFileSync(join(app, ".env"), "PRIVATE_SENTINEL=never-upload\n");
    output = exportApp(app).directory;
    assert.equal(
      command(process.execPath, ["-p", "process.cwd()"], output),
      output,
    );
    assert.equal(existsSync(join(output, ".env")), false);
    assert.equal(existsSync(join(output, "unrelated.txt")), false);
    assert.equal(existsSync(join(output, "mobile-apps")), false);
    assert.equal(
      JSON.parse(readFileSync(join(output, "package.json"), "utf8")).name,
      "plantopedia",
    );
    writeFileSync(join(app, "package.json"), '{"name":"changed"}\n');
    assert.throws(() => exportApp(app), /Commit Plantopedia/);
  } finally {
    if (output) rmSync(output, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});
