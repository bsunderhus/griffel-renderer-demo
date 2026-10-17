import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { applicationPlugin } from "./tests/browser/application-plugin.mjs";

export default defineConfig({
  test: {
    outputFile: {
      json: "test-results/report.json",
      blob: "test-results/blob/report.json",
    },
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/**/*.test.mjs"],
          exclude: ["tests/{archived,experiments,source,gallery,browser}/**",
            "tests/architecture-build.test.mjs", "tests/evidence/lifecycle.test.mjs"],
        },
      },
      {
        plugins: [applicationPlugin()],
        test: {
          name: "browser",
          include: ["tests/{browser,archived,source,experiments,gallery}/**/*.test.mjs",
            "tests/evidence/lifecycle.test.mjs"],
          fileParallelism: false,
          testTimeout: 15_000,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
            screenshotFailures: true,
            screenshotDirectory: "test-results/screenshots",
            viewport: { width: 1400, height: 1800 },
          },
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/architecture-build.test.mjs"],
          fileParallelism: false,
        },
      },
    ],
  },
});
