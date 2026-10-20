import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = promisify(execFile);
const origin = new URL(process.argv[2]);
assert.equal(origin.protocol, "https:");
const publicDir = new URL("../server/public/", import.meta.url);

async function request(path) {
  const directory = await mkdtemp(join(tmpdir(), "plantopedia-acceptance-"));
  try {
    const { stdout } = await run(
      "vercel",
      [
        "curl",
        path,
        "--deployment",
        origin.hostname,
        "--",
        "--silent",
        "--show-error",
        "--no-location",
        "--max-time",
        "30",
        "--output",
        join(directory, "body"),
        "--dump-header",
        join(directory, "headers"),
        "--write-out",
        "%{http_code}",
      ],
      { timeout: 45000 },
    );
    return {
      status: Number(stdout.trim()),
      body: await readFile(join(directory, "body")),
      headers: await readFile(join(directory, "headers"), "utf8"),
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const routes = [
  ["/", 307],
  ["/login", 200],
  ["/plants", 200],
  ["/plants/acceptance-fixture", 200],
  ["/scan", 200],
  ["/ask", 200],
  ["/settings", 200],
  ["/tasks", 200],
  ["/sso-callback", 200],
  ["/health", 200],
  ["/ready", 200],
  ["/v1/plants", 401],
  ["/__clerk/v1/environment", 200],
  ["/.env.clerk.local", 404],
  ["/unknown-acceptance-path", 404],
  ["/assets/missing-acceptance-font.ttf", 404],
];
for (const [path, status] of routes) {
  const result = await request(path);
  assert.equal(result.status, status, `${path}: HTTP status`);
  if (path === "/") assert.match(result.headers, /location: \/plants\r?$/im);
  if (path === "/health") assert.equal(JSON.parse(result.body).status, "ok");
  if (path === "/ready") assert.equal(JSON.parse(result.body).status, "ready");
  if (
    status === 200 &&
    !["/health", "/ready", "/__clerk/v1/environment"].includes(path)
  ) {
    assert.match(result.headers, /content-type: text\/html/im);
    assert.match(result.headers, /cache-control:.*no-cache/im);
    assert.deepEqual(
      result.body,
      await readFile(new URL("index.html", publicDir)),
      `${path}: current HTML`,
    );
  }
  console.log(`${status} ${path}`);
}
const files = (
  await readdir(publicDir, { recursive: true, withFileTypes: true })
).filter((entry) => entry.isFile());
for (let index = 0; index < files.length; index += 4) {
  await Promise.all(
    files.slice(index, index + 4).map(async (file) => {
      const full = join(file.parentPath, file.name);
      const path = full.slice(new URL(publicDir).pathname.length - 1);
      const result = await request(path);
      assert.equal(result.status, 200, `${path}: HTTP status`);
      assert.deepEqual(
        result.body,
        await readFile(full),
        `${path}: exact deployed bytes`,
      );
      if (path.startsWith("/assets/") || path.startsWith("/_expo/"))
        assert.match(result.headers, /cache-control:.*immutable/im);
      if (path.endsWith(".ttf"))
        assert.match(
          result.headers,
          /content-type: (?:font\/ttf|application\/(?:octet-stream|x-font-ttf))/im,
        );
    }),
  );
}
console.log(
  `Verified ${routes.length} routes and all ${files.length} exported files, including fonts and bundles.`,
);
