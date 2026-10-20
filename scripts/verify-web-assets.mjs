import { statSync } from "node:fs";

export function verifyWebAssets(entries, publicDir) {
  const assets = new Set(
    entries.flatMap((entry) =>
      [...entry.matchAll(/["'](\/assets\/[^"'\\\s]+)["']/g)].map(
        (match) => match[1],
      ),
    ),
  );
  for (const asset of assets) {
    if (asset.split("/").includes("node_modules"))
      throw new Error(`Exported asset uses an excluded directory: ${asset}`);
    const file = new URL(`.${asset}`, publicDir);
    if (!file.href.startsWith(publicDir.href) || !statSync(file).isFile())
      throw new Error(`Missing exported asset: ${asset}`);
  }
  return [...assets];
}
