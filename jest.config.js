module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["./tests/helpers/setTestEnv.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/utils/seedDatabase.js",
    "!src/utils/resetDatabase.js",
    "!src/docs/**"
  ],
  coverageThreshold: {
    global: {
      lines: 70,
      functions: 70,
      branches: 70
    }
  },
  coverageReporters: ["text", "lcov"]
};
