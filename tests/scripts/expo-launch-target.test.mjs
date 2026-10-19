import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { patchExpoLaunchTarget } from "../../scripts/patch-expo-launch-target.mjs";

const require = createRequire(import.meta.url);
const requireExpo = createRequire(require.resolve("expo/package.json"));
const cliPackage = requireExpo.resolve("@expo/cli/package.json");
const resolverPath = join(
  dirname(cliPackage),
  "build/src/start/resolveOptions.js",
);
const { resolveOptionsAsync } = require(resolverPath);
const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

test("bare Expo startup selects Expo Go while explicit runtime flags still work", async () => {
  assert.equal((await resolveOptionsAsync(projectRoot, {})).devClient, false);
  assert.equal(
    (await resolveOptionsAsync(projectRoot, { "--go": true })).devClient,
    false,
  );
  assert.equal(
    (await resolveOptionsAsync(projectRoot, { "--dev-client": true }))
      .devClient,
    true,
  );
  await assert.rejects(
    resolveOptionsAsync(projectRoot, { "--go": true, "--dev-client": true }),
    /Cannot use both/,
  );
});

test("other projects retain Expo's dependency-based runtime default", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "plantopedia-runtime-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    join(directory, "package.json"),
    JSON.stringify({
      name: "other-app",
      dependencies: { "expo-dev-client": "*" },
    }),
  );
  const options = await resolveOptionsAsync(directory, {
    "--scheme": "other-app",
  });
  assert.equal(options.devClient, true);
});

test("runtime patch is repeatable and rejects changed dependency versions or source", async (t) => {
  assert.equal(patchExpoLaunchTarget(), false);
  const directory = await mkdtemp(join(tmpdir(), "plantopedia-runtime-patch-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const packageFile = join(directory, "package.json");
  const target = join(directory, "build/src/start/resolveOptions.js");
  await mkdir(dirname(target), { recursive: true });
  const patched = await readFile(resolverPath, "utf8");
  const original = patched.replace(
    "require('@expo/config').getPackageJson(projectRoot).plantopedia?.defaultRuntime !== 'expo-go' && ",
    "",
  );
  assert.notEqual(original, patched);
  await writeFile(
    packageFile,
    JSON.stringify({ name: "@expo/cli", version: "57.0.31" }),
  );
  await writeFile(target, original);
  assert.equal(patchExpoLaunchTarget(packageFile), true);
  assert.equal(await readFile(target, "utf8"), patched);
  assert.equal(patchExpoLaunchTarget(packageFile), false);
  await writeFile(target, "changed upstream source");
  assert.throws(() => patchExpoLaunchTarget(packageFile), /Unexpected Expo/);
  await writeFile(
    packageFile,
    JSON.stringify({ name: "@expo/cli", version: "58.0.0" }),
  );
  assert.throws(() => patchExpoLaunchTarget(packageFile), /Review/);
});
