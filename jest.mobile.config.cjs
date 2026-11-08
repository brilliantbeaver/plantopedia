module.exports = {
  preset: "jest-expo",
  modulePathIgnorePatterns: ["/\\.vercel/"],
  setupFilesAfterEnv: ["<rootDir>/tests/components/setup.cjs"],
  testMatch: ["<rootDir>/tests/components/**/*.test.tsx"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-.*|@plantopedia/.*|react-native-.*)/)",
  ],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@plantopedia/contracts$": "<rootDir>/packages/contracts/src/index.ts",
  },
};
