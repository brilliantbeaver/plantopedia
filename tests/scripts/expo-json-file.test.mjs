import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { patchExpoJsonFile } from "../../scripts/patch-expo-json-file.mjs";

const require = createRequire(import.meta.url);
const requireExpo = createRequire(require.resolve("expo/package.json"));
const requireCli = createRequire(requireExpo.resolve("@expo/cli/package.json"));
const jsonFilePath = requireCli.resolve("@expo/json-file");
const JsonFile = require(jsonFilePath).default;
const run = promisify(execFile);
const settings = { easProjectId: "synthetic-project", privateKey: null };

test("Expo CLI can initialize the same signing cache concurrently", async () => {
  const directory = await mkdtemp(join(tmpdir(), "plantopedia-expo-json-"));
  try {
    const target = join(directory, "codesigning", "settings.json");
    const results = await Promise.allSettled(
      Array.from({ length: 32 }, () =>
        JsonFile.writeAsync(target, settings, { ensureDir: true, mode: 0o600 }),
      ),
    );
    assert.deepEqual(
      results.flatMap((result) =>
        result.status === "rejected" ? [result.reason.code] : [],
      ),
      [],
    );
    assert.deepEqual(JSON.parse(await readFile(target, "utf8")), settings);
    assert.equal((await stat(target)).mode & 0o777, 0o600);
    assert.deepEqual(await readdir(join(directory, "codesigning")), [
      "settings.json",
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Expo atomic writes work across processes with synchronous and asynchronous writers", async () => {
  const directory = await mkdtemp(join(tmpdir(), "plantopedia-expo-process-"));
  try {
    const target = join(directory, "settings.json");
    const worker = `
      const JsonFile = require(process.argv[1]).default;
      const target = process.argv[2];
      const settings = JSON.parse(process.argv[3]);
      for (let attempt = 0; attempt < 40; attempt++)
        JsonFile.write(target, settings, { mode: 0o600 });
      Promise.all(Array.from({ length: 16 }, () =>
        JsonFile.writeAsync(target, settings, { mode: 0o600 })
      )).catch((error) => { console.error(error.code); process.exitCode = 1; });
    `;
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        run(process.execPath, [
          "-e",
          worker,
          jsonFilePath,
          target,
          JSON.stringify(settings),
        ]),
      ),
    );
    assert.deepEqual(
      results.flatMap((result) =>
        result.status === "rejected" ? [result.reason.stderr] : [],
      ),
      [],
    );
    assert.deepEqual(JSON.parse(await readFile(target, "utf8")), settings);
    assert.equal((await stat(target)).mode & 0o777, 0o600);
    assert.deepEqual(await readdir(directory), ["settings.json"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Expo atomic writes still report a genuinely missing parent directory", async () => {
  const directory = await mkdtemp(join(tmpdir(), "plantopedia-expo-missing-"));
  try {
    const target = join(directory, "missing", "settings.json");
    await assert.rejects(JsonFile.writeAsync(target, settings), {
      code: "ENOENT",
    });
    assert.throws(() => JsonFile.write(target, settings), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("install workaround is repeatable and refuses unexpected dependency versions or source", async () => {
  const directory = await mkdtemp(join(tmpdir(), "plantopedia-expo-patch-"));
  try {
    const packageFile = join(directory, "package.json");
    const writer = join(directory, "build", "writeAtomic.js");
    await mkdir(join(directory, "build"));
    await writeFile(
      packageFile,
      JSON.stringify({ name: "@expo/json-file", version: "11.2.1" }),
    );
    const original =
      "function getTarget(filename, data) { const hash = 'fixture'; return `${filename}.${hash}`; }";
    await writeFile(writer, original);
    assert.equal(patchExpoJsonFile(packageFile), true);
    const patched = await readFile(writer, "utf8");
    assert.match(patched, /randomUUID/);
    // Execute this run's generated code, independently of installed patches.
    const getTarget = runInNewContext(`${patched}; getTarget;`, {
      _nodecrypto: () => ({ randomUUID }),
    });
    const targets = Array.from({ length: 32 }, () =>
      getTarget("settings.json", "identical-data"),
    );
    assert.equal(new Set(targets).size, 32);
    assert.equal(patchExpoJsonFile(packageFile), false);
    assert.equal(await readFile(writer, "utf8"), patched);
    await writeFile(writer, original);
    assert.equal(patchExpoJsonFile(packageFile), true);
    await writeFile(
      packageFile,
      JSON.stringify({ name: "@expo/json-file", version: "12.0.0" }),
    );
    assert.throws(() => patchExpoJsonFile(packageFile), /Review the Expo/);
    assert.equal(await readFile(writer, "utf8"), patched);
    await writeFile(
      packageFile,
      JSON.stringify({ name: "@expo/json-file", version: "11.2.1" }),
    );
    await writeFile(writer, "unexpected-source");
    assert.throws(
      () => patchExpoJsonFile(packageFile),
      /Unexpected Expo atomic writer/,
    );
    assert.equal(await readFile(writer, "utf8"), "unexpected-source");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
