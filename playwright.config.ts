import { defineConfig, devices } from "@playwright/test";

const port = 3108;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      AUTH_PEPPER: process.env.E2E_AUTH_PEPPER ?? "e2e-only-pepper-that-is-longer-than-32-characters",
      BOOTSTRAP_ADMIN_ID: process.env.E2E_ADMIN_ID ?? "20269999",
      BOOTSTRAP_ADMIN_NAME: "E2E 관리자",
      BOOTSTRAP_ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD ?? "e2e-admin-2026",
      STILL_DATABASE_PATH: `data/e2e-${process.pid}.db`,
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
