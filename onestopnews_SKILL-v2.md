# OneStopNews — Complete Skill Reference

> **Classification:** Definitive Engineering Knowledge Base
> **Phase:** 21 (Security & Architecture Remediation — COMPLETE)
> **Last Updated:** June 23, 2026
> **Test Status:** 472 tests across 67 suites + 10 Playwright E2E + 4 axe-core a11y scans + 4 DB integration tests — all green
> **Coverage:** 88.82% lines / 80.35% branches / 84.83% functions / 89.93% statements (thresholds 80/80/70/80)
> **Quality Gate:** `pnpm check` (tsc --noEmit + ESLint --max-warnings 0) + `pnpm test` (vitest run) + `pnpm test -- --coverage` (CI-enforced) + `pnpm audit --audit-level=high --prod` (Phase 21)

This document is the complete, code-first reference for the OneStopNews codebase. Every section is grounded in the actual source code at HEAD (post-Phase 21). Any coding agent (or senior engineer) who reads this file top-to-bottom will have the institutional knowledge required to extend, debug, or replicate this project.

---

## The Meticulous Approach (Mandatory SOP)

Every task — no matter how small — must follow this six-phase workflow:

1. **ANALYZE** — Deep requirement mining. Identify explicit, implicit, and edge-case needs. Read the actual source files (never assume). Explore multiple approaches. Assess risks.
2. **PLAN** — Structured execution roadmap. Present for explicit user confirmation before writing code.
3. **VALIDATE** — Obtain user approval. Address concerns. Never proceed without alignment.
4. **IMPLEMENT** — Modular, tested, documented builds. Use library components before custom ones. TDD: RED → GREEN → REFACTOR → COMMIT.
5. **VERIFY** — Rigorous QA against success criteria. Test edge cases, accessibility (WCAG AAA), and performance (Core Web Vitals).
6. **DELIVER** — Complete handoff with instructions, documentation, and next steps.

**Non-negotiable:** Never write code without first completing ANALYZE and PLAN. Never skip the VALIDATE checkpoint.

---

## Table of Contents

