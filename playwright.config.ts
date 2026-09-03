import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT || 3000;
const baseURL = `http://localhost:${PORT}`;

// Behavioral Playwright E2E suite — see docs/plans/visual-e2e-testing.md and ADR 0022.
// Run via `npm run e2e:test` (loads .env.e2e, so the app under test points at
// the dedicated e2e-only databases from compose.e2e.yml, never dev's DBs).
export default defineConfig({
  testDir: "./e2e/tests",
  timeout: 60 * 1000,
  fullyParallel: true,
  workers: process.env.CI
    ? undefined
    : process.env.PLAYWRIGHT_WORKERS
      ? Number(process.env.PLAYWRIGHT_WORKERS)
      : 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: process.env.CI
      ? `npm run e2e:build && npm run e2e:start -- -p ${PORT}`
      : `npm run dev -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 20 * 60 * 1000,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
});

