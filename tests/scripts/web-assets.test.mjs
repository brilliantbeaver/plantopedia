import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import exportAssetPaths from "../../scripts/export-asset-paths.cjs";
import { verifyWebAssets } from "../../scripts/verify-web-assets.mjs";

test("exported dependency assets avoid upload exclusions, including nested dependencies", () => {
  const asset = {
    httpServerLocation:
      "/assets?export_path=/assets/node_modules/expo/node_modules/icons/Fonts",
    name: "Ionicons",
    files: ["/project/node_modules/icons/Fonts/Ionicons.ttf"],
  };
  const exported = exportAssetPaths(asset);
  assert.equal(
    exported.httpServerLocation,
    "/assets?export_path=/assets/vendor/expo/vendor/icons/Fonts",
  );
  assert.equal(exported.files, asset.files);
  assert.equal(asset.httpServerLocation.includes("node_modules"), true);
});

test("Metro development asset URLs retain their source locations", () => {
  for (const httpServerLocation of [
    "/assets/node_modules/icons",
    "/assets?unstable_path=node_modules/icons",
  ]) {
    const asset = { httpServerLocation };
    assert.equal(exportAssetPaths(asset), asset);
  }
});

test("an export cannot pass when a referenced font is missing or filtered out during upload", () => {
  const root = mkdtempSync(join(tmpdir(), "plantopedia-assets-"));
  const publicDir = pathToFileURL(`${root}/`);
  try {
    const asset = "/assets/vendor/icons/Ionicons.123.ttf";
    const entry = `const font = ${JSON.stringify(asset)};`;
    assert.throws(() => verifyWebAssets([entry], publicDir), /ENOENT/);
    mkdirSync(join(root, "assets/vendor/icons"), { recursive: true });
    writeFileSync(join(root, asset), "fixture-font");
    assert.deepEqual(verifyWebAssets([entry], publicDir), [asset]);
    assert.throws(
      () =>
        verifyWebAssets(
          ['const font="/assets/node_modules/icons/Ionicons.ttf";'],
          publicDir,
        ),
      /excluded directory/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
