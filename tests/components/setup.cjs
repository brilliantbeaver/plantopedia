/* global jest */
// Native font files are Metro assets; component tests exercise the real icon component
// with its font already loaded, as it is after application startup.
jest.mock("expo-font", () => ({
  ...jest.requireActual("expo-font"),
  isLoaded: () => true,
  isLoading: () => false,
  loadAsync: async () => {},
}));
