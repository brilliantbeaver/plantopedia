import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  symlinkSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { packageVercelOutput } from "../../scripts/package-vercel-output.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "plantopedia-vercel-output-"));
  const write = (path, body) => {
    const full = join(root, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body);
  };
  write("package.json", '{"type":"module"}');
  write(
    "server/dist/server.js",
    "import { value } from '@plantopedia/contracts'; export default value;",
  );
  write(
    "packages/contracts/package.json",
    '{"type":"module","main":"dist/index.js"}',
  );
  write("packages/contracts/dist/index.js", "export const value = 42;");
  mkdirSync(join(root, "node_modules/@plantopedia"), { recursive: true });
  symlinkSync(
    "../../packages/contracts",
    join(root, "node_modules/@plantopedia/contracts"),
  );
  write("node_modules/express/package.json", '{"version":"5.3.0"}');
  write(
    "server/public/index.html",
    '<script src="/assets/vendor/app.js"></script>',
  );
  write("server/public/assets/vendor/app.js", "console.log('app');");
  write("server/public/assets/vendor/icons.ttf", "fixture-font");
  return {
    root,
    write,
    close: () => rmSync(root, { recursive: true, force: true }),
  };
}

test("clean source builds package generated static files and self-contained workspace dependencies", async () => {
  const f = fixture();
  try {
    const { output, functionDir } = await packageVercelOutput(f.root);
    assert.equal(
      readFileSync(join(output, "static/assets/vendor/icons.ttf"), "utf8"),
      "fixture-font",
    );
    assert.equal(
      readFileSync(
        join(functionDir, "node_modules/@plantopedia/contracts/dist/index.js"),
        "utf8",
      ),
      "export const value = 42;",
    );
    const config = JSON.parse(
      readFileSync(join(functionDir, ".vc-config.json"), "utf8"),
    );
    assert.equal(config.runtime, "nodejs22.x");
    assert.equal(existsSync(join(functionDir, config.handler)), true);
    f.write("server/.vercel/output/static/stale.js", "stale");
    await packageVercelOutput(f.root);
    assert.equal(existsSync(join(output, "static/stale.js")), false);
  } finally {
    f.close();
  }
});

test("packaging fails before publishing accidental private files in the web export", async () => {
  const f = fixture();
  try {
    f.write("server/public/.env.production", "FIXTURE_SECRET=private");
    await assert.rejects(
      packageVercelOutput(f.root),
      /Private or out-of-project/,
    );
    assert.equal(
      existsSync(join(f.root, "server/.vercel/output/static/.env.production")),
      false,
    );
  } finally {
    f.close();
  }
});

test("unpatched build-tool dependencies cannot enter the API function", async () => {
  const f = fixture();
  try {
    f.write(
      "server/dist/server.js",
      "import braces from 'braces'; export default braces;",
    );
    f.write("node_modules/braces/package.json", '{"main":"index.js"}');
    f.write("node_modules/braces/index.js", "module.exports = {};");
    await assert.rejects(
      packageVercelOutput(f.root),
      /Unpatched build-only dependency/,
    );
  } finally {
    f.close();
  }
});
