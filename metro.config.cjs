/* global __dirname */
const { getDefaultConfig } = require("expo/metro-config");
const { ensureDevelopmentServices } = require("./scripts/dev-phone-api.cjs");

module.exports = async () => {
  // The guard only enables this for local `expo start`, never exports/builds.
  // Wait before serving the app so Clerk sign-in cannot mask a missing API.
  const phoneOrigin = await ensureDevelopmentServices(__dirname);
  const config = getDefaultConfig(__dirname);
  config.transformer.assetPlugins = [
    ...(config.transformer.assetPlugins ?? []),
    require.resolve("./scripts/export-asset-paths.cjs"),
  ];
  // Expo 57's development env context discovers every .env* file, including
  // custom secret profiles it cannot parse. Keep files out of the bundle graph;
  // Expo CLI still loads env normally and injects only EXPO_PUBLIC_ values.
  const existingBlockList = config.resolver.blockList;
  config.resolver.blockList = [
    ...(Array.isArray(existingBlockList)
      ? existingBlockList
      : existingBlockList
        ? [existingBlockList]
        : []),
    /[/\\]\.env(?:\.[^/\\]*)?$/,
    // Packaged functions contain duplicate workspace manifests and dependencies.
    /[/\\]\.vercel[/\\].*/,
  ];
  // A temporary tunnel changes on every launch. Invalidate previously inlined
  // public URLs rather than leaving a phone on yesterday's cached endpoint.
  if (phoneOrigin)
    config.cacheVersion = `${config.cacheVersion}:${phoneOrigin}`;
  return config;
};
