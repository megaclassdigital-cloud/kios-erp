import { defineConfig, devices } from "@playwright/test";

/**
 * Visual QA only (directive requirement) — not a functional/E2E test
 * suite. Screenshots are taken manually against a running dev server;
 * this config exists so `npx playwright test` has somewhere to look and
 * a consistent set of viewports to reuse across pages.
 */
export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "tablet",
      use: { ...devices["iPad (gen 7)"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"] },
    },
  ],
});
