import { defineConfig, devices } from "@playwright/test";

const PORT = 4175;

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: "retain-on-failure",
    // Locally, reuse the installed Google Chrome instead of downloading a
    // browser; CI installs Playwright's own Chromium.
    channel: process.env.CI ? undefined : "chrome",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build:test && npx vite preview --outDir dist-test --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
