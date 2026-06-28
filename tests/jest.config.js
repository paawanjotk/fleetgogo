/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/integration/**/*.test.ts"],
  testTimeout: 30_000,
  verbose: true,
  setupFilesAfterEnv: ["<rootDir>/setup.ts"],
};
