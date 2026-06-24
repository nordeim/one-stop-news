# OneStopNews — MASTER_EXECUTION_PLAN_v5.0

**Classification:** Authoritative Implementation Blueprint  
**Status:** FINAL – Merged from MEP v4.5 (sonnet) + Claw Code MEP  
**Companion Documents:** PRD v4.3 · PAD v4.5 · CLAUDE.md · README.md  
**Last Updated:** June 11, 2026  
**Prepared By:** Claw Code — Frontend Architect & Avant-Garde UI Designer

---

## Executive Summary

OneStopNews is a **topic‑first news aggregation and AI summarisation platform** built on Next.js ≥16.2.6 (CVE‑2025‑55182 mitigated), React 19.2, PostgreSQL 17, BullMQ v5 on Redis, and a separate Node.js 24 LTS worker service. The codebase is organised as a **modular monolith** (web app) + **standalone worker service**, connected via BullMQ queues and a shared PostgreSQL database.

**Key merged decisions** from comparative analysis:

| Decision | Source | Rationale |
|----------|--------|-----------|
| 7‑phase structure | Provided MEP v4.5 | Cleaner handoffs, logical bundling |
| `cacheComponents: true` at top‑level | Provided MEP + validation | Next.js 16 requirement |
| `proxy.ts` replaces `middleware.ts` | Provided MEP + validation | Next.js 16 migration |
| `pg_textsearch` BM25 for full‑text search | Provided MEP | Modern relevance ranking |
| `postgres` (postgres.js) driver | Provided MEP | Enables lazy proxy connection |
| WCAG AAA mandatory (not aspirational) | Claw MEP | Meets Claude Code standard |
| UI state checklists (loading/error/empty/success/async) | Claw MEP | Enforces complete user feedback |
| Testing suite (Vitest, Playwright, Lighthouse CI) | Claw MEP | Ensures quality gates |
| Performance budget (TTFB, LCP, CLS, TTI) | Claw MEP | Core Web Vitals compliance |
| Risk register (R1–R14) | Claw MEP | Explicit mitigations for known pitfalls |

---

## 1. Deep Analysis & Core Architectural Pillars

### 1.1 The Meticulous Approach (Our Operating Framework)

All work follows the **six‑phase workflow**:
1. **ANALYZE** – multi‑dimensional requirement mining
2. **PLAN** – structured execution roadmap
3. **VALIDATE** – explicit user confirmation before coding
4. **IMPLEMENT** – modular, tested, documented builds
5. **VERIFY** – rigorous QA against success criteria
6. **DELIVER** – complete handoff with knowledge transfer

### 1.2 5‑Layer Request Model

```
Layer 0: proxy.ts (Network boundary, cookie check)
Layer 1: App Router (Next.js routing)
Layer 2: Feature Modules (feed, summaries, search, admin)
Layer 3: Domain Services (pure business logic, no Next.js imports)
Layer 4: Infrastructure (DB clients, queue clients, AI SDKs)
```

### 1.3 "Editorial Dispatch" Design System

| Element | Choice | Anti‑generic rejection |
|---------|--------|------------------------|
| Serif headline | **Newsreader** | Inter, Roboto, Space Grotesk |
| Sans‑serif body | **Instrument Sans** | |
| Monospace | **Commit Mono** | |
| Accent color | `--dispatch-ember` (`#c7513f`) | purple gradients, amber warnings |
| Layout | CSS Subgrid for feed alignment | fixed heights, JS measurement |

### 1.4 Critical Configuration Invariants (Validated with External Sources)

| Flag | Placement | Why | Source |
|------|-----------|-----|--------|
| `cacheComponents: true` | Top‑level | Silently ignored if inside `experimental` | Next.js 16 docs |
| `cacheLife` profiles | Top‑level | Runtime throws if missing | Next.js 16 docs |
| `turbopack: {}` | Top‑level | Graduated from experimental | Next.js 16 docs |
| `reactCompiler: true` | Top‑level | Ignored if in `experimental` | Next.js 16 docs |
| `experimental.viewTransition: true` | Inside `experimental: {}` | Transitions disabled if misplaced | React 19 docs |
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

---

## 2. Merged Phase Structure (7 Phases)

```
Phase 1: Foundation & Configuration
Phase 2: Database Schema & Infrastructure
Phase 3: Design System & Shared Components
Phase 4: Core Feed Feature (Topic‑First Feed)
Phase 5: AI Summarisation Pipeline
Phase 6: Search, Admin & Public API
Phase 7: Worker Service, Push Notifications & Observability
```

Each phase is independently deployable and verifiable. Phases 1–4 constitute V1 (feature‑complete). Phases 5–7 are enhancement layers.

---

## Phase 1: Foundation & Configuration

### Objective
Establish correct Next.js 16 configuration, install all required dependencies, wire up environment variable schema with Zod, and create `proxy.ts` (replaces `middleware.ts`).

### Files to Create / Modify

#### `next.config.ts` — MODIFY
**Checklist:**
- [ ] `cacheComponents: true` at top‑level (not inside `experimental`)
- [ ] `cacheLife` profiles at top‑level: `feed` (60s stale, 300s revalidate), `topicShell` (3600s), `reference` (86400s)
- [ ] `turbopack: {}` at top‑level
- [ ] `reactCompiler: true` at top‑level
- [ ] `experimental.viewTransition: true` inside `experimental: {}`
- [ ] `experimental.clientSegmentCache: true` inside `experimental: {}`
- [ ] `experimental.ppr` and `experimental.dynamicIO` are **absent**
- [ ] Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- [ ] TypeScript strict passes

