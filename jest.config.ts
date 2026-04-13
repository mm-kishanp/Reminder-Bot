import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  collectCoverageFrom: [
    "src/utils/nlpParser.ts",
    "src/services/schedulerService.ts",
    "src/services/subscriptionService.ts",
    "src/api/webhooks/graphWebhook.ts"
  ],
  coverageDirectory: "coverage",
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70
    }
  }
};

export default config;
