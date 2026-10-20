// Exported fonts/images are public assets, but deployment tools exclude any
// directory named node_modules. Change the asset metadata before Expo writes
// BOTH the bundle URLs and the files. Development Metro URLs stay untouched.
module.exports = function exportAssetPaths(asset) {
  if (!asset.httpServerLocation.includes("?export_path=")) return asset;
  return {
    ...asset,
    httpServerLocation: asset.httpServerLocation.replace(
      /\/node_modules(?=\/|$)/g,
      "/vendor",
    ),
  };
};
