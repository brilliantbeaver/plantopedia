import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { publishTutorials } from "../../scripts/publish-tutorials.mjs";
function fixture(reference = "src/example.tsx") {
  const root = mkdtempSync(join(tmpdir(), "plantopedia-tutorials-"));
  function write(path, value) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), value);
  }
  for (let i = 1; i <= 10; i++)
    write(
      `docs/tutorials/content/${String(i).padStart(2, "0")}-lesson.json`,
      JSON.stringify({ repo: [{ path: reference }] }),
    );
  write(
    "docs/tutorials/index.html",
    '<main id="main"><h1>Ten lessons</h1></main>',
  );
  write(
    "docs/tutorials/course-reader.html",
    `<a href="../../${reference}">Source</a>`,
  );
  write("docs/tutorials/README.md", "Course setup");
  write("docs/tutorials/publishing.md", "Deployment directions");
  write(
    "docs/tutorials/assets/course.js",
    "const href = escape('../../' + value.split('/').map(encodeURIComponent).join('/'));",
  );
  write("docs/tutorials/downloads/course.zip", "fixture archive");
  write("docs/tutorials/notebooks/01.ipynb", "{}");
  write("docs/tutorials/review/verification.md", "Verification");
  write("docs/tutorials/exercises/README.md", "Exercise instructions");
  write("docs/tutorials/review/content-and-models-review.md", "Review notes");
  write("docs/tutorials/tools/private-tool.js", "must not publish");
  write("src/example.tsx", 'const sample = "<script>unsafe</script>";');
  write(".env", "NEVER_PUBLIC=fixture_private_value");
  return {
    root,
    write,
    close: () => rmSync(root, { recursive: true, force: true }),
  };
}
test("tutorial publication includes working hosted source links, escaped snapshots and downloads without tools or env", async () => {
  const f = fixture();
  try {
    const manifest = await publishTutorials(f.root),
      output = join(f.root, "server/public/tutorials");
    assert.equal(manifest.lessonCount, 10);
    assert.match(
      readFileSync(join(output, "assets/course.js"), "utf8"),
      /escape\('source\//,
    );
    assert.match(
      readFileSync(join(output, "course-reader.html"), "utf8"),
      /href="source\/src\/example.tsx.html"/,
    );
    const source = readFileSync(
      join(output, "source/src/example.tsx.html"),
      "utf8",
    );
    assert.match(source, /&lt;script&gt;/);
    assert.match(source, /class="code-block"/);
    assert.match(
      readFileSync(join(output, "index.html"), "utf8"),
      /aria-label="Course compatibility"/,
    );
    assert.doesNotMatch(source, /<script>/);
    assert.equal(existsSync(join(output, "downloads/course.zip")), true);
    assert.equal(existsSync(join(output, "tools")), false);
    assert.equal(existsSync(join(output, "exercises/README.md")), true);
    assert.equal(
      existsSync(join(output, "review/content-and-models-review.md")),
      true,
    );
    assert.equal(existsSync(join(output, ".env")), false);
    f.write("server/public/tutorials/stale.txt", "stale");
    await publishTutorials(f.root);
    assert.equal(existsSync(join(output, "stale.txt")), false);
  } finally {
    f.close();
  }
});
test("a private or traversing tutorial reference fails before publication", async () => {
  for (const ref of [".env", "../.env", "server/service-account.json"]) {
    const f = fixture(ref);
    try {
      await assert.rejects(publishTutorials(f.root), /Unsafe|Unexpected/);
      assert.equal(existsSync(join(f.root, "server/public/tutorials")), false);
    } finally {
      f.close();
    }
  }
});

test("symlinked assets and source ancestors cannot expose files outside the publication", async () => {
  for (const kind of ["asset", "source", "source-parent"]) {
    const f = fixture();
    try {
      if (kind === "asset")
        symlinkSync(
          join(f.root, ".env"),
          join(f.root, "docs/tutorials/assets/leak.txt"),
        );
      if (kind === "source") {
        rmSync(join(f.root, "src/example.tsx"));
        symlinkSync(join(f.root, ".env"), join(f.root, "src/example.tsx"));
      }
      if (kind === "source-parent") {
        f.write("outside/example.tsx", "private outside source");
        rmSync(join(f.root, "src"), { recursive: true });
        symlinkSync(join(f.root, "outside"), join(f.root, "src"));
      }
      await assert.rejects(publishTutorials(f.root), /Symlink/);
      assert.equal(existsSync(join(f.root, "server/public/tutorials")), false);
    } finally {
      f.close();
    }
  }
});

test("a changed course link contract preserves the previous complete publication", async () => {
  const f = fixture();
  try {
    await publishTutorials(f.root);
    const previous = readFileSync(
      join(f.root, "server/public/tutorials/publication.json"),
      "utf8",
    );
    f.write("docs/tutorials/assets/course.js", "changed contract");
    await assert.rejects(publishTutorials(f.root), /contract changed/);
    assert.equal(
      readFileSync(
        join(f.root, "server/public/tutorials/publication.json"),
        "utf8",
      ),
      previous,
    );
    assert.equal(
      existsSync(join(f.root, "server/public/tutorials.staging")),
      false,
    );
  } finally {
    f.close();
  }
});

test("unmerged companion source paths get an honest reading map instead of a broken link", async () => {
  const f = fixture("src/app/species/[speciesId].tsx");
  try {
    const manifest = await publishTutorials(f.root);
    assert.deepEqual(manifest.missingSourcePaths, [
      "src/app/species/[speciesId].tsx",
    ]);
    assert.match(
      readFileSync(
        join(
          f.root,
          "server/public/tutorials/source/src/app/species/[speciesId].tsx.html",
        ),
        "utf8",
      ),
      /Source unavailable in this revision/,
    );
  } finally {
    f.close();
  }
});

test("unexpected missing source paths fail instead of hiding a typo", async () => {
  const f = fixture("src/services/sesion.tsx");
  try {
    await assert.rejects(
      publishTutorials(f.root),
      /Unexpected missing tutorial source/,
    );
  } finally {
    f.close();
  }
});
