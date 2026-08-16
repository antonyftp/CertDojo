import { defineConfig, devices } from "@playwright/test";

// E2E runs against a throwaway SQLite database, recreated (rm + migrate) on
// every run so specs can rely on a fresh onboarding state. A dedicated port
// keeps it from ever reusing a normal dev server (and its real user data).
const E2E_SQLITE_PATH = "data/certdojo-e2e.db";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:3100",
    // Capture unconditionally on failure rather than "on-first-retry": retries
    // are deliberately left at 0 (a flaky e2e should fail, not be retried into
    // green), so a retry-gated trace would never be produced at all.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `rm -f ${E2E_SQLITE_PATH} && pnpm db:migrate && pnpm dev --hostname 127.0.0.1 --port 3100`,
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: {
      SQLITE_PATH: E2E_SQLITE_PATH,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
