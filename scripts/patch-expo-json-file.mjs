import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function findExpoJsonFilePackage() {
  const require = createRequire(import.meta.url);
  const requireExpo = createRequire(require.resolve("expo/package.json"));
  const requireCli = createRequire(
    requireExpo.resolve("@expo/cli/package.json"),
  );
  return requireCli.resolve("@expo/json-file/package.json");
}

export function patchExpoJsonFile(packageFile = findExpoJsonFilePackage()) {
  const { name, version } = JSON.parse(readFileSync(packageFile, "utf8"));
  if (name !== "@expo/json-file" || version !== "11.2.1")
    throw new Error(
      "Review the Expo atomic-write workaround before changing @expo/json-file from 11.2.1; run tests/scripts/expo-json-file.test.mjs against the replacement.",
    );
  const writer = join(dirname(packageFile), "build/writeAtomic.js");
  const source = readFileSync(writer, "utf8");
  const before = "return `${filename}.${hash}`;";
  const after =
    "return `${filename}.${hash}.${(0, _nodecrypto().randomUUID)()}`;";
  if (source.includes(after)) return false;
  if (source.split(before).length !== 2)
    throw new Error(
      "Unexpected Expo atomic writer; review the workaround instead of applying an incompatible patch.",
    );
  writeFileSync(writer, source.replace(before, after));
  return true;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const changed = patchExpoJsonFile();
  console.log(
    changed
      ? "Applied Expo JSON atomic-write concurrency fix."
      : "Expo JSON atomic-write concurrency fix already applied.",
  );
}