#### `proxy.ts` — CREATE (replaces `middleware.ts`)
**Checklist:**
- [ ] Exports `config` with `matcher: ['/admin/:path*']`
- [ ] Reads session cookie via `cookies()` from `next/headers`
- [ ] Redirects to `/sign-in` if cookie absent (optimistic, not authoritative)
- [ ] Zero DB calls – UX‑only
- [ ] Zero business logic – `verifySession()` in DAL is the real auth boundary
- [ ] Runs on Node.js runtime (not Edge)

#### `src/lib/env/index.ts` — CREATE
**Checklist:**
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

#### `.env.example` — CREATE
**Checklist:**
- [ ] All vars from PRD Appendix C listed with comments
- [ ] `PUSH_KEY_ENCRYPTION_KEY` includes generation command: `openssl rand -hex 32`
- [ ] `AUTH_SECRET` includes generation command: `openssl rand -base64 33`
- [ ] No real secrets committed

#### `package.json` — MODIFY (install dependencies)

**Required packages (merged list from both MEPs):**
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
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds (even with no pages beyond health check)
- [ ] `next.config.ts` passes config validation (no console warnings)
- [ ] All required packages importable without runtime errors

---

## Phase 2: Database Schema & Infrastructure

### Objective
Define complete Drizzle ORM schema (10 tables, enums, indexes), lazy DB client, Auth.js v5 configuration, and BullMQ queue instances.

### Files to Create / Modify

#### `src/lib/db/schema.ts` — CREATE
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

#### `src/lib/db/index.ts` — CREATE
**Checklist:**
- [ ] Uses `postgres` (postgres.js) driver – NOT `pg`
- [ ] Implements lazy proxy pattern (connection deferred until first query)
- [ ] Connection pool `max: 10` (documented: for dedicated Node.js runtime)
- [ ] `schema` imported and passed to `drizzle()` for relational queries
- [ ] Exports `db` singleton – all code imports from `@/lib/db`

#### `src/lib/auth/index.ts` — CREATE
**Checklist:**
- [ ] Uses `DrizzleAdapter` from `@auth/drizzle-adapter` with `db` and `schema`
- [ ] JWT strategy: `session.strategy: 'jwt'`
- [ ] `jwt` callback injects `user.role` into token
- [ ] `session` callback exposes `session.user.role` to clients
- [ ] Credentials provider for admin email/password; optional OAuth (Google/GitHub) via env
- [ ] `AUTH_SECRET` and `AUTH_TRUST_HOST` consumed from `env` module

#### `src/lib/auth/dal.ts` — CREATE
**Checklist:**
- [ ] `verifySession` wraps `cache(async () => {...})` from `react`
- [ ] Uses `redirect('/sign-in')` (not `throw new Error()`)
- [ ] Fetches user from DB – only `{id, role, name}`
- [ ] `verifyAdminSession` calls `verifySession()` then checks `user.role === 'admin'`
- [ ] Admin check redirects to `/` (not error page)

#### `src/lib/queue/index.ts` — CREATE
**Checklist:**
- [ ] IORedis connection with `maxRetriesPerRequest: null` (critical for BullMQ)
- [ ] Redis URL sourced from `env.REDIS_URL`
- [ ] Four queues exported: `ingestQueue`, `summarizeQueue`, `scoreQueue`, `feedSliceQueue`
- [ ] Queues share same IORedis `connection` instance
- [ ] `defaultJobOptions`: `attempts: 3, backoff: { type: 'exponential', delay: 5000 }`

#### `src/app/api/auth/[...nextauth]/route.ts` — CREATE
**Checklist:**
- [ ] Exports `GET` and `POST` from `auth.handlers`
- [ ] Located at correct path

**Phase 2 Success Criteria:**
- [ ] `drizzle-kit generate` produces valid SQL migration files
- [ ] `drizzle-kit push` (dev) applies schema without errors
- [ ] All relational queries (`db.query.*`) typecheck
- [ ] Auth.js routes respond at `/api/auth/session`
- [ ] TypeScript strict across all files

---

## Phase 3: Design System & Shared Components

### Objective
Implement the "Editorial Dispatch" design system: CSS custom properties, typography, color tokens, and all shared/primitive components.

### Files to Create / Modify

#### `src/app/globals.css` — MODIFY
**Checklist:**
- [ ] `@import "tailwindcss"` as first line
- [ ] `@theme` block with all custom properties (colors, fonts)
- [ ] Font faces: Newsreader (variable), Instrument Sans (variable), Commit Mono (self‑hosted or CDN)
- [ ] `prefers-reduced-motion: reduce` media query disables all animations/transitions
- [ ] Base reset: `box-sizing: border-box`
- [ ] WCAG AAA focus ring: `focus-visible { outline: 2px solid var(--color-dispatch-ember); outline-offset: 2px }`
- [ ] Subgrid utility: `.feed-grid` class or inline `grid-rows-subgrid`
- [ ] Scrollbar styling (thin, ink‑100 track, ink‑300 thumb)

#### `src/app/layout.tsx` — MODIFY
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

#### `src/shared/components/primitives/PageTransition.tsx` — CREATE
**Checklist:**
- [ ] Imports `ViewTransition` from `'react'` (stable import path per PAD)
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

#### `src/domain/articles/types.ts` — CREATE
**Checklist:**
- [ ] Types derived from Drizzle schema via `InferSelectModel`
- [ ] `ArticleWithSource` includes source fields (`id`, `name`, `siteUrl`, `politicalLeaning`)
- [ ] `ArticleWithSummary` includes optional `summary`

