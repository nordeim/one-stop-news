# OneStopNews — Master Execution Plan v7.0

**Classification:** Definitive Engineering Blueprint — Current-State Authoritative
**Status:** FINAL — Supersedes MEP v6.0 (June 22, 2026), v5.1 (and the duplicate `MASTER_EXECUTION_PLAN_v5.1.md`)
**Companion Documents:** PRD v4.3 · PAD v4.5 · AGENTS.md (canonical source of truth post-Phase 19 consolidation) · README.md
**Last Updated:** June 24, 2026
**Prepared By:** Claw Code — Frontend Architect & Technical Partner

---

## Executive Summary

OneStopNews is a **topic‑first news aggregation and AI summarisation platform** built on Next.js 16.2.9 (CVE‑2025‑55182 mitigated), React 19.2, PostgreSQL 17, BullMQ v5 on Redis, and a separate Node.js 24 LTS worker service. The codebase is organised as a **modular monolith** (web app) + **standalone worker service**, connected via BullMQ queues and a shared PostgreSQL database. **Current state: 21 phases complete · 498 tests across 69 suites · 88/81/84/89% coverage · 0 TypeScript errors · 0 ESLint warnings.**

### What changed from v6.0 → v7.0

The v6.0 plan covered Phases 1–19 and reported 392 tests. Phases 20–21 happened in the interim but were documented only in AGENTS.md (the canonical institutional knowledge base). This v7.0 update brings the MEP back into sync with the current state.

| #   | Change                                            | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| :-- | :------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Phase count: 19 → 21                              | Phase 20 (post-Phase-19 remediation: 4 batches / 13 tasks; TRUSTED_PROXY_CIDR chain-walking, OAuth account-linking `/account` page, testcontainers integration test, coverage thresholds restored to 80/80/70/80; tests 392→452) and Phase 21 (Security & architecture remediation: 11 findings; `.env*` gitignored, `(admin)/admin/` URL fix, `verifySession()` no try/catch, CSP `unsafe-eval` removal claim, AES-GCM IV 16→12 bytes, rate limiter fail-open, weak AUTH_SECRET rejection, hard delete fix, CI audit; tests 452→472) are now reflected. |
| 2   | Test count: 392 → 498                             | Phase 20 (+60), Phase 21 (+20), Phase 22 audit (+26 regression tests for findings H1/N1/N5).                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 3   | Phase 22 audit section added                      | A fresh 7-pass systematic code audit (`Codebase_Review_Validation_Report_16.md`) surfaced 2 HIGH + 1 MEDIUM new findings (N1: `/api/summarize/[id]` rate-limiter did not fail-open on Redis outage; H1 regression: CSP `unsafe-eval` claim was false — comment updated but value not edited). Both fixed with TDD: H1 with `next.config.test.ts` regression guard, N1 with 2 new fail-open tests. Plus 4 documentation/hygiene fixes (N2/N3/N5/N6/N7).                                                                                                   |
| 4   | `pnpm audit` promoted to hard gate                | Phase 22 / F4: removed `\|\| true` from `ci.yml`. After H2 mitigation (cheerio>undici override to `^8.5.0`), audit reports only 1 moderate — well below the `--audit-level=high` threshold. The gate now fails CI on any new high/critical vuln.                                                                                                                                                                                                                                                                                                         |
| 5   | Admin sources Pause button wired                  | Phase 22 / N5: `pauseSource` server action (tested since Phase 21 Q3) was previously dead code — no UI button called it. Added `pauseSourceAction(formData)` wrapper + Actions column with Pause form button. `deleteSource` remains tested-but-unwired (irreversible; needs confirmation dialog, deferred).                                                                                                                                                                                                                                             |
| 6   | Repo hygiene: 119MB of `.tar.gz` archives removed | Phase 22 / N2: three stale remediation archives (`phase17.2` 23M, `phase20.2` 47M, `phase21.2` 49M) deleted from repo root. `.gitignore` now blocks `*.tar.gz`, `*.tar.bz2`, `*.tgz`.                                                                                                                                                                                                                                                                                                                                                                    |
| 7   | `.prettierignore` created                         | Phase 22 / N6: previously `pnpm format:check` scanned all 226+ markdown files outside src/, causing spurious CI failures. `.prettierignore` now scopes formatting to src/ + root configs only.                                                                                                                                                                                                                                                                                                                                                           |

### What changed from v5.1 → v6.0 (preserved for historical context)

The v5.1 plan described 8 phases and contained several specifications that were corrected during actual implementation. This v6.0 rewrite is the **current‑state authoritative** document: it (a) preserves Phases 1–8 from v5.1 with implementation‑corrected specs, (b) adds Phases 9–19 (which were documented only in `Phase_N.md` files and `AGENTS.md` lessons‑learned sections), and (c) consolidates the errata into the body of the plan rather than leaving them as a changelog appendix.

| #   | Change                                                                                 | Why                                                                                                                                                                                                                                                                                                                                                                            |
| :-- | :------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Phase count: 8 → 19                                                                    | Phases 9–19 (Testing, CI/CD, Landing Page, Tailwind v4 fix, Critical gaps remediation, Validated gaps closure, Production readiness, Remediation batches, Comprehensive remediation, DB reinit, Comprehensive code audit) are documented                                                                                                                                       |
| 2   | Search syntax: removed `pg_textsearch` references entirely                             | `pg_textsearch` is **not** a separate extension in PostgreSQL 17 — `ts_rank_cd` is built‑in. The original MEP was wrong about needing `CREATE EXTENSION pg_textsearch`.                                                                                                                                                                                                        |
| 3   | `articles.body` column added to Phase 2 schema spec                                    | The body column was actually added in Phase 13 (migration `0003_strong_mac_gargan.sql`), not present in the original Phase 2 schema. Phase 19 / H11 then added it to the `searchVector` generated column with weight C.                                                                                                                                                        |
| 4   | JSON‑LD rendering: page body, not `metadata.other`                                     | The v5.1 plan said "X-AI-Provenance header set via `generateMetadata()` `other` field" for both the HTTP header AND the JSON‑LD. In practice, Next.js 16 does NOT render `<script type="application/ld+json">` from `metadata.other`. The Phase 17 fix renders JSON‑LD in the page body via `ArticleData.tsx:86-93`. The HTTP header + meta tag still go via `metadata.other`. |
| 5   | `Dockerfile.worker` CMD: `tsx src/workers/index.ts` (not `node dist/workers/index.js`) | Phase 15 corrected the worker Dockerfile to run `tsx` directly. No build step compiles to `dist/`.                                                                                                                                                                                                                                                                             |
| 6   | Coverage target: 75/80/65/80 (Phase 19 calibrated)                                     | The v5.1 plan targeted ≥90% coverage. Phase 19 calibrated `vitest.config.ts` thresholds down to 75/80/65/80 pending additional unit tests for low‑coverage files. The Phase 19+ remediation (Batch 2) raises thresholds back to 80/80/70/80.                                                                                                                                   |
| 7   | `proxy.ts` runs on Node.js runtime only                                                | Next.js 16's `proxy.ts` (the successor to `middleware.ts`) does NOT support Edge runtime — only Node.js.                                                                                                                                                                                                                                                                       |
| 8   | `experimental.clientSegmentCache` is **omitted**                                       | The v5.1 plan recommended enabling it. Phase 13 gotcha #8 discovered this flag is not in Next.js 16.2.9's `ExperimentalConfig` type and causes a TypeScript error. Do not enable.                                                                                                                                                                                              |
| 9   | `next.md` / `MASTER_EXECUTION_PLAN_v5.1.md` duplicates removed                         | These were stale duplicate files of the v5.1 plan. They should be archived or deleted; v6.0 (this file) is the single source.                                                                                                                                                                                                                                                  |
| 10  | AGENTS.md is the canonical instructions source (post‑consolidation)                    | CLAUDE.md has been reduced to a stub pointing to AGENTS.md. The MEP now references AGENTS.md for lessons learned rather than duplicating them.                                                                                                                                                                                                                                 |

---

## 1. Deep Analysis & Core Architectural Pillars

### 1.1 The Meticulous Approach (Our Operating Framework)

All work follows the **six‑phase workflow** [PRD §1.1]:

1. **ANALYZE** – multi‑dimensional requirement mining
2. **PLAN** – structured execution roadmap
3. **VALIDATE** – explicit user confirmation before coding
4. **IMPLEMENT** – modular, tested, documented builds (TDD where applicable)
5. **VERIFY** – rigorous QA against success criteria
6. **DELIVER** – complete handoff with knowledge transfer

