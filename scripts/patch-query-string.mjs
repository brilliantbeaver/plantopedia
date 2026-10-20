import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// query-string 7 is used by Expo 57. The fixed decoder is ESM; retain the
// existing query-string API while consuming that published security update.
export function patchQueryString(
  packageFile = createRequire(import.meta.url).resolve(
    "query-string/package.json",
  ),
) {
  const pkg = JSON.parse(readFileSync(packageFile, "utf8"));
  if (pkg.name !== "query-string" || pkg.version !== "7.1.3")
    throw new Error(
      "Review the decoder interoperability patch for this query-string version.",
    );
  const file = join(dirname(packageFile), "index.js");
  const source = readFileSync(file, "utf8");
  const before = "const decodeComponent = require('decode-uri-component');";
  const after =
    "const decodeComponent = require('decode-uri-component').default;";
  if (source.includes(after)) return false;
  if (source.split(before).length !== 2)
    throw new Error(
      "Unexpected query-string decoder import; refusing an unsafe patch.",
    );
  writeFileSync(file, source.replace(before, after));
  return true;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  patchQueryString();
  console.log("query-string uses the patched ESM URI decoder.");
}
