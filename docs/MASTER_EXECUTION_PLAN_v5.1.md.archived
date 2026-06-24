# OneStopNews — Master Execution Plan v5.1

**Classification:** Definitive Engineering Blueprint  
**Status:** FINAL — Merged from MEP v5.0 (Corrected) + My_MEP.md (Supplemented)  
**Companion Documents:** PRD v4.3 · PAD v4.5 · CLAUDE.md · README.md  
**Last Updated:** June 11, 2026  
**Prepared By:** Claw Code — Frontend Architect & Technical Partner

---

## Executive Summary

OneStopNews is a **topic‑first news aggregation and AI summarisation platform** built on Next.js ≥16.0.7 (CVE-2025-55182 mitigated), React 19.2, PostgreSQL 17, BullMQ v5 on Redis, and a separate Node.js 24 LTS worker service. The codebase is organised as a **modular monolith** (web app) + **standalone worker service**, connected via BullMQ queues and a shared PostgreSQL database.

**Key decisions from merged analysis:**

| Decision | Source | Rationale |
|----------|--------|-----------|
| 7‑phase structure | MEP v5.0 | Fewer handoffs, logical bundling |
| `cacheComponents: true` at top‑level | MEP v5.0 + PRD | Next.js 16 requirement |
| `proxy.ts` replaces `middleware.ts` | MEP v5.0 + PRD | Next.js 16 migration |
| `pg_textsearch` BM25 for full‑text search | MEP v5.0 | Modern relevance ranking |
| `postgres` (postgres.js) driver | MEP v5.0 | Enables lazy proxy connection |
| WCAG AAA mandatory | MEP v5.0 + My_MEP | Meets project quality standard |
| UI state checklists | MEP v5.0 + My_MEP | Enforces complete user feedback |
| Testing suite (Vitest, Playwright, Lighthouse CI) | MEP v5.0 + My_MEP | Quality gates |
| Performance budget (TTFB, LCP, CLS, TTI) | MEP v5.0 + My_MEP | Core Web Vitals compliance |
| Risk register (R1–R14) with build mitigations | MEP v5.0 + My_MEP | Explicit mitigations |
| CI/CD pipelines (GitHub Actions) | My_MEP | Continuous integration |
| Docker deployment (web + worker) | My_MEP | Production-ready containers |
| `noUncheckedIndexedAccess` | My_MEP | Stricter TypeScript safety |

---

## Changes from v5.0 → v5.1

| # | Change | Severity | Rationale |
|:-:|--------|----------|-----------|
| 1 | CVE version: `≥16.2.6` → `≥16.0.7` | CRITICAL | 16.0.7 is the actual security patch. 16.0.7–16.2.5 are NOT vulnerable. |
| 2 | Search syntax: dropped invalid `<@> websearch_to_tsquery()` hybrid | CRITICAL | These operators are incompatible. Switched to native `@@ websearch_to_tsquery() ORDER BY ts_rank_cd()`. |
| 3 | `proxy.ts` matcher: narrow `/admin/:path*` → broad `['/((?!_next/static|_next/image|favicon.ico).*)']` | CRITICAL | Enables rate limiting and provenance headers on public routes per PRD §1.1. |
| 4 | Risk R3 (Firefox): `Certain` → `Low` | CRITICAL | Firefox 144+ (Oct 2025) ships View Transitions stable, no flag. |
| 5 | BullMQ Redis: single connection → split Worker/Queue configs | MODERATE | Workers need `enableOfflineQueue: true`; queues need `enableOfflineQueue: false`. |
| 6 | `cacheLife` profiles: added `expire` field per PRD §5.2 | MODERATE | Missing `expire` prevents hard cache eviction. |
| 7 | `calculateImportanceScore`: returns float [0.0, 1.0] not 0–100 | MODERATE | Must match Drizzle schema `real('importance_score').default(0.5)`. |
| 8 | New Phase 8: Testing, CI/CD & Deployment | ENHANCEMENT | Incorporated from My_MEP.md Phase 10. Docker, GitHub Actions, Lighthouse CI, deployment checklist. |
| 9 | `noUncheckedIndexedAccess: true` in `tsconfig.json` | ENHANCEMENT | Added from My_MEP.md for stricter type safety. |
| 10 | All checklist items now annotated with PRD/PAD section references | TRACEABILITY | Full cross-document traceability. |

---

## 1. Deep Analysis & Core Architectural Pillars

### 1.1 The Meticulous Approach (Our Operating Framework)

All work follows the **six‑phase workflow** [PRD §1.1]:
1. **ANALYZE** – multi‑dimensional requirement mining
2. **PLAN** – structured execution roadmap
3. **VALIDATE** – explicit user confirmation before coding
4. **IMPLEMENT** – modular, tested, documented builds
5. **VERIFY** – rigorous QA against success criteria
6. **DELIVER** – complete handoff with knowledge transfer

### 1.2 5‑Layer Request Model [PAD §5.1]

```
Layer 0: proxy.ts (Network boundary, cookie check)
Layer 1: App Router (Next.js routing, PPR, Suspense)
Layer 2: Feature Modules (feed, summaries, search, admin)
Layer 3: Domain Services (pure business logic, no Next.js imports)
Layer 4: Infrastructure (DB clients, queue clients, AI SDKs)
```

### 1.3 "Editorial Dispatch" Design System [PRD §4.1–4.3]

| Element | Choice | Anti‑generic rejection |
|---------|--------|------------------------|
| Serif headline | **Newsreader Variable** | Inter, Roboto, Space Grotesk |
| Sans‑serif body | **Instrument Sans Variable** | |
| Monospace | **Commit Mono** | |
| Accent color | `--dispatch-ember` (`#c7513f`) | purple gradients, amber warnings |
| Layout | CSS Subgrid for feed alignment | fixed heights, JS measurement |

### 1.4 Critical Configuration Invariants [PRD §5.2, PAD §5.3]

| Flag | Placement | Why | Source |
|------|-----------|-----|--------|
| `cacheComponents: true` | Top‑level | Silently ignored if inside `experimental` | Next.js 16 docs |
| `cacheLife` profiles | Top‑level | Runtime throws if missing | Next.js 16 docs |
| `turbopack: {}` | Top‑level | Graduated from experimental | Next.js 16 docs |
| `reactCompiler: true` | Top‑level | Disabled by default (build cost). Enable when components follow Rules of React. | Next.js 16 docs |
| `experimental.viewTransition: true` | Inside `experimental: {}` | Transitions disabled if misplaced | React 19 docs |
| `experimental.clientSegmentCache: true` | Inside `experimental: {}` | Smart prefetching disabled if misplaced | Next.js 16 docs |
| `experimental.ppr` | **DO NOT INCLUDE** | Build error in Next.js 16 | Next.js 16 upgrade guide |
| `experimental.dynamicIO` | **DO NOT INCLUDE** | Deprecated / removed | Next.js 16 upgrade guide |

### 1.5 Non‑Negotiable Code Standards

- TypeScript `strict: true`, zero `any`
- `interface` over `type` for structural definitions; `type` for unions/intersections
- Early returns (guard clauses)
- Composition over inheritance
- No data fetching in Layouts — fetch in Pages
- Async `params`/`searchParams` are `Promise` — always `await`
- Auth at the DAL: `proxy.ts` is UX‑only; real auth lives in `verifySession()`
- Drizzle schema = single source of truth for database types
- All queries through `queries.ts` in the relevant module
- Never enqueue summarisation for `title_only` or `excerpt` articles
- **Library discipline** – if Shadcn/Radix provides a component, wrap it; never rebuild from scratch
- `noUncheckedIndexedAccess: true` in `tsconfig.json` (catches undefined array access at compile time)

---

## 2. Merged Phase Structure (8 Phases)

```
Phase 1: Foundation & Configuration
Phase 2: Database Schema & Infrastructure
Phase 3: Design System & Shared Components
Phase 4: Core Feed Feature (Topic‑First Feed)
Phase 5: AI Summarisation Pipeline
Phase 6: Search, Admin & Public API
Phase 7: Worker Service, Push Notifications & Observability
Phase 8: Testing, CI/CD & Deployment
```

Each phase is independently deployable and verifiable. Phases 1–4 constitute V1 (feature‑complete). Phases 5–8 are enhancement layers.

---

## Phase 1: Foundation & Configuration

### Objective
Establish correct Next.js 16 configuration, install all required dependencies, wire up environment variable schema with Zod, and create `proxy.ts` and `docker-compose.yml`. No feature code is written in this phase — it is pure scaffolding.