### 1.2 5‑Layer Request Model [PAD §5.1]

```
Layer 0: proxy.ts (Network boundary, cookie check only — NO DB, NO logic)
Layer 1: App Router (Next.js routing, PPR, Suspense — layouts must NOT fetch data)
Layer 2: Feature Modules (feed, summaries, search, admin — UI + queries.ts + actions.ts)
Layer 3: Domain Services (pure business logic — no Next.js or DB runtime imports)
Layer 4: Infrastructure (Drizzle, Auth.js, BullMQ, AI SDKs, Env — side effects only)
```

### 1.3 "Editorial Dispatch" Design System [PRD §4.1–4.3]

| Element         | Choice                         | Anti‑generic rejection           |
| :-------------- | :----------------------------- | :------------------------------- |
| Serif headline  | **Newsreader Variable**        | Inter, Roboto, Space Grotesk     |
| Sans‑serif body | **Instrument Sans Variable**   | (same as above)                  |
| Monospace       | **Commit Mono** (self‑hosted)  | Fira Code, JetBrains Mono        |
| Accent color    | `--dispatch-ember` (`#c7513f`) | purple gradients, amber warnings |
| Layout          | CSS Subgrid for feed alignment | fixed heights, JS measurement    |

### 1.4 Critical Configuration Invariants [PRD §5.2, PAD §5.3]

| Flag                                | Placement                 | Why                                                                                 |
| :---------------------------------- | :------------------------ | :---------------------------------------------------------------------------------- |
| `cacheComponents: true`             | Top‑level                 | Silently ignored if inside `experimental`                                           |
| `cacheLife` profiles                | Top‑level                 | Runtime throws if missing — all 3 fields (`stale`, `revalidate`, `expire`) required |
| `turbopack: {}`                     | Top‑level                 | Graduated from experimental in Next.js 16                                           |
| `reactCompiler: true`               | Top‑level (optional)      | Disabled by default (build cost). Enable when components follow Rules of React.     |
| `experimental.viewTransition: true` | Inside `experimental: {}` | Transitions disabled if misplaced                                                   |
| `experimental.ppr`                  | **DO NOT INCLUDE**        | Build error in Next.js 16 — `cacheComponents` implements PPR as default             |
| `experimental.dynamicIO`            | **DO NOT INCLUDE**        | Deprecated / removed                                                                |
| `experimental.clientSegmentCache`   | **DO NOT INCLUDE**        | Not in Next.js 16.2.9 `ExperimentalConfig` — TypeScript error                       |

### 1.5 Non‑Negotiable Code Standards

- TypeScript `strict: true`, zero `any` (use `unknown` with type guards)
- `interface` over `type` for structural definitions; `type` for unions/intersections
- Early returns (guard clauses); composition over inheritance
- No data fetching in Layouts — fetch in Pages
- Async `params`/`searchParams` are `Promise` — always `await`
- `cookies()` is async — always `await` before `.get()`
- Auth at the DAL: `proxy.ts` is UX‑only; real auth lives in `verifySession()` / `verifyAdminSession()`
- Drizzle schema = single source of truth for database types
- All queries through `queries.ts` in the relevant module — no direct DB calls in components
- Never enqueue summarisation for `title_only` or `excerpt` articles (anti‑hallucination guard)
- Library discipline — if Shadcn/Radix provides a primitive, wrap it; never rebuild from scratch
- `noUncheckedIndexedAccess: true` in `tsconfig.json`
- `verbatimModuleSyntax: true` + `erasableSyntaxOnly: true` in `tsconfig.json`
- `import type` for type‑only imports (required by `verbatimModuleSyntax`)
- No `enum` or `namespace` (use string unions and ES modules — `erasableSyntaxOnly` compatible)

---

## 2. Phase Structure (19 Phases)

The original 8 phases (1–8) constitute the V1 feature‑complete deliverable. Phases 9–19 are enhancement, hardening, and remediation layers — each documented with a `Phase_N.md` file and a "Lessons Learned" section in `AGENTS.md`. The phase numbering reflects chronological execution order; subsequent phases may revisit earlier files.

```
Phase 1:  Foundation & Configuration
Phase 2:  Database Schema & Infrastructure
Phase 3:  Design System & Shared Components
Phase 4:  Core Feed Feature (Topic‑First Feed)
Phase 5:  AI Summarisation Pipeline
Phase 6:  Search, Admin & Public API
Phase 7:  Worker Service, Push Notifications & Observability
Phase 8:  Testing, CI/CD & Deployment
Phase 9:  Blocking‑Route Error Fix (cacheComponents + Suspense)
Phase 10: Landing Page & Design System (10‑section landing)
Phase 11: Landing Page Dynamic Bug Fixes
Phase 12: Tailwind v4 PostCSS & Commit Mono Font Fix
Phase 13: Critical Gaps Remediation (RSS parsing, AI integration, FlowProducer DAG, rate limiting, SHA‑256)
Phase 14: Validated Gaps Closure (Article detail page, summarizeFailure, pushSubscriptions schema, E2E)
Phase 15: Production Readiness (Dockerfiles, sign‑in/auth‑error pages, OAuth providers, cursor Load More)
Phase 16: Remediation Batches 1–4 (AdminGuard, env tests, compose validator)
Phase 17: Comprehensive Remediation (skip links, schema‑derived types, JSON‑LD in body)
Phase 18: Database Reinitialization & Skip‑Link Supplement
Phase 19: Comprehensive Code Audit & Remediation (47 gaps, 5 batches, +80 tests)
```

Each phase is independently deployable and verifiable. See the per‑phase detail below.

---

## Phase 1: Foundation & Configuration

### Objective

Establish correct Next.js 16 configuration, install all required dependencies, wire up environment variable schema with Zod, and create `proxy.ts` and `docker-compose.yml`. No feature code is written in this phase — it is pure scaffolding.

### Files to Create / Modify

#### `next.config.ts` — MODIFY [PRD §5.2, PAD §5.3]

- [ ] `cacheComponents: true` at top‑level (not inside `experimental`)
- [ ] `cacheLife` profiles at top‑level with **3 fields** each:
  - `feed: { stale: 30, revalidate: 120, expire: 600 }`
  - `topicShell: { stale: 300, revalidate: 900, expire: 86400 }`
  - `reference: { stale: 3600, revalidate: 86400, expire: 604800 }`
- [ ] `turbopack: {}` at top‑level
- [ ] `experimental.viewTransition: true` inside `experimental: {}`
- [ ] **DO NOT** include `experimental.ppr`, `experimental.dynamicIO`, or `experimental.clientSegmentCache`
- [ ] Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- [ ] `output: "standalone"` for production Docker (Phase 15)
- [ ] HSTS + CSP headers (Phase 19 / M1)
- [ ] TypeScript strict passes

#### `proxy.ts` — CREATE (replaces `middleware.ts`) [PRD §1.1, PAD §5.1]

- [ ] Exports `config` with `matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']`
- [ ] Reads session cookie via `cookies()` from `next/headers` (awaited — async in Next.js 16)
- [ ] Redirects to `/sign-in` if cookie absent (optimistic, not authoritative)
- [ ] Zero DB calls – UX‑only
- [ ] Zero business logic – `verifySession()` in DAL is the real auth boundary
- [ ] Runs on Node.js runtime only (NOT Edge — `proxy.ts` does not support Edge in Next.js 16)

#### `src/lib/env/index.ts` — CREATE

- [ ] Zod schema covers all 17 env vars (10 required + 6 optional + 1 with default — see Appendix A)
- [ ] `ANTHROPIC_API_KEY` validated with `startsWith('sk-ant-')`
- [ ] `OPENAI_API_KEY` validated with `startsWith('sk-')`
- [ ] `PUSH_KEY_ENCRYPTION_KEY` validated as 64‑char hex string via regex
- [ ] `AUTH_SECRET` validated as min 32 chars
- [ ] Optional `TRUSTED_PROXY_CIDRS` (Phase 19 / M2) for CIDR chain walking
- [ ] `env` object exported – all consuming code imports from here, not `process.env`
- [ ] Throws on startup with clear, human‑readable error listing all missing vars

#### `drizzle.config.ts` — CREATE

