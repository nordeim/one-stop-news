/**
 * playwright.config.ts — Playwright E2E test configuration.
 *
 * Phase 14 (MEDIUM-4): Establishes E2E test infrastructure.
 * Tests run against a local dev server (pnpm dev) on http://localhost:3000.
 *
 * Run with: pnpm test:e2e
 * (Requires `pnpm dev` to be running in a separate terminal, OR use
 * the `webServer` config below to auto-start the dev server.)
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Test directory
  testDir: "./e2e",

  // Test files match this pattern
  testMatch: "*.spec.ts",

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI (resources are limited)
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: process.env.CI ? "github" : "html",

  // Shared settings for all tests
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  // Auto-start the dev server before tests
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // 2 minutes to start
  },
});
