/**
 * next.config.test.ts — Regression tests for the Next.js configuration.
 *
 * Purpose: Lock down security-sensitive configuration values so they cannot
 * silently regress. Specifically guards the Content-Security-Policy header.
 *
 * TDD RED phase for H1 (CSP unsafe-eval removal):
 *   - The CSP `script-src` directive MUST NOT contain `'unsafe-eval'`.
 *   - Phase 21 claimed removal but the value was never actually edited.
 *   - This test will fail until the CSP string is corrected.
 *
 * Per AGENTS.md anti-pattern #24 / #57:
 *   "CSP with `'unsafe-eval'` → Remove (no code in src/ uses eval())."
 *
 * Note: `'unsafe-inline'` is intentionally retained as a transitional
 * measure for Next.js inline scripts + Tailwind runtime. A future Phase
 * should migrate to nonce-based CSP to remove `'unsafe-inline'` too.
 */

import { describe, it, expect, vi } from "vitest";
import nextConfig from "./next.config";

describe("next.config.ts — security headers", () => {
  it("exports a valid NextConfig object", () => {
    expect(nextConfig).toBeDefined();
    expect(typeof nextConfig).toBe("object");
  });

  it("uses output: 'standalone' (required for Docker deployment)", () => {
    expect(nextConfig.output).toBe("standalone");
  });

  it("enables cacheComponents (top-level, required for 'use cache')", () => {
    expect(nextConfig.cacheComponents).toBe(true);
  });

  it("defines cacheLife profiles (feed, topicShell, reference)", () => {
    expect(nextConfig.cacheLife).toBeDefined();
    expect(nextConfig.cacheLife?.feed).toBeDefined();
    expect(nextConfig.cacheLife?.topicShell).toBeDefined();
    expect(nextConfig.cacheLife?.reference).toBeDefined();
  });

  describe("Content-Security-Policy", () => {
    async function getCspHeaderValue(): Promise<string> {
      const headersFn = nextConfig.headers;
      if (!headersFn) {
        throw new Error("next.config.ts has no headers() function");
      }
      const result = await headersFn();
      const allHeaders = result[0]?.headers ?? [];
      const cspHeader = allHeaders.find(
        (h) => h.key === "Content-Security-Policy",
      );
      if (!cspHeader) {
        throw new Error(
          "Content-Security-Policy header not found in headers()",
        );
      }
      return cspHeader.value;
    }

    it("includes Content-Security-Policy header", async () => {
      const csp = await getCspHeaderValue();
      expect(csp).toBeTruthy();
    });

    it("contains default-src 'self'", async () => {
      const csp = await getCspHeaderValue();
      expect(csp).toContain("default-src 'self'");
    });

    it("contains frame-ancestors 'none' (clickjacking protection)", async () => {
      const csp = await getCspHeaderValue();
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("contains base-uri 'self' (base-tag injection protection)", async () => {
      const csp = await getCspHeaderValue();
      expect(csp).toContain("base-uri 'self'");
    });

    it("contains form-action 'self' (form-action hijacking protection)", async () => {
      const csp = await getCspHeaderValue();
      expect(csp).toContain("form-action 'self'");
    });

    // ── H1 regression: 'unsafe-eval' MUST NOT be in script-src (production) ──
    // Per AGENTS.md anti-pattern #24: "CSP with 'unsafe-eval' → Remove
    // (no code in src/ uses eval())." The directive was supposed to be
    // removed in Phase 21 S4 but the comment was updated while the actual
    // CSP string still contained it. This test prevents that regression.
    //
    // Phase 23 / BUG-1 fix: The CSP is now CONDITIONAL on NODE_ENV:
    //   - production / test: 'unsafe-eval' is REMOVED (security hardening)
    //   - development: 'unsafe-eval' is INCLUDED (React dev mode requires eval()
    //     for callstack reconstruction — without it, `pnpm dev` shows console
    //     errors and React DevTools doesn't work)
    //
    // This test runs with NODE_ENV=test (vitest default), which matches the
    // production posture: 'unsafe-eval' MUST be absent.
    it("script-src MUST NOT contain 'unsafe-eval' in production/test mode (H1 regression)", async () => {
      // NODE_ENV is "test" in vitest — matches production posture
      const csp = await getCspHeaderValue();
      // Extract the script-src directive value
      const scriptSrcMatch = csp.match(/script-src\s+([^;]+)/);
      expect(
        scriptSrcMatch,
        "script-src directive must exist in CSP",
      ).not.toBeNull();
      const scriptSrcValue = scriptSrcMatch![1];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = scriptSrcValue; // for type narrowing in case of strict unused
      expect(
        csp,
        `CSP must not contain 'unsafe-eval' in production/test mode. Got: ${csp}`,
      ).not.toContain("'unsafe-eval'");
    });

    // ── Phase 23 / BUG-1: 'unsafe-eval' MUST be present in development mode ──
    // React dev mode requires eval() for callstack reconstruction. Without
    // 'unsafe-eval' in the CSP, `pnpm dev` shows console errors:
    //   "eval() is not supported in this environment. If this page was served
    //    with a Content-Security-Policy header, make sure that `unsafe-eval`
    //    is included. React requires eval() in development mode..."
    //
    // The fix: make the CSP conditional on NODE_ENV. In development, include
    // 'unsafe-eval'. In production/test, exclude it (H1 regression guard above).
    //
    // This test stubs NODE_ENV=development and verifies the CSP includes
    // 'unsafe-eval'. After the test, NODE_ENV is restored to "test".
    it("script-src MUST contain 'unsafe-eval' in development mode (Phase 23 / BUG-1)", async () => {
      // NODE_ENV is typed as read-only in @types/node — use vi.stubEnv
      // which bypasses the type check at runtime.
      vi.stubEnv("NODE_ENV", "development");

      try {
        // Re-import next.config.ts to pick up the new NODE_ENV
        vi.resetModules();
        const { default: devConfig } = await import("./next.config");
        const headersFn = devConfig.headers;
        if (!headersFn) throw new Error("no headers() in dev config");
        const result = await headersFn();
        const allHeaders = result[0]?.headers ?? [];
        const cspHeader = allHeaders.find(
          (h) => h.key === "Content-Security-Policy",
        );
        if (!cspHeader) throw new Error("CSP header not found");
        expect(
          cspHeader.value,
          `CSP must contain 'unsafe-eval' in development mode. Got: ${cspHeader.value}`,
        ).toContain("'unsafe-eval'");
      } finally {
        // Restore NODE_ENV to "test" (vitest default)
        vi.unstubAllEnvs();
        vi.resetModules();
      }
    });

    // ── Transitional: 'unsafe-inline' is currently retained ────────────────
    // This is documented as a known limitation pending nonce-based CSP
    // migration (Phase 21 R2). Locking it in here so any future change is
    // an intentional decision rather than an accidental drift.
    it("script-src retains 'unsafe-inline' (transitional, pending nonce CSP)", async () => {
      const csp = await getCspHeaderValue();
      // This is NOT a security requirement — it's a documentation lock.
      // When nonce-based CSP is implemented, this assertion should be
      // inverted to assert 'unsafe-inline' is ABSENT.
      expect(csp).toContain("'unsafe-inline'");
    });
  });

  describe("HSTS header", () => {
    it("includes Strict-Transport-Security with 2-year max-age + preload", async () => {
      const headersFn = nextConfig.headers;
      if (!headersFn) throw new Error("no headers()");
      const result = await headersFn();
      const allHeaders = result[0]?.headers ?? [];
      const hsts = allHeaders.find(
        (h) => h.key === "Strict-Transport-Security",
      );
      expect(hsts, "HSTS header must be present").toBeDefined();
      expect(hsts!.value).toContain("max-age=63072000"); // 2 years
      expect(hsts!.value).toContain("includeSubDomains");
      expect(hsts!.value).toContain("preload");
    });
  });

  describe("X-Frame-Options + X-Content-Type-Options", () => {
    it("sets X-Frame-Options: DENY", async () => {
      const headersFn = nextConfig.headers;
      if (!headersFn) throw new Error("no headers()");
      const result = await headersFn();
      const allHeaders = result[0]?.headers ?? [];
      const xfo = allHeaders.find((h) => h.key === "X-Frame-Options");
      expect(xfo?.value).toBe("DENY");
    });

    it("sets X-Content-Type-Options: nosniff", async () => {
      const headersFn = nextConfig.headers;
      if (!headersFn) throw new Error("no headers()");
      const result = await headersFn();
      const allHeaders = result[0]?.headers ?? [];
      const xcto = allHeaders.find((h) => h.key === "X-Content-Type-Options");
      expect(xcto?.value).toBe("nosniff");
    });
  });

  // ── Phase 23 / BUG-2: X-AI-Provenance HTTP header for article routes ──────
  // The live site E2E audit revealed that the X-AI-Provenance HTTP header
  // was NOT being emitted. Root cause: metadata.other in Next.js 16 only
  // emits <meta> tags, never HTTP headers. The fix: add a static
  // X-AI-Provenance header in next.config.ts headers() for /article/:id*
  // routes, indicating that AI provenance disclosure is present on the page
  // (in the <meta name="ai-provenance"> tag + JSON-LD <script>).
  describe("X-AI-Provenance header (Phase 23 / BUG-2 fix)", () => {
    it("defines a header rule for /article/:id* routes", async () => {
      const headersFn = nextConfig.headers;
      if (!headersFn) throw new Error("no headers()");
      const result = await headersFn();
      const articleRoute = result.find((r) => r.source === "/article/:id*");
      expect(
        articleRoute,
        "next.config.ts must define a header rule for /article/:id* routes",
      ).toBeDefined();
    });

    it("sets X-AI-Provenance header on article routes", async () => {
      const headersFn = nextConfig.headers;
      if (!headersFn) throw new Error("no headers()");
      const result = await headersFn();
      const articleRoute = result.find((r) => r.source === "/article/:id*");
      if (!articleRoute) throw new Error("no /article/:id* route rule");
      const xAiProvenance = articleRoute.headers.find(
        (h) => h.key === "X-AI-Provenance",
      );
      expect(
        xAiProvenance,
        "X-AI-Provenance header must be present on /article/:id* routes",
      ).toBeDefined();
      expect(xAiProvenance!.value).toContain("eu-ai-act-art50");
    });
  });
});
