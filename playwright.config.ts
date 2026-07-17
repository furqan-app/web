import { defineConfig, devices } from "@playwright/test";

// Visual regression suite — see docs/plans/visual-e2e-testing.md and ADR 0018.
// Run via `npm run e2e:test` (loads .env.e2e, so the app under test points at
// the dedicated e2e-only databases from compose.e2e.yml, never dev's DBs).
export default defineConfig({
  testDir: "./e2e/tests",
  // First-run baseline writes (or CI's shared runners under parallel load) can
  // make context teardown slower than the 30s default test timeout — bump it.
  timeout: 60 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["json", { outputFile: "playwright-report/results.json" }]]
    : "list",
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run e2e:build && npm run e2e:start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 20 * 60 * 1000,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
});
