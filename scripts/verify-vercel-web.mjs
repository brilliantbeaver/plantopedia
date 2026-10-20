import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { verifyWebAssets } from "./verify-web-assets.mjs";
import { vercelWebConfig } from "./vercel-web-config.mjs";

const publicDir = new URL("../server/public/", import.meta.url);
try {
  const html = readFileSync(new URL("index.html", publicDir), "utf8");
  // Expo's generated HTML references its entry script directly. Inspect only
  // those entries: an unused stale bundle must not satisfy this check.
  const entries = [
    ...html.matchAll(
      /<script\b[^>]*\bsrc=["'](\/_expo\/static\/js\/web\/[A-Za-z0-9._-]+\.js)["'][^>]*>/g,
    ),
  ].map((match) => readFileSync(new URL(match[1].slice(1), publicDir), "utf8"));
  const expected = Object.values(vercelWebConfig()).filter(Boolean);
  if (
    !entries.some((entry) =>
      expected.every((value) => value && entry.includes(JSON.stringify(value))),
    )
  )
    throw new Error("Export configuration does not match this environment");
  const assets = verifyWebAssets(entries, publicDir);
  console.log(
    `Expo web export matches this deployment's public configuration; ${assets.length} referenced assets verified.`,
  );
} catch (cause) {
  throw new Error(
    `Missing or stale web export in ${fileURLToPath(publicDir)}. Run npm run build:vercel to generate and verify web assets in the deployment build.`,
    { cause },
  );
}
