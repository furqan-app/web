import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT || 3000;
const baseURL = `http://localhost:${PORT}`;

// Behavioral Playwright E2E suite — see ADR 0022 and docs/architecture/decisions/testing.md.
// Run via `npm run e2e:test` (loads .env.e2e, so the app under test points at
// the dedicated e2e-only databases from compose.e2e.yml, never dev's DBs).
// The web server is a production build (`e2e:build && e2e:start`) locally and in CI.
// Locally, `reuseExistingServer` means `npm run e2e:serve` in a separate terminal
// builds once and every later run attaches to it — `next dev` is not used for E2E
// (on-demand route compilation makes it slower and far heavier; see decisions/testing.md).
export default defineConfig({
  testDir: "./e2e/tests",
  timeout: 60 * 1000,
  fullyParallel: true,
  // Local default 2 (env-overridable); CI is unconstrained. The server is a built
  // one, so there is no on-demand compilation to serialize — the cap only bounds
  // concurrent Chromium memory.
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
    command: `npm run e2e:build && npm run e2e:start -- -p ${PORT}`,
    url: baseURL,
    // Local: reuse a server already started by `npm run e2e:serve` (build once,
    // iterate). CI: always build fresh.
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