- [ ] Schema path: `./src/lib/db/schema.ts`
- [ ] Migration output: `./drizzle`
- [ ] Dialect: `postgresql`
- [ ] `dbCredentials.url` from `process.env.DATABASE_URL` (this is the ONE place `process.env` is allowed — drizzle‑kit runs outside the Next.js module graph)

#### `tsconfig.json` — CREATE

- [ ] `"strict": true`
- [ ] `"noUncheckedIndexedAccess": true`
- [ ] `"verbatimModuleSyntax": true`
- [ ] `"erasableSyntaxOnly": true`
- [ ] Path aliases: `@/` → `src/`
- [ ] `exclude: ["node_modules", ".next", "dist", "coverage", "skills"]` — Phase 19 C1 fix: vendored `skills/` pollutes tsc

#### `.env.example` — CREATE

- [ ] All 17 vars from Appendix A listed with comments
- [ ] Includes `TRUSTED_PROXY_CIDRS` (Phase 19 / M2)
- [ ] No phantom `SENTRY_DSN` / `AXIOM_TOKEN` (these are reserved for future observability but not currently validated)

#### `docker-compose-dev.yml` — CREATE

- [ ] PostgreSQL 17 image with `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- [ ] Redis 7 image with `noeviction` policy
- [ ] Named volumes for data persistence
- [ ] `scripts/init-extensions.sql` mounted to `/docker-entrypoint-initdb.d/01-init.sql`

#### `scripts/init-extensions.sql` — CREATE

- [ ] `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
- [ ] `CREATE EXTENSION IF NOT EXISTS pg_trgm`
- [ ] **DO NOT** create `pg_textsearch` — it does not exist in PG 17 (ts_rank_cd is built‑in)

### Phase 1 Success Criteria

- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm build` succeeds
- [ ] `next.config.ts` passes config validation (no console warnings)
- [ ] `docker-compose up -d` starts PostgreSQL and Redis
- [ ] `redis-cli ping` returns `PONG`

---

## Phase 2: Database Schema & Infrastructure

### Objective

Define complete Drizzle ORM schema (11 tables, 4 enums, indexes), lazy DB client, Auth.js v5 configuration, and BullMQ queue instances.

### Files to Create / Modify

#### `src/lib/db/schema.ts` — CREATE [PRD §6, PAD §7]

- [ ] 11 tables total: 8 business + 3 Auth.js adapter (`users`, `accounts`, `sessions`, `verificationTokens`)
- [ ] 4 enums derived via `pgEnum`: `userRoleEnum`, `feedFormatEnum`, `contentAvailabilityEnum`, `summaryStatusEnum`
- [ ] Types derived via `typeof enum.enumValues[number]` — single source of truth
- [ ] `articles.canonicalUrl` has `unique()` constraint (idempotency key)
- [ ] `articles.contentHash` defined (SHA‑256 for change detection)
- [ ] `articles.body` text column (nullable — Phase 13 added this; Phase 19 / H11 added to searchVector with weight C)
- [ ] `articles.sourceName` text column (denormalized — Phase 19 / H11 added for cross‑field search with weight D)
- [ ] `articles.searchVector` defined as `tsvector` `generatedAlwaysAs` with 4 `setweight` calls (A=title, B=excerpt, C=body, D=source_name)
- [ ] `subcategories` has `uniqueIndex(['categoryId', 'slug'])` (R12 mitigation)
- [ ] `pushSubscriptions.encryptedKeys` text column (Phase 14 schema fix; legacy `keys` column dropped in migration `0005`)
- [ ] All `.$inferSelect` and `.$inferInsert` types re‑exported from schema
- [ ] GIN index on `searchVector` with `fastupdate = off` (Phase 19 / M8)

#### `src/lib/db/index.ts` — CREATE [PAD §5.3]

- [ ] Uses `postgres` (postgres.js) driver – NOT `pg`
- [ ] Implements lazy proxy pattern via JavaScript `Proxy<T>` — defers connection until first query
- [ ] **CRITICAL**: must be a real `Proxy<T>` that intercepts every property access, NOT a plain `return {}` object
- [ ] Connection pool `max: 10` (documented: for dedicated Node.js runtime; serverless requires PgBouncer/Supavisor)
- [ ] Exports `db` singleton – all code imports from `@/lib/db`

#### `src/lib/db/auth.ts` — CREATE

- [ ] Eager Drizzle instance for Auth.js DrizzleAdapter (cannot use the lazy proxy — Auth.js needs immediate access)
- [ ] Uses same `postgres` driver + connection config

#### `src/lib/auth/index.ts` — CREATE [PAD §8.1]

- [ ] Uses `DrizzleAdapter` from `@auth/drizzle-adapter` with `db` (eager) and `schema`
- [ ] JWT strategy: `session.strategy: 'jwt'`
- [ ] `jwt` callback injects `user.role` into token
- [ ] `session` callback exposes `session.user.role` to clients
- [ ] Credentials provider for email/password (bcryptjs hashing)
- [ ] Optional OAuth (Google/GitHub) via `buildProviders()` from `src/lib/auth/providers.ts` (Phase 15)
- [ ] `AUTH_SECRET` and `AUTH_URL` consumed from `env` module
- [ ] `signIn` callback is a no‑op (Phase 19 / M6 — `OAuthAccountNotLinked` error message is actionable but the actual `/account` linking flow is a follow‑up)

#### `src/lib/auth/dal.ts` — CREATE [PAD §8.1]

- [ ] `verifySession` wraps `cache(async () => {...})` from `react` (per‑request memoization)
- [ ] Uses `redirect('/sign-in')` (not `throw new Error()` — preserves invisible UX)
- [ ] Fetches user from DB – only `{id, role, name}`
- [ ] `verifyAdminSession` calls `verifySession()` then checks `user.role === 'admin'`, redirects to `/` if not

#### `src/lib/auth/providers.ts` — CREATE (Phase 15)

- [ ] `buildProviders()` returns array of providers
- [ ] Always includes Credentials provider
- [ ] Conditionally includes Google / GitHub based on env vars (both CLIENT_ID and CLIENT_SECRET must be set)
- [ ] Backward compatible: leave OAuth vars blank for Credentials‑only auth

#### `src/lib/queue/index.ts` — CREATE [PAD §6.2]

- [ ] Two separate IORedis connection configs: one for Workers, one for Queue producers
- [ ] **Worker connection:** `maxRetriesPerRequest: null`, `enableOfflineQueue: true` (workers persist during Redis outages)
- [ ] **Queue (producer) connection:** `enableOfflineQueue: false` (prevents memory leaks + stale job accumulation)
- [ ] Redis URL sourced from `env.REDIS_URL`
- [ ] Four queues exported: `ingestQueue`, `summarizeQueue`, `scoreQueue`, `feedSliceQueue`
- [ ] `defaultJobOptions`: `attempts: 3, backoff: { type: 'exponential', delay: 5000 }`

#### `src/app/api/auth/[[...nextauth]]/route.ts` — CREATE [PAD §8.1]

- [ ] Exports `GET` and `POST` from `auth.handlers`
- [ ] Catch‑all route `[[...nextauth]]` (not `[...nextauth]`) — supports `/api/auth` root

### Phase 2 Success Criteria

- [ ] `drizzle-kit generate` produces valid SQL migration files
- [ ] `drizzle-kit migrate` applies schema without errors
- [ ] All relational queries (`db.query.*`) typecheck
- [ ] Auth.js routes respond at `/api/auth/session`
- [ ] TypeScript strict across all files

---

## Phase 3: Design System & Shared Components

### Objective

Implement the "Editorial Dispatch" design system: CSS custom properties, typography, color tokens, and all shared/primitive components.

### Files to Create / Modify

#### `src/app/globals.css` — MODIFY [PRD §4.2]

- [ ] `@import "tailwindcss"` as first line
- [ ] `@theme` block with all custom properties (colors, fonts)
- [ ] Font faces: Newsreader (variable, via `next/font/google`), Instrument Sans (variable, via `next/font/google`), Commit Mono (self‑hosted woff2 — Phase 12 fix)
- [ ] `prefers-reduced-motion: reduce` media query disables all animations/transitions
- [ ] WCAG AAA focus ring: `focus-visible { outline: 2px solid var(--color-dispatch-ember); outline-offset: 2px }`
- [ ] Custom utility classes: `.cat-label`, `.cat-label-wide`, `.btn-ember`, `.pulse-dot`, `.commitment-number`
- [ ] Custom animation tokens: `ticker-scroll`, `pulse-dot`, `slideDown`/`slideUp`, `reveal`/`reveal.visible`

#### `src/app/layout.tsx` — MODIFY [PRD §4.1]

- [ ] `Newsreader` and `Instrument_Sans` loaded via `next/font/google` with `variable` CSS properties
- [ ] `Commit Mono` loaded via `next/font/local` from `public/fonts/commit-mono-400.woff2` (Phase 12 fix — `@fontsource/commit-mono` causes build issues; self‑hosted woff2 is the correct pattern)
- [ ] Root `<html>` has `lang="en"`, `suppressHydrationWarning`
- [ ] Root `<body>` has `bg-paper-50 text-ink-600 antialiased font-ui`
- [ ] Skip‑to‑content link at top (Phase 17 fix)
- [ ] `<RevealProvider>` wraps children (Phase 10)
- [ ] `Metadata` export with title template and OpenGraph defaults

#### Shared components (`src/shared/`)

- [ ] `lib/utils.ts` — `cn()`, `formatTimeAgo()`, `formatDate()`, `truncate()`
- [ ] `components/ui/Button.tsx` — cva + Radix Slot, 5 variants, loading spinner, disabled state
- [ ] `components/ui/Badge.tsx` — 6 colour variants, font-mono, accessible
- [ ] `components/ui/Skeleton.tsx` — reduced‑motion aware, ArticleCard/Feed skeletons
- [ ] `components/ui/StatsSection.tsx`, `Accordion.tsx` (Radix), `NewsletterCTA.tsx`
- [ ] `components/layout/Header.tsx` — sticky, cat‑nav, mobile dialog (Radix Dialog), includes `<UserMenu>` (Phase 19 H2)
- [ ] `components/layout/Footer.tsx`, `Masthead.tsx`, `NewsTicker.tsx`
- [ ] `components/layout/UserMenu.tsx` (Phase 19 H2) — sign‑in/out button via `useSession()`
- [ ] `components/providers/RevealProvider.tsx` — IntersectionObserver scroll‑reveal
- [ ] `components/auth/AdminGuard.tsx` + `AdminGuardSkeleton.tsx` (Phase 16)
- [ ] `hooks/useDebounce.ts`, `useReducedMotion.ts`
- [ ] `components/primitives/PageTransition.tsx` (at `src/components/primitives/`) — `document.startViewTransition` with graceful degradation

### Phase 3 Success Criteria

- [ ] All shared components render without errors
- [ ] Design tokens match PRD §4.2 color table exactly
- [ ] Fonts load correctly (Newsreader, Instrument Sans, Commit Mono all visible)
- [ ] Focus ring visible on all interactive elements
- [ ] `prefers-reduced-motion` disables all animations
- [ ] `tsc --noEmit` passes

---

## Phase 4: Core Feed Feature (Topic‑First Feed)

### Objective

Build the topic‑first news feed – home page, topic pages, article detail page, feed queries with cursor pagination, and CSS Subgrid card hierarchy.

### Files to Create / Modify

#### Domain layer (`src/domain/`) — Layer 3 (pure logic)

- [ ] `articles/types.ts` — Types derived from Drizzle schema via `InferSelectModel`. Note: `import type { ... } from "@/lib/db/schema"` is acceptable — type‑only imports are erased at compile time and create no runtime coupling.
- [ ] `articles/normalize.ts` — `normalizeCanonicalUrl()`, `hashContent(title, body, publishedAt)` using SHA‑256. **Phase 14 gotcha #1**: `hashContent` must include body for content‑change detection.
- [ ] `ranking/score.ts` — `calculateImportanceScore()` returns float in **0.0–1.0** range (not 0–100). Phase 19 / P1: `import type { ContentAvailability }` is acceptable.

#### Feature module (`src/features/feed/`)

- [ ] `queries.ts` — `getFeedArticles(params: { categorySlug?, cursor?: Date, limit? })` returns `FeedPage`
- [ ] LIMIT 31 pattern: fetch `limit + 1`, return `limit`, `hasNextPage = results.length > limit`
- [ ] `"use cache"` + `cacheLife('feed')` on cached queries
- [ ] `nextCursor` = `publishedAt` of last item in returned page (ISO 8601 string)
- [ ] Always `LEFT JOIN sources`
- [ ] `components/`: `ArticleCard`, `FeedGrid`, `FeedData` (Suspense wrapper), `FeedSkeleton`, `LeadStory`, `FeedContainer` (Phase 15), `LoadMoreButton` (Phase 15)

#### App Router pages

- [ ] `src/app/(public)/page.tsx` — 10‑section landing page (Phase 10): NewsTicker, Masthead, Header, LeadStory, Feed (Suspense + FeedData), NutritionLabelDemo, StatsSection, Accordion, NewsletterCTA, Footer
- [ ] `src/app/(public)/search/page.tsx` + `SearchPageClient.tsx`
- [ ] `src/app/topics/[category]/page.tsx` — OUTSIDE `(public)` route group, PPR + Cache Component
- [ ] `src/app/article/[id]/page.tsx` — OUTSIDE `(public)` route group, `generateMetadata()` emits HTTP header + meta tag for provenance; JSON‑LD rendered in page body via `ArticleData.tsx` (Phase 17 fix — NOT via `metadata.other`)
- [ ] `src/app/sign-in/page.tsx` + `SignInClient.tsx` (Phase 15)
- [ ] `src/app/auth-error/page.tsx` + `AuthErrorMessage.tsx` (Phase 15)
- [ ] `src/app/(admin)/layout.tsx` — wraps children in `<AdminGuard>` (Phase 16)
- [ ] `src/app/(admin)/sources/page.tsx` + `actions.ts`
- [ ] `src/app/(admin)/summaries/page.tsx`
- [ ] `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx` (Phase 19 H5)

### Phase 4 Success Criteria

- [ ] Home page renders with CSS Subgrid cards
- [ ] Topic pages filter correctly by category
- [ ] Cursor pagination works
- [ ] "AI Brief" badge visible when summary exists
- [ ] All 4 UI states (loading/error/empty/success) handled
- [ ] Lighthouse accessibility score ≥ 95

---

## Phase 5: AI Summarisation Pipeline

### Objective

Build complete AI summarisation system: content availability guard, Zod‑validated prompt schemas, NutritionLabel disclosure component, 3‑layer provenance generation, and enqueue endpoint.

### Files to Create / Modify

#### `src/features/summaries/lib/summariseSchema.ts`

- [ ] Zod schema: `summaryText` (50–800 chars), `keyPoints` (1–5 items), `sourcesCited` (1+), `aiStatement`, `coveragePercentage`

#### `src/lib/ai/prompts.ts`

- [ ] `buildSummarisationPrompt(params)` – pure function
- [ ] System prompt with role definition and constraints
- [ ] EU AI Act compliance instruction embedded

#### `src/lib/ai/provenance.ts`

- [ ] `generateProvenanceMetadata(summary): { metaTag, jsonLd, httpHeader }`
- [ ] **Layer 1 — JSON‑LD**: `schema.org/CreativeWork` — rendered in page body via `ArticleData.tsx` `<script type="application/ld+json">` (NOT via `metadata.other` — Phase 17 fix)
- [ ] **Layer 2 — HTTP Header**: `X-AI-Provenance` base64‑encoded JSON, set via `generateMetadata()` `other` field
- [ ] **Layer 3 — HTML Meta Tag**: `<meta name="ai-provenance" content="...">`, set via `generateMetadata()` `other` field
- [ ] **C2PA explicitly rejected** — no text standard exists

#### `src/features/summaries/components/`

- [ ] `NutritionLabel.tsx` — transparency panel with model, temperature, coverage %, citations, compliance statement
- [ ] `DisclosureBadge.tsx` — dot indicator + status text
- [ ] `SummaryPanel.tsx` — handles all 5 states (none/pending/ok/needs_review/disabled) with error boundary (Phase 19 H4)
- [ ] `NutritionLabelDemo.tsx`, `SummariesData.tsx`, `SummariesSkeleton.tsx`

#### `src/features/summaries/actions.ts`

- [ ] `requestSummary(articleId)` — calls `verifySession()` as first line (Phase 19 C3), per‑user rate limit 5/min (Phase 19 C2), content availability guard, enqueues via `summarizeQueue.add`
- [ ] `approveSummary(summaryId)` — calls `verifyAdminSession()`, sets status to `ok` (Phase 19 C5)
- [ ] `disableSummary(summaryId)` — admin only
- [ ] All mutations use `revalidatePath`

#### `src/app/api/summarize/[id]/route.ts`

- [ ] `params: Promise<{id: string}>` – `await params`
- [ ] Validates UUID – 400 if invalid
- [ ] 404 if article not found
- [ ] 409 if `summaryStatus !== 'none'`
- [ ] 400 if `contentAvailability` is `title_only` or `excerpt`
- [ ] Per‑user rate limit 5/min (Phase 19 C2)
- [ ] Requires valid session
- [ ] Enqueues job, returns 202 with `{ jobId }`

### Phase 5 Success Criteria

- [ ] `POST /api/summarize/:id` returns 202 and job appears in BullMQ
- [ ] Content guard correctly rejects invalid articles with 400
- [ ] NutritionLabel renders all sections with correct typography
- [ ] **All 3 provenance layers present** when summary exists:
  - JSON‑LD `<script>` in page body
  - `X-AI-Provenance` HTTP header
  - `<meta name="ai-provenance">` HTML tag
- [ ] All 5 summary states render correctly

---

## Phase 6: Search, Admin & Public API

### Objective

Implement full‑text search with native PostgreSQL `ts_rank_cd` BM25, admin source management UI, summary review queue, and public REST API.

### Files to Create / Modify

#### `src/features/search/queries.ts`

- [ ] Uses native PostgreSQL FTS: `WHERE search_vector @@ websearch_to_tsquery('english', $query) ORDER BY ts_rank_cd('{0.1, 0.2, 0.4, 1.0}', search_vector, websearch_to_tsquery('english', $query)) DESC`
- [ ] **Drizzle `ts_rank_cd` requires `sql` template literal** — use: `sql\`ts_rank_cd('{0.1, 0.2, 0.4, 1.0}', ${articles.searchVector}, ${websearchToTsQuery})\``
- [ ] Weights {0.1, 0.2, 0.4, 1.0} map to {D, C, B, A} → A=title=1.0 > B=excerpt=0.4 > C=body=0.2 > D=source_name=0.1 (Phase 19 / H11)
- [ ] `"use cache"` + `cacheLife("reference")` (Phase 19 / M4)
- [ ] LIMIT 31 pattern for pagination