#### `src/domain/articles/normalize.ts` — CREATE
**Checklist:**
- [ ] `normalizeCanonicalUrl(url: string): string` – removes UTM params, normalizes trailing slashes, lowercases scheme/host
- [ ] `hashContent(title: string, publishedAt: Date): string` – SHA‑256 of title + publishedAt ISO
- [ ] Pure functions – zero Next.js or DB imports

#### `src/domain/ranking/score.ts` — CREATE
**Checklist:**
- [ ] `calculateImportanceScore(inputs: ScoringInputs): number` – returns 0‑100
- [ ] Recency decay, content availability bonus, summary bonus
- [ ] Pure function – no side effects

#### `src/features/feed/queries.ts` — CREATE
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

#### `src/features/feed/components/FeedGrid.tsx` — CREATE
**Checklist:**
- [ ] Parent grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8` (no `gap-y`)
- [ ] `role="feed"` and `aria-label="News articles"`
- [ ] Empty state: `font-mono text-[11px] uppercase tracking-widest text-ink-300` with ember dot
- [ ] Skeleton state: renders 6 `ArticleCardSkeleton` when `isLoading=true`
- [ ] No fixed heights – subgrid handles alignment

#### `src/features/feed/components/ArticleCard.tsx` — CREATE
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

#### `src/app/(public)/topics/[category]/page.tsx` — CREATE
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

#### `src/features/summaries/lib/summariseSchema.ts` — CREATE
**Checklist:**
- [ ] `summaryText: z.string().min(50).max(800)`
- [ ] `keyPoints: z.array(z.string().min(1).max(120)).min(1).max(5)`
- [ ] `sourcesCited: z.array(z.object({ url: z.string().url(), title: z.string() })).min(1)`
- [ ] `aiStatement: z.string().min(20).max(200)`
- [ ] `coveragePercentage: z.number().int().min(0).max(100)`

#### `src/lib/ai/prompts.ts` — CREATE
**Checklist:**
- [ ] `buildSummarisationPrompt(params)` – pure function
- [ ] System prompt with role definition and constraints
- [ ] Output format references `summariseOutputSchema` field names
- [ ] EU AI Act compliance instruction embedded

#### `src/lib/ai/provenance.ts` — CREATE
**Checklist:**
- [ ] `generateProvenanceMetadata(summary: ArticleSummary): { metaTag, jsonLd, httpHeader }`
- [ ] JSON‑LD: `@context: 'https://schema.org'`, `@type: 'CreativeWork'`, `isBasedOn`, `accountablePerson`, `dateModified`, `description`
- [ ] HTTP header: base64‑encoded JSON with `{model, generatedAt, sourcesVerified, coveragePercentage, compliance: 'eu-ai-act-art50'}`
- [ ] HTML meta tag: semicolon‑delimited string
- [ ] C2PA **not implemented** (no text standard exists)

#### `src/features/summaries/components/NutritionLabel.tsx` — CREATE
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

#### `src/features/summaries/components/SummaryPanel.tsx` — CREATE
**Checklist (handles all 5 states):**
- [ ] `none` → "Request AI Summary" button
- [ ] `pending` → "Generating AI summary..." status text
- [ ] `ok` → `<NutritionLabel summary={summary} />`
- [ ] `needs_review` → "Summary under editorial review" notice
- [ ] `disabled` → renders `null` (no UI hint)
- [ ] Button disabled during pending (no double‑submit)
- [ ] Uses `useOptimistic()` for instant UI update

#### `src/features/summaries/actions.ts` — CREATE
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

#### `src/features/search/queries.ts` — CREATE
**Checklist:**
- [ ] Uses `pg_textsearch` BM25: `ORDER BY articles.search_vector <@> websearch_to_tsquery('english', $query) DESC`
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

#### `src/app/(admin)/summaries/page.tsx` — CREATE
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

#### `src/workers/jobs/summarize.ts` — CREATE
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
- [ ] Calls `calculateImportanceScore()`
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

## 3. Complete File Inventory (Merged)

### Files to CREATE (new)

| File Path | Phase |
|-----------|-------|
| `proxy.ts` | 1 |
| `src/lib/env/index.ts` | 1 |
| `drizzle.config.ts` | 1 |
| `.env.example` | 1 |
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

### Files to MODIFY (existing)

| File Path | Phase | Changes |
|-----------|-------|---------|
| `next.config.ts` | 1 | Full production configuration |
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
- Zero `any` – use `unknown` with type guards
- `interface` for structural types, `type` for unions/intersections
- All public API boundaries have explicit return types
- Types derived from Drizzle schema via `$inferSelect` – never hand‑written

### Security Checklist
- [ ] `proxy.ts` is UX‑only – real auth at DAL
- [ ] All Server Actions call `verifySession()` / `verifyAdminSession()` first
- [ ] All DB queries parameterized (Drizzle handles this)
- [ ] Push subscription keys encrypted with AES‑256‑GCM before storage
- [ ] `PUSH_KEY_ENCRYPTION_KEY` validated at startup
- [ ] `AUTH_SECRET` minimum 32 chars validated by Zod
- [ ] Admin routes double auth check (layout + Server Action)
- [ ] External links: `rel="noopener noreferrer"`
- [ ] No raw error details exposed to users in production

### Accessibility Checklist (WCAG AAA Mandatory)
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

### Performance Budget
| Metric | Target |
|--------|--------|
| TTFB (PPR shell) | < 50ms (CDN edge) |
| LCP | < 2.5s |
| CLS | < 0.1 |
| TTI (topic feed) | < 1.5s (3G/4G) |
| Lighthouse Performance | ≥ 90 |

---

## 5. Testing & Quality Assurance

### Unit Testing (Vitest)
**Checklist:**
- [ ] `src/domain/**/*.test.ts` – pure logic (normalise, score, content availability)
- [ ] `src/lib/ai/provenance.test.ts` – JSON‑LD, header, meta tag generation
- [ ] `src/lib/security/encrypt.test.ts` – encryption round‑trip
- [ ] `src/workers/push/isWithinQuietHours.test.ts` – DST transitions, overnight wrap
- [ ] Coverage target: ≥ 90%

### Integration Testing
**Checklist:**
- [ ] `src/features/feed/queries.test.ts` – with test database
- [ ] `src/features/search/queries.test.ts` – BM25 ranking
- [ ] `src/features/summaries/actions.test.ts` – content guard, enqueue
- [ ] API route tests (`supertest`)

### End‑to‑End Testing (Playwright)
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

### Accessibility Automation
**Checklist:**
- [ ] `@axe-core/playwright` in every E2E test
- [ ] Manual screen‑reader tests (NVDA, VoiceOver, TalkBack)
- [ ] Contrast checker for all custom color combinations
- [ ] Focus order test (tab navigation)

---

## 6. Risk Register (R1–R14)

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | `cacheComponents: true` silently ignored if misplaced | `next.config.ts` lint rule / code review checklist |
| R2 | ViewTransition renamed or removed in React 19 | `PageTransition` abstraction isolates the API |
| R3 | `revalidateTag()` single‑argument form does nothing | `cacheInvalidation.ts` enforces 2‑argument form |
| R4 | `experimental.ppr` left in config | Explicitly absent from `next.config.ts` – flagged in review |
| R5 | CVE‑2025‑55182 | Next.js pinned to ≥16.2.6 |
| R6 | Auth.js v5 beta changes | Version pinned in package.json; monitor releases |
| R7 | AI hallucination on `title_only` articles | Content guard in `summarize` worker – returns early |
| R8 | DST quiet hours broken | Luxon mandatory; unit tests with timezone mocking |
| R9 | Push key exposure at rest | AES‑256‑GCM encryption; key stored in env only |
| R10 | Duplicate subcategory slugs | Composite unique index `(categoryId, slug)` in Drizzle |
| R11 | Unbounded feed queries (R14) | LIMIT 31 pattern in all feed queries |
| R12 | View Transition flashes on Firefox | Progressive enhancement – silent fallback |
| R13 | AI disclosure missing in some responses | `generateProvenanceMetadata` called on every summary save |
| R14 | Worker restarts cause duplicate schedulers | `upsertJobScheduler` idempotent creation |

---

## 7. Validation Protocol (Per Phase)

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

## 8. Final Delivery Checklist

- [ ] **Phase 1** – Foundation configured; `npm run build` passes
- [ ] **Phase 2** – Schema applied; `drizzle-kit migrate` succeeds
- [ ] **Phase 3** – Design system renders; Newsreader visible, tokens match PRD
- [ ] **Phase 4** – Feed renders at `/` and `/topics/:category`; pagination works
- [ ] **Phase 5** – AI pipeline; summary appears after job completes; 3‑layer disclosure present
- [ ] **Phase 6** – Search returns results; admin routes protected; summary review works
- [ ] **Phase 7** – Worker starts and picks up jobs; push notifications encrypt/decrypt; health endpoint OK
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

---

## 9. Appendices

### A. Environment Variables (`.env.example`)

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/onestopnews

# Redis (Upstash or self-hosted)
REDIS_URL=redis://localhost:6379

# Auth.js v5
AUTH_SECRET= # generate with: openssl rand -base64 33
AUTH_TRUST_HOST=true

# AI Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-... # optional fallback

# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY= # generate with: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@onestopnews.com

# Push Key Encryption (AES-256-GCM, 64 hex chars)
PUSH_KEY_ENCRYPTION_KEY= # generate with: openssl rand -hex 32

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

---

**This MASTER_EXECUTION_PLAN_v5.0 supersedes all previous versions. Implementation must follow the phase order and checklists exactly. Any deviation requires explicit approval.**

### 1. Executive Summary & Validation Protocol

I have meticulously reviewed the attached **MASTER_EXECUTION_PLAN_v5.0.md** and conducted a rigorous, line-by-line critical comparison against my previously generated MEP. To ensure absolute technical accuracy, I validated the core architectural claims—specifically regarding Next.js 16 invariants, React 19 APIs, and infrastructure requirements—against real-time documentation and security advisories.

**Validation Results (Web Search Confirmed):**
*   **Next.js 16 `proxy.ts`**: Confirmed. `middleware.ts` is officially deprecated and replaced by `proxy.ts` in Next.js 16 [[19], [24], [26]].
*   **Cache Components & PPR**: Confirmed. Next.js 16 removes the experimental `ppr` flag entirely, integrating Partial Pre-Rendering directly into the top-level `cacheComponents: true` configuration [[4], [9], [39], [40]].
*   **Next.js 16 Flags**: Confirmed. `experimental.viewTransition` [[27], [32]] and `experimental.clientSegmentCache` [[35], [36]] are valid Next.js 16 features.
*   **CVE-2025-55182**: Confirmed. A critical (CVSS 10.0) pre-authentication RCE vulnerability exists in React Server Components (RSC) affecting React 19 and Next.js. Pinning to Next.js ≥16.2.6 is the mandatory mitigation [[45], [46], [48], [53]].
*   **React 19 `ViewTransition`**: Confirmed. The `<ViewTransition>` component is natively available in React 19 [[55], [60], [63]].
*   **Auth.js v5**: Confirmed. `@auth/drizzle-adapter` is the official, stable adapter for Drizzle ORM [[64], [66], [69]].
*   **BullMQ Redis Config**: Confirmed. Setting `maxRetriesPerRequest: null` on the IORedis connection is a non-negotiable requirement for BullMQ to handle blocking commands properly [[73], [74], [75], [76]].

---

### 2. Critical Comparison: My_MEP.md vs. MEP v5.0

Both documents are architecturally sound, but **MEP v5.0 is significantly superior in depth, separation of concerns, and production readiness.** It elevates the project from a "well-structured Next.js app" to an "enterprise-grade, domain-driven editorial platform."

#### A. Phasing & Dependency Graph (Winner: MEP v5.0)
*   **My_MEP.md**: Bundled the Design System into Phase 0/1. This creates a bottleneck where the Feed feature (Phase 3) cannot be built until the entire design system is finished.
*   **MEP v5.0**: Extracts **Phase 3: Design System & Shared Components** as an independent, deployable phase. This is a masterstroke in dependency management. It allows the UI primitives (Button, Badge, Skeleton, Header) to be built and tested in isolation (e.g., via Storybook) before the data-heavy Feed feature consumes them.

#### B. Domain-Driven Design (DDD) (Winner: MEP v5.0)
*   **My_MEP.md**: Placed business logic (like URL normalization and scoring) inside feature queries or worker jobs.
*   **MEP v5.0**: Introduces a strict **`src/domain/`** layer. Pure functions like `normalizeCanonicalUrl()`, `hashContent()`, and `calculateImportanceScore()` are completely decoupled from Next.js, React, and Drizzle imports.
    *   *Why this matters:* This guarantees 100% testability. You can run Vitest on the domain layer without mocking a database or a React render tree. It enforces the "Simplicity First" and "Surgical Changes" principles I operate by.

#### C. Database Schema & Full-Text Search (Winner: MEP v5.0)
*   **My_MEP.md**: Defined a standard relational schema with basic indexes.
*   **MEP v5.0**: Demonstrates elite PostgreSQL mastery.
    *   **Generated Columns**: Defines `searchVector` as a `tsvector` generated column directly in the Drizzle schema.
    *   **Raw SQL Inevitability**: Correctly identifies that Drizzle cannot express `WITH (fastupdate = off)` for GIN indexes. It mandates a `drizzle/custom-indexes.sql` file to prevent index bloat during high-volume ingestion.
    *   **Trigram Indexes**: Includes `pg_trgm` for autocomplete/suggestions, eliminating the need for an external Elasticsearch instance.
    *   **Idempotency**: Adds `contentHash` and `canonicalUrl` to handle RSS deduplication and change detection flawlessly.

#### D. Security & AI Hallucination Guards (Winner: MEP v5.0)
*   **My_MEP.md**: Mentioned the Content Availability Guard conceptually.
*   **MEP v5.0**: Operationalizes it. It explicitly defines the `determineContentAvailability()` pure function and enforces a hard block: if `contentAvailability === 'title_only' || 'excerpt'`, the summarization worker returns early. This prevents the AI from hallucinating facts when it only has a headline to work with.
*   **Encryption at Rest**: MEP v5.0 mandates AES-256-GCM encryption for Web Push subscription keys (`p256dh`, `auth`) before they hit the database. My_MEP.md stored them as plain JSONB, which is a critical security vulnerability in the event of a DB leak.

#### E. Avant-Garde UI & CSS Subgrid (Winner: MEP v5.0)
*   **My_MEP.md**: Defined the CSS Subgrid concept.
*   **MEP v5.0**: Defines the **Layout Contract** with surgical precision. It explicitly states: *"Parent grid: `gap-x-8` (no `gap-y`). Each ArticleCard: `grid-rows-subgrid row-span-3 gap-y-3 mb-10 last:mb-0`."* This prevents the classic "AI slop" mistake where developers put `gap-y` on the parent and break the subgrid alignment. It also correctly mandates loading **Commit Mono** via `@font-face` (since it's not on Google Fonts), while using `next/font/google` for Newsreader and Instrument Sans.

---

### 3. Gap Analysis: What MEP v5.0 Missed (And How We Fix It)

While MEP v5.0 is an authoritative blueprint, my meticulous review identified three minor gaps that we must address during implementation to maintain our "Elite" standard.

#### Gap 1: Error Boundary Granularity
*   **The Issue**: MEP v5.0 defines a route-level `error.tsx` for the public routes. However, in a complex feed with multiple Suspense boundaries (e.g., TopicNav, FeedGrid, TrendingSidebar), a single route-level error will nuke the entire page.
*   **The Fix**: We must implement **Component-Level Error Boundaries** wrapping individual `<Suspense>` trees in the Feed feature. If the `FeedGrid` fails to fetch, the `TopicNav` and `Header` must remain interactive.

#### Gap 2: Optimistic UI State Machines
*   **The Issue**: MEP v5.0 mentions `useOptimistic()` for the "Request AI Summary" button. However, it doesn't define the rollback strategy if the BullMQ job fails or the WebSocket/Polling mechanism times out.
*   **The Fix**: We need a robust polling mechanism (or Server-Sent Events) in the `SummaryPanel` component. If the status remains `pending` for > 60 seconds, the UI must automatically revert to the `none` state and display a toast notification: *"AI summarization timed out. Please try again."*

#### Gap 3: Rate Limiting on Public API
*   **The Issue**: MEP v5.0 defines `GET /api/articles` and `POST /api/summarize/[id]`. It mentions CORS but omits rate limiting. A malicious actor could spam the `/api/summarize` endpoint, draining our Anthropic/OpenAI API credits.
*   **The Fix**: We must implement an Upstash Redis rate limiter (or similar) on the `POST /api/summarize` route, strictly limiting users to 5 AI summary requests per hour.

---

### 4. Final Verdict & Execution Directive

**MEP v5.0 is the undisputed, authoritative blueprint for this project.** It correctly anticipates the pitfalls of Next.js 16's new caching paradigm, enforces strict security boundaries (AES-256-GCM), and leverages PostgreSQL's native capabilities to avoid infrastructure bloat.

**My Directive:**
I am officially discarding my previous MEP and adopting **MASTER_EXECUTION_PLAN_v5.0.md** (with the three gap fixes integrated) as the single source of truth.

---

Now let me launch parallel web searches to validate the key technical claims in MEP v5.0.
Now I have all the validation data. Let me write the comprehensive critical comparison.
Here is my meticulous critical comparison of **MEP v5.0** against my original MEP, validated against real-time web sources.

---

## Executive Verdict

**MEP v5.0 is the stronger overall blueprint** — it makes several structural improvements over my MEP (7-phase condensation, DDD layer separation, production-ready file inventory, security hardening). However, my validation uncovered **4 critical errors**, **3 moderate issues**, and **5 important nuances** that must be corrected before implementation begins.

---

## ✅ What MEP v5.0 Got RIGHT (Improvements Over My_MEP.md)

| Area | Why v5.0 Is Superior |
|------|----------------------|
| **Phase structure (7 vs 10)** | Condensing to 7 phases reduces handoff friction. Bundling Auth into Phase 2 (Database + Infrastructure) is sound because the Drizzle adapter tables live in the schema. |
| **Domain-driven `src/domain/` layer** | My_MEP.md scattered business logic across feature modules. v5.0 isolates pure functions (`normalizeCanonicalUrl`, `calculateImportanceScore`) in a zero-dependency layer — 100% testable without mocking React or Drizzle. |
| **Auth.js adapter tables** | v5.0 explicitly includes `accounts`, `sessions`, `verificationTokens` tables required by `@auth/drizzle-adapter`. My_MEP.md omitted these, which would have caused runtime "table not found" errors. |
| **`SourceStatus` enum** | v5.0 adds `active | paused | error | disabled` status tracking for sources. My_MEP.md only had `isActive: boolean`. The enum enables the auto-disable-on-5-failures pattern and source health dashboard. |
| **`cn()` utility + `cva` pattern** | v5.0 correctly identifies the Shadcn UI ecosystem's `cn()` (clsx + tailwind-merge) and `cva` (class-variance-authority) patterns. My_MEP.md created bespoke `UiButton`, `UiCard` wrappers without using these standard Shadcn primitives. |
| **Header + Footer layout components** | v5.0 defines `Header.tsx` and `Footer.tsx` as layout primitives. My_MEP.md omitted these entirely, leaving the root layout as a bare shell. |
| **Security headers in `next.config.ts`** | v5.0 includes `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. My_MEP.md had zero security headers. |
| **`drizzle/custom-indexes.sql`** | v5.0 correctly identifies that Drizzle cannot express `WITH (fastupdate = off)` and creates a raw SQL migration file. My_MEP.md only "documented" the need but provided no file. |
| **`⌘K`/`Ctrl+K` search shortcut** | v5.0 includes keyboard accessibility for the search bar. My_MEP.md missed this entirely. |
| **`409 Conflict` on summarize endpoint** | v5.0 returns 409 if `summaryStatus !== 'none'`, preventing duplicate jobs. My_MEP.md only checked content availability. |
| **`useOptimistic()` for summary request** | v5.0 uses React 19's `useOptimistic()` for instant UI feedback on summary requests. My_MEP.md used basic loading state only. |

