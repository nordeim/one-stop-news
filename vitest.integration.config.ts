import { defineConfig } from "vitest/config";

/**
 * vitest.integration.config.ts — Separate config for DB integration tests.
 *
 * Phase 19+ remediation, Batch 3 / F3.
 *
 * Integration tests use testcontainers to spin up real Postgres + Redis
 * containers. They are SLOWER than unit tests (~10-30s for container
 * startup) and require Docker to be available. For these reasons, they
 * are excluded from the default `pnpm test` run and have their own
 * `pnpm test:integration` script.
 *
 * CI strategy: Run integration tests in a separate GitHub Actions job
 * (after the unit test job passes). This keeps the unit-test feedback
 * loop fast (~30s) while still catching DB/Redis integration regressions.
 *
 * Local strategy: Run `pnpm test:integration` before pushing Phase 19+
 * remediation changes that touch the DB layer (queries.ts, schema.ts,
 * migrations, workers/).
 */

export default defineConfig({
  test: {
    environment: "node", // Not jsdom — these tests don't render React
    globals: true,
    include: ["src/**/*.db-integration.test.ts"],
    // Exclude unit tests + e2e
    exclude: ["node_modules/", "dist/", "e2e/**", "playwright.config.ts"],
    // Longer timeout for container startup (default is 5s, we need 60s)
    testTimeout: 120_000,
    hookTimeout: 120_000,
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