### Files to Create / Modify

#### `next.config.ts` — MODIFY [PRD §5.2, PAD §5.3]
**Checklist:**
- [ ] `cacheComponents: true` at top‑level (not inside `experimental`)
- [ ] `cacheLife` profiles at top‑level with **3 fields** [PRD §5.2]:
  - `feed: { stale: 30, revalidate: 120, expire: 600 }`
  - `topicShell: { stale: 300, revalidate: 900, expire: 86400 }`
  - `reference: { stale: 3600, revalidate: 86400, expire: 604800 }`
- [ ] `turbopack: {}` at top‑level
- [ ] `reactCompiler: true` at top‑level (optional: enable when components follow Rules of React)
- [ ] `experimental.viewTransition: true` inside `experimental: {}`
- [ ] `experimental.clientSegmentCache: true` inside `experimental: {}`
- [ ] `experimental.ppr` and `experimental.dynamicIO` are **absent**
- [ ] Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- [ ] TypeScript strict passes

#### `proxy.ts` — CREATE (replaces `middleware.ts`) [PRD §1.1, PAD §5.1]
**Checklist:**
- [ ] Exports `config` with `matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']` [PRD §1.1]
- [ ] Reads session cookie via `cookies()` from `next/headers`
- [ ] Redirects to `/sign-in` if cookie absent (optimistic, not authoritative)
- [ ] Zero DB calls – UX‑only
- [ ] Zero business logic – `verifySession()` in DAL is the real auth boundary
- [ ] Runs on Node.js runtime (not Edge)

#### `src/lib/env/index.ts` — CREATE
**Checklist:** ⬇️
- [ ] Zod schema covers all env vars from PRD Appendix C
- [ ] `ANTHROPIC_API_KEY` validated with `startsWith('sk-ant-')`
- [ ] `PUSH_KEY_ENCRYPTION_KEY` validated as 64‑char hex string via regex
- [ ] `env` object exported – all consuming code imports from here, not `process.env`
- [ ] Throws on startup with clear, human‑readable error listing all missing vars

#### `drizzle.config.ts` — CREATE (replaces `.json`)
**Checklist:**
- [ ] Schema path: `./src/lib/db/schema.ts`
- [ ] Migration output: `./drizzle`
- [ ] Dialect: `postgresql`
- [ ] `dbCredentials.url` from `process.env.DATABASE_URL`

#### `tsconfig.json` — CREATE [My_MEP Addition]
**Checklist:**
- [ ] `"strict": true`
- [ ] `"noUncheckedIndexedAccess": true` — catches undefined array access at compile time
- [ ] Path aliases: `@/` → `src/`

#### `.env.example` — CREATE
**Checklist:**
- [ ] All vars from PRD Appendix C listed with comments
- [ ] `PUSH_KEY_ENCRYPTION_KEY` includes generation command: `openssl rand -hex 32`
- [ ] `AUTH_SECRET` includes generation command: `openssl rand -base64 33`
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` includes: `npx web-push generate-vapid-keys`
- [ ] No real secrets committed

#### `docker-compose.yml` — CREATE [My_MEP Addition]
**Checklist:**
- [ ] PostgreSQL 17 image with `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- [ ] PostgreSQL port `5432:5432`
- [ ] Redis 7 image with `noeviction` policy
- [ ] Redis port `6379:6379`
- [ ] Named volumes for data persistence
- [ ] `scripts/init-extensions.sql` mounted to `/docker-entrypoint-initdb.d/01-init.sql`

#### `scripts/init-extensions.sql` — CREATE [My_MEP Addition]
**Checklist:**
- [ ] `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
- [ ] `CREATE EXTENSION IF NOT EXISTS pg_trgm`
- [ ] `CREATE EXTENSION IF NOT EXISTS pg_textsearch` (Phase 2)

#### `package.json` — MODIFY (install dependencies)

**Required packages (merged list):**
```json
{
  "dependencies": {
    "zod": "^3.24.0",
    "next-auth": "5.0.0-beta.25",
    "@auth/drizzle-adapter": "^1.7.0",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-tooltip": "^1.1.3",
    "@radix-ui/react-tabs": "^1.1.1",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4",
    "lucide-react": "^0.469.0",
    "bullmq": "^5.34.10",
    "ioredis": "^5.4.1",
    "@anthropic-ai/sdk": "^0.32.0",
    "openai": "^4.70.0",
    "ai": "^4.0.0",
    "luxon": "^3.5.0",
    "@types/luxon": "^3.4.2",
    "web-push": "^3.6.7",
    "@types/web-push": "^3.6.3",
    "postgres": "^3.4.4",
    "next-themes": "^0.4.3",
    "drizzle-orm": "^0.36.0",
    "drizzle-kit": "^0.27.0"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0",
    "playwright": "^1.48.0",
    "@playwright/test": "^1.48.0",
    "lighthouse": "^12.0.0",
    "axe-core": "^4.10.0",
    "@axe-core/playwright": "^4.10.0"
  }
}
```

**Checklist:**
- [ ] `postgres` (postgres.js) installed – NOT `pg`
- [ ] `bullmq` and `ioredis` installed
- [ ] All type packages in devDependencies
- [ ] `next-auth` pinned to beta channel (v5)

**Phase 1 Success Criteria:**
- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm build` succeeds (even with no pages beyond health check)
- [ ] `next.config.ts` passes config validation (no console warnings)
- [ ] All required packages importable without runtime errors
- [ ] `docker-compose up -d` starts PostgreSQL and Redis
- [ ] `redis-cli ping` returns `PONG`
- [ ] `psql -h localhost -U onestopnews -d onestopnews_dev` connects

---

## Phase 2: Database Schema & Infrastructure

### Objective
Define complete Drizzle ORM schema (10 tables, enums, indexes), lazy DB client, Auth.js v5 configuration, and BullMQ queue instances.

### Files to Create / Modify

#### `src/lib/db/schema.ts` — CREATE [PRD §6, PAD §7]
**Tables and enums (merged from both MEPs):**

```typescript
// Enums
type ContentAvailability = 'title_only' | 'excerpt' | 'partial_text' | 'full_text';
type SummaryStatus = 'none' | 'pending' | 'ok' | 'needs_review' | 'disabled';
type UserRole = 'reader' | 'admin';
type SourceStatus = 'active' | 'paused' | 'error' | 'disabled';
type FeedFormat = 'rss' | 'atom' | 'json_api';

// Tables (in order of dependencies)
// users, accounts, sessions, verificationTokens (Auth.js adapter)
// categories, subcategories (topic hierarchy)
// sources, articles, summaries, sourceHealthSnapshots
// pushSubscriptions, userPreferences
```

**Checklist (expanded):**
- [ ] All 10 tables defined with correct column types and constraints
- [ ] `articles.canonicalUrl` has `unique()` constraint (idempotency key)
- [ ] `articles.contentHash` defined (change detection for upserts)
- [ ] `articles.searchVector` defined as `tsvector` generated column using Drizzle `customType` OR raw SQL in migration
- [ ] `subcategories` has `uniqueIndex(['categoryId', 'slug'])` to prevent duplicate slugs (R12 mitigation)
- [ ] `pushSubscriptions.keys` typed as `$type<{p256dh:string;auth:string}>`
- [ ] All `.$inferSelect` and `.$inferInsert` types re‑exported from schema
- [ ] Auth.js adapter tables defined per `@auth/drizzle-adapter` spec
- [ ] Raw SQL index file `drizzle/custom-indexes.sql` documented with:
  - GIN FTS index with `fastupdate = off`
  - Partial index for recent articles
  - pg_trgm index for autocomplete
  - Performance indexes on foreign keys

#### `src/lib/db/index.ts` — CREATE [PAD §5.3]
**Checklist:**
- [ ] Uses `postgres` (postgres.js) driver – NOT `pg`
- [ ] Implements lazy proxy pattern (connection deferred until first query)
- [ ] Connection pool `max: 10` (documented: for dedicated Node.js runtime)
- [ ] DEPLOYMENT NOTE: serverless requires PgBouncer or Supavisor
- [ ] `schema` imported and passed to `drizzle()` for relational queries
- [ ] Exports `db` singleton – all code imports from `@/lib/db`

