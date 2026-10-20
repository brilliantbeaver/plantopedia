import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { patchQueryString } from "../../scripts/patch-query-string.mjs";

const require = createRequire(import.meta.url);

test("query strings decode Unicode and tolerate malformed input using the fixed decoder", () => {
  assert.equal(
    patchQueryString(),
    false,
    "postinstall must have applied the compatibility patch",
  );
  const query = require("query-string");
  assert.deepEqual(
    { ...query.parse("name=%E8%8A%B1&broken=%FF%41") },
    { name: "花", broken: "%FFA" },
  );
  const child = spawnSync(
    process.execPath,
    [
      "-e",
      `
    const q = require('query-string');
    const value = '%EA%A4'.repeat(10000);
    if (!q.parse('q=' + value).q) process.exit(1);
  `,
    ],
    { cwd: new URL("../..", import.meta.url), timeout: 5000, encoding: "utf8" },
  );
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
});

test("Istanbul still loads YAML config after removing argparse 1 and sprintf-js", async () => {
  const root = mkdtempSync(join(tmpdir(), "plantopedia-nyc-"));
  try {
    writeFileSync(join(root, "package.json"), "{}");
    writeFileSync(
      join(root, ".nycrc.yaml"),
      "all: true\ninclude:\n  - src/**/*.ts\nreporter:\n  - text\n",
    );
    const { loadNycConfig } = require("@istanbuljs/load-nyc-config");
    const config = await loadNycConfig({ cwd: root });
    assert.equal(config.all, true);
    assert.deepEqual(config.include, ["src/**/*.ts"]);
    assert.deepEqual(config.reporter, ["text"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Xcode keeps its UUID format and rejects undersized UUID output buffers", () => {
  const xcode = require("xcode");
  const project = xcode.project("fixture.pbxproj");
  project.hash = { project: { objects: {} } };
  assert.match(project.generateUuid(), /^[A-F0-9]{24}$/);
  const fromXcode = createRequire(require.resolve("xcode/package.json"));
  const uuid = fromXcode("uuid");
  assert.throws(
    () => uuid.v5("plant", uuid.v5.DNS, new Uint8Array(8)),
    RangeError,
  );
});