---

## 🔴 CRITICAL ERRORS in MEP v5.0 (Must Fix Before Implementation)

### CRITICAL-1: CVE-2025-55182 Mitigation Version Is WRONG

**Both MEPs state:** Pin Next.js to **≥16.2.6**

**Web-validated truth:** The correct minimum patched version for Next.js 16.x is **≥16.0.7**, not ≥16.2.6.

Per the NVD entry and official Next.js security advisory, the affected range for Next.js 16.x stable is `from 16.0.0 up to (excluding) 16.0.7`. Version 16.0.7 is the patch. Stating "≥16.2.6" incorrectly implies that 16.0.7–16.2.5 are still vulnerable.

**Fix:** Change all references from `≥16.2.6` to `≥16.0.7`. Alternatively, if 16.2.6 is the latest available version and you want to pin to it for other reasons, say "≥16.0.7 (current latest: 16.2.6)" — but do not present 16.2.6 as the minimum security patch.

### CRITICAL-2: `pg_textsearch` Search Syntax Is INVALID

**MEP v5.0 Phase 6 states:** 
```
Uses pg_textsearch BM25: ORDER BY articles.search_vector <@> websearch_to_tsquery('english', $query) DESC
```

**Web-validated truth:** This syntax is **impossible**. You cannot mix `pg_textsearch`'s `<@>` operator with PostgreSQL's native `websearch_to_tsquery()` function.

