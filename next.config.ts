import type { NextConfig } from "next";

/**
 * next.config.ts — OneStopNews Production Configuration
 * Next.js ≥16.0.7 (initial release: October 21, 2025)
 *
 * SECURITY NOTE: Per MEP v5.1, pin this project to Next.js ≥16.0.7 as mitigation
 * for CVE-2025-55182 (React2Shell RCE) and the associated 13-advisory
 * bundle covering high-severity DoS and SSRF vulnerabilities.
 * (v5.1 corrected the earlier ≥16.2.6 guidance — 16.0.7 is the actual security patch.)
 */
const nextConfig: NextConfig = {
  // ── OUTPUT MODE ─────────────────────────────────────────────────────────
  // "standalone" produces a self-contained .next/standalone/ directory that
  // can be deployed without node_modules (only used deps are bundled). This
  // is the Next.js-recommended pattern for production Docker images and is
  // required by Dockerfile.web.
  output: "standalone",

  // ── CACHE COMPONENTS ───────────────────────────────────────────────────
  // TOP-LEVEL flag. Enables Cache Components ("use cache" directive), PPR,
  // and opt-in caching model. Replaces ALL of: experimental.ppr + dynamicIO.
  cacheComponents: true,

  // ── NAMED CACHE LIFE PROFILES ───────────────────────────────────────────
  // TOP-LEVEL alongside cacheComponents. MUST be defined here before any
  // cacheLife('profileName') call works — runtime error if profile is missing.
  cacheLife: {
    // Primary news feed. 30s stale, 120s revalidate, 10-min hard eviction.
    feed: { stale: 30, revalidate: 120, expire: 600 },
    // Topic navigation shell. 5-min stale, 15-min revalidate, 1-day hard eviction.
    topicShell: { stale: 300, revalidate: 900, expire: 86400 },
    // Static reference data. 1-hour stale, daily revalidate, weekly hard eviction.
    reference: { stale: 3600, revalidate: 86400, expire: 604800 },
  },

  // ── TURBOPACK ──────────────────────────────────────────────────────────
  // TOP-LEVEL in Next.js 16 (graduated out of experimental). Default bundler.
  turbopack: {},

  // ── REACT COMPILER ──────────────────────────────────────────────────────
  // TOP-LEVEL in Next.js 16 (promoted from experimental to stable).
  // Disabled by default due to build-time cost. Enable when components follow Rules of React.
  // reactCompiler: true,

  // ── IMAGE OPTIMISATION ──────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24, // 24h minimum CDN TTL for news thumbnails
    remotePatterns: [
      // SEED DATA ONLY: picsum.photos generates random placeholder images
      // used by db:seed. For production news images, add the actual CDN
      // domains that serve article images (e.g., your CMS or image proxy).
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
    ],
  },

  // ── EXPERIMENTAL ─────────────────────────────────────────────────────────
  experimental: {
    // VIEW TRANSITIONS: Official docs state "currently experimental and subject to change".
    // All usage MUST go through <PageTransition> abstraction.
    viewTransition: true,
    // NOTE: PRD §5.2 / PAD §5.3 also list `clientSegmentCache: true`,
    // `turbopackPersistentCaching: true`, and `turbopackFileSystemCacheForBuild: true`,
    // but the installed Next.js 16.2.9 does not yet expose these flags in
    // ExperimentalConfig. Re-enable once the upstream type includes them.
  },

  // ── SECURITY HEADERS ─────────────────────────────────────────────────────
  // Phase 19 (M1): Added HSTS and CSP. Previously these were missing — the
  // app relied on the upstream CDN/reverse proxy to set them, which left
  // the app exposed if deployed without a CDN. HSTS forces HTTPS for 2 years;
  // CSP restricts script/style/img/connect sources to 'self' (with
  // 'unsafe-inline' for scripts/styles as a transitional measure until
  // nonce-based CSP is implemented — Next.js inline scripts and Tailwind
  // runtime require this in development).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
          // HSTS — tells browsers to only use HTTPS for 2 years (with
          // subdomains and preload list eligibility). If deploying behind
          // a CDN that also sets HSTS, the browser uses the longer of the
          // two max-age values, so this is safe to set here even with a CDN.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Content-Security-Policy — restricts resource loading to trusted
          // sources.
          //
          // Phase 22 (H1 fix, audit Report 16): 'unsafe-eval' has been
          // REMOVED from script-src in production. No code in src/ uses
          // eval() or new Function() (verified by grep). The previous claim
          // of removal in Phase 21 S4 was incorrect — only the comment was
          // updated while the CSP string still contained the directive.
          // A regression test in next.config.test.ts now locks this in.
          //
          // Phase 23 (BUG-1 fix): The CSP is now CONDITIONAL on NODE_ENV:
          //   - development: 'unsafe-eval' is INCLUDED — React dev mode
          //     requires eval() for callstack reconstruction. Without it,
          //     `pnpm dev` shows console errors:
          //     "eval() is not supported in this environment..."
          //   - production / test: 'unsafe-eval' is REMOVED — security
          //     hardening. React never uses eval() in production mode.
          //
          // This allows developers to use `pnpm dev` without CSP errors
          // while maintaining the production security posture.
          //
          // 'unsafe-inline' remains as a transitional measure for Next.js
          // inline scripts + Tailwind runtime. Production should migrate
          // to nonce-based CSP via Next.js 16's headers() nonce pattern
          // (Phase 21 R2).
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${
                process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
              }`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https: data:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      // ── Phase 23 / BUG-2: X-AI-Provenance HTTP header for article routes ──
      // The live site E2E audit revealed that the X-AI-Provenance HTTP header
      // was NOT being emitted on article detail pages. Root cause: Next.js 16's
      // `metadata.other` API only emits `<meta>` tags, never HTTP headers.
      // The previous code set `"X-AI-Provenance"` in `metadata.other` (page.tsx),
      // which created a `<meta name="X-AI-Provenance">` tag — NOT an HTTP header.
      //
      // This static header tells crawlers/API consumers: "This page may contain
      // AI-generated content with EU AI Act Article 50 provenance disclosure.
      // Check the `<meta name="ai-provenance">` tag and JSON-LD `<script>` for
      // per-article details (model, coverage, sources cited)."
      //
      // The per-article provenance data (model, coverage, sources) is in:
      //   Layer 1: JSON-LD `<script>` (rendered in ArticleData.tsx body)
      //   Layer 3: `<meta name="ai-provenance">` (via metadata.other in page.tsx)
      // This Layer 2 HTTP header is a static indicator — the dynamic data is in
      // the meta tag + JSON-LD.
      {
        source: "/article/:id*",
        headers: [
          {
            key: "X-AI-Provenance",
            value: "eu-ai-act-art50-compliant; disclosure-in-meta-and-jsonld",
          },
        ],
      },
    ];
  },

  // ── CUSTOM REMOTE CACHE HANDLER (Multi-Instance) ────────────────────────
  // UNCOMMENT for multi-instance / horizontally-scaled deployments.
  // Default in-memory cache means each replica maintains its own independent cache.
  // cacheHandler: require.resolve('./src/lib/cache/redis-cache-handler'),
  // cacheMaxMemorySize: 0, // Disable in-memory when using remote handler
};

export default nextConfig;