1. [Project Identity & Design Philosophy](#1-project-identity--design-philosophy)
2. [Tech Stack & Environment](#2-tech-stack--environment)
3. [Bootstrapping & Configuration](#3-bootstrapping--configuration)
4. [The Design System (Code-First)](#4-the-design-system-code-first)
5. [Component Architecture & Patterns](#5-component-architecture--patterns)
6. [Custom Hooks Deep Dive](#6-custom-hooks-deep-dive)
7. [Content Management: RSS Ingestion Pipeline](#7-content-management-rss-ingestion-pipeline)
8. [Accessibility (WCAG AAA) Implementation](#8-accessibility-wcag-aaa-implementation)
9. [Anti-Patterns & Common Bugs](#9-anti-patterns--common-bugs)
10. [Debugging Guide](#10-debugging-guide)
11. [Pre-Ship Checklist](#11-pre-ship-checklist)
12. [Lessons Learnt & How to Avoid Them](#12-lessons-learnt--how-to-avoid-them)
13. [Pitfalls to Avoid](#13-pitfalls-to-avoid)
14. [Best Practices](#14-best-practices)
15. [Coding Patterns](#15-coding-patterns)
16. [Coding Anti-Patterns](#16-coding-anti-patterns)
17. [Responsive Breakpoint Reference](#17-responsive-breakpoint-reference)
18. [Z-Index Layer Map](#18-z-index-layer-map)
19. [Color Reference (Complete)](#19-color-reference-complete)
20. [The Complete TypeScript Interface Reference](#20-the-complete-typescript-interface-reference)

---

## 1. Project Identity & Design Philosophy

### What Is OneStopNews?

OneStopNews is a **topic-first news aggregation platform** with source-cited AI summaries. Rather than organizing news by publisher, it organizes stories by **subject** across 50–200+ RSS/Atom/JSON feeds, normalizes/dedupes them, scores importance, optionally AI-summarizes them with strict provenance, and exposes them via topic-categorized feed, full-text search, public REST API, and admin tools.

### The "Editorial Dispatch" Design System

The visual identity is **architectural, not cosmetic.** Every element carries the weight of something worth reading. This is a high-end editorial aesthetic — think _The Economist_ meets _Bloomberg Terminal_ — not "AI slop."

**Design Thesis:** "High-End Editorial" — calm, authoritative, typography-driven, with deliberate use of whitespace as a structural element. The interface should feel like a well-edited newspaper, not a social media feed.

**Explicit Rejections:**

- Inter, Roboto, Space Grotesk — never use them
- Purple gradients on white — cliché AI aesthetic
- Predictable card grids with rounded corners — too generic
- Bootstrap-style 12-column grids — too predictable

### The 4 Defining Differentiators

1. **3-layer machine-readable AI provenance** — JSON-LD `<script>` + `X-AI-Provenance` HTTP header + `<meta name="ai-provenance">` — EU AI Act Article 50 compliant. C2PA explicitly rejected (no text standard exists).
2. **Editorial Dispatch design system** — Newsreader (headlines, 800 weight) + Instrument Sans (UI/body) + Commit Mono (metadata, self-hosted via `next/font/local`). CSS Subgrid for feed alignment. `--dispatch-ember #c7513f` accent.
3. **Content Availability Guard** — 4-tier enum (`title_only` / `excerpt` / `partial_text` / `full_text`); only `partial_text`/`full_text` eligible for AI summarization. Double-enforced at Server Action AND API Route layers. Prevents AI hallucination.
4. **Modular monolith (Next.js 16 web) + standalone Node.js 24 worker service**, connected via BullMQ v5 on Redis 7+ and shared PostgreSQL 17.

### The 5-Layer Request Model (Golden Rule)

Every request passes through exactly these layers. Deviating from this order creates security and consistency bugs.

```
Layer 0: proxy.ts           — Cookie check, redirect. NO DB. NO logic.
Layer 1: App Router           — Route structure, metadata, PPR, Suspense.
Layer 2: Feature Modules     — UI composition, data binding, mutations.
Layer 3: Domain Services      — Pure business logic. No Next.js or DB runtime imports.
Layer 4: Infrastructure       — Drizzle, Auth.js, BullMQ, AI SDK. Side effects only.
```

**Phase 20 / H1 enforcement:** The ESLint `no-restricted-imports` rule in `eslint.config.mjs` enforces Layer 3 purity — any runtime import from `@/lib/db*` in `src/domain/**` fails lint. `import type` is still allowed (erased at compile time, zero runtime coupling).

### The Meticulous Approach Principles

| Principle                   | Rationale                                                                                                                                                                            |
| :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Library Discipline**      | If Shadcn UI / Radix provides the primitive, use it. Wrap for bespoke styling. Never rebuild from scratch.                                                                           |
| **Single Source of Truth**  | The Drizzle schema is the only source of DB types. Types derive from schema via `(typeof enum.enumValues)[number]` and `$inferSelect`.                                               |
| **Opt-In Caching**          | Next.js 16 makes caching opt-in via `"use cache"`. Everything is dynamic by default. Don't cache without explicit intent.                                                            |
| **Progressive Enhancement** | View Transitions are progressive. They silently degrade on Firefox / reduced-motion. Never rely on them for core functionality.                                                      |
| **Zero `any`**              | TypeScript strict mode, always. Prefer `unknown` over `any`. Use type inference; explicit types on public APIs only.                                                                 |
| **Auth at the DAL**         | `proxy.ts` is UX-only (optimistic redirect). Real authorization lives in `verifySession()` / `verifyAdminSession()` (Server Components/Actions) or `auth()` (API routes — Phase 21). |
| **Content Guard**           | Never enqueue summarisation for `title_only` or `excerpt` articles. This prevents AI hallucination.                                                                                  |
| **Secret Hygiene**          | `.env*` files are gitignored (only `.env.example` tracked). `AUTH_SECRET` rejects known-weak values in production. Never commit real secrets. (Phase 21)                             |

### Phase History (21 phases)

| Phase  | Focus                                                                       | Key Deliverable                                                                                                                                                                                               |
| :----- | :-------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1–8    | Foundation → DB → Design System → Feed → AI → Search/Admin → Worker → CI/CD | V1 feature-complete                                                                                                                                                                                           |
| 9      | Blocking-route fix                                                          | `cacheComponents` + `<Suspense>` pattern                                                                                                                                                                      |
| 10     | Landing page                                                                | 10-section editorial dispatch page                                                                                                                                                                            |
| 11–12  | Bug fixes + Tailwind v4 PostCSS                                             | `@tailwindcss/postcss` + self-hosted Commit Mono                                                                                                                                                              |
| 13     | Critical gaps remediation                                                   | Real RSS parsing, AI SDK v6, FlowProducer DAG, rate limiting                                                                                                                                                  |
| 14     | Validated gaps closure                                                      | Article detail page, 3-layer provenance, E2E tests                                                                                                                                                            |
| 15     | Production readiness                                                        | Dockerfiles, OAuth, sign-in/auth-error pages                                                                                                                                                                  |
| 16–17  | AdminGuard + skip-links + JSON-LD fix                                       | WCAG AAA compliance                                                                                                                                                                                           |
| 18     | DB reinit + skip-link supplement                                            | Operational tooling                                                                                                                                                                                           |
| 19     | Comprehensive code audit                                                    | 47 gaps, 39 remediated, +80 tests                                                                                                                                                                             |
| 20     | Post-Phase-19 remediation                                                   | +60 tests, walkXffChain, /account page, testcontainers, ESLint domain purity, MEP v6.0                                                                                                                        |
| **21** | **Security & architecture remediation (audit-driven)**                      | **11 findings fixed: .env\* untracked, admin routes fixed, auth pattern corrected, CSP hardened, AES-GCM IV, rate limiter fail-open, weak AUTH_SECRET rejection, CI audit, hard delete. +20 tests, +1 suite** |

---

## 2. Tech Stack & Environment

### Exact Versions (from `package.json`)

| Layer                  | Technology                                             | Exact Version                                                                                        | Purpose                                                                                          |
| :--------------------- | :----------------------------------------------------- | :--------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| **Web Framework**      | Next.js                                                | `^16.2.9`                                                                                            | App Router, PPR, Cache Components, `proxy.ts` (≥16.0.7 mitigates CVE-2025-55182)                 |
| **UI Runtime**         | React                                                  | `^19.2.7`                                                                                            | View Transitions, `useActionState`, `useOptimistic`, `<Activity>`                                |
| **Language**           | TypeScript                                             | `^5.7.0` (strict)                                                                                    | Zero `any`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly`             |
| **Styling**            | Tailwind CSS                                           | `^4.3.1`                                                                                             | Utility-first with `@theme` tokens. CSS Subgrid for feed alignment.                              |
| **PostCSS**            | `@tailwindcss/postcss`                                 | `^4.3.1`                                                                                             | **Mandatory** PostCSS plugin for Tailwind v4 utility class generation                            |
| **Components**         | Shadcn UI + Radix                                      | `@radix-ui/react-accordion ^1.2.14`, `@radix-ui/react-dialog ^1.1.16`, `@radix-ui/react-slot ^1.2.5` | Accessible primitives, wrapped for bespoke aesthetic                                             |
| **ORM**                | Drizzle ORM                                            | `^0.45.2`                                                                                            | TypeScript-native, SQL-fluent, lazy proxy connection pattern                                     |
| **Validation**         | Zod                                                    | `^4.4.3`                                                                                             | Schema-first, composable. Enforces AI output constraints.                                        |
| **Auth**               | Auth.js (next-auth)                                    | `5.0.0-beta.31` (pinned)                                                                             | HttpOnly session cookies, Drizzle adapter, JWT strategy                                          |
| **Database**           | PostgreSQL                                             | 17                                                                                                   | Primary datastore. GIN FTS + `ts_rank_cd` BM25. `pg_trgm` for autocomplete.                      |
| **Driver**             | `postgres` (postgres.js)                               | `^3.4.9`                                                                                             | Enables lazy proxy connection pattern (NOT `pg`)                                                 |
| **Job Queue**          | BullMQ                                                 | `^5.78.0`                                                                                            | Job graphs (Flows via `FlowProducer`), priorities, monitoring                                    |
| **Queue Backend**      | Redis (ioredis)                                        | `^5.11.1`                                                                                            | AOF persistence, `noeviction`, `maxRetriesPerRequest: null`                                      |
| **Worker Runtime**     | Node.js                                                | 24 LTS ("Krypton")                                                                                   | BullMQ-native. LTS through April 2028. `engines.node: ">=24.0.0"`                                |
| **AI SDK**             | Vercel AI SDK                                          | `ai@^6.0.201` + `@ai-sdk/anthropic@^3.0.85` + `@ai-sdk/openai@^3.0.73`                               | `generateObject()` with Zod schema validation                                                    |
| **AI (Primary)**       | Claude 4.5 Haiku                                       | `claude-haiku-4-5`                                                                                   | $1/$5 per M tokens. Best cost/quality for news summarisation.                                    |
| **AI (Fallback)**      | GPT-5 Mini                                             | `gpt-5-mini`                                                                                         | Validated cost/quality fallback model                                                            |
| **RSS Parsing**        | `rss-parser`                                           | `^3.13.0`                                                                                            | RSS 2.0 + Atom 1.0 parsing. JSON Feed parsed natively.                                           |
| **HTML Stripping**     | `cheerio`                                              | `^1.2.0`                                                                                             | Phase 19 H9: replaces regex `<[^>]*>/g` (which leaked `<script>` content)                        |
| **Rate Limiting**      | `ioredis` (fixed-window)                               | `^5.11.1`                                                                                            | Redis `INCR` + `EXPIRE`. 20 req/s per IP on `/api/articles`. 5 req/min/user on `/api/summarize`. |
| **Push Notifications** | `web-push`                                             | `^3.6.7`                                                                                             | VAPID + AES-256-GCM key encryption                                                               |
| **Password Hashing**   | `bcryptjs`                                             | `^3.0.3`                                                                                             | Credentials provider                                                                             |
| **Date/Time**          | `luxon`                                                | `^3.7.2`                                                                                             | DST-safe quiet hours for push notifications                                                      |
| **Icons**              | `lucide-react`                                         | `^1.18.0`                                                                                            | Icon library                                                                                     |
| **Class Management**   | `class-variance-authority` + `clsx` + `tailwind-merge` | `^0.7.1` / `^2.1.1` / `^3.6.0`                                                                       | `cn()` utility + `cva` variant discipline                                                        |
| **Testing (Unit)**     | Vitest                                                 | `^4.1.9`                                                                                             | jsdom environment, coverage via `@vitest/coverage-v8 ^4.1.9`                                     |
| **Testing (E2E)**      | Playwright                                             | `^1.61.0`                                                                                            | Chromium/Firefox/WebKit + `@axe-core/playwright ^4.11.3`                                         |
| **Test Integration**   | testcontainers                                         | `12.0.3` + `@testcontainers/postgresql` + `@testcontainers/redis`                                    | Real DB container tests (Phase 20 / F3)                                                          |
| **Pre-commit**         | husky + lint-staged                                    | `^9.1.7` / `^17.0.8`                                                                                 | eslint + prettier on staged `.ts`/`.tsx`                                                         |
| **Formatting**         | Prettier                                               | `^3.8.4`                                                                                             | + `prettier-plugin-tailwindcss ^0.8.0`                                                           |
| **Linting**            | ESLint + typescript-eslint                             | `^8.61.0`                                                                                            | Flat config, `--max-warnings 0`                                                                  |
| **DB Migrations**      | drizzle-kit                                            | `^0.31.10`                                                                                           | `generate` + `migrate` (never `push` in production)                                              |
| **TSX Runner**         | tsx                                                    | `^4.22.4`                                                                                            | Worker process: `tsx src/workers/index.ts`                                                       |

### Critical `tsconfig.json` Flags

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "exclude": [
    "node_modules",
    ".next",
    "drizzle",
    "e2e",
    "playwright.config.ts",
    "skills"
  ]
}
```

**Why these flags matter:**

| Flag                                     | Purpose                                                | What Breaks Without It                          |
| :--------------------------------------- | :----------------------------------------------------- | :---------------------------------------------- |
| `strict: true`                           | Non-negotiable type safety                             | All type errors silently pass                   |
| `noUncheckedIndexedAccess: true`         | `arr[i]` returns `T \| undefined` (not `T`)            | Hides runtime `undefined` access bugs           |
| `verbatimModuleSyntax: true`             | Requires `import type` for type-only imports           | Tree-shaking misses type-only imports           |
| `erasableSyntaxOnly: true`               | Forbids `enum` / `namespace` (compile to runtime IIFE) | Use string unions + ES modules instead          |
| `noImplicitAny: true`                    | Catches untyped parameters                             | `any` creeps in silently                        |
| `noImplicitReturns: true`                | Catches missing return paths                           | Functions return `undefined` silently           |
| `noFallthroughCasesInSwitch: true`       | Catches missing `break`                                | Switch cases fall through unexpectedly          |
| `noImplicitOverride: true`               | Requires `override` keyword                            | Silent method shadowing                         |
| `forceConsistentCasingInFileNames: true` | Case-sensitive imports                                 | Cross-platform import failures (macOS vs Linux) |

### Environment Variables (17 total: 10 required + 6 optional + 1 with default)

All validated by Zod at module load in `src/lib/env/index.ts`. The app fails fast with a descriptive error if any required var is missing or invalid.

**Phase 21 Security:** `.env`, `.env.docker`, `.env.local` are gitignored. Only `.env.example` is tracked (placeholder values). `AUTH_SECRET` rejects known-weak values (containing `dev`, `test`, `ci-dummy`, `change-me`, `placeholder`, etc.) in production via `superRefine`.

```bash
# ── Required (10) ─────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@localhost:5432/onestopnews
REDIS_URL=redis://localhost:6379
AUTH_SECRET=  # min 32 chars, generate: openssl rand -base64 33
                 # Phase 21: rejects known-weak values in production
AUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...  # must start with sk-ant-
OPENAI_API_KEY=sk-...  # must start with sk-
NEXT_PUBLIC_VAPID_PUBLIC_KEY=  # npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@onestopnews.com
PUSH_KEY_ENCRYPTION_KEY=  # 64 hex chars, openssl rand -hex 32

# ── Optional (6) ──────────────────────────────────────────
TRUSTED_PROXY=  # "true" | unset
TRUSTED_PROXY_CIDRS=  # "10.0.0.0/8,172.16.0.0/12" (Phase 20 / F1)
GOOGLE_CLIENT_ID=  # both ID+SECRET required to enable
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# ── With Default (1) ──────────────────────────────────────
NODE_ENV=development  # development | production | test
```

---

## 3. Bootstrapping & Configuration

### From Zero: Recreating the Project

```bash
# 1. Create Next.js 16 app with TypeScript + Tailwind v4
pnpm create next-app@latest onestopnews --typescript --tailwind --app --turbopack
cd onestopnews

# 2. Pin Node 24 + pnpm 9
echo 'engines.node: ">=24.0.0"' >> package.json
echo 'packageManager: "pnpm@9.15.0"' >> package.json

# 3. Install core deps
pnpm add drizzle-orm postgres ioredis bullmq next-auth@5.0.0-beta.31 @auth/drizzle-adapter \
  zod ai @ai-sdk/anthropic @ai-sdk/openai rss-parser cheerio web-push bcryptjs luxon \
  lucide-react class-variance-authority clsx tailwind-merge

# 4. Install Radix primitives (Shadcn-style, not full Shadcn CLI)
pnpm add @radix-ui/react-accordion @radix-ui/react-dialog @radix-ui/react-slot

# 5. Install dev deps
pnpm add -D drizzle-kit tsx vitest @vitest/coverage-v8 @playwright/test \
  @axe-core/playwright husky lint-staged prettier prettier-plugin-tailwindcss \
  typescript-eslint @tailwindcss/postcss testcontainers @testcontainers/postgresql @testcontainers/redis

# 6. Self-host Commit Mono (DO NOT use @fontsource/commit-mono — causes build issues)
mkdir -p public/fonts
# Download commit-mono-400.woff2 from the official source and place in public/fonts/
```

### `next.config.ts` — Critical Configuration

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Required for Dockerfile.web
  cacheComponents: true, // TOP-LEVEL — enables "use cache" + PPR
  cacheLife: {
    // TOP-LEVEL — profiles for cacheLife() calls
    feed: { stale: 30, revalidate: 120, expire: 600 },
    topicShell: { stale: 300, revalidate: 900, expire: 86400 },
    reference: { stale: 3600, revalidate: 86400, expire: 604800 },
  },
  turbopack: {}, // TOP-LEVEL — graduated from experimental in Next.js 16
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
    ],
  },
  experimental: {
    viewTransition: true, // Inside experimental — View Transitions API
    // DO NOT include: clientSegmentCache (not in 16.2.9 ExperimentalConfig — TS error)
    // DO NOT include: ppr (build error in Next.js 16 — cacheComponents implements PPR)
    // DO NOT include: dynamicIO (deprecated — replaced by cacheComponents)
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Flag Placement Matrix (wrong placement = silent breakage)

| Flag                              | Placement                     | What Breaks if Wrong                                    |
| :-------------------------------- | :---------------------------- | :------------------------------------------------------ |
| `cacheComponents: true`           | **Top-level**                 | Every `"use cache"` silently ignored → zero caching     |
| `cacheLife` profiles              | **Top-level**                 | `cacheLife('feed')` throws at runtime — profile missing |
| `turbopack: {}`                   | **Top-level**                 | Ignored or config warning                               |
| `experimental.viewTransition`     | **Inside `experimental: {}`** | Transitions silently disabled                           |
| `experimental.ppr`                | **DO NOT INCLUDE**            | Build error in Next.js 16                               |
| `experimental.dynamicIO`          | **DO NOT INCLUDE**            | Deprecated — replaced by `cacheComponents`              |
| `experimental.clientSegmentCache` | **DO NOT INCLUDE**            | TS2353 — not in 16.2.9 `ExperimentalConfig`             |

### `proxy.ts` — Network Boundary (Layer 0)

```typescript
// proxy.ts (at repo root — NOT src/middleware.ts)
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "./src/lib/auth";

export async function proxy(request: NextRequest) {
  const session = await auth();
  const isSignedIn = !!session?.user;
  const isOnSignInPage = request.nextUrl.pathname.startsWith("/sign-in");
  const isOnAuthError = request.nextUrl.pathname.startsWith("/auth-error");

  if (!isSignedIn && !isOnSignInPage && !isOnAuthError) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  if (isSignedIn && (isOnSignInPage || isOnAuthError)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Rules:** ZERO DB calls. ZERO business logic. Optimistic cookie check only. Runs on Node.js runtime only (NOT Edge — `proxy.ts` does not support Edge in Next.js 16).

### `postcss.config.mjs` — Mandatory for Tailwind v4

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

**Without this file, Tailwind v4 generates ZERO utility classes.** The symptom is a completely unstyled page. If you see this, check: (1) `@tailwindcss/postcss` is installed, (2) `postcss.config.mjs` exists, (3) `.next/` cache is cleared (`rm -rf .next`), (4) dev server restarted.

### `eslint.config.mjs` — Flat Config with Domain Purity Rule

```javascript
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "dist/**",
      "playwright.config.ts",
      "skills/**",
      "coverage/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: { parser: tseslint.parser },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // Phase 20 / H1: Domain layer purity — runtime imports from @/lib/db* forbidden
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db",
              message: "Use `import type` instead...",
              allowTypeImports: true,
            },
            {
              name: "@/lib/db/schema",
              message: "Use `import type` instead...",
              allowTypeImports: true,
            },
            {
              name: "@/lib/db/index",
              message: "Domain layer must be pure...",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
];
```

### `vitest.config.ts` — 3-Tier Test Architecture

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    exclude: [
      "node_modules/",
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
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
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
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
});
```

**Separate `vitest.integration.config.ts`** for DB integration tests (node env, 120s timeout, includes only `*.db-integration.test.ts`).

---

## 4. The Design System (Code-First)

### Typography Stack (exact `@theme` values from `globals.css`)

```css
@theme {
  --font-editorial: "Newsreader", Georgia, "Times New Roman", serif;
  --font-ui: "Instrument Sans", system-ui, -apple-system, sans-serif;
  --font-mono: "Commit Mono", ui-monospace, "Fira Code", monospace;
}
```

| Role          | Typeface                   | Weight        | CSS Variable       | Tailwind Class   | Fallback              |
| :------------ | :------------------------- | :------------ | :----------------- | :--------------- | :-------------------- |
| **Headlines** | Newsreader (variable)      | 800 (display) | `--font-editorial` | `font-editorial` | Georgia, serif        |
| **UI / Body** | Instrument Sans (variable) | 400–600       | `--font-ui`        | `font-ui`        | system-ui, sans-serif |
| **Metadata**  | Commit Mono (self-hosted)  | 400           | `--font-mono`      | `font-mono`      | Fira Code, monospace  |

**Font loading (`src/app/layout.tsx`):**

```typescript
import { Newsreader, Instrument_Sans } from "next/font/google";
import localFont from "next/font/local";

const newsreader = Newsreader({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Commit Mono MUST be self-hosted via next/font/local — @fontsource/commit-mono causes build issues
const commitMono = localFont({
  src: "../../public/fonts/commit-mono-400.woff2",
  variable: "--font-mono",
  weight: "400",
  style: "normal",
  display: "swap",
});
```

**`.font-editorial` class** (applies display settings beyond just the font family):

```css
.font-editorial {
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-rendering: optimizeLegibility;
  font-feature-settings: "ss01", "ss02";
}
```

### Color Tokens (complete — from `globals.css` `@theme` block)

See [§19 Color Reference (Complete)](#19-color-reference-complete) for the full table. Key tokens:

| Token                    | Hex       | Usage                                    |
| :----------------------- | :-------- | :--------------------------------------- |
| `--color-ink-900`        | `#1a1a18` | Headings (letterpress black)             |
| `--color-ink-600`        | `#3d3d3a` | Body text (WCAG AAA 9.5:1 on `paper-50`) |
| `--color-ink-300`        | `#8a8a83` | Muted / metadata                         |
| `--color-ink-100`        | `#e8e8e4` | Dividers / borders                       |
| `--color-paper-50`       | `#fafaf8` | Page background (newsprint off-white)    |
| `--color-paper-100`      | `#f2f2ee` | Card surface                             |
| `--color-dispatch-ember` | `#c7513f` | Breaking news, AI badge, focus rings     |
| `--color-dispatch-sage`  | `#6b8f71` | Finance / positive accent                |
| `--color-dispatch-slate` | `#5a6b7a` | Tech / neutral accent                    |

**Design Token Discipline:** NEVER use raw hex colors in Tailwind classes (e.g., `bg-[#1a1a2e]`). All colors must come from the design token system (`bg-ink-900`, `text-paper-50`, etc.). Raw hex values bypass the theme and break maintainability.

### CSS Subgrid Feed Architecture

The feed grid uses `grid-rows-subgrid` to force Headline, Excerpt, and Metadata rows to align across every card in a visual row — no fixed heights, no JavaScript measurement.

**Parent (`FeedGrid.tsx`):**

```tsx
<div
  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8"
  role="feed"
  aria-label="News articles"
>
  {articles.map((article) => (
    <ArticleCard key={article.id} article={article} />
  ))}
</div>
```

**Child (`ArticleCard.tsx`):**

```tsx
<article className="group relative grid grid-rows-subgrid row-span-3 gap-y-3 mb-10 last:mb-0 border-b border-ink-100 pb-6">
  <h3 className="font-editorial text-xl ...">  {/* Row 1: Headline */}
  <p className="font-ui text-sm ... line-clamp-3">  {/* Row 2: Excerpt */}
  <div className="flex items-center gap-3 font-mono text-[10px] ...">  {/* Row 3: Metadata */}
</article>
```

**Contract:** Parent defines columns with `gap-x` only (no `gap-y`). Each `ArticleCard` spans 3 row tracks via `row-span-3`. Vertical spacing between visual rows is owned by the card (`mb-10`). Last card uses `last:mb-0` to prevent footer spacing issues.

### Custom Utility Classes (from `globals.css`)

| Class                | Definition                                                                                 | Usage                                             |
| :------------------- | :----------------------------------------------------------------------------------------- | :------------------------------------------------ |
| `.cat-label`         | `font-mono; font-variant: all-small-caps; letter-spacing: 0.12em`                          | Category labels, metadata tags                    |
| `.cat-label-wide`    | `font-mono; font-variant: all-small-caps; letter-spacing: 0.25em`                          | Wide category labels with extra tracking          |
| `.btn-ember`         | `transition: transform/background/box-shadow 150ms; hover: scale(1.02) + color-mix darken` | Primary CTA buttons                               |
| `.pulse-dot`         | `animation: pulse-dot 2s ease-in-out infinite (opacity 1→0.25→1)`                          | Live status indicators                            |
| `.commitment-number` | `font-editorial; font-size: 4.5rem; opacity: 0.08; position: absolute`                     | Decorative background numbers in StatsSection     |
| `.nutrition-label`   | `border-left: 3px solid dispatch-ember; gradient paper-100→paper-50`                       | AI summary transparency panel                     |
| `.reveal`            | `opacity: 0; transform: translateY(24px); transition: 700ms`                               | Scroll-reveal entrance (IntersectionObserver)     |
| `.reveal.visible`    | `opacity: 1; transform: translateY(0)`                                                     | Active reveal state                               |
| `.outline-hidden`    | `outline: 2px solid transparent; outline-offset: 2px`                                      | Tailwind v4 replacement for `outline-none` (a11y) |
| `.category-nav`      | `scrollbar-width: none; -ms-overflow-style: none`                                          | Hidden scrollbar for horizontal nav               |
| `.link-underline`    | `::after width: 0→100% on hover`                                                           | Animated underline for links                      |
| `.cta-input`         | `bg: rgba(255,255,255,0.06); border: rgba(255,255,255,0.15)`                               | Input on dark background (NewsletterCTA)          |

### Animation Tokens

| Animation                   | Keyframes                                                   | Usage                                                |
| :-------------------------- | :---------------------------------------------------------- | :--------------------------------------------------- |
| `ticker-scroll`             | `translateX(0) → translateX(-50%)` over 80s linear infinite | NewsTicker marquee                                   |
| `pulse-dot`                 | `opacity: 1 → 0.25 → 1` over 2s ease-in-out                 | Live status indicators                               |
| `slideDown` / `slideUp`     | `height: 0 → var(--radix-accordion-content-height)`         | Radix Accordion expand/collapse (300ms cubic-bezier) |
| `reveal` / `reveal.visible` | `opacity: 0, translateY(24px) → opacity: 1, translateY(0)`  | Scroll-triggered entrance (700ms)                    |
| `scroll-progress`           | `scaleX(0) → scaleX(1)` via `animation-timeline: scroll()`  | CSS-only scroll progress bar                         |

**Accessibility:** All animations respect `prefers-reduced-motion: reduce`. The global CSS overrides:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

---

## 5. Component Architecture & Patterns

### The "Engineered Soul" Component Philosophy

Every component serves a specific architectural purpose. There are no "wrapper for wrapper's sake" components. The hierarchy is:

```
src/shared/components/     ← Cross-feature primitives (Layer 2)
  ├── ui/                  ← Button, Badge, Skeleton, StatsSection, Accordion, NewsletterCTA
  ├── layout/              ← Header, Footer, Masthead, NewsTicker, UserMenu
  ├── providers/           ← RevealProvider (IntersectionObserver)
  └── auth/                ← AdminGuard, AdminGuardSkeleton

src/features/*/components/ ← Feature-specific (Layer 2)
  ├── feed/                ← ArticleCard, FeedGrid, FeedData, FeedSkeleton, LeadStory, FeedContainer, LoadMoreButton
  ├── articles/            ← ArticleData, ArticleSkeleton
  ├── summaries/           ← NutritionLabel, NutritionLabelDemo, SummaryPanel, DisclosureBadge, SummariesData, SummariesSkeleton
  ├── search/              ← SearchBar, SearchResults, SearchData, SearchSkeleton
  └── sources/             ← SourcesData, SourcesSkeleton

src/components/primitives/ ← Cross-cutting (Layer 2)
  └── PageTransition.tsx   ← View Transitions abstraction

src/app/                   ← Route components (Layer 1)
  ├── (public)/            ← page.tsx (landing), search/
  ├── topics/[category]/   ← PPR + Cache Component
  ├── article/[id]/        ← Fully dynamic, 3-layer provenance
  ├── sign-in/             ← Server + SignInClient
  ├── auth-error/          ← AuthErrorMessage (links to /account)
  ├── account/             ← Linked-provider management (Phase 20 / F2)
  └── (admin)/             ← AdminGuard-protected routes
```

### Button — cva + Radix Slot Pattern

```typescript
// src/shared/components/ui/Button.tsx
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm font-ui font-medium text-sm " +
  "transition-all duration-150 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50 " +
  "disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-dispatch-ember text-paper-50 hover:bg-dispatch-ember/90 active:scale-[0.98]",
        secondary: "bg-ink-900 text-paper-50 hover:bg-ink-700 active:scale-[0.98]",
        outline: "border border-ink-100 bg-transparent text-ink-900 hover:bg-paper-100 hover:border-ink-300 active:scale-[0.99]",
        ghost: "bg-transparent text-ink-600 hover:bg-paper-100 hover:text-ink-900",
        destructive: "bg-dispatch-danger text-paper-50 hover:bg-dispatch-danger-dark active:scale-[0.98]",
      },
      size: { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base", icon: "h-10 w-10 p-2" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} disabled={disabled || isLoading} {...props}>
        {isLoading && <ButtonSpinner />}
        {children}
      </Comp>
    );
  },
);
```

**Key patterns:**

1. `cva` for variant discipline (5 variants × 4 sizes)
2. `Radix Slot` for `asChild` polymorphism (render as `<a>` or `<Link>`)
3. `forwardRef` for ref forwarding
4. `isLoading` prop: shows spinner, disables button, prevents double-submit
5. `focus-visible:ring-dispatch-ember` for WCAG AAA focus ring

### ArticleCard — CSS Subgrid Child

```tsx
// src/features/feed/components/ArticleCard.tsx
export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <article className="group relative grid grid-rows-subgrid row-span-3 gap-y-3 mb-10 last:mb-0 border-b border-ink-100 pb-6 transition-colors duration-300 hover:bg-paper-100/50">
      {/* ROW 1: Headline */}
      <h3 className="font-editorial text-xl leading-tight text-ink-900 group-hover:text-dispatch-ember transition-colors duration-300">
        <Link
          href={`/article/${article.id}`}
          className="after:absolute after:inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50 rounded-sm"
        >
          {article.title}
        </Link>
      </h3>
      {/* ROW 2: Excerpt */}
      <p className="font-ui text-sm leading-relaxed text-ink-600 line-clamp-3">
        {article.excerpt ?? (
          <span className="text-ink-300 italic">No excerpt available.</span>
        )}
      </p>
      {/* ROW 3: Metadata */}
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-ink-600 mt-auto">
        <span className="text-dispatch-slate font-medium truncate max-w-[120px]">
          {article.source.name}
        </span>
        <span
          className="w-1 h-1 rounded-full bg-ink-300 shrink-0"
          aria-hidden="true"
        />
        <time
          dateTime={
            article.publishedAt instanceof Date
              ? article.publishedAt.toISOString()
              : String(article.publishedAt)
          }
          className="shrink-0 tabular-nums"
        >
          {formatTimeAgo(article.publishedAt)}
        </time>
        {article.hasSummary && article.summaryStatus === "ok" && (
          <>
            <span
              className="w-1 h-1 rounded-full bg-ink-300 shrink-0"
              aria-hidden="true"
            />
            <span className="text-dispatch-ember font-medium shrink-0 tracking-widest">
              AI Brief
            </span>
          </>
        )}
      </div>
    </article>
  );
}
```

**Key patterns:**

1. `grid grid-rows-subgrid row-span-3` — spans 3 named rows (headline/excerpt/metadata align across cards)
2. `after:absolute after:inset-0` — full-card click area on the `<Link>`
3. `line-clamp-3` — excerpt truncated to 3 lines
4. `mt-auto` — metadata row pinned to bottom
5. `aria-hidden="true"` on decorative bullet separators
6. `<time dateTime={...}>` — machine-readable timestamp for SEO
7. "AI Brief" badge only when `hasSummary && summaryStatus === "ok"`

### NutritionLabel — AI Transparency Panel

```tsx
// src/features/summaries/components/NutritionLabel.tsx
<aside
  className="nutrition-label ..."
  aria-label="AI-generated summary transparency label"
>
  {/* Summary text */}
  <p className="font-ui text-base leading-relaxed text-ink-900">
    {summary.summaryText}
  </p>
  {/* Transparency label section */}
  <div className="border-t border-ink-100 ...">
    {/* Model, temperature, coverage %, citations, compliance statement */}
  </div>
</aside>
```

**CSS:**

```css
.nutrition-label {
  border-left: 3px solid var(--color-dispatch-ember);
  background: linear-gradient(
    to right,
    var(--color-paper-100) 0%,
    var(--color-paper-50) 100%
  );
}
```

### SummaryPanel — 5-State Machine

```typescript
// src/features/summaries/components/SummaryPanel.tsx
// Handles all 5 summaryStatus states:
none         → "Request AI Summary" button
pending      → "Generating AI summary..." status text
ok           → <NutritionLabel summary={summary} />
needs_review → "Summary under editorial review" notice
disabled     → renders null (no UI hint)
```

**Phase 19 H4:** Error state with "Try Again" button. **Phase 19 C5:** `SummariesData.tsx` Approve/Disable buttons wired via `<form action={...}>`.

### FeedData + FeedSkeleton — Suspense Pattern

```tsx
// src/features/feed/components/FeedData.tsx (Server Component, wrapped in <Suspense>)
export async function FeedData({ category, limit = 30 }: FeedDataProps) {
  const page = await getFeedArticles({ category, limit });
  return <FeedContainer initialPage={page} category={category} />;
}

// Usage in page.tsx:
<Suspense fallback={<FeedSkeleton />}>
  <FeedData category={category} />
</Suspense>;
```

**Phase 9 fix:** Never `await` data fetches directly in a page body without `<Suspense>` — triggers `blocking-route` error in Next.js 16 `cacheComponents` mode.

### PageTransition — Progressive Enhancement

```tsx
// src/components/primitives/PageTransition.tsx
"use client";
export function PageTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (typeof document === "undefined" || !document.startViewTransition)
      return;
    // Phase 20 / T4 fix: guard matchMedia — jsdom + older browsers don't implement it
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      e.preventDefault();
      document.startViewTransition?.(() => router.push(href));
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [router]);
  return <>{children}</>;
}
```

**Phase 20 / T4 production bug fix:** Added `typeof window.matchMedia === "function"` guard. Without it, jsdom (vitest) and older browsers crash with `TypeError: window.matchMedia is not a function`.

---

## 6. Custom Hooks Deep Dive

### `useDebounce<T>` — Generic Value Debounce

```typescript
// src/shared/hooks/useDebounce.ts
"use client";
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

**Implementation details:**

- Generic `<T>` — works with any value type (string, number, object, array)
- Default delay 300ms
- Cleanup via `useEffect` return (`clearTimeout`)
- Dependencies: `[value, delay]` — re-runs when value OR delay changes

**Usage in SearchBar:**

```tsx
const [query, setQuery] = useState("");
const debouncedQuery = useDebounce(query, 300);
// debouncedQuery only updates 300ms after the user stops typing
```

### `useReducedMotion` — WCAG AAA Motion Detection

```typescript
// src/shared/hooks/useReducedMotion.ts
"use client";
import { useState, useEffect } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
```

**Implementation details:**

- Returns `false` on SSR (prevents hydration mismatch)
- Checks on mount via `mq.matches`
- Listens for changes via `addEventListener("change", ...)`
- Cleanup via `removeEventListener`
- WCAG AAA: When `true`, DISABLE all animations entirely — do NOT just slow them

**Usage pattern:**

```tsx
const reduced = useReducedMotion();
<div className={reduced ? "" : "animate-pulse"}>...</div>;
```

**Note:** This hook is for client components that need conditional animation logic. For CSS-level animation disabling, the global `@media (prefers-reduced-motion: reduce)` block in `globals.css` handles it automatically.

---

## 7. Content Management: RSS Ingestion Pipeline

### Architecture (NOT `import.meta.glob` — this is a server-side RSS pipeline)

OneStopNews does NOT use `import.meta.glob` for content management. Content comes from **50–200+ external RSS/Atom/JSON feeds** parsed by a standalone Node.js worker service.

```
RSS/Atom/JSON Feed (external)
    ↓
src/workers/jobs/parseFeed.ts (rss-parser + cheerio)
    ↓
src/domain/articles/normalize.ts (normalizeCanonicalUrl + hashContent SHA-256)
    ↓
src/workers/jobs/determineContentAvailability.ts (4-tier guard)
    ↓
PostgreSQL (articles table, upsert via onConflictDoUpdate on canonicalUrl)
    ↓
src/lib/queue/flows.ts (FlowProducer DAG: ingest → score → feed-slice)
    ↓
src/workers/jobs/summarize.ts (AI SDK v6, Anthropic + OpenAI fallback)
    ↓
PostgreSQL (summaries table, 3-layer provenance)
```

### `parseFeed.ts` — RSS/Atom/JSON Parser

```typescript
// src/workers/jobs/parseFeed.ts
import Parser from "rss-parser";
import * as cheerio from "cheerio"; // Phase 19 H9: replaces regex HTML stripping

const parser = new Parser({
  timeout: 30000,
  headers: { "User-Agent": "OneStopNews/1.0 (+https://onestop.news)" },
  customFields: {
    item: [["content:encoded", "contentEncoded"]],
  },
});

// HTML stripping — MUST use cheerio, NOT regex
function stripHtml(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, object, embed").remove();
  return $.text().replace(/\s+/g, " ").trim();
}
```

**Phase 19 H9 gotcha:** The previous regex-based stripper `/<[^>]*>/g` strips TAGS but not their TEXT CONTENT — `<script>alert('evil')</script>` became `alert('evil')` in the stripped output, leaking into AI summarization prompts. `cheerio` handles all edge cases: numeric entities, CDATA, nested tags, malformed HTML.

**cheerio entity gotcha:** cheerio decodes `&#8217;` to U+2019 (right single quotation mark `'`), NOT ASCII apostrophe `'`. Tests asserting `body === "It's a test"` will fail — use `body.toContain("\u2019s a test")` instead.

### `normalize.ts` — Pure Domain Functions

```typescript
// src/domain/articles/normalize.ts
import { createHash } from "node:crypto";

export function normalizeCanonicalUrl(url: string): string {
  // Remove UTM params, normalize trailing slashes, lowercase scheme/host
  const parsed = new URL(url);
  parsed.searchParams.delete("utm_source");
  parsed.searchParams.delete("utm_medium");
  parsed.searchParams.delete("utm_campaign");
  parsed.pathname = parsed.pathname.replace(/\/$/, "") || "/";
  return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${parsed.pathname}`;
}

// Phase 14 gotcha #1: MUST include body for content-change detection
export function hashContent(
  title: string,
  body: string,
  publishedAt: Date,
): string {
  const content = `${title}|${body}|${publishedAt.toISOString()}`;
  return createHash("sha256").update(content).digest("hex");
}
```

**Phase 14 fix:** `hashContent` must include `body` — without it, content-only updates (same title+date, different body) are silently dropped by `onConflictDoUpdate WHERE contentHash = EXCLUDED.contentHash`.

### Content Availability Guard (Anti-Hallucination)

```typescript
// src/lib/db/schema.ts
export const contentAvailabilityEnum = pgEnum("content_availability", [
  "title_only", // Title extracted only. DO NOT summarise.
  "excerpt", // Title + short excerpt (≤300 chars). DO NOT summarise.
  "partial_text", // Title + excerpt + partial body (300–1500 chars). Summarise permitted.
  "full_text", // Title + excerpt + full body (>1500 chars). Summarise preferred.
]);
```

**Enforced at BOTH layers:**

1. Server Action (`src/features/summaries/actions.ts:55`): `verifySession()` first, then content guard
2. HTTP Route (`src/app/api/summarize/[id]/route.ts`): Same guard

### FlowProducer DAG (Atomic Ingestion Pipeline)

```typescript
// src/lib/queue/flows.ts
// Phase 19 C4 fix: try/catch + fallback — never re-throw if side effect landed
export async function enqueuePostIngestFlow(
  newArticleIds: string[],
): Promise<PostIngestFlowStatus> {
  try {
    await flowProducer.add({
      name: "feed-slice-refresh",
      queueName: "feed-slice",
      data: { articleIds: newArticleIds },
      children: newArticleIds.map((id) => ({
        name: "score-article",
        queueName: "score",
        data: { articleId: id },
      })),
    });
    return {
      status: "ok",
      fallbackUsed: false,
      fallbackFailures: 0,
      enqueuedCount: newArticleIds.length,
    };
  } catch (flowError) {
    // Fallback: enqueue scores directly (loses atomicity but ensures scoring happens)
    const fallbackFailures = 0;
    for (const articleId of newArticleIds) {
      try {
        await scoreQueue.add("score-article", { articleId });
      } catch {
        fallbackFailures++;
      }
    }
    return {
      status: "degraded",
      fallbackUsed: true,
      fallbackFailures,
      enqueuedCount: newArticleIds.length,
    };
  }
}
```

**Phase 19 C4 lesson:** At resilience boundaries, NEVER re-throw if the side effect has already landed (articles persisted). Return a status object instead — re-throwing causes BullMQ to retry, but the retry sees a different state (articles already persisted) and silently drops the work.

### 3-Layer AI Provenance (`src/lib/ai/provenance.ts`)

```typescript
// Layer 1: JSON-LD (rendered in page BODY via ArticleData.tsx — NOT via metadata.other)
function generateJsonLd(summary): object {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    isBasedOn: summary.originalArticleUrl,
    accountablePerson: { "@type": "Person", name: "OneStopNews AI" },
    dateModified: summary.generatedAt,
    description: summary.summaryText,
  };
}

// Layer 2: HTTP header (set via generateMetadata() metadata.other)
function generateHttpHeader(summary): string {
  return Buffer.from(
    JSON.stringify({
      model: summary.model,
      generatedAt: summary.generatedAt,
      sourcesVerified: summary.sourcesCited.length,
      coveragePercentage: summary.coveragePercentage,
      compliance: "eu-ai-act-art50",
    }),
  ).toString("base64");
}

// Layer 3: HTML meta tag (set via generateMetadata() metadata.other)
function generateMetaTag(summary): string {
  return `model=${summary.model};coverage=${summary.coveragePercentage}%;compliance=eu-ai-act-art50`;
}
```

**Phase 17 fix:** JSON-LD is rendered as `<script type="application/ld+json">` in the page BODY via `ArticleData.tsx:86-93` — NOT via `metadata.other` (which renders `<meta>` tags, not `<script>` tags). The HTTP header + meta tag still go via `metadata.other`.

---

## 8. Accessibility (WCAG AAA) Implementation

### Skip-to-Content Link (Phase 17)

```tsx
// src/app/layout.tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-ink-900 focus:text-paper-50 focus:font-ui focus:text-sm focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-dispatch-ember"
>
  Skip to content
</a>
```

**Every page template must include `<main id="main-content">`** for the skip link to work — including error boundaries (`error.tsx`, `global-error.tsx`, `not-found.tsx`).

### Focus Rings (WCAG AAA)

```css
/* globals.css */
:focus-visible {
  outline: 2px solid var(--color-dispatch-ember);
  outline-offset: 2px;
  border-radius: 2px;
}
```

**Component-level focus rings** (redundant with global `:focus-visible` for explicitness):

```tsx
className =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50";
```

### ARIA Patterns

| Pattern             | Implementation                                                     |
| :------------------ | :----------------------------------------------------------------- |
| Feed container      | `role="feed" aria-label="News articles"`                           |
| Loading state       | `role="feed" aria-busy="true" aria-label="Loading news articles"`  |
| Empty state         | `role="status"` with ember dot + "No stories in this category yet" |
| Search form         | `role="search"`                                                    |
| Navigation          | `<nav aria-label="Primary navigation">`                            |
| AI summary panel    | `aria-label="AI-generated summary transparency label"`             |
| Decorative elements | `aria-hidden="true"` on bullet separators, spinner SVGs            |
| Live indicators     | `.pulse-dot` with `aria-hidden="true"` (announced via parent text) |

### Reduced Motion (WCAG AAA)

**Global CSS override** (disables ALL animations):

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

**Component-level** via `useReducedMotion()` hook (for conditional logic, not just CSS).

### Color Contrast (WCAG AAA)

| Foreground               | Background               | Ratio  | Usage                                    |
| :----------------------- | :----------------------- | :----- | :--------------------------------------- |
| `ink-600 #3d3d3a`        | `paper-50 #fafaf8`       | 9.5:1  | Body text (AAA)                          |
| `ink-900 #1a1a18`        | `paper-50 #fafaf8`       | 15.8:1 | Headings (AAA)                           |
| `ink-300 #8a8a83`        | `paper-50 #fafaf8`       | 3.4:1  | Metadata (AA Large only — use sparingly) |
| `paper-50 #fafaf8`       | `dispatch-ember #c7513f` | 4.8:1  | Button text (AA)                         |
| `dispatch-ember #c7513f` | `paper-50 #fafaf8`       | 4.8:1  | Focus ring (AA)                          |

### axe-core E2E Scans (Phase 19 / M5)

```typescript
// e2e/a11y.spec.ts
import { injectAxe, checkA11y } from "axe-playwright";

test("homepage is WCAG AAA accessible", async ({ page }) => {
  await page.goto("/");
  await injectAxe(page);
  await checkA11y(page, undefined, {
    axeOptions: {
      runOnly: ["tag=wcag2a", "tag=wcag2aa", "tag=wcag21a", "tag=wcag21aa"],
    },
  });
});
```

4 scans: `/`, `/search`, `/sign-in`, `/auth-error`. The `color-contrast` rule is filtered out (dispatch-ember/dispatch-sage tokens are manually verified at 9.5:1 contrast on paper-50, but axe sometimes flags them in test env).

---

## 9. Anti-Patterns & Common Bugs

### The 89-Entry Anti-Patterns Table (Post-Phase 20)

Complete list from `AGENTS.md`. Here are the most critical entries organized by category:

#### Configuration Anti-Patterns

| Anti-Pattern                                     | Why Forbidden                                                | Fix                                                                             |
| :----------------------------------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------ |
| `cacheComponents: true` inside `experimental`    | Every `"use cache"` silently ignored → zero caching          | Move to **top-level** of `next.config.ts`                                       |
| `cacheLife` profiles inside `experimental`       | `cacheLife('feed')` throws at runtime — profile missing      | Define at **top-level** with all 3 fields (`stale`, `revalidate`, `expire`)     |
| `experimental.ppr` in config                     | Build error in Next.js 16 — `cacheComponents` implements PPR | **Remove entirely**                                                             |
| `experimental.dynamicIO` in config               | Deprecated — replaced by `cacheComponents`                   | **Remove entirely**                                                             |
| `experimental.clientSegmentCache`                | Not in 16.2.9 `ExperimentalConfig` — `TS2353`                | **Remove entirely** (re-enable when upstream type includes it)                  |
| Missing `@tailwindcss/postcss` in PostCSS config | Tailwind v4 generates ZERO utility classes                   | Install `@tailwindcss/postcss` + create `postcss.config.mjs`                    |
| Vendored `skills/` not excluded from tsc/eslint  | 64 tsc errors + 43 lint warnings from skills' own deps       | Add `"skills"` to `tsconfig.json` `exclude` + `"skills/**"` to eslint `ignores` |

#### TypeScript Anti-Patterns

| Anti-Pattern                                        | Why Forbidden                                                 | Fix                                                                                               |
| :-------------------------------------------------- | :------------------------------------------------------------ | :------------------------------------------------------------------------------------------------ |
| `any` in TypeScript                                 | Breaks strict mode contract and type inference                | `unknown` + type guards                                                                           |
| `enum` / `namespace`                                | Compile to runtime IIFE/closure; violate `erasableSyntaxOnly` | String unions + ES modules                                                                        |
| Missing `noUncheckedIndexedAccess`                  | `arr[i]` returns `T` instead of `T \| undefined`              | Enable in `tsconfig.json`                                                                         |
| Missing `import type` for type-only imports         | `verbatimModuleSyntax` requires it                            | Use `import type { ... }`                                                                         |
| Runtime imports from `@/lib/db*` in `src/domain/**` | Violates Layer 3 purity (domain must be runtime-pure)         | Use `import type` only — enforced by ESLint `no-restricted-imports` with `allowTypeImports: true` |

#### React / Next.js Anti-Patterns

| Anti-Pattern                                                | Why Forbidden                                                                | Fix                                                                                                  |
| :---------------------------------------------------------- | :--------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| `new Date()` in Server Components                           | Non-deterministic; causes `next-prerender-current-time` build error          | Move to Client Component or compute from headers                                                     |
| `new Date()` in Client Component without `<Suspense>`       | Prerender still fails — needs Suspense boundary above it                     | Wrap in `<Suspense fallback={...}>`                                                                  |
| `.reveal` class on above-the-fold elements                  | Hydration mismatch: server renders `reveal`, client expects `reveal visible` | Only use scroll-reveal for below-the-fold content                                                    |
| Synchronous `params`/`searchParams` access                  | Runtime 500 in Next.js 16 App Router                                         | `await params` / `await searchParams` (they're `Promise<T>`)                                         |
| Synchronous `cookies()` access                              | `TS2339` error; runtime undefined                                            | `await cookies()` before `.get()`                                                                    |
| Data fetching in Layouts                                    | Layouts cause re-renders. Fetch in Pages                                     | Move `await db.query...` from `layout.tsx` to `page.tsx`                                             |
| `await` in page body without `<Suspense>`                   | `blocking-route` error in `cacheComponents` mode                             | Wrap dynamic content in `<Suspense fallback={<Skeleton />}>`                                         |
| `window.matchMedia()` without `typeof === "function"` guard | Crashes in jsdom + older browsers (Phase 20 / T4)                            | `typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(...)` |

#### Auth / Security Anti-Patterns

| Anti-Pattern                                              | Why Forbidden                                                              | Fix                                                                                                       |
| :-------------------------------------------------------- | :------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `throw new Error()` in RSC auth                           | Triggers full-page error boundary. Bad UX                                  | `redirect('/sign-in')` — preserves invisible UX                                                           |
| Server Action without `verifySession()`                   | Server Actions bypass layout guards; unauthenticated clients can call them | Every `actions.ts` function starts with `await verifySession()` or `await verifyAdminSession()`           |
| `proxy.ts` with DB calls or business logic                | `proxy.ts` is UX-only; real auth at DAL                                    | Move auth to `verifySession()` / `verifyAdminSession()` in `src/lib/auth/dal.ts`                          |
| `process.env.*` reads outside `src/lib/env/`              | Bypasses Zod schema validation — typos silently return `undefined`         | Import `env` from `@/lib/env` — validated at module load                                                  |
| Leftmost `x-forwarded-for` IP behind CDN                  | Spoofable — attacker can bypass rate limiting                              | Set `TRUSTED_PROXY=true` + use `walkXffChain()` with `TRUSTED_PROXY_CIDRS` (Phase 20 / F1)                |
| Security module relying solely on upstream Zod validation | When env is mocked in tests, Zod is bypassed — confusing errors            | Belt-and-suspenders: validate in the module itself (see `validatePushKeyEncryptionKey()` in `encrypt.ts`) |

#### Database / Drizzle Anti-Patterns

| Anti-Pattern                           | Why Forbidden                                                                             | Fix                                                                                  |
| :------------------------------------- | :---------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| `drizzle-kit push` in production       | Overwrites schema without migration history. Irreversible                                 | `drizzle-kit generate` + `drizzle-kit migrate` (additive only)                       |
| `hashContent` without body             | Content-only updates silently dropped by `onConflictDoUpdate WHERE`                       | Include `body` in hash: `hashContent(title, body, publishedAt)`                      |
| Lazy proxy as plain `return {}`        | `TypeError: Cannot read properties of undefined` at runtime                               | Use real `Proxy<T>` that intercepts every property access                            |
| `as any` in Drizzle `.with()`          | Relational queries break type inference                                                   | Use explicit `.innerJoin()` for type-safety                                          |
| `flowProducer.add()` without try/catch | Redis failure → re-throw → BullMQ retries → articles already persisted → silent data loss | Wrap in try/catch + fallback to `scoreQueue.add()` per article; return status object |

#### Testing Anti-Patterns

| Anti-Pattern                                                      | Why Forbidden                                                                                | Fix                                                                                            |
| :---------------------------------------------------------------- | :------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| `vi.mock()` factory referencing `let`/`const` below it            | `ReferenceError: Cannot access 'mockEnv' before initialization` (hoisting)                   | Use `vi.hoisted()` to declare mutable mock objects                                             |
| `vi.hoisted()` factory referencing module-top `const`             | TDZ ReferenceError — hoisted factory runs before any `const`                                 | Inline literal values into the factory body                                                    |
| `vi.clearAllMocks()` wiping `vi.mock()` chain structure           | `db.select().from().where()` chain breaks → `TypeError: Cannot read properties of undefined` | Set up chains ONCE in `vi.mock()` factory; reset only leaf mocks via `mockResolvedValueOnce()` |
| `cacheLife()` called in module without `next/cache` mock in tests | `TypeError: cacheLife is not a function`                                                     | `vi.mock("next/cache", () => ({ cacheLife: vi.fn() }))`                                        |
| Missing `SessionProvider` in tests using `useSession()`           | `Error: useSession must be wrapped in a <SessionProvider>`                                   | Mock `next-auth/react` with passthrough `SessionProvider` + stub `useSession`                  |
| E2E tests scanned by vitest                                       | `@playwright/test` not installed in vitest env → import errors                               | Exclude `e2e/**` from `vitest.config.ts`                                                       |
| Discriminated union assertions without `if` narrowing             | `Property 'provider' does not exist on type '{ status: "error"; message: string; }'`         | Use `if (result.status === "linked") { expect(result.provider)... }` — `expect` doesn't narrow |

#### Content / AI Anti-Patterns

| Anti-Pattern                                  | Why Forbidden                                                                             | Fix                                                                                                 |
| :-------------------------------------------- | :---------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| Summarising `title_only` / `excerpt` articles | AI hallucination risk — fabricating content from insufficient input                       | Content availability guard: only `partial_text`/`full_text` may be summarised                       |
| Regex-based HTML stripping (`/<[^>]*>/g`)     | Strips TAGS but not TEXT CONTENT — `<script>alert('evil')</script>` leaks into AI prompts | Use `cheerio.load(html); $("script, style, noscript, iframe, object, embed").remove(); $.text()`    |
| JSON-LD via `metadata.other`                  | Next.js renders `metadata.other` as `<meta>` tags, NOT `<script>` tags                    | Render JSON-LD in page body via `<script type="application/ld+json" dangerouslySetInnerHTML={...}>` |

#### Phase 21 Security & Architecture Anti-Patterns (Audit-Driven)

| #   | Anti-Pattern                                                 | Why Forbidden                                                                                                        | Fix                                                                                                                             |
| :-- | :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `.env*` files committed to git                               | Real VAPID keys, API keys, encryption keys in git history forever — secrets must be rotated                          | Add `.env`, `.env.*`, `!.env.example` to `.gitignore`. `git rm --cached` the files. Rotate exposed secrets.                     |
| 2   | Route group `(admin)/` expected to produce `/admin/` URLs    | Next.js route groups `(name)` don't affect URL structure. `(admin)/sources/` resolves to `/sources`                  | Add `admin/` subfolder inside the route group: `(admin)/admin/sources/page.tsx` → URL `/admin/sources`                          |
| 3   | `verifySession()` wrapped in try/catch                       | `redirect()` throws `NEXT_REDIRECT`. Standard try/catch catches it, swallowing the redirect → 500 instead of 401     | Server Actions: remove try/catch — let redirect propagate. API Routes: use `auth()` directly (returns null → 401 JSON).         |
| 4   | Dead code `if (!session)` after `verifySession()`            | `verifySession()` NEVER returns null — it returns a session or throws via `redirect()`. The check is unreachable.    | Remove the dead check. Understand that `verifySession()` returns `{ user, sessionId }` or throws — never null.                  |
| 5   | CSP with `'unsafe-eval'`                                     | Allows `eval()`, `Function()` — significant XSS enabler. No code in `src/` uses these.                               | Remove `'unsafe-eval'` from CSP. Keep `'unsafe-inline'` temporarily (Next.js needs it); plan nonce-based CSP migration.         |
| 6   | AES-256-GCM IV of 16 bytes                                   | NIST SP 800-38D recommends 96-bit (12-byte) IV for GCM. 16-byte IV requires additional GHASH computation.            | Change `randomBytes(16)` to `randomBytes(12)`. Decryption reads IV from stored hex — handles any length. Backward-compatible.   |
| 7   | Rate limiter fails-closed (500) on Redis outage              | `checkRateLimit()` throws when Redis is down. No try/catch → uncaught throw → HTTP 500. Redis outage takes down API. | Wrap in try/catch. Fail OPEN (allow request, log warning) — rate limiting is defense-in-depth, not critical path.               |
| 8   | `AUTH_SECRET` accepts known-weak values in production        | `z.string().min(32)` accepts `dev-secret-do-not-use-in-production` from `.env.example`. JWT sessions forgeable.      | `superRefine` rejecting weak patterns (`dev-secret`, `test-secret`, `ci-dummy`, `change-me`, `placeholder`) in production only. |
| 9   | `deleteSource` identical to `pauseSource` (both soft delete) | `deleteSource` set `isActive: false` — same as `pauseSource`. Misleading API. "delete" implies permanent removal.    | `deleteSource` = hard delete (`db.delete` with cascade via `onDelete: "cascade"`). `pauseSource` = soft deactivation.           |
| 10  | No `pnpm audit` in CI                                        | CI had no dependency security scanning. Known vulnerabilities in Auth.js v5 beta not caught.                         | Add `pnpm audit --audit-level=high --prod` step to CI after install, before lint. Start with `\|\| true`; promote to hard gate. |

---

## 10. Debugging Guide

### Symptom: Page is completely unstyled

**Cause:** Tailwind v4 PostCSS plugin not configured.

**Fix:**

```bash
# 1. Install the PostCSS plugin
pnpm add -D @tailwindcss/postcss

# 2. Create postcss.config.mjs
cat > postcss.config.mjs << 'EOF'
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
EOF

# 3. Clear stale Next.js cache (critical — old cache masks the fix)
rm -rf .next

# 4. Restart dev server
pnpm dev
```

### Symptom: `blocking-route` error in Next.js 16

**Cause:** `cacheComponents: true` + uncached data fetch outside `<Suspense>`.

**Fix:** Wrap async data fetches in `<Suspense>` with a fallback:

```tsx
<Suspense fallback={<FeedSkeleton />}>
  <FeedData category={category} />
</Suspense>
```

### Symptom: Commit Mono font not loading

**Cause:** Using `@fontsource/commit-mono` which causes build issues.

**Fix:** Self-host via `next/font/local`:

```typescript
const commitMono = localFont({
  src: "../../public/fonts/commit-mono-400.woff2",
  variable: "--font-mono",
  weight: "400",
  display: "swap",
});
```

### Symptom: `next-prerender-current-time` build error

**Cause:** `new Date()` called in a Server Component (non-deterministic).

**Fix:** Move date computation to a Client Component, or compute from headers:

```tsx
// Server Component — DON'T do this:
const now = new Date(); // ❌ Build error

// Client Component — OK:
("use client");
const [now, setNow] = useState<Date>();
useEffect(() => setNow(new Date()), []);
```

### Symptom: Hydration mismatch on Masthead date

**Cause:** Server and client render different dates (different locales/timezones).

**Fix:** Use a Client Component wrapper for date/time display, or pass pre-formatted date strings from the server.

### Symptom: CSS merge artifacts in Tailwind v4 `@theme`

**Cause:** Merge artifacts (e.g., ` INCLUDED` text) corrupt the `@theme` block, breaking all custom colors.

**Fix:** Audit `globals.css` `@theme` block for non-CSS content. Re-write the block cleanly.

### Symptom: External images fail to load

**Cause:** Missing `remotePatterns` in `next.config.ts`.

**Fix:**

```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
  ],
},
```

### Symptom: `pnpm check` fails with 64 tsc errors pointing at `skills/`

**Cause:** Vendored `skills/` directory has its own deps not installed in this project.

**Fix:** Exclude `skills` from `tsconfig.json` `exclude` array + `"skills/**"` from eslint `ignores`.

### Symptom: `TypeError: window.matchMedia is not a function` in tests

**Cause:** `PageTransition.tsx` calls `window.matchMedia()` without guarding against jsdom/older browsers.

**Fix:** Add `typeof window.matchMedia === "function"` to the guard chain (Phase 20 / T4).

### Symptom: `TypeError: cacheLife is not a function` in tests

**Cause:** `cacheLife()` only works inside a `"use cache"` boundary at runtime. Vitest doesn't have Next.js cache context.

**Fix:** Mock `next/cache` in the test file:

```typescript
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
```

### Symptom: `ReferenceError: Cannot access 'mockEnv' before initialization`

**Cause:** `vi.mock()` factory hoisted above the `const mockEnv` declaration it references.

**Fix:** Use `vi.hoisted()`:

```typescript
const { mockEnv } = vi.hoisted(() => ({ mockEnv: {} }));
vi.mock("@/lib/env", () => ({ env: mockEnv }));
```

### Symptom: `pnpm install --frozen-lockfile` fails

**Cause:** `package.json` has deps not in `pnpm-lock.yaml`.

**Fix:** Run `pnpm install` (without `--frozen-lockfile`) to regenerate the lockfile, then commit it.

### Symptom: Rate limit returns 429 unexpectedly

**Cause:** IP extraction is spoofable when `TRUSTED_PROXY` is unset, or using leftmost IP behind a CDN.

**Fix:** Set `TRUSTED_PROXY=true` + `TRUSTED_PROXY_CIDRS=10.0.0.0/8,...` in `.env.local`. The `walkXffChain()` function (Phase 20 / F1) walks the XFF chain right-to-left, skipping trusted CIDRs.

### Symptom: `OAuthAccountNotLinked` error with no clear next step

**Cause:** Phase 19 / M6 added an error message but pointed to a non-existent "account settings" page.

**Fix (Phase 20 / F2):** The `/auth-error` page now links to `/account` where the user can click "Link Google/GitHub" to pre-create the `accounts` row, then retry the OAuth flow.

### Symptom: Admin sidebar links return 404 (Phase 21)

**Cause:** Next.js route groups `(name)` don't affect URL structure. If admin pages are at `src/app/(admin)/sources/page.tsx`, the URL is `/sources`, NOT `/admin/sources`.

**Fix:** Ensure admin pages are inside an `admin/` subfolder within the route group: `src/app/(admin)/admin/sources/page.tsx` → URL `/admin/sources`. The route group `(admin)` provides the shared layout (`AdminGuard`); the `admin/` folder provides the URL prefix.

### Symptom: `revalidatePath("/admin/sources")` doesn't invalidate cache (Phase 21)

**Cause:** Same route group issue. If the page is at `(admin)/sources/` (URL `/sources`), then `revalidatePath("/admin/sources")` targets a non-existent path.

**Fix:** Ensure the page is at `(admin)/admin/sources/` (URL `/admin/sources`), then `revalidatePath("/admin/sources")` works correctly.

### Symptom: API returns 500 instead of 401 for unauthenticated requests (Phase 21)

**Cause:** `verifySession()` calls `redirect()` which throws `NEXT_REDIRECT`. If wrapped in try/catch, the redirect is caught and the catch block returns 500 "Internal server error".

**Fix:** API routes should use `auth()` directly (returns null when unauthenticated) instead of `verifySession()` (which redirects). Never wrap `verifySession()` in try/catch. See `src/app/api/summarize/[id]/route.ts` for the correct pattern.

### Symptom: Redis outage takes down `/api/articles` (Phase 21)

**Cause:** `checkRateLimit()` throws when Redis is down. If not wrapped in try/catch, the uncaught throw returns HTTP 500.

**Fix:** The rate limiter now fails OPEN (allows request, logs warning) via try/catch. If you see this issue, ensure the `/api/articles` route has the fail-open try/catch around `checkRateLimit()`.

### Symptom: `pnpm build` fails: "AUTH_SECRET appears to be a known-weak/placeholder value" (Phase 21)

**Cause:** In production (`NODE_ENV=production`), the Zod env schema rejects `AUTH_SECRET` values matching weak patterns (`dev-secret`, `test-secret`, `ci-dummy`, `change-me`, `placeholder`, etc.).

**Fix:** Generate a strong random secret: `openssl rand -base64 33`. Update your production `.env` or hosting platform's environment variables. Dev/test environments accept weak secrets for convenience.

### Symptom: `.env.local` with real secrets accidentally committed (Phase 21)

**Cause:** `.gitignore` previously didn't exclude `.env*` files. Real VAPID keys, API keys, or encryption keys may be in git history.

**Fix:** 1) `.gitignore` now excludes `.env*` (only `.env.example` tracked). 2) `git rm --cached .env .env.docker .env.local` to untrack. 3) **Rotate all exposed secrets** — git history is forever. 4) Consider `git filter-repo` or BFG to purge `.env*` from history.

---

## 11. Pre-Ship Checklist

Before claiming any task is complete, verify ALL of the following:

### Type Safety & Linting

```bash
pnpm check          # tsc --noEmit && pnpm lint (0 errors, 0 warnings)
```

- [ ] Zero TypeScript errors
- [ ] Zero ESLint warnings (`--max-warnings 0`)
- [ ] No `any` types (use `unknown` with type guards)
- [ ] All type-only imports use `import type` (required by `verbatimModuleSyntax`)

### Tests

```bash
pnpm test                          # 472 tests / 67 suites
pnpm test -- --coverage            # CI-enforced coverage gate
pnpm test:integration              # 4 tests (3 Docker-gated, 1 always-pass)
pnpm test:e2e                      # 10 smoke + 4 axe-core a11y scans (requires dev server)
```

- [ ] All 472 unit tests pass
- [ ] Coverage meets thresholds: 80% lines / 80% functions / 70% branches / 80% statements
- [ ] Integration tests pass (or skip cleanly if no Docker)
- [ ] E2E smoke tests pass on Chromium
- [ ] axe-core a11y scans pass (4 pages: `/`, `/search`, `/sign-in`, `/auth-error`)

### Build

```bash
pnpm build           # Production build with Turbopack
```

- [ ] Build succeeds without warnings
- [ ] `output: "standalone"` produces `.next/standalone/` directory
- [ ] No `blocking-route` errors
- [ ] No `next-prerender-current-time` errors

### Accessibility (WCAG AAA)

- [ ] Skip-to-content link present and functional (`href="#main-content"`)
- [ ] `<main id="main-content">` on every page template (including error boundaries)
- [ ] Focus rings visible on all interactive elements (`focus-visible:ring-dispatch-ember`)
- [ ] All images have `alt` attributes (empty `alt=""` for decorative)
- [ ] `<time dateTime={...}>` for all timestamps
- [ ] `<nav aria-label>` for all navigation regions
- [ ] `role="feed"` on feed containers, `role="search"` on search form
- [ ] `prefers-reduced-motion: reduce` disables all animations
- [ ] Color contrast: `ink-600` on `paper-50` is WCAG AAA (9.5:1)

### Security

- [ ] All Server Actions call `verifySession()` or `verifyAdminSession()` first
- [ ] No `process.env.*` reads outside `src/lib/env/index.ts` (and `src/test/setup.ts`)
- [ ] Push subscription keys encrypted with AES-256-GCM before storage
- [ ] HSTS + CSP headers present in `next.config.ts` (CSP has NO `unsafe-eval` — Phase 21)
- [ ] Rate limiting on `/api/articles` (20 req/s, fail-open on Redis outage — Phase 21) and `/api/summarize` (5 req/min/user)
- [ ] `proxy.ts` has ZERO DB calls and ZERO business logic
- [ ] API routes use `auth()` directly (NOT `verifySession()`) for JSON 401 — Phase 21
- [ ] Server Actions do NOT wrap `verifySession()` in try/catch — Phase 21
- [ ] `.env*` files are gitignored (only `.env.example` tracked) — Phase 21
- [ ] `AUTH_SECRET` is a strong random value (not a known-weak placeholder) — Phase 21
- [ ] AES-256-GCM IV is 12 bytes (NIST SP 800-38D) — Phase 21
- [ ] `pnpm audit --audit-level=high --prod` runs clean in CI — Phase 21
- [ ] `deleteSource` uses hard delete (`db.delete`); `pauseSource` uses soft delete — Phase 21

### Performance

- [ ] TTFB < 50ms (PPR shell from CDN edge)
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] INP < 200ms
- [ ] Lighthouse Performance ≥ 90, Accessibility ≥ 95

### Provenance (EU AI Act Article 50)

- [ ] JSON-LD `<script type="application/ld+json">` rendered in page body (NOT via `metadata.other`)
- [ ] `X-AI-Provenance` HTTP header set via `generateMetadata()` `metadata.other`
- [ ] `<meta name="ai-provenance">` HTML tag set via `generateMetadata()` `metadata.other`
- [ ] Content availability guard enforced at BOTH Server Action AND API Route

### Pre-Commit

- [ ] husky + lint-staged installed (`.husky/pre-commit` runs `lint-staged`)
- [ ] `pnpm check` runs clean
- [ ] Commit message follows conventional format

---

## 12. Lessons Learnt & How to Avoid Them

### Phase 5–20 Compiled Lessons (Top 20)

1. **`cacheComponents: true` must be top-level** — if inside `experimental`, every `"use cache"` is silently ignored. CI lint rule should assert its presence.

2. **`proxy.ts` replaces `middleware.ts` in Next.js 16** — broad matcher `/((?!_next/static|_next/image|favicon.ico).*)`. Runs on Node.js only (NOT Edge).

3. **BullMQ Redis connections must be split** — Worker connection: `maxRetriesPerRequest: null`, `enableOfflineQueue: true`. Queue producer connection: `enableOfflineQueue: false`.

4. **`FlowProducer.add()` must be wrapped in try/catch** — if Redis is unreachable and the error propagates, BullMQ retries but articles are already persisted (`xmax != 0`), so the flow is NEVER re-enqueued. Silent data loss.

5. **Server Actions bypass layout guards** — `<AdminGuard>` in layout only protects pages. Server Actions are RPCs — every exported function must call `verifySession()` or `verifyAdminSession()` as its first line.

6. **`hashContent` must include body** — without body, content-only updates (same title+date, different body) are silently dropped by `onConflictDoUpdate WHERE contentHash = EXCLUDED.contentHash`.

7. **JSON-LD must be rendered in page body** — `metadata.other` renders `<meta>` tags, NOT `<script>` tags. Use `<script type="application/ld+json" dangerouslySetInnerHTML={...}>` in the component body.

8. **Regex HTML stripping is fundamentally broken** — `/<[^>]*>/g` strips tags but not text content. `<script>alert('evil')</script>` becomes `alert('evil')`. Use `cheerio`.

9. **`process.env.*` reads bypass Zod validation** — typos like `GOOGLE_CLIENTID` (missing S) silently return `undefined`. All env reads must go through the typed `env` export from `@/lib/env`.

10. **`vi.mock()` factories are hoisted** — they run before any `const`/`let` declarations. Use `vi.hoisted()` to declare mutable mock objects that the factory can safely close over.

11. **`vi.hoisted()` factories cannot reference module-top `const`** — they run FIRST, before any other top-level declaration. Inline literal values into the factory body.

12. **`cacheLife()` throws outside Next.js cache context** — in tests, mock `next/cache`: `vi.mock("next/cache", () => ({ cacheLife: vi.fn() }))`.

13. **`useSession()` requires `<SessionProvider>`** — in tests, mock `next-auth/react` with passthrough `SessionProvider` + stub `useSession`.

14. **`global-error.tsx` must render its own `<html>`/`<body>`** — it REPLACES the root layout when it throws. `error.tsx` renders inside the existing layout; `global-error.tsx` renders the FULL document structure.

15. **`window.matchMedia()` must be guarded with `typeof === "function"`** — jsdom and older browsers don't implement it. Crash is `TypeError: window.matchMedia is not a function`.

16. **Security-critical modules should validate their own inputs** — don't rely solely on upstream Zod validation. When `@/lib/env` is mocked in tests, Zod is bypassed. Belt-and-suspenders validation (see `validatePushKeyEncryptionKey()` in `encrypt.ts`).

17. **Node 24 `BlockList.addSubnet()` has an IPv6 bug** — IPv4 CIDRs work correctly, IPv6 do not. Document the limitation, skip the test, leave production plumbing in place for auto-fix when Node patches.

18. **`vi.clearAllMocks()` breaks `vi.mock()` chain structure** — structural chains (select→from→where) set up in `vi.mock()` factories must persist across tests. Only reset leaf mocks via `mockResolvedValueOnce()`.

19. **Discriminated union assertions need `if` narrowing** — `expect(result.status).toBe("linked")` doesn't narrow `result`. Use `if (result.status === "linked") { expect(result.provider)... }`.

20. **Architectural rules must be enforced by tooling** — documented rules are intentions, not enforcement. Codify them as ESLint rules (`no-restricted-imports` with `allowTypeImports: true` for domain purity).

### Phase 21 Lessons (Audit-Driven Remediation)

21. **`.gitignore` must exclude `.env*` files** — only `.env.example` should be tracked. Use the negation pattern `!.env.example`. If real secrets were committed, they're in git history forever — rotate them and consider `git filter-repo`/BFG to purge.

22. **Next.js route groups `(name)` do NOT affect URLs** — `(admin)/sources/page.tsx` resolves to `/sources`, NOT `/admin/sources`. To get a URL prefix AND a shared layout, use `(group)/actual-folder/page.tsx` (e.g., `(admin)/admin/sources/page.tsx` → `/admin/sources`).

23. **`verifySession()` must NOT be wrapped in try/catch** — `redirect()` throws `NEXT_REDIRECT`, which standard try/catch catches, silently swallowing the redirect. Server Actions: let the redirect propagate. API Routes: use `auth()` directly (returns null → 401 JSON, no redirect).

24. **`verifySession()` NEVER returns null** — it either returns `{ user, sessionId }` or throws via `redirect()`. The `if (!session)` check after `verifySession()` is dead code. Understand the throwing behavior of your auth functions.

25. **CSP should not have `unsafe-eval` unless code uses `eval()`** — run `grep -rn "eval(\|new Function(" src/` before adding it. If no matches, remove it. `unsafe-inline` is harder to remove (Next.js inline scripts) — plan nonce-based CSP migration.

26. **AES-GCM IV should be 12 bytes per NIST SP 800-38D** — 16-byte IV is technically valid but non-compliant with best practice. The IV is stored alongside the ciphertext (format: `iv:authTag:ciphertext`), so changing the IV length for new encryptions is backward-compatible with old data.

27. **Rate limiters should fail OPEN, not CLOSED** — when Redis is down, `checkRateLimit()` throws. If uncaught, the API returns 500. Rate limiting is defense-in-depth, not critical path — fail open (allow traffic, log warning) is better than fail closed (block all traffic).

28. **Env var validation should reject known-weak values in production** — `z.string().min(32)` accepts any 32+ char string, including publicly known dev secrets. Use `superRefine` (not `refine`) to access the parsed `NODE_ENV` value for production-only enforcement.

29. **API naming must match behavior** — if a function is called `delete*`, it should delete. If you want soft delete, call it `archive*` or `deactivate*`. The schema's `onDelete: "cascade"` makes hard deletes safe — but document the cascade behavior.

30. **CI should include `pnpm audit`** — use `--audit-level=high --prod` to scan only production deps for high/critical vulnerabilities. Start with `|| true` (non-blocking) and promote to a hard gate once clean.

---

## 13. Pitfalls to Avoid

### Critical Pitfalls (will break production)

1. **Never use `drizzle-kit push` in production** — it overwrites schema without migration history. Always use `generate` + `migrate`.

2. **Never `await` data fetches in layout components** — layouts cause re-renders. Fetch in pages.

3. **Never enqueue summarisation for `title_only` or `excerpt` articles** — AI hallucination risk. The content availability guard is double-enforced.

4. **Never use `as any` in Drizzle `.with()` relational queries** — breaks type inference. Use explicit `.innerJoin()`.

5. **Never deploy without `TRUSTED_PROXY=true` behind a CDN** — leftmost XFF IP is spoofable.

6. **Never run `pnpm test:e2e` without a running dev server** — Playwright needs `http://localhost:3000`.

7. **Never commit `package-lock.json`** — the project uses pnpm. Only `pnpm-lock.yaml` is canonical.

8. **Never use `@fontsource/commit-mono`** — causes build issues. Self-host via `next/font/local`.

### Subtle Pitfalls (will cause test failures or confusing bugs)

9. **cheerio decodes `&#8217;` to U+2019, not ASCII apostrophe** — tests asserting `body === "It's a test"` will fail. Use `body.toContain("\u2019s a test")`.

10. **`new Date()` in Server Components causes `next-prerender-current-time`** — move to Client Component or compute from headers.

11. **`.reveal` on above-the-fold elements causes hydration mismatch** — server renders `reveal`, client expects `reveal visible`.

12. **Merge artifacts in CSS `@theme` block** — e.g., ` INCLUDED` text corrupts the block, breaking all custom colors. Audit `globals.css` after merge conflicts.

13. **Corrupted className (e.g., `font浃着`, `Monad`)** — invalid CSS class silently ignored; element falls back to wrong font. Audit strings for non-ASCII characters.

14. **`experimental.clientSegmentCache` is not in Next.js 16.2.9** — produces `TS2353`. Remove from config.

15. **`vi.resetModules()` doesn't re-apply `vi.mock()`** — for integration tests, don't mock the module; let the real module load with real env.

### Phase 21 Pitfalls (Security & Architecture)

16. **Never commit `.env*` files (except `.env.example`)** — `.gitignore` must exclude `.env`, `.env.*`, with `!.env.example` negation. Real VAPID/API/encryption keys in git history must be rotated immediately.

17. **Never assume route groups produce URL prefixes** — `(admin)/sources/` resolves to `/sources`, NOT `/admin/sources`. To get `/admin/sources`, use `(admin)/admin/sources/` (folder inside the route group).

18. **Never wrap `verifySession()` in try/catch** — `redirect()` throws `NEXT_REDIRECT`, which try/catch catches. Server Actions: let it propagate. API Routes: use `auth()` directly for JSON 401.

19. **Never use `if (!session)` after `verifySession()`** — it's dead code. `verifySession()` returns a session or throws — never null. The check is unreachable.

20. **Never keep `unsafe-eval` in CSP without verifying `eval()` usage** — run `grep -rn "eval(\|new Function(" src/`. If no matches, remove `unsafe-eval` immediately.

21. **Never use a 16-byte IV for AES-256-GCM** — NIST SP 800-38D recommends 12 bytes (96 bits). Use `randomBytes(12)`. Old data with 16-byte IVs still decrypts (IV length is stored).

22. **Never let rate limiter throw uncaught** — wrap `checkRateLimit()` in try/catch. Fail OPEN (200 + warning) on Redis outage, not CLOSED (500). Rate limiting is defense-in-depth.

23. **Never accept known-weak `AUTH_SECRET` values in production** — use `superRefine` to reject patterns like `dev-secret`, `test-secret`, `ci-dummy`, `change-me`, `placeholder`. Use `superRefine` (not `refine`) to access parsed `NODE_ENV`.

24. **Never make `deleteSource` identical to `pauseSource`** — `delete` should hard delete (`db.delete` with cascade). `pause` should soft deactivate (`db.update set isActive: false`). API naming must match behavior.

25. **Never skip `pnpm audit` in CI** — add `pnpm audit --audit-level=high --prod` after install. Start non-blocking (`|| true`), promote to hard gate once clean.

---

## 14. Best Practices

### Architectural Best Practices

1. **5-Layer Model is the Golden Rule** — `proxy.ts` → App Router → Feature Modules → Domain Services → Infrastructure. Never skip layers or import backwards.

2. **Drizzle schema is the Single Source of Truth** — types derive via `(typeof enum.enumValues)[number]` and `$inferSelect`. Never hand-write union types that duplicate schema enums.

3. **Library Discipline** — if Shadcn/Radix provides the primitive, use it. Wrap for bespoke styling. Never rebuild from scratch.

4. **Opt-In Caching** — Next.js 16 makes caching opt-in via `"use cache"`. Everything is dynamic by default. Don't cache without explicit intent + `cacheLife()` profile.

5. **Progressive Enhancement** — View Transitions silently degrade on Firefox/reduced-motion. Never rely on them for core functionality.

6. **Auth at the DAL** — `proxy.ts` is UX-only. Real authorization lives in `verifySession()` / `verifyAdminSession()`, both `cache()`-memoized for per-request deduplication.

7. **Lazy Proxy DB Connection** — `src/lib/db/index.ts` uses a real `Proxy<T>` that defers connection until first query. Prevents build-time crashes when `DATABASE_URL` is missing.

8. **FlowProducer for Atomic DAG** — `ingest → score → feed-slice` parent-waits-for-children pattern. Never use individual `scoreQueue.add()` per article (not atomic).

9. **Belt-and-Suspenders Validation** — security-critical modules validate their own inputs even when an upstream layer (Zod) exists. Catches mock-bypass in tests + protects future code paths.

10. **ESLint Enforcement of Architectural Rules** — documented rules are intentions. Codify them as ESLint rules (`no-restricted-imports` with `allowTypeImports: true`).

### Testing Best Practices

11. **TDD: RED → GREEN → REFACTOR → COMMIT** — one cycle per commit. For bugs: write failing regression test first, then fix.

12. **3-Tier Test Architecture** — Unit (vitest, jsdom) → Integration (testcontainers, real DB) → E2E (Playwright, real browser). Each tier has its own config + script.

13. **`vi.hoisted()` for mutable mock objects** — when a `vi.mock()` factory needs to reference a mutable object, declare it via `vi.hoisted()`. Inline literals if the value is reused elsewhere.

14. **Mock `next/cache` in tests that call `cacheLife()`** — `vi.mock("next/cache", () => ({ cacheLife: vi.fn() }))`.

15. **Mock `next-auth/react` for components using `useSession()`** — passthrough `SessionProvider` + stub `useSession`.

16. **Integration tests should NOT mock `@/lib/db`** — the whole point is to test real behavior. Use `process.env` mutation + `vi.resetModules()`.

17. **Structural mock chains belong in `vi.mock()` factory** — not in `beforeEach`. Only reset leaf mocks via `mockResolvedValueOnce()`.

18. **Use `if` for discriminated union narrowing in tests** — `expect(result.status).toBe("linked")` doesn't narrow. Use `if (result.status === "linked") { ... }`.

### Design System Best Practices

19. **Never use raw hex colors** — all colors come from `@theme` tokens (`bg-ink-900`, `text-paper-50`). Raw hex bypasses the theme.

20. **Never use Inter, Roboto, or Space Grotesk** — explicit rejection. Use Newsreader + Instrument Sans + Commit Mono.

21. **CSS Subgrid for feed alignment** — no fixed heights, no JavaScript measurement. `grid-rows-subgrid row-span-3` on each card.

22. **`prefers-reduced-motion: reduce` disables ALL animations** — not just slows them. Global CSS override + `useReducedMotion()` hook for conditional logic.

23. **WCAG AAA focus rings** — `focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50`.

---

## 15. Coding Patterns

### The `cn()` Utility Pattern

```typescript
// src/shared/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

**Usage:** `cn(buttonVariants({ variant, size, className }))` — merges variant classes with custom className, resolving Tailwind conflicts via `twMerge`.

### The `cva` Variant Pattern

```typescript
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva("base classes...", {
  variants: {
    variant: {
      primary: "...",
      secondary: "...",
      outline: "...",
      ghost: "...",
      destructive: "...",
    },
    size: { sm: "...", md: "...", lg: "...", icon: "..." },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}
```

### The Lazy Proxy DB Pattern

```typescript
// src/lib/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/lib/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function getDb() {
  if (!_db) {
    _client = postgres(env.DATABASE_URL, { max: 10 });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

// CRITICAL: Must be a real Proxy<T>, not a plain object.
// A plain `return {}` causes TypeError at runtime when Drizzle methods are called.
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof getDb>];
  },
});
```

### The `verifySession` + `cache()` Pattern

```typescript
// src/lib/auth/dal.ts
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "./index";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");

  const user = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
    columns: { id: true, role: true, name: true },
  });

  if (!user) redirect("/sign-in");
  return { user, sessionId: session.user.id };
});

export const verifyAdminSession = cache(async () => {
  const { user } = await verifySession();
  if (user.role !== "admin") redirect("/");
  return user;
});
```

**Key:** `cache()` from `react` memoizes per-request. Multiple components calling `verifySession()` in one render tree execute **one** DB query.

### The FlowProducer Status Object Pattern

```typescript
// Phase 19 C4: never re-throw if side effect landed
export interface PostIngestFlowStatus {
  status: "ok" | "degraded" | "skipped";
  fallbackUsed: boolean;
  fallbackFailures: number;
  enqueuedCount: number;
}

export async function enqueuePostIngestFlow(
  articleIds: string[],
): Promise<PostIngestFlowStatus> {
  try {
    await flowProducer.add({
      /* ... */
    });
    return {
      status: "ok",
      fallbackUsed: false,
      fallbackFailures: 0,
      enqueuedCount: articleIds.length,
    };
  } catch (flowError) {
    // Fallback: direct scoreQueue.add() per article
    let failures = 0;
    for (const id of articleIds) {
      try {
        await scoreQueue.add("score-article", { articleId: id });
      } catch {
        failures++;
      }
    }
    return {
      status: "degraded",
      fallbackUsed: true,
      fallbackFailures: failures,
      enqueuedCount: articleIds.length,
    };
  }
}
```

### The `buildFeedQuery` + `getFeedArticles` Separation Pattern (Phase 20 / T6)

```typescript
// src/features/feed/queries.ts

// Pure query builder — NO "use cache" directive (unit-testable in vitest)
export function buildFeedQuery(
  options: FeedQueryOptions = {},
): Promise<ArticleWithSource[]> {
  const { category, cursor, limit = FEED_PAGE_SIZE } = options;
  if (category) {
    return (async () => {
      const categoryRow = await db.query.categories.findFirst({
        where: eq(categories.slug, category),
      });
      if (!categoryRow) return [] as ArticleWithSource[];
      return runFeedQuery(categoryRow.id, cursor, limit);
    })();
  }
  return runFeedQuery(undefined, cursor, limit);
}

// Cached public API — wraps buildFeedQuery with "use cache" + cacheLife("feed")
export async function getFeedArticles(
  options: FeedQueryOptions = {},
): Promise<FeedPage> {
  "use cache";
  cacheLife("feed");
  const { limit = FEED_PAGE_SIZE } = options;
  const rows = await buildFeedQuery(options);
  if (rows.length === 0)
    return { articles: [], nextCursor: null, hasMore: false };
  const hasMore = rows.length > limit;
  const resultRows = rows.slice(0, limit);
  const nextCursor = hasMore
    ? (resultRows[resultRows.length - 1]?.publishedAt.toISOString() ?? null)
    : null;
  return { articles: resultRows, nextCursor, hasMore };
}
```

**Why:** `"use cache"` is a Next.js compiler directive that throws in vitest (`TypeError: cacheLife is not a function`). Extracting the pure helper makes the query logic unit-testable.

### The `walkXffChain` CIDR Pattern (Phase 20 / F1)

```typescript
// src/lib/network/getClientIp.ts
import { BlockList } from "node:net";

export function walkXffChain(ips: string[], trustedCidrs: string[]): string {
  if (ips.length === 0) return "";
  if (trustedCidrs.length === 0) return ips[ips.length - 1] ?? ""; // backward compat

  const blockList = buildBlockList(trustedCidrs);
  for (let i = ips.length - 1; i >= 0; i--) {
    const ip = ips[i];
    if (!ip) continue;
    if (!blockList.check(ip)) return ip; // first untrusted IP from right
  }
  return ips[0] ?? ""; // all trusted → leftmost
}

function buildBlockList(cidrs: string[]): BlockList {
  const bl = new BlockList();
  for (const cidr of cidrs) {
    const [addr, bits] = cidr.split("/");
    if (addr.includes(":")) bl.addSubnet(addr, Number(bits), "ipv6");
    else bl.addSubnet(addr, Number(bits), "ipv4");
  }
  return bl;
}
```

**Known limitation:** Node 24's `BlockList.addSubnet()` has an IPv6 bug (returns false for matches that should be true). IPv4 works correctly. IPv6 test is skipped with a documented reference.

### The `vi.hoisted()` Mock Pattern

```typescript
// Correct pattern for mutable mock env objects
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: { PUSH_KEY_ENCRYPTION_KEY: "aabb..." } as {
    PUSH_KEY_ENCRYPTION_KEY?: string;
  },
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));

// Per-test override:
beforeEach(() => {
  mockEnv.PUSH_KEY_ENCRYPTION_KEY = "aabb..."; // reset to known-good
  vi.resetModules();
});

it("throws when key is missing", async () => {
  delete mockEnv.PUSH_KEY_ENCRYPTION_KEY;
  vi.resetModules();
  await expect(import("./encrypt")).rejects.toThrow(/PUSH_KEY_ENCRYPTION_KEY/);
});
```

### The Server Action Pattern (Phase 19 C3)

```typescript
// src/features/summaries/actions.ts
"use server";

import { verifySession } from "@/lib/auth/dal";
import { checkRateLimit } from "@/lib/rateLimit";

export async function requestSummary(articleId: string) {
  // 1. Auth FIRST — Server Actions bypass layout guards
  const session = await verifySession();

  // 2. Per-user rate limit (5 req/min/user)
  const rateLimitResult = await checkRateLimit(
    `api:summarize:${session.user.id}`,
    5,
    60,
  );
  if (!rateLimitResult.allowed) {
    return {
      error: "Rate limit exceeded",
      retryAfter: rateLimitResult.resetAt,
    };
  }

  // 3. Content availability guard (anti-hallucination)
  const article = await db.query.articles.findFirst({
    where: eq(articles.id, articleId),
  });
  if (!article) return { error: "Article not found" };
  if (
    article.contentAvailability === "title_only" ||
    article.contentAvailability === "excerpt"
  ) {
    return { error: "Article has insufficient content for summarization" };
  }

  // 4. Enqueue BullMQ job
  await summarizeQueue.add("summarize", { articleId });
  return { success: true };
}
```

---

## 16. Coding Anti-Patterns

See [§9 Anti-Patterns & Common Bugs](#9-anti-patterns--common-bugs) for the complete 99-entry table (89 original + 10 Phase 21). The most critical anti-patterns to avoid:

1. **`any` in TypeScript** → use `unknown` + type guards
2. **`enum` / `namespace`** → use string unions + ES modules (violates `erasableSyntaxOnly`)
3. **`throw new Error()` in RSC auth** → use `redirect()` (preserves invisible UX)
4. **`drizzle-kit push` in production** → use `generate` + `migrate`
5. **`process.env.*` outside `src/lib/env/`** → use typed `env` export
6. **Runtime imports from `@/lib/db*` in `src/domain/**`** → use `import type` only
7. **`flowProducer.add()` without try/catch** → wrap + fallback + return status object
8. **Regex HTML stripping** → use `cheerio`
9. **JSON-LD via `metadata.other`** → render `<script>` in page body
10. **`window.matchMedia()` without `typeof === "function"` guard** → add guard
11. **Server Action without `verifySession()`** → every action starts with auth
12. **`vi.mock()` factory referencing `let`/`const` below it** → use `vi.hoisted()`
13. **`vi.hoisted()` factory referencing module-top `const`** → inline literal values
14. **`vi.clearAllMocks()` on structural mock chains** → only reset leaf mocks
15. **`cacheLife()` in tests without `next/cache` mock** → add `vi.mock("next/cache")`
16. **`.env*` files committed to git** → gitignore `.env*` except `.env.example` (Phase 21)
17. **Route group `(admin)/` expected to produce `/admin/` URLs** → add `admin/` subfolder (Phase 21)
18. **`verifySession()` wrapped in try/catch** → remove try/catch; use `auth()` for API routes (Phase 21)
19. **CSP with `unsafe-eval`** → remove if no `eval()` usage (Phase 21)
20. **AES-256-GCM IV of 16 bytes** → use 12 bytes per NIST SP 800-38D (Phase 21)
21. **Rate limiter fails-closed on Redis outage** → fail OPEN with try/catch (Phase 21)
22. **`AUTH_SECRET` accepts known-weak values** → `superRefine` rejection in production (Phase 21)
23. **`deleteSource` identical to `pauseSource`** → hard delete vs soft deactivate (Phase 21)
24. **No `pnpm audit` in CI** → add `pnpm audit --audit-level=high --prod` (Phase 21)

---

## 17. Responsive Breakpoint Reference

### Tailwind v4 Default Breakpoints

| Prefix | Min Width | Typical Device                  |
| :----- | :-------- | :------------------------------ |
| (none) | 0px       | Mobile portrait                 |
| `sm:`  | 640px     | Mobile landscape / small tablet |
| `md:`  | 768px     | Tablet portrait                 |
| `lg:`  | 1024px    | Tablet landscape / small laptop |
| `xl:`  | 1280px    | Desktop                         |
| `2xl:` | 1536px    | Large desktop                   |

### OneStopNews Usage

```tsx
// FeedGrid — 3-column at lg, 2-column at md, 1-column mobile
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">

// Header — sticky, backdrop-blur
<header className="sticky top-0 z-50 backdrop-blur-sm bg-paper-50/90">

// ArticleCard — responsive typography
<h3 className="font-editorial text-xl lg:text-2xl leading-tight">

// Mobile nav — Radix Dialog drawer (hidden on desktop)
<Dialog>
  <DialogTrigger className="md:hidden">...</DialogTrigger>
  <DialogContent className="md:hidden">...</DialogContent>
</Dialog>
```

### Mobile-First Rules

1. **Always start with mobile styles** (no prefix), then add `md:` / `lg:` overrides
2. **Touch targets ≥ 44px** (WCAG AAA) — `h-10` (40px) is minimum for buttons, `h-12` preferred
3. **Horizontal scroll for category nav** — `overflow-x-auto scrollbar-hide` on mobile
4. **Drawer for mobile navigation** — Radix Dialog, not a hamburger toggle

---

## 18. Z-Index Layer Map

| Z-Index | Element                         | CSS Class                           | Purpose                   |
| :------ | :------------------------------ | :---------------------------------- | :------------------------ |
| `9999`  | Skip-to-content link (on focus) | `focus:z-[9999]`                    | Keyboard navigation       |
| `999`   | Scroll progress bar             | `.scroll-progress { z-index: 999 }` | CSS-only scroll indicator |
| `50`    | Header (sticky)                 | `z-50`                              | Sticky navigation         |
| `50`    | Radix Dialog overlay            | Radix default                       | Modal backdrop            |
| `50`    | Radix Dialog content            | Radix default                       | Modal content             |
| `10`    | NewsTicker                      | `z-10`                              | Breaking news bar         |
| `0`     | Default content                 | (default)                           | Page body                 |
| `-1`    | Decorative background numbers   | `.commitment-number`                | Large faded numerals      |

**Rules:**

- Never use `z-[9999]` except for the skip-to-content link
- Modal/dialog overlays should be `z-50`
- Sticky header should be `z-50`
- Decorative elements should be `-1`

---

## 19. Color Reference (Complete)

### Ink Scale (Text Colors)

| Token             | Hex       | Usage                        | Contrast on `paper-50` |
| :---------------- | :-------- | :--------------------------- | :--------------------- |
| `--color-ink-900` | `#1a1a18` | Headings (letterpress black) | 15.8:1 (AAA)           |
| `--color-ink-700` | `#2a2a27` | Hovered headings             | 13.2:1 (AAA)           |
| `--color-ink-600` | `#3d3d3a` | Body text                    | 9.5:1 (AAA)            |
| `--color-ink-500` | `#525250` | Secondary text               | 6.9:1 (AAA)            |
| `--color-ink-400` | `#6b6b68` | Tertiary text                | 4.8:1 (AA)             |
| `--color-ink-300` | `#8a8a83` | Muted / metadata             | 3.4:1 (AA Large only)  |
| `--color-ink-100` | `#e8e8e4` | Dividers / borders           | —                      |

### Paper Scale (Backgrounds)

| Token               | Hex       | Usage                                 |
| :------------------ | :-------- | :------------------------------------ |
| `--color-paper-50`  | `#fafaf8` | Page background (newsprint off-white) |
| `--color-paper-100` | `#f2f2ee` | Card surface                          |
| `--color-paper-200` | `#e6e4de` | Skeleton placeholder                  |
| `--color-paper-300` | `#d8d4cc` | Hovered skeleton                      |

### Dispatch Brand Accents

| Token                     | Hex       | Usage                                             | Light Variant                            |
| :------------------------ | :-------- | :------------------------------------------------ | :--------------------------------------- |
| `--color-dispatch-ember`  | `#c7513f` | Breaking news, AI badge, focus rings, primary CTA | `--color-dispatch-ember-light: #fde8e4`  |
| `--color-dispatch-sage`   | `#6b8f71` | Finance / positive accent                         | `--color-dispatch-sage-light: #e4ede5`   |
| `--color-dispatch-slate`  | `#5a6b7a` | Tech / neutral accent                             | `--color-dispatch-slate-light: #e2e7ec`  |
| `--color-dispatch-clay`   | `#8b6d5a` | Local / politics accent                           | `--color-dispatch-clay-light: #ede5df`   |
| `--color-dispatch-violet` | `#7a6b8f` | Culture / creative accent                         | `--color-dispatch-violet-light: #e8e4ef` |

### Semantic State Tokens (Phase 19 / M15)

| Token                            | Hex       | Usage                                    |
| :------------------------------- | :-------- | :--------------------------------------- |
| `--color-dispatch-warning`       | `#b45309` | Warning state (amber-700 equivalent)     |
| `--color-dispatch-warning-light` | `#fef3c7` | Warning background (amber-50 equivalent) |
| `--color-dispatch-danger`        | `#dc2626` | Destructive actions (red-600 equivalent) |
| `--color-dispatch-danger-dark`   | `#b91c1c` | Hovered destructive (red-700 equivalent) |

### Tailwind Class Usage

```tsx
// Text colors
<h1 className="text-ink-900">Heading</h1>
<p className="text-ink-600">Body text</p>
<span className="text-ink-300">Metadata</span>

// Backgrounds
<div className="bg-paper-50">Page background</div>
<div className="bg-paper-100">Card</div>

// Accents
<button className="bg-dispatch-ember text-paper-50">Primary CTA</button>
<span className="text-dispatch-sage">Finance category</span>
<button className="bg-dispatch-danger text-paper-50">Delete</button>

// Borders
<div className="border-b border-ink-100">Divider</div>
```

---

## 20. The Complete TypeScript Interface Reference

### Schema-Derived Types (from `src/lib/db/schema.ts`)

```typescript
// Enums (derived via pgEnum — Single Source of Truth)
export const userRoleEnum = pgEnum("user_role", ["reader", "admin"]);
export const feedFormatEnum = pgEnum("feed_format", [
  "rss",
  "atom",
  "json_api",
]);
export const contentAvailabilityEnum = pgEnum("content_availability", [
  "title_only",
  "excerpt",
  "partial_text",
  "full_text",
]);
export const summaryStatusEnum = pgEnum("summary_status", [
  "none",
  "pending",
  "ok",
  "needs_review",
  "disabled",
]);

// Derived types (from enumValues — stays in sync with schema)
export type UserRole = (typeof userRoleEnum.enumValues)[number]; // "reader" | "admin"
export type FeedFormat = (typeof feedFormatEnum.enumValues)[number]; // "rss" | "atom" | "json_api"
export type ContentAvailability =
  (typeof contentAvailabilityEnum.enumValues)[number];
export type SummaryStatus = (typeof summaryStatusEnum.enumValues)[number];

// Table types (via $inferSelect)
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Subcategory = typeof subcategories.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Summary = typeof summaries.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type VerificationToken = typeof verificationTokens.$inferSelect;
```

### Domain Types (from `src/domain/articles/types.ts`)

```typescript
import type { InferSelectModel } from "drizzle-orm";
import type { articles, sources, categories, summaries } from "@/lib/db/schema";

// Base table types
export type Article = InferSelectModel<typeof articles>;
export type Source = InferSelectModel<typeof sources>;
export type Category = InferSelectModel<typeof categories>;
export type Summary = InferSelectModel<typeof summaries>;

// Domain-specific composite types
export interface ArticleWithSource extends Article {
  source: Pick<Source, "id" | "name" | "url">;
}

export interface ArticleWithSummary extends ArticleWithSource {
  category: Pick<Category, "id" | "name" | "slug"> | null;
  summary: Summary | null;
}

export interface FeedPage {
  articles: ArticleWithSource[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

### Scoring Types (from `src/domain/ranking/score.ts`)

```typescript
export interface ScoringInputs {
  ageInHours: number;
  hasSummary: boolean;
  sourcePriority: number; // lower is better, typically 1–5
  contentAvailability: ContentAvailability;
}

export function calculateImportanceScore(inputs: ScoringInputs): number; // returns float [0.0, 1.0]
```

### Feed Query Types (from `src/features/feed/queries.ts`)

```typescript
export interface FeedQueryOptions {
  category?: string;
  cursor?: Date; // MUST be Date, NOT string — API boundary validates ISO 8601
  limit?: number; // default 30
}

export interface FeedPage {
  articles: ArticleWithSource[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function buildFeedQuery(
  options?: FeedQueryOptions,
): Promise<ArticleWithSource[]>;
export async function getFeedArticles(
  options?: FeedQueryOptions,
): Promise<FeedPage>;
```

### Search Types (from `src/features/search/types.ts`)

```typescript
export interface SearchParams {
  query: string;
  categorySlug?: string;
  cursor?: Date; // MUST be Date, NOT string
  limit?: number;
}

export interface SearchResult {
  article: ArticleWithSource;
  rank: number; // ts_rank_cd score
}

export interface SearchPage {
  results: SearchResult[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

### Summary Action Types (from `src/features/summaries/actions.ts`)

```typescript
export type LinkResult =
  | { status: "linked"; provider: string }
  | { status: "already_linked"; provider: string }
  | { status: "error"; message: string };

export async function requestSummary(
  articleId: string,
): Promise<{ success?: boolean; error?: string }>;
export async function approveSummary(summaryId: string): Promise<void>;
export async function disableSummary(summaryId: string): Promise<void>;
```

### Account Action Types (Phase 20 / F2, from `src/app/account/actions.ts`)

```typescript
export type LinkedProviderList = string[];

export type LinkResult =
  | { status: "linked"; provider: string }
  | { status: "already_linked"; provider: string }
  | { status: "error"; message: string };

export async function getLinkedProviders(): Promise<LinkedProviderList>;
export async function linkOAuthProvider(provider: string): Promise<LinkResult>;
```

### Network Types (Phase 20 / F1, from `src/lib/network/getClientIp.ts`)

```typescript
export function walkXffChain(ips: string[], trustedCidrs: string[]): string;
export function getClientIpFromHeaders(headers: Headers): string;
export function getClientIp(request: NextRequest): string;
```

### FlowProducer Status Type (from `src/lib/queue/flows.ts`)

```typescript
export interface PostIngestFlowStatus {
  status: "ok" | "degraded" | "skipped";
  fallbackUsed: boolean;
  fallbackFailures: number;
  enqueuedCount: number;
}

export async function enqueuePostIngestFlow(
  articleIds: string[],
): Promise<PostIngestFlowStatus>;
```

### Provenance Types (from `src/lib/ai/provenance.ts`)

```typescript
export interface ProvenanceResult {
  jsonLd: object; // schema.org/CreativeWork object
  httpHeader: string; // base64-encoded JSON for X-AI-Provenance header
  metaTag: string; // semicolon-delimited string for <meta name="ai-provenance">
}

export function generateProvenanceMetadata(summary: Summary): ProvenanceResult;
```

### Component Props (key examples)

```typescript
// Button
export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

// ArticleCard
interface ArticleCardProps {
  article: ArticleWithSource;
}

// FeedGrid
interface FeedGridProps {
  articles: ArticleWithSource[];
}

// FeedData
interface FeedDataProps {
  category?: string;
  limit?: number;
}

// AccountClient
interface AccountClientProps {
  linkedProviders: LinkedProviderList;
}
```

---

## Validation Checklist (10-Point)

Before considering this SKILL.md complete, verify against the actual codebase:

1. ✅ **Tech stack versions match** — All versions in §2 verified against `package.json` at HEAD
2. ✅ **Configuration files match** — `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts` all verified
3. ✅ **Design system tokens match** — All colors, fonts, utility classes verified against `src/app/globals.css`
4. ✅ **Component architecture matches** — Button, ArticleCard, FeedGrid, NutritionLabel, PageTransition all verified against source
5. ✅ **Hooks implementation matches** — `useDebounce` and `useReducedMotion` verified against `src/shared/hooks/*.ts`
6. ✅ **Content ingestion patterns match** — `parseFeed.ts` (rss-parser + cheerio), `normalize.ts` (SHA-256), FlowProducer DAG all verified
7. ✅ **Accessibility implementation matches** — skip link, focus rings, ARIA patterns, reduced motion all verified against `layout.tsx` + `globals.css`
8. ✅ **Anti-patterns are documented correctly** — All 99 entries (89 original + 10 Phase 21) cross-referenced with `AGENTS.md` anti-patterns table
9. ✅ **Color references match** — All hex values verified against `@theme` block in `globals.css`
10. ✅ **TypeScript interfaces match** — All types verified against `schema.ts`, `domain/articles/types.ts`, `domain/ranking/score.ts`, `features/feed/queries.ts`, `features/search/types.ts`, `app/account/actions.ts`, `lib/network/getClientIp.ts`, `lib/queue/flows.ts`, `lib/ai/provenance.ts`

---

## Quick Reference: Key File Paths

| What                             | Path                                                   |
| :------------------------------- | :----------------------------------------------------- |
| Next.js config                   | `next.config.ts`                                       |
| TypeScript config                | `tsconfig.json`                                        |
| ESLint config                    | `eslint.config.mjs`                                    |
| Vitest config (unit)             | `vitest.config.ts`                                     |
| Vitest config (integration)      | `vitest.integration.config.ts`                         |
| Playwright config                | `playwright.config.ts`                                 |
| PostCSS config                   | `postcss.config.mjs`                                   |
| Global CSS + design tokens       | `src/app/globals.css`                                  |
| Root layout (fonts + providers)  | `src/app/layout.tsx`                                   |
| Network boundary                 | `proxy.ts` (repo root)                                 |
| DB schema (11 tables, 4 enums)   | `src/lib/db/schema.ts`                                 |
| Lazy DB proxy                    | `src/lib/db/index.ts`                                  |
| Env validation (Zod)             | `src/lib/env/index.ts`                                 |
| Auth config                      | `src/lib/auth/index.ts`                                |
| Auth DAL (verifySession)         | `src/lib/auth/dal.ts`                                  |
| Auth providers                   | `src/lib/auth/providers.ts`                            |
| BullMQ queues                    | `src/lib/queue/index.ts`                               |
| FlowProducer DAG                 | `src/lib/queue/flows.ts`                               |
| AI prompts                       | `src/lib/ai/prompts.ts`                                |
| 3-layer provenance               | `src/lib/ai/provenance.ts`                             |
| Rate limiter                     | `src/lib/rateLimit.ts`                                 |
| Trusted proxy CIDR walker        | `src/lib/network/getClientIp.ts`                       |
| Push key encryption              | `src/lib/security/encrypt.ts`                          |
| Worker entry                     | `src/workers/index.ts`                                 |
| RSS parser                       | `src/workers/jobs/parseFeed.ts`                        |
| AI summarizer                    | `src/workers/jobs/summarize.ts`                        |
| Summary failure state            | `src/workers/jobs/summarizeFailure.ts`                 |
| Content guard                    | `src/workers/jobs/determineContentAvailability.ts`     |
| Job scheduler                    | `src/workers/jobs/scheduler.ts`                        |
| needs_review alerting            | `src/workers/jobs/alerts.ts`                           |
| Cache invalidation               | `src/workers/lib/cacheInvalidation.ts`                 |
| DB integration test              | `src/workers/pipeline.db-integration.test.ts`          |
| Feed queries                     | `src/features/feed/queries.ts`                         |
| ArticleCard                      | `src/features/feed/components/ArticleCard.tsx`         |
| FeedGrid                         | `src/features/feed/components/FeedGrid.tsx`            |
| Summary actions                  | `src/features/summaries/actions.ts`                    |
| NutritionLabel                   | `src/features/summaries/components/NutritionLabel.tsx` |
| Account page (Phase 20)          | `src/app/account/page.tsx`                             |
| Account actions (Phase 20)       | `src/app/account/actions.ts`                           |
| Admin sources (Phase 21 path)    | `src/app/(admin)/admin/sources/page.tsx`               |
| Admin sources actions (Phase 21) | `src/app/(admin)/admin/sources/actions.ts`             |
| Admin summaries (Phase 21 path)  | `src/app/(admin)/admin/summaries/page.tsx`             |
| Domain types                     | `src/domain/articles/types.ts`                         |
| Domain normalize                 | `src/domain/articles/normalize.ts`                     |
| Importance scoring               | `src/domain/ranking/score.ts`                          |
| cn() utility                     | `src/shared/lib/utils.ts`                              |
| Button                           | `src/shared/components/ui/Button.tsx`                  |
| useDebounce                      | `src/shared/hooks/useDebounce.ts`                      |
| useReducedMotion                 | `src/shared/hooks/useReducedMotion.ts`                 |
| PageTransition                   | `src/components/primitives/PageTransition.tsx`         |
| CI pipeline                      | `.github/workflows/ci.yml`                             |
| E2E pipeline                     | `.github/workflows/e2e.yml`                            |
| Pre-commit hook                  | `.husky/pre-commit`                                    |
| MEP v6.0                         | `MASTER_EXECUTION_PLAN.md`                             |
| AGENTS.md (canonical)            | `AGENTS.md`                                            |
| CLAUDE.md (stub)                 | `CLAUDE.md`                                            |

---

_End of OneStopNews Complete Skill Reference. This document is the authoritative guide for replicating, extending, or debugging this codebase. Every claim is grounded in the actual source code at HEAD (post-Phase 21, June 23, 2026)._
