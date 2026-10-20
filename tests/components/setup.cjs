/* global jest */
// Node supports ES2023 copy-by-change array methods that the installed native
// runtime does not. Keep component tests honest about that runtime boundary.
for (const name of ["toSorted", "toReversed", "toSpliced", "with"]) {
  if (!Reflect.deleteProperty(Array.prototype, name))
    throw new Error(`Cannot configure native test runtime: Array.${name}`);
}
// Native font files are Metro assets; component tests exercise the real icon component
// with its font already loaded, as it is after application startup.
jest.mock("expo-font", () => ({
  ...jest.requireActual("expo-font"),
  isLoaded: () => true,
  isLoading: () => false,
  loadAsync: async () => {},
}));
