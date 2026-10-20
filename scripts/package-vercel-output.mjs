import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { nodeFileTrace } from "@vercel/nft";

const defaultRoot = fileURLToPath(new URL("..", import.meta.url));
const forbidden =
  /(^|\/)(\.env(?:\.[^/]*)?|[^/]*service[-_]?account[^/]*\.json|[^/]+\.(?:pem|key|p8|p12|jks))$/i;

function checkPath(path) {
  if (
    isAbsolute(path) ||
    path.split(/[\\/]/).includes("..") ||
    forbidden.test(path)
  )
    throw new Error(
      `Private or out-of-project file in deployment trace: ${path}`,
    );
  // These unpatched packages belong to the Expo/Jest toolchain, never the API.
  if (/(^|\/)node_modules\/(braces|node-forge)(\/|$)/.test(path))
    throw new Error(`Unpatched build-only dependency entered the API: ${path}`);
}

export async function packageVercelOutput(root = defaultRoot) {
  root = resolve(root);
  const handler = "server/dist/server.js";
  const publicDir = join(root, "server/public");
  if (!existsSync(join(publicDir, "index.html")))
    throw new Error("Build the web export before packaging Vercel output.");
  // Trace compiled code instead of copying monorepo dependencies. Cloud builds
  // retain Linux native libraries and workspace links without the Expo tooling.
  const { fileList } = await nodeFileTrace([join(root, handler)], {
    base: root,
    processCwd: root,
  });
  for (const file of fileList) checkPath(file);
  for (const file of readdirSync(publicDir, {
    recursive: true,
    withFileTypes: true,
  })) {
    const path = relative(publicDir, join(file.parentPath, file.name));
    checkPath(path);
    if (file.isSymbolicLink())
      throw new Error(`Symlink in public web export: ${path}`);
  }
  const output = join(root, "server/.vercel/output");
  rmSync(output, { recursive: true, force: true });
  const functionDir = join(output, "functions/api.func");
  mkdirSync(functionDir, { recursive: true });
  for (const file of [...fileList].sort()) {
    const source = join(root, file);
    const target = join(functionDir, file);
    mkdirSync(dirname(target), { recursive: true });
    if (lstatSync(source).isSymbolicLink()) {
      const link = readlinkSync(source);
      checkPath(relative(root, resolve(dirname(source), link)));
      const localLink = relative(
        dirname(source),
        resolve(dirname(source), link),
      );
      symlinkSync(localLink, target);
    } else {
      cpSync(source, target);
    }
  }
  cpSync(publicDir, join(output, "static"), { recursive: true });
  const express = JSON.parse(
    readFileSync(join(root, "node_modules/express/package.json"), "utf8"),
  );
  writeFileSync(
    join(functionDir, ".vc-config.json"),
    JSON.stringify(
      {
        runtime: "nodejs22.x",
        architecture: process.arch === "arm64" ? "arm64" : "x86_64",
        handler,
        launcherType: "Nodejs",
        shouldAddHelpers: true,
        supportsResponseStreaming: true,
        framework: { slug: "express", version: express.version },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(output, "config.json"),
    JSON.stringify(
      {
        version: 3,
        routes: [
          { src: "^/$", status: 307, headers: { Location: "/plants" } },
          {
            src: "^/(?:login|plants(?:/[^/]+)?|scan|ask|settings|tasks|sso-callback)/?$",
            dest: "/index.html",
            headers: { "Cache-Control": "no-cache" },
          },
          {
            src: "^/index\\.html$",
            headers: { "Cache-Control": "no-cache" },
            continue: true,
          },
          {
            src: "^/(?:assets|_expo)/.*$",
            headers: { "Cache-Control": "public, max-age=31536000, immutable" },
            continue: true,
          },
          {
            src: "^/(v1(?:/.*)?|__clerk(?:/.*)?|health|ready)$",
            dest: "/api",
            transforms: [{ type: "request.path", op: "set", args: "/$1" }],
          },
          { handle: "filesystem" },
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    `Packaged web assets and ${fileList.size} traced API files into ${output}`,
  );
  return { output, functionDir, files: [...fileList] };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await packageVercelOutput();
