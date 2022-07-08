module.exports = {
  transformIgnorePatterns: [
    "/node_modules/(?!(solid-js/web|solid-app-router|dexie)/)",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest-setup.ts"],
  // uses a webpack style resolver, the default one has many issues.
  // but if I disable it, tests run much faster
  // resolver: require.resolve("./jest/resolver"),
  testEnvironment: "jsdom",
  transform: {
    "\\.[jt]sx$": require.resolve("./jest/transform"),
    "\\.[jt]s$": require.resolve("./jest/transform"),
    "\\.[m]js$": "babel-jest",
  },
};