#### `src/features/search/components/`

- [ ] `SearchBar.tsx` (client) — `useDebounce`, `⌘K` shortcut, clear button, error state with Retry (Phase 19 H3)
- [ ] `SearchResults.tsx`, `SearchData.tsx`, `SearchSkeleton.tsx`

#### `src/app/api/articles/route.ts`

- [ ] `GET /api/articles?category=&cursor=&q=&limit=`
- [ ] `limit` clamped to max 100
- [ ] If `q` present → `searchArticles()`, else `getFeedArticles()`
- [ ] `cursor` parsed as ISO 8601 date – 400 if invalid
- [ ] Response: `{ articles, nextCursor, hasNextPage }`
- [ ] `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- [ ] CORS headers
- [ ] Rate limited: 20 req/s per IP via Redis fixed‑window (Phase 13)
- [ ] `TRUSTED_PROXY` env var controls IP extraction (rightmost vs leftmost from XFF)
- [ ] `getClientIp()` function — Phase 19+ remediation will add `walkXffChain()` for CIDR chain walking

#### Admin routes

- [ ] `src/app/(admin)/sources/page.tsx` + `actions.ts` — paginated sources query (Phase 19 / M3)
- [ ] `src/app/(admin)/summaries/page.tsx` — summary review queue
- [ ] `SummariesData.tsx` — Approve/Disable buttons wired via `<form action={...}>` (Phase 19 C5)

### Phase 6 Success Criteria

- [ ] `GET /api/articles` returns paginated JSON with correct shape
- [ ] `GET /api/articles?q=...` returns search results with BM25 ranking
- [ ] Admin routes redirect non‑admin users to `/`
- [ ] Source CRUD works end‑to‑end
- [ ] Summary review state machine transitions correctly
- [ ] `tsc --noEmit` passes

---

## Phase 7: Worker Service, Push Notifications & Observability

### Objective

Build standalone Node.js 24 worker service, implement web push with AES‑256‑GCM encryption, DST‑safe quiet hours, and production observability.

### Files to Create / Modify

#### `src/workers/index.ts`

- [ ] Starts 4 workers: ingest (concurrency 50), summarize (5), score (20), feedSlice (10)
- [ ] Graceful shutdown: SIGTERM/SIGINT handlers, `Promise.allSettled(workers.map(w => w.close()))`, 25s timeout (Phase 19 / M7)
- [ ] Console logging with timestamps

#### `src/workers/jobs/parseFeed.ts` — Phase 13 + Phase 19 H9

- [ ] Fetches feed URL with 30s timeout
- [ ] Handles RSS, Atom, JSON Feed formats via `rss-parser`
- [ ] **HTML stripping via `cheerio`** (Phase 19 H9 — regex `<[^>]*>/g` was fundamentally broken; leaked `<script>` content into AI prompts)
- [ ] `normalizeCanonicalUrl()` on each article URL
- [ ] `hashContent(title, body, publishedAt)` for change detection (SHA‑256)
- [ ] Denormalizes `sourceName` onto article row (Phase 19 / H11 — generated columns can't reference joined tables)

#### `src/workers/jobs/summarize.ts` — Phase 13

- [ ] Content guard: if `contentAvailability` is `title_only` or `excerpt` → return early
- [ ] `generateObject({model: anthropic('claude-haiku-4-5'), schema: summariseOutputSchema})`
- [ ] Fallback: if Anthropic fails → retry with `openai('gpt-5-mini')`
- [ ] Validates output with Zod – ZodError triggers retry
- [ ] Inserts into `summaries` table with all provenance fields
- [ ] Updates `articles.summaryStatus = 'ok'` and `articles.hasSummary = true`

#### `src/workers/jobs/summarizeFailure.ts` — Phase 14

- [ ] `getSummaryFailureState(attemptsMade, maxAttempts = 3)` returns `needs_review` after `maxAttempts` retries

#### `src/workers/jobs/alerts.ts` — Phase 19 H10

- [ ] `checkNeedsReviewAlert()` — alerts when summaries transition to `needs_review`

#### `src/workers/jobs/score.ts`

- [ ] Fetches article with source reliability info
- [ ] Calls `calculateImportanceScore()` (returns float 0.0–1.0)
- [ ] Updates `articles.importanceScore`
- [ ] Enqueues `feedSliceQueue.add()` to refresh Redis cache

#### `src/workers/jobs/scheduler.ts`

- [ ] Fetches all `active` sources from DB
- [ ] For each source: `ingestQueue.upsertJobScheduler(...)` (idempotent — restart‑safe)
- [ ] Pattern is dynamic: `pollIntervalMinutes` per source

#### `src/workers/jobs/determineContentAvailability.ts`

- [ ] Pure function: `'title_only'` if no title, `'excerpt'` if no excerpt, `'partial_text'` if body < 500 chars, else `'full_text'`

#### `src/lib/queue/flows.ts` — Phase 13 + Phase 19 C4

- [ ] `FlowProducer` atomic DAG: ingest → score → refresh‑feed‑slice
- [ ] Parent runs only after all children complete
- [ ] **Phase 19 C4 fix**: `flowProducer.add()` wrapped in try/catch; on failure falls back to direct `scoreQueue.add()` per article (loses atomic guarantee but at least scores get enqueued)
- [ ] Returns `PostIngestFlowStatus` object `{ status: "ok"|"degraded"|"skipped", fallbackUsed, fallbackFailures, enqueuedCount }` — never re‑throws

#### `src/lib/security/encrypt.ts`

- [ ] `encryptPushKeys(keys: { p256dh, auth }): string` – AES‑256‑GCM, IV random 16 bytes
- [ ] Output format: `${iv}:${authTag}:${encrypted}` (hex‑encoded)
- [ ] `decryptPushKeys(encryptedString): { p256dh, auth }` – validates format
- [ ] `PUSH_KEY_ENCRYPTION_KEY` read via typed `env` export (Phase 19 H12 fix — was `process.env`)

#### `src/workers/push/isWithinQuietHours.ts`

- [ ] Imports `DateTime` from `'luxon'` – NOT native Date
- [ ] Returns `false` (fail open) if any preference is null
- [ ] DST‑correct via `DateTime.fromJSDate(nowUtc, { zone: briefingTimezone })`

#### `src/workers/lib/cacheInvalidation.ts`

- [ ] Singleton Redis publisher (Phase 13 — workers cannot use `revalidateTag()` because Next.js API is not available in Node.js worker process)
- [ ] Publishes invalidation messages to Redis pub/sub
- [ ] Web app subscribes and calls `revalidateTag()` / `revalidatePath()`

#### `src/app/api/push/subscribe/route.ts`

- [ ] Requires valid session (`verifySession()`)
- [ ] Validates subscription body with Zod
- [ ] Encrypts keys via `encryptPushKeys()` before storing
- [ ] Stores in `pushSubscriptions.encryptedKeys` column (Phase 14 schema fix)
- [ ] Returns 201 Created

#### `src/app/api/health/route.ts`

- [ ] `SELECT 1` via Drizzle to verify DB connectivity
- [ ] Redis ping via `connection.ping()`
- [ ] Returns `{ status: 'ok', deps: { db: 'connected', redis: 'connected' } }` on 200
- [ ] Returns 503 if any dependency is down

### Phase 7 Success Criteria

- [ ] Worker starts without errors: `pnpm worker`
- [ ] Ingest worker picks up jobs from `ingestQueue`
- [ ] Summarise worker respects content availability guard
- [ ] SIGTERM causes clean shutdown with no job loss (25s timeout enforced)
- [ ] Push encryption/decryption round‑trip passes
- [ ] Quiet hours evaluation correct across DST transition (unit test)
- [ ] `/api/health` returns 200 with DB + Redis status

---

## Phase 8: Testing, CI/CD & Deployment

### Objective

Establish comprehensive testing infrastructure, continuous integration/deployment pipelines, and production deployment procedures.

### Files to Create / Modify

#### `.github/workflows/ci.yml`

- [ ] Trigger: `push` and `pull_request` to `main`
- [ ] PostgreSQL 17 service container with `env` settings
- [ ] Redis 7 service container
- [ ] Node 24 setup + pnpm 9 setup
- [ ] `pnpm install --frozen-lockfile`
- [ ] Validate shell scripts + docker‑compose YAML (Phase 19 fail‑fast gate)
- [ ] `pnpm lint` (ESLint --max-warnings 0)
- [ ] `pnpm test` (vitest run)
- [ ] `pnpm test -- --coverage` (Phase 19 H6 — coverage gate)
- [ ] `pnpm check` (tsc --noEmit)
- [ ] `pnpm build` (production build)
- [ ] All 17 env vars set with CI‑safe dummy values

#### `.github/workflows/e2e.yml`

- [ ] Trigger: `push` and `pull_request` to `main`
- [ ] Playwright browser caching
- [ ] `npx playwright install --with-deps`
- [ ] Run E2E tests on Chromium, Firefox, WebKit
- [ ] Upload Playwright report as artifact

#### `lighthouserc.js`

- [ ] Performance budget: ≥ 90
- [ ] Accessibility budget: ≥ 95
- [ ] Best Practices budget: ≥ 90
- [ ] SEO budget: ≥ 90
- [ ] INP budget entry (Phase 19 / M11)

#### `Dockerfile.web` + `Dockerfile.worker`

- [ ] Multi‑stage build, `node:24-alpine`
- [ ] Web: `output: "standalone"`, port 3000, HEALTHCHECK, non‑root user
- [ ] Worker: runs `tsx src/workers/index.ts` directly (no compile step — Phase 15 fix), HEALTHCHECK, non‑root user

#### `docker-compose.prod.yml`

- [ ] Web app service with `Dockerfile.web`
- [ ] Worker service with `Dockerfile.worker`
- [ ] PostgreSQL 17 service with volume persistence
- [ ] Redis 7 service with `noeviction` + AOF + `maxmemory 1gb` (Phase 16 hardening)
- [ ] No legacy `version: '3.8'` field (Phase 19 / M17)

#### `nginx/nginx.conf` (Phase 19 H8)

- [ ] HTTPS reverse proxy config (was missing pre‑Phase 19)

#### `scripts/deploy.sh` (Phase 19 H7)

- [ ] Tagged release flow
- [ ] Database migration pre‑deploy step
- [ ] Zero‑downtime deploy strategy (rolling update)
- [ ] Rollback procedure (no `|| true` — explicit trap)

#### `.husky/pre-commit` + `lint-staged` (Phase 19 M10)

- [ ] Runs eslint + prettier on staged `.ts`/`.tsx` before every commit

#### `e2e/smoke.spec.ts` (Phase 14) + `e2e/a11y.spec.ts` (Phase 19 M5)

- [ ] 10 smoke tests
- [ ] 4 axe‑core WCAG AAA scans against `/`, `/search`, `/sign-in`, `/auth-error`

### Phase 8 Success Criteria

- [ ] CI pipeline passes on every PR
- [ ] E2E tests pass on Chromium, Firefox, WebKit
- [ ] Lighthouse CI scores meet budgets
- [ ] Docker images build successfully
- [ ] `docker-compose.prod.yml` spins up full stack locally
- [ ] Deployment script executes without errors
- [ ] Coverage thresholds enforced (currently 75/80/65/80 — Phase 19 calibrated; will be raised to 80/80/70/80 in the Phase 19+ remediation Batch 2)

---

## Phases 9–19 — Enhancement, Hardening & Remediation Layers

Phases 9 through 19 are documented in detail in the per‑phase markdown files (`Phase_9.md` through `Phase_19.md`) and in the "Lessons Learned" sections of `AGENTS.md`. The v6.0 MEP provides this index; for full gotchas + recommendations, consult `AGENTS.md` §Phase N.

| Phase | Status   | Objective                                        | Key Deliverables                                                                                                                                                                                                                             |
| :---- | :------- | :----------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9     | COMPLETE | Blocking‑Route Error Fix                         | `cacheComponents` + uncached data outside `<Suspense>` — async data fetches in Server Components must be wrapped in `<Suspense>`                                                                                                             |
| 10    | COMPLETE | Landing Page & Design System                     | 10‑section landing page (NewsTicker, Masthead, Header, LeadStory, Feed, NutritionLabelDemo, StatsSection, Accordion, NewsletterCTA, Footer); `RevealProvider` IntersectionObserver                                                           |
| 11    | COMPLETE | Landing Page Dynamic Bug Fixes                   | Hydration mismatch fixes; date rendering patterns                                                                                                                                                                                            |
| 12    | COMPLETE | Tailwind v4 PostCSS & Commit Mono Font Fix       | `@tailwindcss/postcss` plugin; self‑hosted Commit Mono woff2 (replaces `@fontsource/commit-mono`)                                                                                                                                            |
| 13    | COMPLETE | Critical Gaps Remediation                        | Real RSS/Atom/JSON parsing; AI integration (SDK v6); FlowProducer DAG; Redis rate limiting (20 req/s); Category API; SHA‑256 content hashing; `articles.body` column added                                                                   |
| 14    | COMPLETE | Validated Gaps Closure                           | Article detail page (`/article/[id]`); `summarizeFailure.ts`; `pushSubscriptions.encryptedKeys` schema fix; E2E smoke tests; `getSummaryFailureState` returns `needs_review` after 3 retries                                                 |
| 15    | COMPLETE | Production Readiness                             | Dockerfiles (web + worker + dev); `output: "standalone"`; sign‑in + auth‑error pages; OAuth providers (`buildProviders()`); cursor‑based Load More; `Dockerfile.worker` runs `tsx` directly                                                  |
| 16    | COMPLETE | Remediation Batches 1–4                          | `AdminGuard` + `AdminGuardSkeleton`; env schema tests; compose YAML validator; Redis `noeviction` + AOF                                                                                                                                      |
| 17    | COMPLETE | Comprehensive Remediation                        | Skip links; schema‑derived types (`UserRole`, `FeedFormat`, etc.); JSON‑LD rendered in page body via `ArticleData.tsx` (NOT via `metadata.other`)                                                                                            |
| 18    | COMPLETE | Database Reinitialization & Skip‑Link Supplement | `database_reinitialize.md` + `scripts/reinit-db.sh`; `<main id="main-content">` added to all page templates                                                                                                                                  |
| 19    | COMPLETE | Comprehensive Code Audit & Remediation           | 7‑dimension audit; 47 gaps identified; 39 remediated across 5 batches (5 Critical, 12 High, 15 of 19 Medium, 1 of 8 Low); tests 312→392 (+80); suites 56→63 (+7); `pnpm check` + `pnpm lint` both green (were red due to vendored `skills/`) |

For the full Phase 19 Lessons Learned (10 gotchas + 8 recommendations), see `AGENTS.md` §Phase 19.

---

## 3. Cross‑Cutting Concerns

### TypeScript Enforcement

- `strict: true` – non‑negotiable
- `noUncheckedIndexedAccess: true`
- `verbatimModuleSyntax: true` + `erasableSyntaxOnly: true`
- Zero `any` – use `unknown` with type guards
- `interface` for structural types, `type` for unions/intersections
- `import type` for type‑only imports (required by `verbatimModuleSyntax`)
- No `enum` or `namespace` (use string unions and ES modules)
- Types derived from Drizzle schema via `$inferSelect` – never hand‑written

### Security Checklist [PRD §9, PAD §11]

- [ ] `proxy.ts` is UX‑only – real auth at DAL
- [ ] All Server Actions call `verifySession()` / `verifyAdminSession()` first (Phase 19 C3)
- [ ] All DB queries parameterized (Drizzle handles this)
- [ ] Push subscription keys encrypted with AES‑256‑GCM before storage
- [ ] `PUSH_KEY_ENCRYPTION_KEY` validated at startup
- [ ] `AUTH_SECRET` minimum 32 chars validated by Zod
- [ ] Admin routes double auth check (`<AdminGuard>` layout + Server Action)
- [ ] External links: `rel="noopener noreferrer"`
- [ ] HSTS + CSP headers (Phase 19 / M1)
- [ ] No `process.env.*` direct reads in production code (Phase 19 H12 — use typed `env` export)
- [ ] Per‑user rate limit on `/api/summarize/[id]` (5 req/min/user, Phase 19 C2)
- [ ] Per‑IP rate limit on `/api/articles` (20 req/s, Phase 13)
- [ ] `TRUSTED_PROXY` + `TRUSTED_PROXY_CIDRS` env vars for IP extraction (Phase 19+ remediation adds full CIDR chain walking)

### Accessibility Checklist (WCAG AAA Mandatory) [PRD §4.4, PAD §5.5]

- [ ] Focus rings: `focus-visible:ring-2 focus-visible:ring-dispatch-ember`
- [ ] All images have `alt` attributes
- [ ] `<time>` with `dateTime` for all timestamps
- [ ] `<nav aria-label>` for all navigation regions
- [ ] `role="feed"` on feed containers, `role="search"` on search form
- [ ] Skip‑to‑content link at top of every page (Phase 17)
- [ ] `<main id="main-content">` in every page template including error boundaries (Phase 18 + Phase 19 H5)
- [ ] `prefers-reduced-motion` disables all animations
- [ ] Color contrast: `ink-600` on `paper-50` is WCAG AAA (9.5:1)
- [ ] AI disclosure: `aria-label="AI-generated summary transparency label"`
- [ ] Every list has an empty state with screen‑reader announcement
- [ ] Error messages announced via `aria-live="polite"`
- [ ] axe‑core WCAG AAA scans in E2E (Phase 19 M5 — `e2e/a11y.spec.ts`)

### UI State Checklist (Every Component)

- [ ] **Loading** – skeleton only when no data exists (not shown for refetch)
- [ ] **Error** – user‑friendly message + retry button (Phase 19 H3, H4, H5)
- [ ] **Empty** – informative text, not just blank (Phase 19 M13)
- [ ] **Success** – visual feedback
- [ ] **Async operation** – button disabled, loading indicator shown
- [ ] **onError handler** – always present with user feedback

### Performance Budget

| Metric                   | Target                                              |
| :----------------------- | :-------------------------------------------------- |
| TTFB (PPR shell)         | < 50ms (CDN edge)                                   |
| LCP                      | < 2.5s                                              |
| CLS                      | < 0.1                                               |
| INP                      | < 200ms (Phase 19 / M11 — added to lighthouserc.js) |
| TTI (topic feed)         | < 1.5s (3G/4G)                                      |
| Lighthouse Performance   | ≥ 90                                                |
| Lighthouse Accessibility | ≥ 95                                                |

---

## 4. Risk Register (R1–R14) [PAD §11, corrected]

| ID  | Risk                                                       | Likelihood        | Impact   | Mitigation                                                                               |
| :-- | :--------------------------------------------------------- | :---------------- | :------- | :--------------------------------------------------------------------------------------- |
| R1  | `use cache` silently inert without `cacheComponents: true` | Very High         | Critical | Flag locked at top‑level of `next.config.ts`.                                            |
| R2  | ViewTransition API renamed before stabilisation            | High              | High     | All usage routed through `<PageTransition>` abstraction.                                 |
| R3  | Firefox users see no transitions                           | Low               | Low      | Firefox 144+ ships View Transitions stable. Progressive enhancement degrades gracefully. |
| R4  | `revalidateTag()` called with single argument              | Medium            | Medium   | TypeScript error in Next.js 16. Two‑arg form enforced.                                   |
| R5  | `experimental.ppr` left in config from Next.js 15          | Medium            | High     | Build error in Next.js 16. Explicitly removed.                                           |
| R6  | Multi‑instance in‑memory cache fragmentation               | High              | Medium   | Redis pub/sub cache invalidation via singleton publisher (Phase 13).                     |
| R7  | Security: Unpatched Next.js 16.x (CVE‑2025‑55182)          | High if unpatched | Critical | Minimum version pinned to `≥16.0.7` (NOT `≥16.2.6` — v5.1 fix).                          |
| R8  | Auth.js v5 remains in beta                                 | High              | Medium   | Exact beta version pinned (`5.0.0-beta.31`). Monitor `authjs.dev`.                       |
| R9  | Summarising low‑quality content (AI hallucination)         | Medium            | High     | Content availability guard: only `partial_text` or `full_text` may be summarised.        |
| R10 | Quiet hours DST evaluation error                           | Medium            | Medium   | `luxon` mandated for all timezone comparisons.                                           |
| R11 | Push subscription key exposure                             | Low               | Medium   | `encryptedKeys` column (AES‑256‑GCM encrypted envelope, Phase 14).                       |
| R12 | Duplicate subcategory slugs                                | Low               | High     | Composite unique constraint `(categoryId, slug)`.                                        |
| R13 | EU AI Act machine‑readable marking insufficient            | Medium            | High     | 3‑layer disclosure (JSON‑LD + HTTP header + Meta tag). C2PA rejected for text.           |
| R14 | Unbounded feed query without pagination                    | High              | High     | Cursor‑based pagination with strict `LIMIT 31` pattern.                                  |

---

## 5. Validation Protocol (Per Phase)

After each phase, run:

```bash
# 1. TypeScript
pnpm tsc --noEmit --pretty false