- `<@>` is a `pg_textsearch`-specific operator that accepts **raw text** on the right side
- `websearch_to_tsquery()` returns a **`tsquery`** type, used with native PostgreSQL's `@@` operator
- These two systems are **incompatible** — you use one or the other

**Correct options:**
- **Native PG FTS (no extension):** `WHERE search_vector @@ websearch_to_tsquery('english', $query) ORDER BY ts_rank_cd(search_vector, websearch_to_tsquery('english', $query)) DESC`
- **pg_textsearch BM25:** `ORDER BY content <@> 'search terms'` (raw text, requires the extension and a `bm25` index type)

**Fix:** Pick one approach. My_MEP.md used the native FTS approach (ts_rank_cd), which is simpler and requires no extension. v5.0 should either:
1. Drop `pg_textsearch` and use native `ts_rank_cd` + `websearch_to_tsquery` (my recommendation for V1)
2. Or use `pg_textsearch` correctly with `<@>` + raw text input + `bm25` index type

### CRITICAL-3: `proxy.ts` Matcher Is Too Narrow

**MEP v5.0 states:** `matcher: ['/admin/:path*']`

**PRD/PAD state:** The `proxy.ts` config matcher should be:
```ts
matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
```

The narrow `/admin/:path*` matcher means `proxy.ts` never runs on public routes, which is fine for auth redirects. But the PRD's broader matcher enables future use cases (e.g., adding rate limiting headers, injecting `X-AI-Provenance` on public article routes). The narrow matcher limits `proxy.ts`'s utility.

