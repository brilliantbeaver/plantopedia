import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function findExpoCliPackage() {
  const require = createRequire(import.meta.url);
  const requireExpo = createRequire(require.resolve("expo/package.json"));
  return requireExpo.resolve("@expo/cli/package.json");
}

// Expo has no project setting for this default: merely installing dev-client
// changes bare `npx expo start` to a custom scheme that Expo Go cannot open.
// Keep the native dependency, but honor this project's explicit runtime choice.
const before =
  "const isAutoDevClient = args['--dev-client'] == null && args['--go'] == null && (0, _detectDevClient.hasDirectDevClientDependency)(projectRoot);";
const after =
  "const isAutoDevClient = args['--dev-client'] == null && args['--go'] == null && require('@expo/config').getPackageJson(projectRoot).plantopedia?.defaultRuntime !== 'expo-go' && (0, _detectDevClient.hasDirectDevClientDependency)(projectRoot);";

export function patchExpoLaunchTarget(packageFile = findExpoCliPackage()) {
  const { name, version } = JSON.parse(readFileSync(packageFile, "utf8"));
  if (name !== "@expo/cli" || version !== "57.0.31")
    throw new Error(
      "Review the Plantopedia default-runtime patch before changing @expo/cli from 57.0.31; run tests/scripts/expo-launch-target.test.mjs against the replacement.",
    );
  const target = join(
    dirname(packageFile),
    "build/src/start/resolveOptions.js",
  );
  const source = readFileSync(target, "utf8");
  if (source.includes(after)) return false;
  if (source.split(before).length !== 2)
    throw new Error(
      "Unexpected Expo launch-target resolver; review the patch.",
    );
  writeFileSync(target, source.replace(before, after));
  return true;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const changed = patchExpoLaunchTarget();
  console.log(
    changed
      ? "Applied Plantopedia's Expo Go startup default."
      : "Plantopedia's Expo Go startup default already applied.",
  );
}