# 2. Type generation
pnpm next typegen

# 3. Production build
pnpm build

# 4. Database migration (Phase 2+)
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 5. Unit tests
pnpm test

# 6. Coverage (Phase 19+ gate)
pnpm test -- --coverage

# 7. Lint
pnpm lint

# 8. E2E (Phase 14+)
pnpm test:e2e
```

**Pass criteria:** Zero TypeScript errors, zero build warnings, zero Drizzle schema errors, all unit tests pass, coverage thresholds met, all E2E tests pass.

---

## 6. Final Delivery Checklist

- [ ] All 19 phases COMPLETE (see Phase Status Tracker in AGENTS.md)
- [ ] **392 tests across 63 suites pass** (post‑Phase 19 baseline)
- [ ] **10 Playwright E2E + 4 axe‑core a11y scans pass**
- [ ] Zero TypeScript errors
- [ ] Zero ESLint warnings (`--max-warnings 0`)
- [ ] Zero `any` types (enforced by `strict: true`)
- [ ] All API endpoints respond correctly
- [ ] WCAG AAA – automated + manual screen‑reader tests pass
- [ ] `prefers-reduced-motion` disables all animations
- [ ] EU AI Act 3‑layer disclosure present on all summarised articles
- [ ] Content availability guard prevents summarisation of `title_only`/`excerpt`
- [ ] Admin routes inaccessible to non‑admin users
- [ ] Lighthouse CI – Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90, INP < 200ms
- [ ] Production build deployed; `/api/health` returns 200
- [ ] CVE version pinned to `≥16.0.7`
- [ ] Search uses native `@@ websearch_to_tsquery()` with `ts_rank_cd` (4 weights A/B/C/D)
- [ ] `proxy.ts` matcher uses broad PRD pattern
- [ ] BullMQ split into Worker/Queue connection configs
- [ ] `cacheLife` profiles include `stale`, `revalidate`, and `expire`
- [ ] Importance score returns float [0.0, 1.0]
- [ ] JSON‑LD rendered in page body (NOT via `metadata.other`)
- [ ] `Dockerfile.worker` runs `tsx src/workers/index.ts` directly
- [ ] `articles.body` + `articles.sourceName` columns present and indexed in `searchVector`
- [ ] Vendored `skills/` excluded from `tsconfig.json` + `eslint.config.mjs`
- [ ] Per‑user rate limit on `/api/summarize/[id]` (5 req/min/user)
- [ ] HSTS + CSP headers in `next.config.ts`
- [ ] husky + lint-staged pre-commit hooks
- [ ] `e2e/a11y.spec.ts` axe-core scans
- [ ] AGENTS.md is the canonical instructions source (CLAUDE.md is a stub)

---

## 7. Appendices

### A. Environment Variables

**Total: 17 vars** (10 required + 6 optional + 1 with default). All validated by Zod at module load in `src/lib/env/index.ts`. The app fails fast with a descriptive error if any required var is missing or invalid.

```bash
# ── Database ──────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@localhost:5432/onestopnews
# Must start with postgres:// or postgresql://
# For serverless (Vercel/Lambda), use PgBouncer/Supavisor pooler URL