#### `src/lib/auth/index.ts` — CREATE [PAD §8.1]
**Checklist:**
- [ ] Uses `DrizzleAdapter` from `@auth/drizzle-adapter` with `db` and `schema`
- [ ] JWT strategy: `session.strategy: 'jwt'`
- [ ] `jwt` callback injects `user.role` into token
- [ ] `session` callback exposes `session.user.role` to clients
- [ ] Credentials provider for admin email/password; optional OAuth (Google/GitHub) via env
- [ ] `AUTH_SECRET` and `AUTH_TRUST_HOST` consumed from `env` module

#### `src/lib/auth/dal.ts` — CREATE [PAD §8.1]
**Checklist:**
- [ ] `verifySession` wraps `cache(async () => {...})` from `react`
- [ ] Uses `redirect('/sign-in')` (not `throw new Error()`)
- [ ] Fetches user from DB – only `{id, role, name}`
- [ ] `verifyAdminSession` calls `verifySession()` then checks `user.role === 'admin'`
- [ ] Admin check redirects to `/` (not error page)

#### `src/lib/queue/index.ts` — CREATE [PAD §6.2]
**Checklist:**
- [ ] Two separate IORedis connection configs: one for Workers, one for Queue producers [v5.1 FIX]
- [ ] **Worker connection:** `maxRetriesPerRequest: null`, `enableOfflineQueue: true`
- [ ] **Queue (producer) connection:** `maxRetriesPerRequest: default`, `enableOfflineQueue: false`
- [ ] Redis URL sourced from `env.REDIS_URL`
- [ ] Four queues exported: `ingestQueue`, `summarizeQueue`, `scoreQueue`, `feedSliceQueue`
- [ ] Queues share the producer connection instance
- [ ] `defaultJobOptions`: `attempts: 3, backoff: { type: 'exponential', delay: 5000 }`

#### `src/app/api/auth/[...nextauth]/route.ts` — CREATE [PAD §8.1]
**Checklist:**
- [ ] Exports `GET` and `POST` from `auth.handlers`
- [ ] Located at correct path

**Phase 2 Success Criteria:**
- [ ] `drizzle-kit generate` produces valid SQL migration files
- [ ] `drizzle-kit migrate` applies schema without errors [PAD §7.3: "Never push in production"]
- [ ] All relational queries (`db.query.*`) typecheck
- [ ] Auth.js routes respond at `/api/auth/session`
- [ ] TypeScript strict across all files

---

## Phase 3: Design System & Shared Components

### Objective
Implement the "Editorial Dispatch" design system: CSS custom properties, typography, color tokens, and all shared/primitive components.

### Files to Create / Modify

#### `src/app/globals.css` — MODIFY [PRD §4.2]
**Checklist:**
- [ ] `@import "tailwindcss"` as first line
- [ ] `@theme` block with all custom properties (colors, fonts)
- [ ] Font faces: Newsreader (variable), Instrument Sans (variable), Commit Mono (self‑hosted or CDN)
- [ ] `prefers-reduced-motion: reduce` media query disables all animations/transitions
- [ ] Base reset: `box-sizing: border-box`
- [ ] WCAG AAA focus ring: `focus-visible { outline: 2px solid var(--color-dispatch-ember); outline-offset: 2px }`
- [ ] Subgrid utility: `.feed-grid` class or inline `grid-rows-subgrid`
- [ ] Scrollbar styling (thin, ink‑100 track, ink‑300 thumb)

#### `src/app/layout.tsx` — MODIFY [PRD §4.1]
**Checklist:**
- [ ] `Newsreader` and `Instrument_Sans` loaded via `next/font/google` with `variable` CSS properties
- [ ] `Commit Mono` loaded via `@font-face` in `globals.css`
- [ ] Font CSS variables applied to `<html>`
- [ ] Root `<html>` has `lang="en"`, `suppressHydrationWarning`
- [ ] Root `<body>` has `bg-paper-50 text-ink-600 antialiased font-ui`
- [ ] `Metadata` export with title template and OpenGraph defaults

#### `src/shared/lib/utils.ts` — CREATE
**Checklist:**
- [ ] `cn(...inputs: ClassValue[])` using `clsx` + `tailwind-merge`
- [ ] `formatTimeAgo(date: Date): string` – handles seconds, minutes, hours, days, weeks, months, years
- [ ] `formatDate(date: Date): string` – uses `Intl.DateTimeFormat`
- [ ] `truncate(str: string, maxLength: number): string`

#### `src/shared/components/ui/Button.tsx` — CREATE
**Checklist:**
- [ ] Uses `cva` (class-variance-authority) for variants (`primary`, `secondary`, `ghost`, `destructive`) and sizes (`sm`, `md`, `lg`)
- [ ] Uses Radix `Slot` for `asChild` pattern
- [ ] `isLoading` prop: shows `Loader2` spinner, disables button, prevents double‑submit
- [ ] `primary` variant: `bg-dispatch-ember` with hover/focus states
- [ ] Focus ring compliant with WCAG AAA
- [ ] `disabled` state: `opacity-50 cursor-not-allowed`

#### `src/shared/components/ui/Badge.tsx` — CREATE
**Checklist:**
- [ ] Variants: `ember`, `slate`, `sage`, `clay`, `violet`, `muted`
- [ ] Uses `font-mono text-[10px] uppercase tracking-widest`
- [ ] Accessible: uses `<span>` with appropriate ARIA

#### `src/shared/components/ui/Skeleton.tsx` — CREATE
**Checklist:**
- [ ] Animated shimmer (`animate-pulse`) unless `prefers-reduced-motion`
- [ ] `lines` prop for multi‑line text skeletons
- [ ] `ArticleCardSkeleton` variant matching 3‑row subgrid layout

#### `src/shared/components/layout/Header.tsx` — CREATE
**Checklist:**
- [ ] Sticky with `backdrop-blur-sm bg-paper-50/90`
- [ ] Logo in `font-editorial font-[800]` with ember accent dot
- [ ] Desktop: horizontal category nav links
- [ ] Mobile: hamburger menu trigger (Radix `Dialog`)
- [ ] Search icon button (routes to `/search`)
- [ ] `<nav aria-label="Primary navigation">`
- [ ] Active category indicator with `dispatch-ember` underline

#### `src/shared/components/layout/Footer.tsx` — CREATE
**Checklist:**
- [ ] Background `bg-paper-100`
- [ ] AI disclosure statement in `font-mono text-[10px]`
- [ ] `<footer role="contentinfo">`

#### `src/shared/components/primitives/PageTransition.tsx` — CREATE [PRD §5.3, PAD §5.7]
**Checklist:**
- [ ] Imports `ViewTransition` from `'react'` (stable import path per PAD §5.7)
- [ ] Conditional render: wraps in `<ViewTransition>` only if API available
- [ ] `prefers-reduced-motion` check: skips transition entirely
- [ ] Zero hard dependency – core functionality works without it

#### `src/shared/hooks/useDebounce.ts` — CREATE
**Checklist:**
- [ ] `'use client'` directive
- [ ] Generic `<T>` – works with any value type
- [ ] Default delay 300ms
- [ ] Cleans up via `useEffect` return

**Phase 3 Success Criteria:**
- [ ] All shared components render without errors
- [ ] Design tokens match PRD §4.2 color table exactly
- [ ] Fonts load correctly (Newsreader, Instrument Sans visible)
- [ ] Focus ring visible on all interactive elements (keyboard navigation test)
- [ ] `prefers-reduced-motion` disables all animations (OS setting test)
- [ ] `tsc --noEmit` passes

---

## Phase 4: Core Feed Feature (Topic‑First Feed)

### Objective
Build the topic‑first news feed – home page, topic pages, article detail page, feed queries with cursor pagination, and CSS Subgrid card hierarchy.

### Files to Create / Modify

#### `src/domain/articles/types.ts` — CREATE [PAD §5.6]
**Checklist:**
- [ ] Types derived from Drizzle schema via `InferSelectModel`
- [ ] `ArticleWithSource` includes source fields (`id`, `name`, `siteUrl`, `politicalLeaning`)
- [ ] `ArticleWithSummary` includes optional `summary`

#### `src/domain/articles/normalize.ts` — CREATE [PAD §6.2]
**Checklist:**
- [ ] `normalizeCanonicalUrl(url: string): string` – removes UTM params, normalizes trailing slashes, lowercases scheme/host
- [ ] `hashContent(title: string, publishedAt: Date): string` – SHA‑256 of title + publishedAt ISO
- [ ] Pure functions – zero Next.js or DB imports