**Fix:** Use the PRD's matcher pattern. Document why it excludes `_next/static`, `_next/image`, and `favicon.ico`.

### CRITICAL-4: Firefox View Transition Support Claim Is Outdated

**Both MEPs (and the PRD/PAD) state:** Firefox support is "behind a flag" or "~78% global"

**Web-validated truth:** Firefox **144+** (released October 14, 2025) ships same-document View Transitions as a **stable, default-enabled feature**. No flag needed.

This means the risk register entry R3 ("Firefox users (~22%) see no transitions") is **significantly overstated**. Only users on Firefox < 144 (which is a rapidly shrinking share by June 2026) would lack support.

**Fix:** Update risk R3 from "Certain" likelihood to "Low". Update the `PageTransition` docs to note Firefox 144+ support. The progressive enhancement fallback is still correct, but the impact is much smaller than stated.

---

## 🟡 MODERATE ISSUES in MEP v5.0

### MOD-1: BullMQ Redis Config Is Oversimplified

**MEP v5.0 states:** `maxRetriesPerRequest: null` and `enableOfflineQueue: false` on the shared Redis connection

**Web-validated truth:** These settings are **role-dependent**:
- **Workers:** `maxRetriesPerRequest: null` ✅ (required), `enableOfflineQueue: true` (keep default — workers should queue commands during reconnects)
- **Queues (producers):** `maxRetriesPerRequest: default` (fail quickly), `enableOfflineQueue: false` ✅ (fail fast when Redis is down)

