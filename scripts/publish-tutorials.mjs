import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
  lstat,
  rename,
} from "node:fs/promises";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = fileURLToPath(new URL("..", import.meta.url));
const reviewedUnavailableSources = new Set(["src/app/species/[speciesId].tsx"]);
const privatePath =
  /(^|\/)(?:\.[^/]*|node_modules|[^/]*service[-_]?account[^/]*|[^/]+\.(?:pem|key|p8|p12|jks))($|\/)/i;
function safePath(path) {
  if (
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((part) => !part || part === ".") ||
    path.split(/[\\/]/).includes("..") ||
    privatePath.test(path)
  )
    throw new Error("Unsafe tutorial publication path");
}
const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export async function publishTutorials(root = defaultRoot) {
  const course = resolve(root, "docs/tutorials"),
    output = resolve(root, "server/public/tutorials");
  const lessons = await Promise.all(
    (await readdir(join(course, "content")))
      .filter((p) => /^\d{2}-.+\.json$/.test(p))
      .sort()
      .map(async (p) =>
        JSON.parse(await readFile(join(course, "content", p), "utf8")),
      ),
  );
  if (lessons.length !== 10) throw new Error("Expected ten tutorial lessons");
  const sourcePaths = [
    ...new Set(lessons.flatMap((l) => l.repo.map((r) => r.path))),
  ];
  const compatibilityNote =
    '<aside class="reader-note publication-note" aria-label="Course compatibility"><p><strong>App revision note.</strong> These lessons were authored against a development checkout. Main does not yet include the guest session API used in lessons 05 and 06, the lazy database API in lesson 08, or the companion species route. Browser and notebook models work independently; dependent TSX exercises need those companion features. <a href="publishing.md">Read the compatibility notes</a>.</p></aside>';
  const files = [];
  async function collect(path) {
    safePath(path);
    const full = join(course, path),
      info = await lstat(full);
    if (info.isSymbolicLink())
      throw new Error("Symlink in tutorial publication");
    if (info.isDirectory()) {
      for (const child of await readdir(full))
        await collect(`${path}/${child}`);
    } else if (info.isFile()) files.push(path);
  }
  for (const path of [
    "index.html",
    "course-reader.html",
    "README.md",
    "publishing.md",
    "assets",
    "downloads",
    "notebooks",
    "exercises",
    "review",
  ])
    await collect(path);
  const missingSourcePaths = [];
  // Validate the full bounded set before replacing the previous generated site.
  for (const path of sourcePaths) {
    safePath(path);
    if (
      !/^(?:src\/|server\/(?:src|tests)\/|packages\/contracts\/src\/|tests\/components\/|README\.md$|package\.json$|eas\.json$)/.test(
        path,
      )
    )
      throw new Error("Unexpected tutorial source reference");
    // Check every ancestor: a normal file beneath a symlink is still outside
    // the intended publication boundary.
    let current = root;
    try {
      for (const part of path.split("/")) {
        current = join(current, part);
        if ((await lstat(current)).isSymbolicLink())
          throw new Error("Symlink in tutorial source reference");
      }
      if (!(await lstat(current)).isFile())
        throw new Error("Tutorial source reference is not a file");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      if (!reviewedUnavailableSources.has(path))
        throw new Error(`Unexpected missing tutorial source: ${path}`);
      missingSourcePaths.push(path);
    }
  }
  // Prepare the complete tree first. A failed transformation must not replace
  // an earlier successful export with a partial course.
  const staging = output + ".staging";
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  let manifest;
  try {
    for (const path of files) {
      const target = join(staging, path);
      await mkdir(dirname(target), { recursive: true });
      if (path === "assets/course.js") {
        let script = await readFile(join(course, path), "utf8");
        const original =
          "escape('../../' + value.split('/').map(encodeURIComponent).join('/'))";
        if (!script.includes(original))
          throw new Error("Tutorial source-link contract changed");
        script = script.replace(
          original,
          "escape('source/' + value.split('/').map(encodeURIComponent).join('/') + '.html')",
        );
        await writeFile(target, script);
      } else if (path === "assets/course.css") {
        const css = await readFile(join(course, path), "utf8");
        await writeFile(
          target,
          css +
            "\n.publication-note{max-width:1100px;margin:24px auto;padding:16px 24px;border:1px solid #b1c7bb;border-radius:18px;background:#f0ebfb;color:#183c31}\n",
        );
      } else if (path === "index.html") {
        const html = await readFile(join(course, path), "utf8");
        await writeFile(
          target,
          html.replace(
            '<main id="main"',
            `${compatibilityNote}<main id="main"`,
          ),
        );
      } else if (path === "course-reader.html") {
        const html = (await readFile(join(course, path), "utf8")).replace(
          /href="\.\.\/\.\.\/([^"#]+)(?:#[^"]*)?"/g,
          (_, p) => {
            if (!sourcePaths.includes(p))
              throw new Error("Unknown tutorial reader source link");
            return `href="source/${p.split("/").map(encodeURIComponent).join("/")}.html"`;
          },
        );
        await writeFile(
          target,
          html.replace("<main>", `<main>${compatibilityNote}`),
        );
      } else await cp(join(course, path), target);
    }
    for (const path of sourcePaths) {
      const target = join(staging, "source", path + ".html");
      await mkdir(dirname(target), { recursive: true });
      const unavailable = missingSourcePaths.includes(path);
      const source = unavailable
        ? "This source path is referenced by the course, but is not included in this deployment's repository revision. Companion feature work may not have been merged yet. Use the lesson examples and downloadable exercises to study this idea."
        : await readFile(resolve(root, path), "utf8");
      const depth =
        relative(dirname(target), staging)
          .split(/[\\/]/)
          .filter(Boolean)
          .map(() => "..")
          .join("/") || ".";
      await writeFile(
        target,
        `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(path)} — Plantopedia tutorial source</title><link rel="stylesheet" href="${depth}/assets/course.css"><body class="reader"><main><a href="${depth}/">Back to tutorials</a><h1>${escape(path)}</h1><p>${unavailable ? "Source unavailable in this revision. The path is retained as a reading map; this page does not claim to contain the implementation." : "Read-only source snapshot from this deployment. It is not executed here."}</p><div class="code-block"><pre><code>${escape(source)}</code></pre></div></main></body></html>`,
      );
    }
    manifest = {
      version: 1,
      lessonCount: lessons.length,
      missingSourcePaths,
      files: [...files, ...sourcePaths.map((p) => `source/${p}.html`)].sort(),
    };
    await writeFile(
      join(staging, "publication.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );
    await rm(output, { recursive: true, force: true });
    await rename(staging, output);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  console.log(
    `Published ${lessons.length} tutorial lessons and ${sourcePaths.length} bounded source pages`,
  );
  if (missingSourcePaths.length)
    console.warn(
      `Tutorial source paths unavailable in this revision: ${missingSourcePaths.length}; see tutorials/publication.json`,
    );
  return manifest;
}
