import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// Public acceptance, against a deployment built from this source revision.
const base = new URL(
  process.argv[2] || "https://plantopedia-nine.vercel.app/tutorials/",
);
assert.equal(base.pathname, "/tutorials/");
assert.ok(base.protocol === "https:" || base.hostname === "127.0.0.1");
const local = fileURLToPath(
  new URL("../server/public/tutorials/", import.meta.url),
);
const manifest = JSON.parse(
  await readFile(resolve(local, "publication.json"), "utf8"),
);
async function get(path) {
  return fetch(new URL(path, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
}
const redirect = await get("/tutorials");
assert.equal(redirect.status, 308);
assert.equal(
  new URL(redirect.headers.get("location"), base).pathname,
  "/tutorials/",
);
for (const path of [
  "missing-acceptance-file.js",
  ".env",
  "source/.env.html",
  "tools/build_course.py",
]) {
  assert.equal((await get(path)).status, 404, path);
}
const entry = await get("");
assert.equal(entry.status, 200);
assert.deepEqual(
  Buffer.from(await entry.arrayBuffer()),
  await readFile(resolve(local, "index.html")),
);
const paths = [...manifest.files, "publication.json"];
for (let index = 0; index < paths.length; index += 6) {
  await Promise.all(
    paths.slice(index, index + 6).map(async (path) => {
      const response = await get(
        path.split("/").map(encodeURIComponent).join("/"),
      );
      assert.equal(response.status, 200, path);
      assert.equal(
        response.headers.get("x-content-type-options"),
        "nosniff",
        path,
      );
      assert.match(
        response.headers.get("content-security-policy") || "",
        /object-src 'none'/,
        path,
      );
      assert.match(
        response.headers.get("cache-control") || "",
        /(?:max-age=0|no-cache)/,
        path,
      );
      if (path.endsWith(".js"))
        assert.match(
          response.headers.get("content-type"),
          /(?:application|text)\/javascript/,
          path,
        );
      if (path.endsWith(".svg"))
        assert.match(
          response.headers.get("content-type"),
          /image\/svg\+xml/,
          path,
        );
      assert.deepEqual(
        Buffer.from(await response.arrayBuffer()),
        await readFile(resolve(local, path)),
        path,
      );
    }),
  );
}
assert.match(
  entry.headers.get("content-security-policy") || "",
  /object-src 'none'/,
);
console.log(
  `Verified /tutorials redirect, entry, 4 private/missing paths, and ${paths.length} files with exact bytes and security/cache headers.`,
);