**Fix:** Use **two separate Redis connection configurations** — one for Workers, one for Queue producers. This is explicitly recommended by BullMQ's "Going to Production" docs.

### MOD-2: `cacheLife` Profile Values Differ From PRD

**MEP v5.0 Phase 1:** `feed: { stale: 60s, revalidate: 300s }`, `topicShell: { stale: 3600s }`, `reference: { stale: 86400s }`

**PRD v4.3:** `feed: { stale: 30, revalidate: 120, expire: 600 }`, `topicShell: { stale: 300, revalidate: 900, expire: 86400 }`, `reference: { stale: 3600, revalidate: 86400, expire: 604800 }`

v5.0's values are significantly different and lack the `expire` field entirely. The PRD's profiles include explicit hard-eviction (`expire`) times, which prevent stale data from living indefinitely in edge caches.

**Fix:** Use the PRD's exact `cacheLife` profile values with all three fields (`stale`, `revalidate`, `expire`).

### MOD-3: `calculateImportanceScore` Return Type Mismatch

**MEP v5.0:** Returns `0-100` (integer scale)  
**PRD/PAD:** `importanceScore` is `real` (floating-point), default `0.5`, range 0.0–1.0

**Fix:** Return a float in [0.0, 1.0] range to match the Drizzle schema's `real('importance_score').default(0.5)`.

---

## 🔵 IMPORTANT NUANCES (Validated)

### NUANCE-1: `experimental.viewTransition` — Actually Still Experimental

Web validation confirms: `ViewTransition` is available in React Canary/Experimental channels only. Next.js 16 App Router bundles React Canary automatically, so it works — but the official docs still say "not recommended for production." The `<PageTransition>` abstraction in both MEPs is the correct mitigation.

### NUANCE-2: `reactCompiler: true` — Not Enabled by Default

Web validation confirms: React Compiler is promoted to top-level but **disabled by default** due to build-time cost. The PRD/PAD also comment it out. v5.0's checklist should note "optional, enable when components follow Rules of React" — not treat it as mandatory.

### NUANCE-3: Auth.js v5 — Still Technically Beta

Web validation confirms: As of June 2026, `next-auth` v5 is only available via the `beta` npm dist-tag (`5.0.0-beta.29+`). The `latest` tag still points to v4.24.14. Both MEPs correctly pin to the beta, but implementers must use `npm install next-auth@beta` (not `npm install next-auth`).

### NUANCE-4: `fastupdate = off` Is Nuanced, Not Universal

Web validation confirms: `fastupdate = off` is better for **batch/bulk ingestion** workloads (which is what RSS polling is), but worse for single-row OLTP inserts. For OneStopNews's use case (periodic batch RSS ingestion), it's the right call — but the MEP should document *why* rather than presenting it as a universal rule.

