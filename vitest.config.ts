import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    // Exclude Playwright E2E tests + DB integration tests from default vitest run.
    // Integration tests use testcontainers (require Docker) and run via
    // `pnpm test:integration` (separate vitest config).
    // Also exclude .gemini/ (vendored agent extensions with external test files
    // that would cause 199+ spurious failures if picked up).
    exclude: [
      "node_modules/",
      ".gemini/",
      "skills/",
      ".claude/",
      ".agents/",
      "dist/",
      "backup/",
      "plans/",
      "e2e/**",
      "playwright.config.ts",
      "src/**/*.db-integration.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Phase 19+ remediation (Batch 2 / T7): Thresholds raised back to
      // 80/80/70/80 (functions/lines/branches/statements). The Phase 19
      // calibration lowered these to 75/80/65/80 pending additional unit
      // tests; T1-T6 of the remediation plan added those tests:
      //   - T1: FeedSkeleton.test.tsx (7 tests) — was 0% lines, now ~100%
      //   - T2: categories/route.test.ts OPTIONS + 401 (3 new tests) — was 33%
      //   - T3: push/subscribe/route.test.ts OPTIONS + 401 + invalid JSON (5 new tests) — was 50%
      //   - T4: PageTransition click + reduced-motion (6 new tests) — was 40%
      //   - T5: seed.test.ts orchestration (3 new tests) — was untested
      //   - T6: queries.ts refactored to extract buildFeedQuery (11 new tests) — was 21% functions
      // Current actual coverage: 89.62% lines / 81.23% branches / 84.57% functions / 90.56% statements.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      exclude: [
        "node_modules/",
        "dist/",
        "*.config.*",
        "*.d.ts",
        "src/test/**",
        "e2e/**",
        "src/**/*.db-integration.test.ts",
      ],
    },
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
