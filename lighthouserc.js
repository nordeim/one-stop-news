module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:3000"],
      startServerCommand: "pnpm start",
      startServerReadyPattern: "Ready on",
      startServerReadyTimeout: 120000,
    },
    assert: {
      assertions: {
        // Category-level scores (Lighthouse 0-1 scale).
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],

        // ── Phase 19 (M11): Explicit Core Web Vitals numeric budgets ───────
        // Previously only category scores were asserted. Now we explicitly
        // cap the three Core Web Vitals (LCP, CLS, INP) plus TTFB. INP
        // (Interaction to Next Paint) became a Core Web Vital in March 2024
        // and was missing from the original budget.
        //
        // Values are in milliseconds (lower = better), except CLS which is
        // a unitless score (0-1, lower = better).
        //
        // Sources:
        //   - LCP: https://web.dev/articles/lcp (good < 2500ms)
        //   - CLS: https://web.dev/articles/cls (good < 0.1)
        //   - INP: https://web.dev/articles/inp (good < 200ms)
        //   - TTFB: https://web.dev/articles/ttfb (good < 800ms)
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "interaction-to-next-paint": ["error", { maxNumericValue: 200 }],
        "server-response-time": ["error", { maxNumericValue: 800 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