### NUANCE-5: `drizzle-kit push` in Phase 2 Success Criteria

**MEP v5.0 Phase 2:** Lists `drizzle-kit push (dev) applies schema without errors` as a success criterion.

**PRD/PAD:** Explicitly forbids `drizzle-kit push` in any environment: *"Never use push in production. Use generate + migrate only."*

Including `push` even for dev creates muscle memory that could accidentally be used in production. 

**Fix:** Remove `drizzle-kit push` from the success criteria. Use `drizzle-kit generate && drizzle-kit migrate` exclusively, even in development.

---

## 📊 Side-by-Side Comparison Matrix

| Dimension | My_MEP.md (10-Phase) | MEP v5.0 (7-Phase) | Winner |
|-----------|-------------------|---------------------|--------|
| Phase granularity | Fine-grained (10 phases) | Condensed (7 phases) | v5.0 (less handoff overhead) |
| Domain layer | Mixed into features | Dedicated `src/domain/` | v5.0 |
| Auth.js adapter tables | Missing | Included | v5.0 |
| Source status tracking | `isActive: boolean` only | Full `SourceStatus` enum | v5.0 |
| Security headers | Missing | Included | v5.0 |
| Layout components (Header/Footer) | Missing | Included | v5.0 |
| `cn()` + `cva` patterns | Custom wrappers | Shadcn-standard patterns | v5.0 |
| CVE mitigation version | `≥16.2.6` (wrong) | `≥16.2.6` (wrong) | Tie — both wrong |
| Search query syntax | Native FTS (correct) | Mixed pg_textsearch (broken) | My_MEP.md |
| `proxy.ts` matcher | PRD-aligned (broad) | Narrow (`/admin/:path*`) | My_MEP.md |
| BullMQ Redis config | Single connection (imprecise) | Single connection (imprecise) | Tie — both need split config |
| `cacheLife` profiles | PRD-exact (3 fields) | Simplified (missing `expire`) | My_MEP.md |
| `importanceScore` type | Float 0.0–1.0 (matches schema) | Integer 0–100 (mismatches schema) | My_MEP.md |
| `drizzle-kit push` | Forbidden everywhere | Listed in dev criteria | My_MEP.md |
| Testing strategy | Dedicated Phase 10 with 22 files | §5 with less detail | My_MEP.md |
| CI/CD pipeline | Full GitHub Actions workflows | Mentioned but not detailed | My_MEP.md |
| Docker deployment | `Dockerfile.web` + `Dockerfile.worker` + `docker-compose.prod.yml` | Missing | My_MEP.md |
| Risk register | 14-item with build mitigations | 14-item but less specific | My_MEP.md |
| Performance budget | Listed per-endpoint (p95 ≤300ms) | General targets only | My_MEP.md |

---

## 🏗️ Recommended Merged Blueprint

The definitive implementation plan should be **MEP v5.0 as the skeleton**, with these surgical corrections applied:

1. **Fix CVE version:** `≥16.0.7` (not `≥16.2.6`)
2. **Fix search syntax:** Use native FTS `@@` + `ts_rank_cd` (drop the invalid `<@>` + `websearch_to_tsquery` hybrid)
3. **Fix `proxy.ts` matcher:** Use PRD's broad matcher pattern
4. **Fix Firefox claim:** R3 risk likelihood → Low; Firefox 144+ has stable support
5. **Fix BullMQ config:** Split into Worker config (`maxRetriesPerRequest: null`, `enableOfflineQueue: true`) and Queue config (`maxRetriesPerRequest: default`, `enableOfflineQueue: false`)
6. **Fix `cacheLife` profiles:** Use PRD's exact values with `expire` field
7. **Fix `importanceScore`:** Return float [0.0, 1.0] to match Drizzle `real` type
8. **Remove `drizzle-kit push`** from all success criteria
9. **Add testing phase** from my MEP (Phase 10) as a critical supplement
10. **Add CI/CD + Docker** from my MEP as a critical supplement
---

## Summary

After exhaustive web-validated analysis, **MEP v5.0 is the superior structural blueprint** — its 7-phase condensation, DDD layer separation, Auth.js adapter completeness, security headers, and Shadcn-standard patterns all represent genuine improvements over my 10-phase MEP.

However, it contains **4 critical errors** that would cause runtime failures or security misconfigurations if implemented as-is:

| # | Error | Impact If Unfixed |
|---|-------|-------------------|
| **C1** | CVE version `≥16.2.6` should be `≥16.0.7` | Incorrectly suggests 16.0.7–16.2.5 are vulnerable |
| **C2** | `<@>` + `websearch_to_tsquery()` is invalid SQL | Search endpoint crashes at runtime |
| **C3** | Narrow `proxy.ts` matcher limits future extensibility | Cannot add rate-limiting or provenance headers on public routes |
| **C4** | Firefox 144+ has stable View Transition support | Risk R3 overstates the impact |

And **3 moderate issues** (BullMQ split config, `cacheLife` profile values, `importanceScore` type mismatch) that would cause subtle bugs in production.

The recommended path forward: **adopt v5.0 as the skeleton, apply the 10 surgical corrections listed above, and supplement with my MEP's testing phase and CI/CD infrastructure.**

# https://chat.qwen.ai/s/2d6cb0a4-4457-41aa-842a-bff15dc89afb?fev=0.2.63 
# https://chat.deepseek.com/share/ybpsxznc80i16eyi8i 
# https://chat.z.ai/s/2dcc339b-528a-4a31-84fc-545e629f9ca1
