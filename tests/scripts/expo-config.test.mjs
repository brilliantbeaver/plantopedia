import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { getConfig } = require("@expo/config");
const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

test("Expo resolves every installed plugin with recorded audio and no WebRTC dependencies", async () => {
  // Resolve plugins as native manifest/prebuild does, rather than only parsing
  // TypeScript or bundling the browser application.
  const { exp } = getConfig(projectRoot);
  const plugins = exp.plugins.map((plugin) =>
    Array.isArray(plugin) ? plugin[0] : plugin,
  );
  assert.ok(plugins.includes("expo-audio"));
  assert.ok(!plugins.some((plugin) => /webrtc/i.test(plugin)));
  assert.ok(exp._internal.pluginHistory["expo-audio"]);
  const pkg = JSON.parse(
    await readFile(new URL("../../package.json", import.meta.url), "utf8"),
  );
  assert.ok(pkg.dependencies["expo-audio"]);
  assert.ok(
    !Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).some((name) =>
      /webrtc/i.test(name),
    ),
  );
});