#### `src/domain/ranking/score.ts` — CREATE [PRD §6, PAD §7]
**Checklist:**
- [ ] `calculateImportanceScore(inputs: ScoringInputs): number` – returns float in **0.0–1.0** range [v5.1 FIX]
- [ ] Recency decay, content availability bonus, summary bonus
- [ ] Pure function – no side effects

#### `src/features/feed/queries.ts` — CREATE [PAD §5.6]
**Checklist:**
- [ ] `getFeedArticles(params: { categorySlug?, cursor?, limit? })` – returns `FeedPage`
- [ ] LIMIT 31 pattern: fetch `limit + 1`, return `limit`, `hasNextPage = results.length > limit`
- [ ] `nextCursor` = `publishedAt` of last item in returned page
- [ ] Always `LEFT JOIN sources`
- [ ] `getCategories()` uses `"use cache"` with `cacheLife('reference')`

#### `src/features/feed/actions.ts` — CREATE
**Checklist:**
- [ ] `'use server'` directive
- [ ] `savePreference`, `setFavoriteCategory`, `muteSource` – all call `verifySession()`
- [ ] Input validation with Zod
- [ ] `revalidatePath` / `revalidateTag` after mutations (2‑argument form)

#### `src/features/feed/components/FeedGrid.tsx` — CREATE [PRD §4.3, PAD §5.6]
**Checklist:**
- [ ] Parent grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8` (no `gap-y`)
- [ ] `role="feed"` and `aria-label="News articles"`
- [ ] Empty state: `font-mono text-[11px] uppercase tracking-widest text-ink-300` with ember dot
- [ ] Skeleton state: renders 6 `ArticleCardSkeleton` when `isLoading=true`
- [ ] No fixed heights – subgrid handles alignment

#### `src/features/feed/components/ArticleCard.tsx` — CREATE [PRD §4.3, PAD §5.6]
**Checklist (critical UI states):**
- [ ] `<article>` with `grid grid-rows-subgrid row-span-3 gap-y-3 mb-10 last:mb-0`
- [ ] Headline: `font-editorial text-xl leading-tight text-ink-900 font-[800] tracking-[-0.02em]`
- [ ] Headline hover: `group-hover:text-dispatch-ember transition-colors duration-300`
- [ ] `<Link>` with `after:absolute after:inset-0` for full‑card click area
- [ ] Focus ring visible on keyboard navigation
- [ ] Excerpt: `line-clamp-3` – if null, show italic "No excerpt available."
- [ ] Metadata row: source name, bullet, relative time, "AI Brief" badge
- [ ] "AI Brief" badge visible only when `hasSummary && summaryStatus === 'ok'`
- [ ] `<time>` has `dateTime={article.publishedAt.toISOString()}`

#### `src/features/feed/components/TopicNav.tsx` — CREATE
**Checklist:**
- [ ] `'use client'` for `usePathname`
- [ ] Horizontal scroll on mobile: `overflow-x-auto scrollbar-hide`
- [ ] Active state: `border-b-2 border-dispatch-ember text-ink-900 font-semibold`
- [ ] Font: `font-mono text-[11px] uppercase tracking-widest`
- [ ] Each item is a `<Link>` – "Top Stories" to `/`

#### `src/app/(public)/page.tsx` — MODIFY (home feed)
**Checklist:**
- [ ] `"use cache"` with `cacheLife('feed')` and `cacheTag('feed:top')`
- [ ] `<Suspense fallback={<FeedSkeleton />}>` around dynamic content
- [ ] Imports `getFeedArticles()` from feature queries
- [ ] Renders `<FeedGrid>` and `<TopicNav>`

#### `src/app/(public)/topics/[category]/page.tsx` — CREATE [PRD §5.3, PAD §5.7]
**Checklist:**
- [ ] `params: Promise<{ category: string }>` – always `await params`
- [ ] `notFound()` if category slug doesn't exist
- [ ] `"use cache"` with `cacheLife('topicShell')` and `cacheTag(\`feed:${category}\`)`
- [ ] `generateStaticParams()` for category slugs
- [ ] Reuses `FeedGrid` and `TopicNav`

#### `src/app/(public)/article/[id]/page.tsx` — CREATE
**Checklist:**
- [ ] `params: Promise<{ id: string }>` – `await params`
- [ ] `notFound()` if article not found
- [ ] Fully dynamic – NO `"use cache"` (summary status is real‑time)
- [ ] `<Suspense>` around summary panel
- [ ] "Request AI Summary" button if `summaryStatus === 'none'`
- [ ] `generateMetadata()` with JSON‑LD provenance in `<script type="application/ld+json">` when summary exists
- [ ] `X-AI-Provenance` header set via `generateMetadata()` `other` field

#### `src/app/(public)/loading.tsx` — CREATE
**Checklist:**
- [ ] Returns `<FeedSkeleton />`
- [ ] No layout shift

#### `src/app/(public)/error.tsx` — CREATE
**Checklist:**
- [ ] `'use client'` directive
- [ ] Shows human‑friendly error message
- [ ] "Try again" button calls `reset()`
- [ ] No raw error details exposed

#### `src/app/(public)/not-found.tsx` — CREATE
**Checklist:**
- [ ] Headline in `font-editorial`
- [ ] Link back to home feed

**Phase 4 Success Criteria:**
- [ ] Home page renders with CSS Subgrid cards
- [ ] Topic pages filter correctly by category
- [ ] Cursor pagination works
- [ ] "AI Brief" badge visible when summary exists
- [ ] Empty state displayed when no articles
- [ ] Loading skeleton during data fetch
- [ ] Error boundary catches and displays errors
- [ ] `tsc --noEmit` passes
- [ ] Lighthouse accessibility score ≥ 95 (WCAG AAA)

---

## Phase 5: AI Summarisation Pipeline

### Objective
Build complete AI summarisation system: content availability guard, Zod‑validated prompt schemas, NutritionLabel disclosure component, 3‑layer provenance generation, and enqueue endpoint.

### Files to Create / Modify

#### `src/features/summaries/lib/summariseSchema.ts` — CREATE [PRD §7, PAD §7.1]
**Checklist:**
- [ ] `summaryText: z.string().min(50).max(800)`
- [ ] `keyPoints: z.array(z.string().min(1).max(120)).min(1).max(5)`
- [ ] `sourcesCited: z.array(z.object({ url: z.string().url(), title: z.string() })).min(1)`
- [ ] `aiStatement: z.string().min(20).max(200)`
- [ ] `coveragePercentage: z.number().int().min(0).max(100)`

#### `src/lib/ai/prompts.ts` — CREATE [PRD §7, PAD §8.4]
**Checklist:**
- [ ] `buildSummarisationPrompt(params)` – pure function
- [ ] System prompt with role definition and constraints
- [ ] Output format references `summariseOutputSchema` field names
- [ ] EU AI Act compliance instruction embedded

#### `src/lib/ai/provenance.ts` — CREATE [PRD §7.1, PAD §8.4]
**Checklist:**
- [ ] `generateProvenanceMetadata(summary: ArticleSummary): { metaTag, jsonLd, httpHeader }`
- [ ] JSON‑LD: `@context: 'https://schema.org'`, `@type: 'CreativeWork'`, `isBasedOn`, `accountablePerson`, `dateModified`, `description`
- [ ] HTTP header: base64‑encoded JSON with `{model, generatedAt, sourcesVerified, coveragePercentage, compliance: 'eu-ai-act-art50'}`
- [ ] HTML meta tag: semicolon‑delimited string
- [ ] **C2PA explicitly rejected** — no text standard exists

#### `src/features/summaries/components/NutritionLabel.tsx` — CREATE [PRD §4.4, PAD §8.4]
**Checklist:**
- [ ] `<aside aria-label="AI-generated summary transparency label">`
- [ ] Left border `border-l-2 border-dispatch-ember`
- [ ] Header: `font-mono text-[10px] uppercase tracking-widest text-ink-300`
- [ ] Summary text: `font-ui text-base leading-relaxed text-ink-900`
- [ ] Transparency label section with `border-t border-ink-100`
- [ ] Source citations: numbered `[1]`, `[2]` in `font-mono text-ink-300`
- [ ] "Verify with original source →" link with `target="_blank" rel="noopener noreferrer"`

#### `src/features/summaries/components/DisclosureBadge.tsx` — CREATE
**Checklist:**
- [ ] `font-mono text-[10px] uppercase tracking-widest text-dispatch-ember`
- [ ] Dot indicator `w-1.5 h-1.5 rounded-full bg-dispatch-ember`
- [ ] `needs_review`: amber dot with "Under Review"
- [ ] `pending`: gray dot with "Processing" (no spinner)
- [ ] `onClick` scrolls to `#ai-summary`

#### `src/features/summaries/components/SummaryPanel.tsx` — CREATE [PRD §7.1, PAD §7.4]
**Checklist (handles all 5 states):**
- [ ] `none` → "Request AI Summary" button
- [ ] `pending` → "Generating AI summary..." status text
- [ ] `ok` → `<NutritionLabel summary={summary} />`
- [ ] `needs_review` → "Summary under editorial review" notice
- [ ] `disabled` → renders `null` (no UI hint)
- [ ] Button disabled during pending (no double‑submit)
- [ ] Uses `useOptimistic()` for instant UI update

#### `src/features/summaries/actions.ts` — CREATE [PAD §7.4]
**Checklist:**
- [ ] `'use server'` directive
- [ ] `requestSummary(articleId)` – validates UUID, content availability guard, enqueues via `summarizeQueue.add`
- [ ] Returns `{ success: true, jobId }` or error
- [ ] `flagSummary(summaryId, flagReason)` – calls `verifyAdminSession()`
- [ ] `disableSummary(summaryId)` – admin only

#### `src/app/api/summarize/[id]/route.ts` — CREATE
**Checklist:**
- [ ] `params: Promise<{id: string}>` – `await params`
- [ ] Validates UUID – 400 if invalid
- [ ] 404 if article not found
- [ ] 409 if `summaryStatus !== 'none'`
- [ ] 400 if `contentAvailability` is `title_only` or `excerpt`
- [ ] **Rate limiting** (e.g., max 5 requests/hour per user), returning **429** if exceeded. See `src/lib/rate-limit.ts` (Phase 8). [v5.1 VALIDATION FIX]
- [ ] Enqueues job, returns 202 with `{ jobId }`
- [ ] Requires valid session (user must be signed in)

**Phase 5 Success Criteria:**
- [ ] `POST /api/summarize/:id` returns 202 and job appears in BullMQ
- [ ] Content guard correctly rejects invalid articles with 400
- [ ] NutritionLabel renders all sections with correct typography
- [ ] JSON‑LD appears in article page `<head>` when summary exists
- [ ] `X-AI-Provenance` header present
- [ ] All 5 summary states render correctly
- [ ] TypeScript strict

---

## Phase 6: Search, Admin & Public API

### Objective
Implement full‑text search with `pg_textsearch` BM25, admin source management UI, summary review queue, and public REST API.

### Files to Create / Modify

#### `src/features/search/queries.ts` — CREATE [PRD §6, PAD §3 ADR-005]
**Checklist:**
- [ ] Uses native PostgreSQL FTS: `WHERE search_vector @@ websearch_to_tsquery('english', $query) ORDER BY ts_rank_cd('{0.1, 0.2, 0.4, 1.0}', search_vector, websearch_to_tsquery('english', $query)) DESC` [v5.1 FIX: dropped invalid `<@>` operator]
- [ ] **Drizzle `ts_rank_cd` requires `sql` template literal** — Drizzle ORM has no native `ts_rank_cd` builder. Use: `sql\`ts_rank_cd('{0.1, 0.2, 0.4, 1.0}', ${articles.searchVector}, ${websearchToTsQuery})\`` [v5.1 VALIDATION FIX]
- [ ] `searchArticles(params: { query, categorySlug?, cursor?, limit? })` – returns `SearchResult`
- [ ] `getSearchSuggestions(partial: string)` – uses `similarity(title, $partial) > 0.3` via pg_trgm
- [ ] LIMIT 31 pattern for pagination

#### `src/features/search/components/SearchBar.tsx` — CREATE
**Checklist:**
- [ ] `'use client'`
- [ ] `useDebounce(query, 300)`
- [ ] `⌘K` / `Ctrl+K` keyboard shortcut to focus
- [ ] Loading spinner during search
- [ ] Clear button when query non‑empty
- [ ] `aria-label="Search news articles"`, `role="search"`

#### `src/features/search/components/SearchResults.tsx` — CREATE
**Checklist:**
- [ ] Loading: shows `ArticleCardSkeleton` ×3
- [ ] Empty: `font-mono text-[11px] text-ink-300` – "No results for '{query}'"
- [ ] Result count above results
- [ ] Each result reuses `ArticleCard`

#### `src/app/(public)/search/page.tsx` — CREATE
**Checklist:**
- [ ] `searchParams: Promise<{q?: string}>` – `await searchParams`
- [ ] Reads `q` from URL – server‑rendered with initial results
- [ ] `<SearchBar defaultValue={q} />`
- [ ] `generateMetadata()` with dynamic title

#### `src/app/api/articles/route.ts` — CREATE
**Checklist:**
- [ ] `GET /api/articles?category=&cursor=&q=&limit=`
- [ ] `limit` clamped to max 100
- [ ] If `q` present → `searchArticles()`, else `getFeedArticles()`
- [ ] `cursor` parsed as ISO date – 400 if invalid
- [ ] Response: `{ articles, nextCursor, hasNextPage }`
- [ ] `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- [ ] CORS headers for external consumers

#### `src/app/(admin)/layout.tsx` — CREATE
**Checklist:**
- [ ] Server Component – no `'use client'`
- [ ] Calls `await verifyAdminSession()` – redirects non‑admins to `/`
- [ ] Admin sidebar nav: Sources, Summaries, Health, Settings
- [ ] Sidebar styled with `bg-ink-900` (dark editorial authority)
- [ ] Active nav item: `text-dispatch-ember`

#### `src/app/(admin)/sources/page.tsx` — CREATE
**Checklist:**
- [ ] Server Component with `await verifyAdminSession()`
- [ ] Table: source name, URL, category, status badge, last success, failure count
- [ ] Status badge: `active` (sage), `error` (ember), `paused` (slate), `disabled` (muted)
- [ ] "Add Source" button opens `<AddSourceDialog>` (Radix Dialog)
- [ ] "Test Connection" button per row (client action)
- [ ] Pagination

#### `src/app/(admin)/sources/actions.ts` — CREATE
**Checklist:**
- [ ] `addSource`, `updateSource`, `pauseSource`, `deleteSource` – all call `verifyAdminSession()`
- [ ] `addSource` validates `feedUrl`, checks for duplicates
- [ ] `testSourceConnection` fetches feed URL, returns article count
- [ ] `deleteSource` soft‑delete preferred (status='disabled')
- [ ] All mutations use `revalidatePath('/admin/sources')`

#### `src/app/(admin)/summaries/page.tsx` — CREATE [PAD §7.4]
**Checklist:**
- [ ] Server Component with `await verifyAdminSession()`
- [ ] `<SummaryReviewTable>` with columns: article title, flag reason, model, generated at, actions
- [ ] Actions: "Approve" (→ ok), "Disable" (→ disabled), "Regenerate"
- [ ] Matches state machine: `ok → needs_review → disabled`

**Phase 6 Success Criteria:**
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

#### `src/workers/index.ts` — CREATE
**Checklist:**
- [ ] Starts all 4 workers: ingest (concurrency 50), summarize (5), score (20), feedSlice (10)
- [ ] SIGTERM/SIGINT handlers: `await Promise.all(workers.map(w => w.close()))`
- [ ] Graceful shutdown – `process.exit(0)` after close
- [ ] Console logging with timestamps

#### `src/workers/jobs/ingest.ts` — CREATE
**Checklist:**
- [ ] Fetches feed URL with 30s timeout
- [ ] Handles RSS, Atom, JSON Feed formats
- [ ] `normalizeCanonicalUrl()` on each article URL
- [ ] `hashContent(title, publishedAt)` for change detection
- [ ] `db.insert(articles).onConflictDoUpdate()` – idempotent upsert
- [ ] Updates `contentAvailability` via `determineContentAvailability()`
- [ ] On success: updates `sources.lastSuccessAt`, resets `consecutiveFailures`
- [ ] On failure: increments `consecutiveFailures`, sets `lastErrorMessage`
- [ ] Auto‑disables source after 5 consecutive failures (`status = 'error'`)
- [ ] Enqueues score jobs for new articles via `scoreQueue.add()`

#### `src/workers/jobs/summarize.ts` — CREATE [PRD §7, PAD §7.1]
**Checklist:**
- [ ] Content guard: if `contentAvailability` is `title_only` or `excerpt` → return early
- [ ] `generateObject({model: anthropic('claude-haiku-4-5'), schema: summariseOutputSchema})`
- [ ] Fallback: if Anthropic fails → retry with `openai('gpt-5-mini')`
- [ ] Validates output with Zod – ZodError triggers retry
- [ ] Inserts into `summaries` table with all provenance fields
- [ ] Updates `articles.summaryStatus = 'ok'` and `articles.hasSummary = true`
- [ ] On failure: sets `articles.summaryStatus = 'none'` (allow retry)

#### `src/workers/jobs/score.ts` — CREATE
**Checklist:**
- [ ] Fetches article with source reliability info
- [ ] Calls `calculateImportanceScore()` (returns float 0.0–1.0)
- [ ] Updates `articles.importanceScore`
- [ ] Enqueues `feedSliceQueue.add()` to refresh Redis cache

#### `src/workers/jobs/scheduler.ts` — CREATE
**Checklist:**
- [ ] Fetches all `active` sources from DB
- [ ] For each source: `ingestQueue.upsertJobScheduler({name: 'ingest', pattern: '*/60 * * * *', jobId: sourceId})`
- [ ] Pattern is dynamic: `pollIntervalMinutes` per source
- [ ] Idempotent – calling twice doesn't create duplicate schedulers
- [ ] Called on worker startup

#### `src/workers/jobs/determineContentAvailability.ts` — CREATE
**Checklist:**
- [ ] Pure function: `'title_only'` if no title, `'excerpt'` if no excerpt, `'partial_text'` if body < 500 chars, else `'full_text'`

#### `src/lib/security/encrypt.ts` — CREATE
**Checklist:**
- [ ] `encryptPushKeys(keys: { p256dh, auth }): string` – AES‑256‑GCM, IV random 16 bytes
- [ ] Output format: `${iv}:${authTag}:${encrypted}` (hex‑encoded)
- [ ] `decryptPushKeys(encryptedString): { p256dh, auth }` – validates format, throws descriptive error
- [ ] `PUSH_KEY_ENCRYPTION_KEY` validated at module load (length 64, hex chars)

#### `src/workers/push/isWithinQuietHours.ts` — CREATE
**Checklist:**
- [ ] Imports `DateTime` from `'luxon'` – NOT native Date
- [ ] Returns `false` (fail open) if any preference is null
- [ ] `DateTime.fromJSDate(nowUtc, { zone: briefingTimezone })` – DST‑correct
- [ ] Handles overnight wrap (`startMinutes > endMinutes`)
- [ ] Handles same‑day wrap

#### `src/app/api/push/subscribe/route.ts` — CREATE
**Checklist:**
- [ ] Requires valid session (`verifySession()`)
- [ ] Validates subscription body with Zod (`endpoint`, `keys.p256dh`, `keys.auth`)
- [ ] Encrypts keys via `encryptPushKeys()` before storing
- [ ] Upserts into `pushSubscriptions` table
- [ ] Returns 201 Created

#### `src/workers/lib/cacheInvalidation.ts` — CREATE
**Checklist:**
- [ ] All calls use 2‑argument form: `revalidateTag('feed:tech', 'feed')` – NOT single arg
- [ ] `invalidateFeedCache(categorySlug)`: `revalidateTag(\`feed:${categorySlug}\`, 'feed')`
- [ ] `invalidateTopicShell()`: `revalidateTag('topic-shell', 'topicShell')`
- [ ] `invalidateReference()`: `revalidateTag('reference-data', 'reference')`

#### `src/app/api/health/route.ts` — MODIFY
**Checklist:**
- [ ] `SELECT 1` via Drizzle to verify DB connectivity
- [ ] Redis ping via `connection.ping()`
- [ ] Returns `{ status: 'ok', db: 'connected', redis: 'connected', timestamp }` on 200
- [ ] Returns 503 if any dependency is down
- [ ] No auth required

**Phase 7 Success Criteria:**
- [ ] Worker starts without errors: `npx tsx src/workers/index.ts`
- [ ] Ingest worker picks up jobs from `ingestQueue`
- [ ] Summarise worker respects content availability guard
- [ ] SIGTERM causes clean shutdown with no job loss
- [ ] Push encryption/decryption round‑trip passes
- [ ] Quiet hours evaluation correct across DST transition (unit test)
- [ ] `/api/health` returns 200 with DB + Redis status

---

## Phase 8: Testing, CI/CD & Deployment [My_MEP Phase 10]

### Objective
Establish comprehensive testing infrastructure, continuous integration/deployment pipelines, and production deployment procedures. This phase was Phase 10 in My_MEP.md and is moved to Phase 8 in v5.1 as it runs in parallel with feature development.

### Files to Create / Modify

#### `.github/workflows/ci.yml` — CREATE
**Checklist:**
- [ ] Trigger: `push` and `pull_request` to `main`
- [ ] PostgreSQL 17 service container with `env` settings
- [ ] Redis 7 service container
- [ ] Node 24 setup
- [ ] `pnpm install` with frozen lockfile
- [ ] `pnpm tsc --noEmit`
- [ ] `pnpm lint`
- [ ] `pnpm test` (unit tests)
- [ ] `pnpm drizzle-kit generate` (validate schema)
- [ ] `pnpm build` (production build)
- [ ] Upload coverage to Codecov

#### `.github/workflows/e2e.yml` — CREATE
**Checklist:**
- [ ] Trigger: `push` and `pull_request` to `main`
- [ ] Playwright browser caching
- [ ] `npx playwright install --with-deps`
- [ ] Run E2E tests on Chromium, Firefox, WebKit
- [ ] Upload Playwright report as artifact
- [ ] Axe-core accessibility checks in every test

#### `lighthouserc.js` — CREATE
**Checklist:**
- [ ] Performance budget: ≥ 90
- [ ] Accessibility budget: ≥ 95
- [ ] Best Practices budget: ≥ 90
- [ ] SEO budget: ≥ 90
- [ ] PWA checks disabled (not PWA)
- [ ] Runs on `http://localhost:3000` (after production build)

#### `Dockerfile.web` — CREATE
**Checklist:**
- [ ] Multi-stage build
- [ ] Stage 1: `node:24-alpine` with `pnpm install`
- [ ] Stage 2: Production image with `next start`
- [ ] exposes port 3000
- [ ] Health check: `curl -f http://localhost:3000/api/health || exit 1`
- [ ] Non-root user for security

#### `Dockerfile.worker` — CREATE
**Checklist:**
- [ ] `node:24-alpine` base
- [ ] `pnpm install --production`
- [ ] Copy worker source and compiled output
- [ ] CMD: `node dist/workers/index.js`
- [ ] Health check via process manager

#### `docker-compose.prod.yml` — CREATE
**Checklist:**
- [ ] Web app service with `Dockerfile.web`
- [ ] Worker service with `Dockerfile.worker`
- [ ] PostgreSQL 17 service with volume persistence
- [ ] Redis 7 service with AOF + `noeviction`
- [ ] Nginx reverse proxy (optional, for SSL termination)
- [ ] Environment from `.env.production`

#### `scripts/deploy.sh` — CREATE
**Checklist:**
- [ ] Tagged release flow: `main` branch → `git tag` → build → push
- [ ] Database migration pre-deploy step: `drizzle-kit migrate`
- [ ] Zero-downtime deploy strategy (rolling update)
- [ ] Rollback procedure: `git revert` + redeploy previous tag

### Phase 8 Testing Strategy (merged from MEP v5.0 §5 + My_MEP)

#### Unit Testing (Vitest)
**Checklist:**
- [ ] `src/domain/**/*.test.ts` – pure logic (normalise, score, content availability)
- [ ] `src/lib/ai/provenance.test.ts` – JSON‑LD, header, meta tag generation
- [ ] `src/lib/security/encrypt.test.ts` – encryption round‑trip
- [ ] `src/workers/push/isWithinQuietHours.test.ts` – DST transitions, overnight wrap
- [ ] Coverage target: ≥ 90%

#### Integration Testing
**Checklist:**
- [ ] `src/features/feed/queries.test.ts` – with test database
- [ ] `src/features/search/queries.test.ts` – BM25 ranking
- [ ] `src/features/summaries/actions.test.ts` – content guard, enqueue
- [ ] API route tests

#### End‑to‑End Testing (Playwright)
**Critical journeys:**
1. User views home feed → clicks article → sees summary
2. User searches for a topic → navigates to search results
3. Admin logs in → adds a new RSS source → triggers ingestion
4. Admin reviews flagged summary → approves it → summary appears on article
5. User subscribes to push notifications → receives test push
6. User with reduced‑motion preference – all animations disabled

**Checklist:**
- [ ] `playwright.config.ts` configured for Chromium, Firefox, WebKit
- [ ] Axe‑core integration: `await injectAxe()`, `await checkA11y()`
- [ ] Lighthouse CI integrated: `lighthouserc.js` with budgets

#### Accessibility Automation
**Checklist:**
- [ ] `@axe-core/playwright` in every E2E test
- [ ] Manual screen‑reader tests (NVDA, VoiceOver, TalkBack)
- [ ] Contrast checker for all custom color combinations
- [ ] Focus order test (tab navigation)

### Phase 8 Success Criteria:
- [ ] CI pipeline passes on every PR (TypeScript, lint, tests, build)
- [ ] E2E tests pass on Chromium, Firefox, WebKit
- [ ] Lighthouse CI scores meet budgets
- [ ] Docker images build successfully
- [ ] `docker-compose.prod.yml` spins up full stack locally
- [ ] Deployment script executes without errors

---

## 3. Complete File Inventory (Merged)

### Files to CREATE (new)

| File Path | Phase |
|-----------|-------|
| `proxy.ts` | 1 |
| `src/lib/env/index.ts` | 1 |
| `drizzle.config.ts` | 1 |
| `.env.example` | 1 |
| `docker-compose.yml` | 1 |
| `scripts/init-extensions.sql` | 1 |
| `src/lib/db/schema.ts` | 2 |
| `src/lib/db/index.ts` | 2 |
| `src/lib/auth/index.ts` | 2 |
| `src/lib/auth/dal.ts` | 2 |
| `src/lib/queue/index.ts` | 2 |
| `src/app/api/auth/[...nextauth]/route.ts` | 2 |
| `src/shared/lib/utils.ts` | 3 |
| `src/shared/components/ui/Button.tsx` | 3 |
| `src/shared/components/ui/Badge.tsx` | 3 |
| `src/shared/components/ui/Separator.tsx` | 3 |
| `src/shared/components/ui/Skeleton.tsx` | 3 |
| `src/shared/components/layout/Header.tsx` | 3 |
| `src/shared/components/layout/Footer.tsx` | 3 |
| `src/shared/components/primitives/PageTransition.tsx` | 3 |
| `src/shared/hooks/useDebounce.ts` | 3 |
| `src/domain/articles/types.ts` | 4 |
| `src/domain/articles/normalize.ts` | 4 |
| `src/domain/ranking/score.ts` | 4 |
| `src/features/feed/queries.ts` | 4 |
| `src/features/feed/actions.ts` | 4 |
| `src/features/feed/components/FeedGrid.tsx` | 4 |
| `src/features/feed/components/ArticleCard.tsx` | 4 |
| `src/features/feed/components/TopicNav.tsx` | 4 |
| `src/app/(public)/topics/[category]/page.tsx` | 4 |
| `src/app/(public)/article/[id]/page.tsx` | 4 |
| `src/app/(public)/loading.tsx` | 4 |
| `src/app/(public)/error.tsx` | 4 |
| `src/app/(public)/not-found.tsx` | 4 |
| `src/features/summaries/lib/summariseSchema.ts` | 5 |
| `src/lib/ai/prompts.ts` | 5 |
| `src/lib/ai/provenance.ts` | 5 |
| `src/features/summaries/components/NutritionLabel.tsx` | 5 |
| `src/features/summaries/components/DisclosureBadge.tsx` | 5 |
| `src/features/summaries/components/SummaryPanel.tsx` | 5 |
| `src/features/summaries/actions.ts` | 5 |
| `src/app/api/summarize/[id]/route.ts` | 5 |
| `src/features/search/queries.ts` | 6 |
| `src/features/search/components/SearchBar.tsx` | 6 |
| `src/features/search/components/SearchResults.tsx` | 6 |
| `src/app/(public)/search/page.tsx` | 6 |
| `src/app/api/articles/route.ts` | 6 |
| `src/app/(admin)/layout.tsx` | 6 |
| `src/app/(admin)/sources/page.tsx` | 6 |
| `src/app/(admin)/sources/actions.ts` | 6 |
| `src/app/(admin)/summaries/page.tsx` | 6 |
| `src/workers/index.ts` | 7 |
| `src/workers/jobs/ingest.ts` | 7 |
| `src/workers/jobs/summarize.ts` | 7 |
| `src/workers/jobs/score.ts` | 7 |
| `src/workers/jobs/scheduler.ts` | 7 |
| `src/workers/jobs/determineContentAvailability.ts` | 7 |
| `src/lib/security/encrypt.ts` | 7 |
| `src/workers/push/isWithinQuietHours.ts` | 7 |
| `src/app/api/push/subscribe/route.ts` | 7 |
| `src/workers/lib/cacheInvalidation.ts` | 7 |
| `drizzle/custom-indexes.sql` | 2 |
| `scripts/migrate.ts` | 2 |
| `scripts/seed.ts` | 2 |
| `.github/workflows/ci.yml` | 8 |
| `.github/workflows/e2e.yml` | 8 |
| `lighthouserc.js` | 8 |
| `Dockerfile.web` | 8 |
| `Dockerfile.worker` | 8 |
| `docker-compose.prod.yml` | 8 |
| `scripts/deploy.sh` | 8 |

### Files to MODIFY (existing)

| File Path | Phase | Changes |
|-----------|-------|---------|
| `next.config.ts` | 1 | Full production configuration |
| `tsconfig.json` | 1 | `strict: true`, `noUncheckedIndexedAccess: true` |
| `package.json` | 1 | Install all dependencies |
| `src/app/globals.css` | 3 | `@theme` tokens, font‑face, resets |
| `src/app/layout.tsx` | 3 | Fonts, providers |
| `src/app/page.tsx` | 4 | Home feed (full rewrite) |
| `src/app/api/health/route.ts` | 7 | Add DB + Redis health checks |

### Files to DELETE

| File Path | Reason |
|-----------|--------|
| `src/db/schema.ts` | Superseded by `src/lib/db/schema.ts` |
| `src/db/index.ts` | Superseded by `src/lib/db/index.ts` |
| `drizzle.config.json` | Superseded by `drizzle.config.ts` |

---

## 4. Cross‑Cutting Concerns

### TypeScript Enforcement
- `strict: true` – non‑negotiable
- `noUncheckedIndexedAccess: true` – added in v5.1 [My_MEP]
- Zero `any` – use `unknown` with type guards
- `interface` for structural types, `type` for unions/intersections
- All public API boundaries have explicit return types
- Types derived from Drizzle schema via `$inferSelect` – never hand‑written

### Security Checklist [PRD §9, PAD §11]
- [ ] `proxy.ts` is UX‑only – real auth at DAL
- [ ] All Server Actions call `verifySession()` / `verifyAdminSession()` first
- [ ] All DB queries parameterized (Drizzle handles this)
- [ ] Push subscription keys encrypted with AES‑256‑GCM before storage
- [ ] `PUSH_KEY_ENCRYPTION_KEY` validated at startup
- [ ] `AUTH_SECRET` minimum 32 chars validated by Zod
- [ ] Admin routes double auth check (layout + Server Action)
- [ ] External links: `rel="noopener noreferrer"`
- [ ] No raw error details exposed to users in production

### Accessibility Checklist (WCAG AAA Mandatory) [PRD §4.4, PAD §5.5]
- [ ] Focus rings: `focus-visible:ring-2 focus-visible:ring-dispatch-ember`
- [ ] All images have `alt` attributes
- [ ] `<time>` with `dateTime` for all timestamps
- [ ] `<nav aria-label>` for all navigation regions
- [ ] `role="feed"` on feed containers
- [ ] `role="search"` on search form
- [ ] Skip‑to‑content link at top of page
- [ ] `prefers-reduced-motion` disables all animations
- [ ] Color contrast: `ink-600` on `paper-50` is WCAG AAA (9.5:1)
- [ ] AI disclosure: `aria-label="AI-generated summary transparency label"`
- [ ] Every list has an empty state with screen‑reader announcement
- [ ] Error messages announced via `aria-live="polite"`

### UI State Checklist (Every Component)
- [ ] **Loading** – skeleton only when no data exists (not shown for refetch)
- [ ] **Error** – user‑friendly message + retry button
- [ ] **Empty** – informative text, not just blank
- [ ] **Success** – visual feedback (e.g., toast for subscription)
- [ ] **Async operation** – button disabled, loading indicator shown
- [ ] **onError handler** – always present with user feedback

### Performance Budget [MEP v5.0 + My_MEP]
| Metric | Target |
|--------|--------|
| TTFB (PPR shell) | < 50ms (CDN edge) |
| LCP | < 2.5s |
| CLS | < 0.1 |
| TTI (topic feed) | < 1.5s (3G/4G) |
| Lighthouse Performance | ≥ 90 |
| Lighthouse Accessibility | ≥ 95 |

---

## 5. Risk Register (R1–R14) [PAD §11, corrected]

| ID | Risk | Likelihood | Impact | Evidence‑Backed Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **R1** | `use cache` silently inert without `cacheComponents: true` | Very High | Critical | Flag locked at top‑level of `next.config.ts`. CI lint rule asserts its presence. |
| **R2** | ViewTransition API renamed before stabilisation | High | High | All usage strictly routed through `<PageTransition>` abstraction. Migration is a 1‑file change. |
| **R3** | Firefox users see no transitions | ~~Certain~~ **Low** | ~~High~~ **Low** | Firefox 144+ (Oct 2025) ships View Transitions **stable, no flag**. Progressive enhancement already degrades gracefully. [v5.1 FIX] |
| **R4** | `revalidateTag()` called with single argument | Medium | Medium | TypeScript error in Next.js 16. Two‑arg form enforced in `cacheInvalidation.ts`. |
| **R5** | `experimental.ppr` left in config from Next.js 15 | Medium | High | Build error in Next.js 16. Explicitly removed from `next.config.ts`. |
| **R6** | Multi‑instance in‑memory cache fragmentation | High (default) | Medium | Acceptable for Phase 1 (single instance). Remote cache handler mandated for Phase 2. |
| **R7** | Security: Unpatched Next.js 16.x (CVE‑2025‑55182) | High if unpatched | Critical | Minimum version strictly pinned to `≥16.0.7`. Automate dependency update PRs. [v5.1 FIX] |
| **R8** | Auth.js v5 remains in beta | High | Medium | Exact beta version pinned. Monitor `authjs.dev` for stable release. DAL handles session validation safely. |
| **R9** | Summarising low‑quality content (AI hallucination) | Medium | High | Ingestion pipeline guard: enqueue summarise *only* if `contentAvailability IN ('partial_text', 'full_text')`. |
| **R10** | Quiet hours DST evaluation error | Medium | Medium | `luxon` mandated for all timezone comparisons. Raw `Date` arithmetic explicitly forbidden. |
| **R11** | Push subscription key exposure | Low | Medium | `keys` JSONB encrypted at rest with AES‑256‑GCM. Decryption key stored in environment variable only. |
| **R12** | Duplicate subcategory slugs | Low | High | Composite unique constraint `(categoryId, slug)` enforced at database level in Drizzle schema. |
| **R13** | EU AI Act machine‑readable marking insufficient | Medium | High | 3‑layer disclosure (JSON‑LD + HTTP header + Meta tag) implemented. C2PA explicitly rejected for text. |
| **R14** | Unbounded feed query without pagination | High | High | Cursor‑based pagination with strict `LIMIT 31` pattern enforced in all feed queries. |

---

## 6. Validation Protocol (Per Phase) [PRD §10, PAD §10]

After each phase, run:

```bash
# 1. TypeScript
npx tsc --noEmit --pretty false

# 2. Type generation
npx next typegen

# 3. Production build
npm run build

# 4. Database migration (Phase 2+)
npx drizzle-kit generate
npx drizzle-kit migrate

# 5. Unit tests
npm run test

# 6. Lint
npm run lint
```

**Pass criteria:** Zero TypeScript errors, zero build warnings about misplaced config flags, zero Drizzle schema errors, all unit tests pass.

---

## 7. Final Delivery Checklist [MEP v5.0 + My_MEP merged]

- [ ] **Phase 1** – Foundation configured; `npm run build` passes
- [ ] **Phase 2** – Schema applied; `drizzle-kit migrate` succeeds
- [ ] **Phase 3** – Design system renders; Newsreader visible, tokens match PRD
- [ ] **Phase 4** – Feed renders at `/` and `/topics/:category`; pagination works
- [ ] **Phase 5** – AI pipeline; summary appears after job completes; 3‑layer disclosure present
- [ ] **Phase 6** – Search returns results; admin routes protected; summary review works
- [ ] **Phase 7** – Worker starts and picks up jobs; push notifications encrypt/decrypt; health endpoint OK
- [ ] **Phase 8** – CI/CD pipeline passes; Docker images build; deployment script ready
- [ ] **Zero TypeScript errors** across entire codebase
- [ ] **Zero `any` types** (enforced by `strict: true`)
- [ ] **All API endpoints** respond correctly (health, articles, summarize, push)
- [ ] **WCAG AAA** – automated + manual screen‑reader tests pass
- [ ] **`prefers-reduced-motion`** disables all animations
- [ ] **EU AI Act 3‑layer disclosure** present on all summarised articles
- [ ] **Content availability guard** prevents summarisation of `title_only`/`excerpt`
- [ ] **Admin routes** inaccessible to non‑admin users
- [ ] **Lighthouse CI** – Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90
- [ ] **Production build** deployed; `/api/health` returns 200
- [ ] **CVE version** pinned to `≥16.0.7` (not `≥16.2.6`) [v5.1 FIX]
- [ ] **Search** uses native `@@ websearch_to_tsquery()` with `ts_rank_cd` (not invalid `<@>`) [v5.1 FIX]
- [ ] **`proxy.ts` matcher** uses broad PRD pattern (not narrow `/admin/:path*`) [v5.1 FIX]
- [ ] **BullMQ** split into Worker/Queue connection configs [v5.1 FIX]
- [ ] **`cacheLife`** profiles include `stale`, `revalidate`, and `expire` [v5.1 FIX]
- [ ] **Importance score** returns float [0.0, 1.0] (not integer 0–100) [v5.1 FIX]

---

## 8. Appendices

### A. Environment Variables (`.env.example`)

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/onestopnews

# Redis (Upstash or self-hosted)
REDIS_URL=redis://localhost:6379

# Auth.js v5
AUTH_SECRET= # generate with: openssl rand -base64 33
AUTH_URL=http://localhost:3000  # Production: your canonical URL

# AI Providers
ANTHROPIC_API_KEY=sk-ant-...             # Claude 4.5 Haiku (primary)
OPENAI_API_KEY=sk-...                    # GPT-5 Mini (fallback)

# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=            # generate with: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@onestopnews.com

# Push Key Encryption (AES-256-GCM, 64 hex chars)
PUSH_KEY_ENCRYPTION_KEY=                 # generate with: openssl rand -hex 32

# Optional OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Environment
NODE_ENV=development
```

### B. Custom Drizzle Migrations

`drizzle/custom-indexes.sql`:
```sql
-- GIN FTS (fastupdate=off is mandatory for ingestion workload)
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
CREATE INDEX IF NOT EXISTS sources_status_idx ON sources (status) WHERE status = 'active';
```

### C. License & Attribution

This execution plan is provided under the MIT license for internal use by the OneStopNews project. All design decisions are documented for long‑term maintainability.

**Changes from MEP v5.0 → v5.1:**
1. **Critical-1:** CVE version corrected: `≥16.2.6` → `≥16.0.7`
2. **Critical-2:** Search syntax corrected: dropped invalid `<@> websearch_to_tsquery()` hybrid
3. **Critical-3:** `proxy.ts` matcher fixed: narrow → broad PRD pattern
4. **Critical-4:** Risk R3 Firefox: `Certain` → `Low`
5. **Moderate-1:** BullMQ Redis: single connection → split Worker/Queue configs
6. **Moderate-2:** `cacheLife` profiles: added `expire` field
7. **Moderate-3:** `calculateImportanceScore`: returns float [0.0, 1.0]
8. **Enhancement:** New Phase 8: Testing, CI/CD & Deployment (from My_MEP.md)
9. **Enhancement:** `noUncheckedIndexedAccess: true` added to tsconfig requirements
10. **Enhancement:** All checklist items annotated with PRD/PAD section references

---

**This MASTER_EXECUTION_PLAN_v5.1 supersedes all previous versions. Implementation must follow the phase order and checklists exactly. Any deviation requires explicit approval.**