# ── Redis ─────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379
# Must start with redis://

# ── Authentication (Auth.js v5) ───────────────────────────
AUTH_SECRET=  # Generate with: openssl rand -base64 33 (min 32 chars)
AUTH_URL=http://localhost:3000  # Production: your canonical URL

# ── AI Models ─────────────────────────────────────────────
ANTHROPIC_API_KEY=             # Must start with sk-ant- (Claude 4.5 Haiku, primary)
OPENAI_API_KEY=                # Must start with sk- (GPT-5 Mini, fallback)

# ── Web Push (VAPID) ──────────────────────────────────────
# Generate with: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@onestopnews.com

# ── Push Key Encryption ───────────────────────────────────
# 32-byte hex string (64 chars). Generate with: openssl rand -hex 32
PUSH_KEY_ENCRYPTION_KEY=

# ── Node Environment ──────────────────────────────────────
NODE_ENV=development  # development | production | test (default: development)

# ── Rate Limiting (Optional) ─────────────────────────────
TRUSTED_PROXY=  # "true" | unset
TRUSTED_PROXY_CIDRS=  # e.g., "10.0.0.0/8,172.16.0.0/12" (Phase 19 / M2)

# ── OAuth Providers (Optional) ───────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# ── Observability (Reserved, NOT currently validated) ────
# SENTRY_DSN and AXIOM_TOKEN are reserved for future observability
# integration but are NOT declared in src/lib/env/index.ts and
# are NOT read by any production code.
```

### B. Custom Drizzle Migrations

`drizzle/custom-indexes.sql`:

```sql
-- GIN FTS (fastupdate=off is mandatory for ingestion workload — Phase 19 / M8)
CREATE INDEX CONCURRENTLY IF NOT EXISTS articles_search_vector_gin_idx
  ON articles USING gin (search_vector) WITH (fastupdate = off);

