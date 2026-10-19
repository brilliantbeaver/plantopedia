/* global __dirname */
const { getDefaultConfig } = require("expo/metro-config");
const { ensureDevelopmentServices } = require("./scripts/dev-phone-api.cjs");

module.exports = async () => {
  // The guard only enables this for local `expo start`, never exports/builds.
  // Wait before serving the app so Clerk sign-in cannot mask a missing API.
  const phoneOrigin = await ensureDevelopmentServices(__dirname);
  const config = getDefaultConfig(__dirname);
  // A temporary tunnel changes on every launch. Invalidate previously inlined
  // public URLs rather than leaving a phone on yesterday's cached endpoint.
  if (phoneOrigin)
    config.cacheVersion = `${config.cacheVersion}:${phoneOrigin}`;
  return config;
};
