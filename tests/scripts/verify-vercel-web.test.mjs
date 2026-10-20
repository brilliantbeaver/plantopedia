import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const key = "pk_live_fixture";
const proxy = "https://fixture.example/__clerk";
const correct = `const config = ${JSON.stringify([key, proxy])};`;
function verify(entry, unused, expectedKey = key) {
  const root = mkdtempSync(join(tmpdir(), "plantopedia-export-check-"));
  try {
    mkdirSync(join(root, "scripts"));
    const publicDir = join(root, "server/public");
    mkdirSync(join(publicDir, "_expo/static/js/web"), { recursive: true });
    copyFileSync(
      new URL("../../scripts/verify-vercel-web.mjs", import.meta.url),
      join(root, "scripts/verify.mjs"),
    );
    writeFileSync(
      join(publicDir, "index.html"),
      '<script src="/_expo/static/js/web/entry.js" defer></script>',
    );
    writeFileSync(join(publicDir, "_expo/static/js/web/entry.js"), entry);
    if (unused)
      writeFileSync(join(publicDir, "_expo/static/js/web/unused.js"), unused);
    return spawnSync(process.execPath, [join(root, "scripts/verify.mjs")], {
      env: { CLERK_PUBLISHABLE_KEY: expectedKey, CLERK_PROXY_URL: proxy },
      encoding: "utf8",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("accepts production settings in the HTML-referenced entry", () => {
  assert.equal(verify(correct).status, 0);
});
test("an unused correct bundle cannot conceal a stale HTML entry", () => {
  const result = verify('const config = "stale";', correct);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing or stale web export/);
});
test("a referenced entry for another Clerk environment is rejected", () => {
  assert.notEqual(verify(correct, undefined, "pk_live_other").status, 0);
});