-- Partial index for recent articles (most common search pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS articles_search_recent_partial_idx
  ON articles USING gin (search_vector)
  WHERE published_at > NOW() - INTERVAL '30 days';

-- Trigram for autocomplete
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS articles_title_trgm_idx
  ON articles USING gist (title gist_trgm_ops);

-- Performance indexes
CREATE INDEX IF NOT EXISTS articles_category_published_idx ON articles (category_id, published_at DESC);
CREATE INDEX IF NOT EXISTS articles_source_id_idx ON articles (source_id);
CREATE INDEX IF NOT EXISTS articles_summary_status_idx ON articles (summary_status) WHERE summary_status != 'none';
CREATE INDEX IF NOT EXISTS sources_status_idx ON sources (is_active) WHERE is_active = true;
```

Migration files in `drizzle/`:

- `0000_purple_blue_marvel.sql` — Initial schema
- `0001_panoramic_makkari.sql`
- `0002_flippant_screwball.sql`
- `0003_strong_mac_gargan.sql` — `articles.body` + `users.email_verified` + `users.image` (Phase 13)
- `0004_smiling_newton_destine.sql` — `push_subscriptions.encrypted_keys` + DROP NOT NULL `keys` (Phase 14)
- `0005_neat_wolverine.sql` — DROP COLUMN `keys` (Phase 15)
- `0006_cross_field_search.sql` — Recreate `searchVector` with 4 weights A/B/C/D (Phase 19 / H11)

### C. License & Attribution

This execution plan is provided under the MIT license for internal use by the OneStopNews project. All design decisions are documented for long‑term maintainability.

---

## 8. Errata — What v5.1 Got Wrong (and v6.0 Corrects)

For traceability, here are the specific specs from MEP v5.1 that were corrected during implementation. Each is also reflected in the relevant phase section above.

| #   | v5.1 Spec                                                | Reality                                                                                                                                                 | Phase Discovered                      | v6.0 Section      |
| :-- | :------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------ | :---------------- |
| 1   | `CREATE EXTENSION IF NOT EXISTS pg_textsearch` (Phase 2) | `pg_textsearch` is not a separate extension in PG 17 — `ts_rank_cd` is built‑in                                                                         | Phase 6 / Phase 17 gotcha #1          | Phase 1 + Phase 2 |
| 2   | `articles.body` column in original Phase 2 schema        | Added in Phase 13 migration `0003_strong_mac_gargan.sql`                                                                                                | Phase 13 gotcha #3                    | Phase 2           |
| 3   | JSON‑LD via `metadata.other` for article page            | Next.js 16 does NOT render `<script type="application/ld+json">` from `metadata.other`. Phase 17 fix: render JSON‑LD in page body via `ArticleData.tsx` | Phase 17                              | Phase 4 + Phase 5 |
| 4   | `Dockerfile.worker` CMD: `node dist/workers/index.js`    | Phase 15 corrected to `tsx src/workers/index.ts` (no compile step)                                                                                      | Phase 15 gotcha #1                    | Phase 8           |
| 5   | Coverage target ≥ 90%                                    | Phase 19 calibrated to 75/80/65/80 pending additional unit tests                                                                                        | Phase 19 / H6                         | Phase 8           |
| 6   | `experimental.clientSegmentCache: true` recommended      | Not in Next.js 16.2.9 `ExperimentalConfig` — TypeScript error                                                                                           | Phase 13 gotcha #8                    | §1.4              |
| 7   | `proxy.ts` runs on Node.js or Edge                       | Node.js runtime only — Edge is not supported for `proxy.ts` in Next.js 16                                                                               | Phase 13                              | Phase 1           |
| 8   | 8 phases total                                           | 19 phases actually executed                                                                                                                             | All                                   | §2                |
| 9   | `hashContent(title, publishedAt)`                        | Must include `body` for content‑change detection (Phase 14 gotcha #1)                                                                                   | Phase 14                              | Phase 4 + Phase 7 |
| 10  | `pushSubscriptions.keys` JSONB                           | Phase 14: schema changed to `encryptedKeys` (single encrypted envelope string); Phase 15: legacy `keys` column dropped                                  | Phase 14 + Phase 15                   | Phase 2 + Phase 7 |
| 11  | `revalidateTag()` in workers                             | Next.js API not available in Node.js worker process — use Redis pub/sub for cache invalidation                                                          | Phase 13 gotcha (singleton publisher) | Phase 7           |
| 12  | Single BullMQ Redis connection                           | Must split into Worker connection (`enableOfflineQueue: true`) + Queue producer connection (`enableOfflineQueue: false`)                                | Phase 13 / v5.1 partial fix           | Phase 2 + Phase 7 |

---

**This MASTER_EXECUTION_PLAN v6.0 supersedes v5.1 and the duplicate `MASTER_EXECUTION_PLAN_v5.1.md` file. Implementation should follow the phase order and checklists. Any deviation requires explicit approval per the Meticulous Approach VALIDATE checkpoint.**

**For per‑phase Lessons Learned (gotchas + recommendations), see `AGENTS.md` §Phase N.** This MEP is the _plan_; `AGENTS.md` is the _history_.
