# OneStopNews — Master Execution Plan

**Document Status:** DEFINITIVE ENGINEERING BLUEPRINT  
**Companion Documents:** PRD v4.3 | PAD v4.5 | CLAUDE.md | README.md  
**Date:** June 10, 2026  
**Purpose:** Provide a logical, phase-by-phase build plan for the complete OneStopNews codebase, with file-level detail, interface contracts, and integrated checklists.

---

## Executive Summary

OneStopNews is a **topic-first news aggregation and AI summarisation platform** that reorganises public news content around subjects rather than sources. It collects article metadata from 50–200+ diverse RSS/Atom/JSON feeds, normalises and categorises stories into a two-level topic hierarchy, and presents them in a calm, editorially-informed interface built on the **"Editorial Dispatch"** design system. Every AI-generated summary carries a machine-readable **3-layer provenance disclosure** (JSON-LD + HTTP header + HTML meta tag) achieving full EU AI Act Article 50 compliance.

This plan decomposes the build into **10 logical, independently verifiable phases**, ordered by dependency chain: infrastructure before data, data before auth, auth before UI, UI before features, features before workers, workers before delivery.

---

## Build Phase Dependency Graph

```
Phase 0: Project Scaffolding & Infrastructure
  │
  ├─► Phase 1: Database Schema & Core Data Layer
  │     │
  │     ├─► Phase 2: Authentication & Authorization
  │     │
  │     └─► Phase 3: Design System & Shared Components
  │           │
  │           ├─► Phase 4: Feed Feature Module
  │           │     │
  │           │     └─► Phase 5: Article Detail & AI Summaries
  │           │           │
  │           │           └─► Phase 6: Search Feature
  │           │
  │           └─► Phase 7: Worker Service & Ingestion Pipeline
  │                 │
  │                 └─► Phase 8: API Routes
  │                       │
  │                       └─► Phase 9: Push Notifications & User Preferences
  │                             │
  │                             └─► Phase 10: Testing, QA & Deployment
```

---

## Phase 0: Project Scaffolding & Infrastructure Setup

**Objective:** Establish the project skeleton, configure all critical Next.js 16 flags in their verified positions, set up local development infrastructure (PostgreSQL, Redis), and validate the build toolchain. No feature code is written in this phase — it is pure scaffolding and configuration.

**Why First:** Every subsequent phase depends on a correctly configured project. The PRD and PAD identify multiple configuration flags that silently break features if placed incorrectly (e.g., `cacheComponents` at top-level, `viewTransition` inside `experimental`). Getting these right before any code is written prevents insidious debugging sessions later.

**Success Criteria:**
- `pnpm dev` starts without errors
- `pnpm tsc --noEmit` passes with `strict: true`
- `pnpm build` succeeds
- PostgreSQL and Redis are accessible via Docker Compose
- `drizzle-kit generate` produces valid migration SQL from the schema

### File List

| # | File Path | Description | Interfaces / Exports |
|---|-----------|-------------|---------------------|
| 0.1 | `package.json` | Project manifest with all dependencies at pinned versions. Next.js ≥16.2.6, React 19.2, Drizzle, BullMQ, Zod, Auth.js v5 beta, Tailwind v4, Shadcn UI. | N/A |
| 0.2 | `tsconfig.json` | TypeScript configuration with `strict: true`, `noUncheckedIndexedAccess`, path aliases (`@/` → `src/`). | N/A |
| 0.3 | `next.config.ts` | **CRITICAL FILE.** All configuration flags in their validated positions: `cacheComponents: true` (top-level), `cacheLife` profiles (top-level), `turbopack: {}` (top-level), `experimental.viewTransition: true` (inside experimental), `experimental.clientSegmentCache: true` (inside experimental). Image optimisation (avif/webp). | `NextConfig` export |
| 0.4 | `drizzle.config.ts` | Drizzle Kit configuration pointing to `lib/db/schema.ts` with migration output to `./drizzle/`. | `Config` export |
| 0.5 | `tailwind.config.ts` | Tailwind CSS v4 configuration with `@theme` tokens for Editorial Dispatch design system (typography, colours). | N/A |
| 0.6 | `globals.css` | Global stylesheet with `@theme` block defining CSS custom properties: `--font-editorial`, `--font-ui`, `--font-mono`, all ink/paper/dispatch colour tokens. Base styles for `body`, focus-visible rings. | N/A |
| 0.7 | `docker-compose.yml` | PostgreSQL 17 + Redis 7 with correct configurations: `noeviction` policy for Redis, extension init script for PostgreSQL (`uuid-ossp`, `pg_trgm`). | N/A |
| 0.8 | `scripts/init-extensions.sql` | SQL script for Docker entrypoint: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`, `CREATE EXTENSION IF NOT EXISTS pg_trgm`. | N/A |
| 0.9 | `.env.example` | Template for all required environment variables with documented descriptions and validation rules. | N/A |
| 0.10 | `src/lib/env/index.ts` | Zod-validated environment variable schema. Fails fast on startup if any required variable is missing or malformed. | `env` object, `envSchema` |
| 0.11 | `src/app/layout.tsx` | Root layout: HTML shell, font loading (Newsreader, Instrument Sans, Commit Mono via `next/font`), global providers. **No data fetching.** | Default layout export |
| 0.12 | `src/app/page.tsx` | Placeholder home page. Will be replaced in Phase 4. | Default page export |
| 0.13 | `.eslintrc.json` | ESLint + Prettier configuration aligned with project conventions. | N/A |
| 0.14 | `.prettierrc` | Prettier configuration: single quotes, trailing commas, 2-space indent. | N/A |

### Phase 0 Checklist

- [ ] `pnpm install` completes with zero peer dependency warnings
- [ ] `next.config.ts` contains `cacheComponents: true` at the **top-level** (not inside `experimental`)
- [ ] `cacheLife` profiles (`feed`, `topicShell`, `reference`) defined at **top-level**
- [ ] `experimental.ppr` and `experimental.dynamicIO` are **NOT present** in config
- [ ] `experimental.viewTransition: true` is **inside** the `experimental: {}` block
- [ ] `tsconfig.json` has `"strict": true` and `"noUncheckedIndexedAccess": true`
- [ ] `pnpm dev` starts on `http://localhost:3000` with Turbopack
- [ ] `pnpm build` succeeds without errors
- [ ] `pnpm tsc --noEmit` passes with zero type errors
- [ ] `docker-compose up -d` starts PostgreSQL 17 and Redis 7
- [ ] PostgreSQL connection verified: `psql -h localhost -U onestopnews -d onestopnews_dev`
- [ ] Redis connection verified: `redis-cli ping` returns `PONG`
- [ ] `.env.example` documents all variables including `PUSH_KEY_ENCRYPTION_KEY` (64 hex chars)
- [ ] Fonts load correctly: Newsreader, Instrument Sans, Commit Mono visible in browser
- [ ] `globals.css` contains all colour tokens (`--color-ink-*`, `--color-paper-*`, `--color-dispatch-*`)

---

## Phase 1: Database Schema & Core Data Layer

**Objective:** Define the complete Drizzle ORM schema (all tables, enums, custom types, indexes), implement the Lazy Proxy DB connection pattern, create domain types, and establish the migration infrastructure. This is the single source of truth for all data structures in the application.

**Why Second:** The PRD mandates "The Drizzle schema is the only source of truth for database types. Types derive from schema, not hand-written." Every feature module's `queries.ts` and every domain type depends on this schema existing first. The Lazy Proxy pattern prevents the common Next.js build-time crash when `DATABASE_URL` is unavailable during static analysis.

**Success Criteria:**
- `drizzle-kit generate` produces valid SQL migration files
- `drizzle-kit migrate` applies migrations to the local PostgreSQL database
- The Lazy Proxy defers connection until first query (verified by import without `DATABASE_URL` not crashing)
- All domain types (`ArticleWithSource`, `ArticleWithSummary`, `ArticleSummary`) are derived from schema
- Raw SQL additions (GIN index with `fastupdate=off`, trigram index) are documented

### File List

| # | File Path | Description | Interfaces / Exports |
|---|-----------|-------------|---------------------|
| 1.1 | `src/lib/db/schema.ts` | **CRITICAL FILE.** Complete Drizzle schema: all enums (`userRoleEnum`, `feedTypeEnum`, `contentAvailabilityEnum`, `summaryStatusEnum`), custom `tsvector` type, all tables (`users`, `categories`, `subcategories` with composite unique index, `sources` with `lastFetchedAt`/`failureCount`, `articles` with `searchVector` generated column and GIN index, `summaries` with `flagReason` and `originalArticleUrl`, `pushSubscriptions`, `userPreferences` with quiet hours and briefing settings). | All table exports, all enum exports, `tsvector` custom type |
| 1.2 | `src/lib/db/index.ts` | **CRITICAL FILE.** Lazy Proxy DB client. Defers PostgreSQL connection until first query using a JavaScript `Proxy`. Connection pool: `max: 10` for dedicated runtime, `max: 3` for development. Deployment note: serverless requires PgBouncer/Supavisor. | `db` (proxied Drizzle instance) |
| 1.3 | `src/domain/articles/types.ts` | Domain types derived from schema: `ArticleSource`, `ArticleCategory`, `ArticleSummary`, `ArticleWithSource`, `ArticleWithSummary`, `Summary` type alias. | All interface/type exports |
| 1.4 | `src/domain/articles/normalize.ts` | Pure domain logic: `normalizeCanonicalUrl()` for URL deduplication, `hashContent()` for content change detection via SHA-256. | `normalizeCanonicalUrl()`, `hashContent()` |
| 1.5 | `src/domain/ranking/score.ts` | Pure domain logic: importance scoring formula. Takes article metadata (source priority, recency, content availability) and returns a float score 0.0–1.0. | `calculateImportanceScore()` |
| 1.6 | `scripts/migrate.ts` | Standalone migration runner. Runs `drizzle-kit migrate` programmatically for CI/CD pipelines. Uses `max: 1` connection. | CLI script |
| 1.7 | `scripts/init-extensions.sql` | (Updated from Phase 0) Adds `pg_trgm` CREATE EXTENSION and documents `pg_textsearch` for Phase 2. | N/A |
| 1.8 | `drizzle/` | Auto-generated migration SQL directory. Created by `drizzle-kit generate`. Contains timestamped `.sql` files. | N/A |

### Phase 1 Checklist

- [ ] All enums defined: `userRoleEnum`, `feedTypeEnum`, `contentAvailabilityEnum`, `summaryStatusEnum`
- [ ] `contentAvailabilityEnum` has all four values: `title_only`, `excerpt`, `partial_text`, `full_text`
- [ ] `summaryStatusEnum` has all five values: `none`, `pending`, `ok`, `needs_review`, `disabled`
- [ ] `subcategories` table has composite unique index on `(categoryId, slug)` — prevents duplicate slugs within a category
- [ ] `sources` table has `lastFetchedAt` and `failureCount` columns for backoff logic
- [ ] `articles` table has `subcategoryId` FK and index
- [ ] `articles` table has `politicalLeaning` column (nullable, for Phase 2)
- [ ] `articles.searchVector` is a `tsvector` generated column with `setweight` for title (A) and excerpt (B)
- [ ] `articles` has GIN index on `searchVector`
- [ ] `articles` has unique index on `canonicalUrl` (idempotency key for ingestion)
- [ ] `articles` has composite indexes on `(categoryId, publishedAt DESC)` and `(subcategoryId, publishedAt DESC)`
- [ ] `summaries` has `flagReason` column (nullable, for review workflow)
- [ ] `summaries` has `originalArticleUrl` column (denormalised for self-contained audit artefacts)
- [ ] `summaries` has `coveragePercentage` column (integer, 0–100)
- [ ] `pushSubscriptions.keys` is typed as `jsonb` with `{ p256dh: string; auth: string }` type
- [ ] `userPreferences` has all quiet hours fields: `pushQuietStart` (time), `pushQuietEnd` (time), `briefingTimezone` (text)
- [ ] `userPreferences` has `mutedSources` (jsonb array of string) for per-user source filtering
- [ ] Lazy Proxy pattern in `lib/db/index.ts` defers connection — verified by importing without `DATABASE_URL` set (must not crash)
- [ ] `drizzle-kit generate` produces valid SQL with no errors
- [ ] `drizzle-kit migrate` applies migrations to local database
- [ ] Domain types in `domain/articles/types.ts` match schema column types exactly
- [ ] `normalizeCanonicalUrl()` handles trailing slashes, query params, protocol normalization
- [ ] `hashContent()` produces deterministic SHA-256 hashes for content change detection
- [ ] `calculateImportanceScore()` returns values in [0.0, 1.0] range
- [ ] Raw SQL additions documented: GIN with `fastupdate=off`, trigram index on `title`, partial index for recent articles

---

## Phase 2: Authentication & Authorization

**Objective:** Implement the full authentication and authorization stack using Auth.js v5 with the Drizzle adapter, establish the Data Access Layer (DAL) with `verifySession()` and `verifyAdminSession()`, and create the `proxy.ts` network boundary. This phase enforces the critical invariant: `proxy.ts` is UX-only (optimistic redirect); real authorization lives in the DAL.

**Why Third:** Admin routes, protected features, and user-specific functionality (push notifications, preferences) all depend on a working auth system. The DAL pattern (`redirect()` not `throw new Error()`) must be established before any admin UI is built. Getting this wrong causes full-page error boundaries that destroy the "invisible UX" principle.

**Success Criteria:**
- Unauthenticated users accessing `/admin/*` are redirected to `/sign-in` (via `proxy.ts` optimistic check + `layout.tsx` real check)
- Session cookies are HttpOnly and validated per-request
- `verifySession()` and `verifyAdminSession()` are memoized per-request via `React.cache()`
- Sign-in page renders with the Editorial Dispatch design system
- Non-admin users accessing admin routes are redirected to `/` (not shown an error page)

### File List

| # | File Path | Description | Interfaces / Exports |
|---|-----------|-------------|---------------------|
| 2.1 | `src/lib/auth/index.ts` | Auth.js v5 server instance. Configured with `DrizzleAdapter`, provider setup, JWT session strategy (7-day max age), callbacks for role propagation (`jwt` → `session`). | `handlers`, `auth`, `signIn`, `signOut` |
| 2.2 | `src/lib/auth/dal.ts` | **CRITICAL FILE.** Data Access Layer. `verifySession()` uses `cache()` from React for per-request memoization. Fetches session via `auth()`, validates email exists, queries DB for user record (id, role, name). Uses `redirect('/sign-in')` on failure — never `throw new Error()`. `verifyAdminSession()` builds on `verifySession()` and redirects non-admins to `/`. | `verifySession()`, `verifyAdminSession()` |
| 2.3 | `proxy.ts` | **CRITICAL FILE.** Next.js 16 network boundary (replaces `middleware.ts`). Runs on Node.js runtime (not Edge). Performs optimistic cookie check only — NO database calls, NO business logic. Redirects unauthenticated users on `/admin/*` routes to `/sign-in`. | `proxy()` function, `config` matcher |
| 2.4 | `src/app/api/auth/[...nextauth]/route.ts` | Auth.js API route handler. Delegates to `handlers` from `lib/auth/index.ts`. | GET, POST handlers |
| 2.5 | `src/app/(auth)/sign-in/page.tsx` | Sign-in page styled with Editorial Dispatch design. Uses Shadcn UI `Card` and `Button` primitives. Shows loading state during authentication. | Default page export |
| 2.6 | `src/app/(admin)/layout.tsx` | Admin layout. Calls `verifyAdminSession()` in the server component — this is the REAL authorization enforcement point (not `proxy.ts`). Redirects non-admins gracefully. | Default layout export |

### Phase 2 Checklist

- [ ] Auth.js v5 pinned to exact beta version (`5.0.0-beta.x`) in `package.json`
- [ ] `DrizzleAdapter` configured with the same `db` instance and schema
- [ ] JWT session strategy configured with 7-day `maxAge`
- [ ] `jwt` callback propagates `user.role` to token
- [ ] `session` callback propagates `token.role` to `session.user.role`
- [ ] `verifySession()` uses `cache()` from React for per-request memoization
- [ ] `verifySession()` calls `redirect('/sign-in')` — NOT `throw new Error()`
- [ ] `verifyAdminSession()` calls `verifySession()` first, then checks `user.role !== 'admin'`
- [ ] `verifyAdminSession()` redirects non-admins to `/` — NOT throwing errors
- [ ] `proxy.ts` performs ONLY cookie presence check — NO database calls
- [ ] `proxy.ts` matcher excludes `_next/static`, `_next/image`, `favicon.ico`
- [ ] Auth API route at `/api/auth/[...nextauth]` delegates correctly to handlers
- [ ] Sign-in page uses Editorial Dispatch typography and colour tokens
- [ ] Sign-in page shows loading state during authentication (button disabled, spinner visible)
- [ ] Admin layout calls `verifyAdminSession()` as the real authorization point
- [ ] Unauthenticated access to `/admin/*` redirects to `/sign-in` (both via proxy.ts and layout.tsx)
- [ ] Non-admin access to `/admin/*` redirects to `/` (not an error page)
- [ ] Session cookies are HttpOnly (verified in browser DevTools)
- [ ] Multiple server components calling `verifySession()` in one render tree execute only ONE validation (verified via logging)

---

## Phase 3: Design System & Shared Components

**Objective:** Build the "Editorial Dispatch" design system foundation: bespoke typography (Newsreader, Instrument Sans, Commit Mono), colour tokens, CSS Subgrid layout primitives, the `<PageTransition>` abstraction, error boundaries, loading skeletons, and Shadcn UI primitives wrapped for the bespoke aesthetic. No feature-specific components yet — these are the reusable building blocks.

**Why Fourth:** Every feature module (feed, summaries, search, admin) depends on these shared components. The CSS Subgrid architecture is a core layout contract that must be correct before `ArticleCard` or `FeedGrid` are built. The `<PageTransition>` abstraction isolates the experimental ViewTransition API so that all page-level transitions route through a single file.

**Success Criteria:**
- Typography renders correctly: Newsreader for headlines, Instrument Sans for body, Commit Mono for metadata
- Colour tokens are applied consistently: `ink-900` for headings, `ink-600` for body, `paper-50` for backgrounds
- `<PageTransition>` wraps content and gracefully degrades on Firefox / reduced-motion
- Error boundaries render the Editorial Dispatch error state (ember dot, mono text, try-again button)
- Loading skeletons match the structure of real content (feed skeleton, article skeleton)
- Shadcn UI components are imported and styled with Editorial Dispatch tokens
- All components pass WCAG AAA focus indicators (`focus-visible:ring-dispatch-ember`)

### File List

| # | File Path | Description | Interfaces / Exports |
|---|-----------|-------------|---------------------|
| 3.1 | `src/components/primitives/PageTransition.tsx` | **CRITICAL FILE.** Stable abstraction over React's experimental `ViewTransition` API. When Next.js stabilises the API, migration is a 1-file change. Uses `document.startViewTransition` with fallback to `router.push`. Respects `prefers-reduced-motion`. | `PageTransition` component with `name` and `children` props |
| 3.2 | `src/shared/components/UiButton.tsx` | Shadcn UI `Button` wrapped with Editorial Dispatch styling: `dispatch-ember` for primary, `ink-600` for secondary. Loading state with spinner. Disabled state during async ops. | `UiButton` component |
| 3.3 | `src/shared/components/UiCard.tsx` | Shadcn UI `Card` wrapped with `paper-100` surface, `ink-100` borders. Used for source management, summary panels, admin dashboard cards. | `UiCard`, `UiCardHeader`, `UiCardContent` |
| 3.4 | `src/shared/components/UiInput.tsx` | Shadcn UI `Input` wrapped with `ink-900` text, `ink-100` border, `dispatch-ember` focus ring. Used for search, admin forms. | `UiInput` component |
| 3.5 | `src/shared/components/UiBadge.tsx` | Badge for "AI Brief", category tags, source labels. Uses `dispatch-ember`, `dispatch-slate`, `dispatch-sage` accent colours. | `UiBadge` component |
| 3.6 | `src/shared/components/UiSkeleton.tsx` | Skeleton loading primitive with `ink-100` pulse animation. Respects `prefers-reduced-motion` (no animation). | `UiSkeleton` component |
| 3.7 | `src/shared/components/UiDialog.tsx` | Shadcn UI `Dialog` wrapped for admin confirmation modals (summary review, source deletion). | `UiDialog`, `UiDialogTrigger`, `UiDialogContent` |
| 3.8 | `src/shared/components/UiTable.tsx` | Shadcn UI `Table` wrapped for admin data tables (sources list, flagged summaries). | `UiTable`, `UiTableHeader`, `UiTableRow`, `UiTableCell` |
| 3.9 | `src/shared/hooks/useDebounce.ts` | 300ms debounce hook for search input. Cleanups timeout on unmount. | `useDebounce()` hook |
| 3.10 | `src/shared/hooks/useArticleActivity.ts` | React 19.2 `Activity` hook wrapper for summary panel zero-shift loading. | `useArticleActivity()` hook |
| 3.11 | `src/app/topics/[category]/error.tsx` | Feed error boundary: ember dot, mono "Feed temporarily unavailable" text, try-again button. Client component. | Default error boundary export |
| 3.12 | `src/app/article/[id]/error.tsx` | Article error boundary: ember dot, mono "Article unavailable" text, try-again button. Client component. | Default error boundary export |
| 3.13 | `src/features/feed/components/FeedSkeleton.tsx` | Loading skeleton matching `FeedGrid` + `ArticleCard` structure. Three-column grid with shimmer cards. | `FeedSkeleton` component |
| 3.14 | `src/features/feed/components/ArticleSkeleton.tsx` | Single article skeleton matching `ArticleCard` row structure (headline, excerpt, metadata rows). | `ArticleSkeleton` component |
| 3.15 | `src/lib/utils/date.ts` | `formatTimeAgo()` utility: converts `Date` to relative time string ("2h ago", "Yesterday"). Uses `Intl.RelativeTimeFormat` for i18n readiness. | `formatTimeAgo()` |

### Phase 3 Checklist

- [ ] `PageTransition` component uses `document.startViewTransition` when available
- [ ] `PageTransition` falls back to `router.push()` on unsupported browsers
- [ ] `PageTransition` respects `prefers-reduced-motion: reduce` — disables transitions entirely
- [ ] `PageTransition` has `name` prop for unique transition identification
- [ ] All Shadcn UI wrappers preserve the underlying Radix primitive's accessibility
- [ ] `UiButton` shows loading indicator during async operations
- [ ] `UiButton` is disabled during async operations
- [ ] `UiInput` has `focus-visible:ring-dispatch-ember` (WCAG AAA)
- [ ] `UiSkeleton` pulse animation is disabled when `prefers-reduced-motion: reduce`
- [ ] Error boundaries render Editorial Dispatch error state (not generic Next.js error page)
- [ ] Error boundaries have "Try again" button that calls `reset()`
- [ ] Error boundaries log to observability platform (Sentry/Axiom)
- [ ] `FeedSkeleton` matches the 3-column grid structure of `FeedGrid`
- [ ] `ArticleSkeleton` has 3 rows matching ArticleCard subgrid rows
- [ ] `formatTimeAgo()` returns sensible strings for recent, today, yesterday, this week, older
- [ ] `useDebounce()` cleans up timeout on unmount
- [ ] No generic fonts (Inter, Roboto, Space Grotesk) used anywhere
- [ ] All focus-visible states use `dispatch-ember` ring colour
- [ ] Colour contrast verified: `ink-600` on `paper-50` meets WCAG AAA (≥7:1 ratio)

---

## Phase 4: Feed Feature Module

**Objective:** Build the core feed experience — the primary user-facing feature. This includes the topic-first feed grid using CSS Subgrid, the `ArticleCard` component, the `TopicNav` navigation, cursor-based pagination, and all feed-related pages (home page, category page). This is the most visible feature and the one users interact with first.

**Why Fifth:** The feed is the heart of the application. It validates the CSS Subgrid architecture, the "Editorial Dispatch" design system, the cursor-based pagination contract, and the explicit `sources` JOIN requirement. All other features (article detail, search, summaries) build on the data structures and query patterns established here.

**Success Criteria:**
- Home page `/` renders a 3-column CSS Subgrid feed on desktop, 2-column on tablet, 1-column on mobile
- ArticleCard headline, excerpt, and metadata rows align across cards in the same visual row
- `article.source.name` is populated (explicit `sources` JOIN verified)
- Cursor-based pagination works: "Load more" fetches the next 30 articles
- Empty state renders when no articles exist in a category
- Loading state renders with `FeedSkeleton` during data fetching
- Error state renders with error boundary on data fetch failure
- "AI Brief" badge shows on articles with `hasSummary === true && summaryStatus === 'ok'`
- Topic navigation renders all categories with active state

### File List

| # | File Path | Description | Interfaces / Exports |
|---|-----------|-------------|---------------------|
| 4.1 | `src/features/feed/components/FeedGrid.tsx` | CSS Subgrid parent container. Defines 1/2/3 columns with `gap-x-8` only (no `gap-y`). Each `ArticleCard` spans 3 row tracks. Empty state with ember dot and mono text. `role="feed"` + `aria-label` for accessibility. | `FeedGrid` component with `articles: ArticleWithSource[]` prop |
| 4.2 | `src/features/feed/components/ArticleCard.tsx` | **CRITICAL FILE.** CSS Subgrid child: `grid-rows-subgrid row-span-3`. Row 1: headline (Newsreader 800), Row 2: excerpt (Instrument Sans, 3-line clamp), Row 3: metadata (Commit Mono, 10px uppercase). "AI Brief" badge conditionally rendered. `last:mb-0` for column termination fix. | `ArticleCard` component with `article: ArticleWithSource` prop |
| 4.3 | `src/features/feed/components/Feed.tsx` | Server component that orchestrates `FeedGrid` + pagination. Fetches data via `getFeedArticles()`. Handles cursor-based "Load more" pattern. | `Feed` component with `category`, `cursor` props |
| 4.4 | `src/features/feed/components/TopicNav.tsx` | Client component for topic/category navigation. Uses `useTopicTransition()` for animated navigation. Horizontal scrollable list of category links with active state. | `TopicNav` component |
| 4.5 | `src/features/feed/queries.ts` | **CRITICAL FILE.** `getFeedArticles()` with explicit `sources` JOIN (required contract), cursor-based pagination (`LIMIT 31` pattern for `hasMore`), category/subcategory filtering, `publishedAt DESC` ordering. `getArticleWithSummary()` for detail page (left joins categories + summaries). | `getFeedArticles()`, `getArticleWithSummary()` |
| 4.6 | `src/features/feed/actions.ts` | Server Actions: `savePreference()`, `setFavoriteCategory()`. All mutations go through DAL verification. | Server Action exports |
| 4.7 | `src/features/categories/queries.ts` | `getCategoryBySlug()`, `getAllCategories()`, `getSubcategoriesByCategory()`. Used by feed pages and TopicNav. | Category query functions |
| 4.8 | `src/app/(public)/page.tsx` | Home page: Top Stories feed. PPR-enabled. Uses `Feed` component with `Suspense` + `FeedSkeleton`. | Default page export |
| 4.9 | `src/app/(public)/topics/[category]/page.tsx` | **CRITICAL FILE.** Category feed page. Uses `'use cache'` + `cacheLife('topicShell')`. Async `params` and `searchParams` (both `Promise<T>` — always `await`). `generateMetadata()` also awaits params. `PageTransition` wrapper. `notFound()` for invalid categories. | Default page export, `generateMetadata` |
| 4.10 | `src/shared/hooks/useTopicTransition.ts` | Hook abstracting ViewTransition for topic navigation. Uses `document.startViewTransition` with `router.push` fallback. Respects `prefers-reduced-motion`. | `useTopicTransition()` hook |
| 4.11 | `src/features/feed/components/FeedPagination.tsx` | "Load more" button at feed bottom. Shows loading indicator during fetch. Uses cursor from last article's `publishedAt`. | `FeedPagination` component |

### Phase 4 Checklist

- [ ] `FeedGrid` renders 3-column grid on `lg:`, 2-column on `md:`, 1-column on mobile
- [ ] `FeedGrid` uses `gap-x-8` only (no `gap-y`) — vertical spacing is owned by cards
- [ ] `ArticleCard` uses `grid grid-rows-subgrid row-span-3` — verified in DevTools computed styles
- [ ] ArticleCard Row 1: headline with Newsreader font-weight 800, `tracking-[-0.02em]`
- [ ] ArticleCard Row 2: excerpt with Instrument Sans, `line-clamp-3`
- [ ] ArticleCard Row 3: metadata with Commit Mono, `text-[10px]`, uppercase, tracking-wider
- [ ] "AI Brief" badge only shows when `article.hasSummary === true && article.summaryStatus === 'ok'`
- [ ] `article.source.name` renders correctly (not undefined) — verifies explicit `sources` JOIN
- [ ] `getFeedArticles()` always uses `.innerJoin(sources, ...)` — no bare `articles` select
- [ ] Cursor pagination: fetches `LIMIT 31`, slices to 30, sets `hasMore` from extra row
- [ ] Empty state: ember dot + mono "No stories in this category yet" text
- [ ] Loading state: `FeedSkeleton` shown via `Suspense` fallback
- [ ] Error state: error boundary with "Try again" button
- [ ] Category page: `params` is `Promise<{ category: string }>` and is `await`ed
- [ ] Category page: `searchParams` is `Promise<{ cursor?: string }>` and is `await`ed
- [ ] Category page: `generateMetadata()` also `await params`
- [ ] Category page: `'use cache'` + `cacheLife('topicShell')` applied correctly
- [ ] `notFound()` called for invalid category slugs (not `throw new Error()`)
- [ ] `PageTransition` wrapper on category page with unique `name` prop
- [ ] TopicNav horizontal scroll with active category highlighted
- [ ] `useTopicTransition()` respects `prefers-reduced-motion: reduce`
- [ ] Feed pagination "Load more" button disabled during fetch
- [ ] `formatTimeAgo()` renders correct relative times for metadata row
- [ ] Last card in each column has `last:mb-0` (prevents footer spacing issue)

---

## Phase 5: Article Detail & AI Summaries

**Objective:** Build the article detail page with the AI Nutrition Label, 3-layer provenance disclosure, summary status polling, and the summary review admin workflow. This is where the EU AI Act Article 50 compliance is fully realized in the UI.

**Why Sixth:** The article detail page depends on the feed module's query patterns (`getArticleWithSummary`) and the shared components (PageTransition, error boundary, NutritionLabel). The AI summary pipeline (worker-side) will be built in Phase 7, but the UI that displays summaries must be ready to receive and render them.

**Success Criteria:**
- Article detail page renders article title, excerpt, source, category, and published date
- When `summaryStatus === 'ok'`, the `NutritionLabel` renders with full transparency panel
- When `summaryStatus === 'pending'`, a polling mechanism checks for summary completion without layout shift
- When `summaryStatus === 'needs_review'`, a "Summary under editorial review" notice is shown (no NutritionLabel)
- When `summaryStatus === 'disabled'` or `'none'`, no summary UI is rendered
- JSON-LD `schema.org/CreativeWork` is embedded in the page for articles with summaries
- `X-AI-Provenance` HTTP header is set for articles with summaries
- `<meta name="ai-provenance">` tag is set in `generateMetadata()` for articles with summaries
- Admin summary review page shows flagged summaries with flagReason

### File List

| # | File Path | Description | Interfaces / Exports |
|---|-----------|-------------|---------------------|
| 5.1 | `src/app/(public)/article/[id]/page.tsx` | **CRITICAL FILE.** Article detail page. Fully dynamic (not cached — summary status changes). `generateMetadata()` sets HTML meta tag provenance (Layer 3). `PageTransition` wrapper. Async `params: Promise<{ id: string }>`. | Default page export, `generateMetadata` |
| 5.2 | `src/features/feed/components/ArticleDetail.tsx` | Server component rendering full article detail: headline, excerpt, source info, category, published date, canonical link. Conditionally renders `SummaryStatusPoller` based on `summaryStatus`. | `ArticleDetail` component |
| 5.3 | `src/features/summaries/components/NutritionLabel.tsx` | **CRITICAL FILE.** Human-readable AI disclosure component (EU AI Act Art. 50). Border-left in `dispatch-ember`. Shows: model, temperature, coverage %, citations count, compliance statement, sources cited list, "Verify with original source" link. | `NutritionLabel` component with `summary: Summary` prop |
| 5.4 | `src/features/summaries/components/SummaryPanel.tsx` | Summary text display with `NutritionLabel`. Handles the `needs_review` state with editorial review notice. | `SummaryPanel` component |
| 5.5 | `src/features/summaries/components/DisclosureBadge.tsx` | Small badge indicating AI-generated content. Links to the NutritionLabel section. | `DisclosureBadge` component |
| 5.6 | `src/features/summaries/components/SummaryStatusPoller.tsx` | Client component using React 19.2 `<Activity>` for zero-layout-shift polling. Polls summary status every 5s when `status === 'pending'`. Switches `<Activity mode="visible">` when status becomes `ok`. | `SummaryStatusPoller` component |
| 5.7 | `src/shared/hooks/useSummaryPoller.ts` | Hook for polling summary status via API endpoint. Returns current status and summary data. Stops polling on `ok`, `needs_review`, `disabled`, or error. | `useSummaryPoller()` hook |
| 5.8 | `src/lib/ai/provenance.ts` | **CRITICAL FILE.** 3-layer machine-readable disclosure generator. `generateProvenanceMetadata()` returns: `metaTag` (semicolon-separated key:value), `jsonLd` (schema.org/CreativeWork), `httpHeader` (base64 JSON). | `generateProvenanceMetadata()`, `ProvenanceData` interface |
| 5.9 | `src/features/summaries/actions.ts` | Server Action: `requestSummary()` — enqueues summarisation job. Verifies session, checks `contentAvailability` guard (rejects `title_only`/`excerpt`), returns job ID. | `requestSummary()` server action |
| 5.10 | `src/features/summaries/lib/summariseSchema.ts` | Zod schema enforcing all summary output fields: `summaryText` (50–800 chars), `keyPoints` (1–5 items), `sourcesCited` (min 1), `aiStatement`, `coveragePercentage` (0–100). Used by AI SDK `generateObject()`. | `summariseOutputSchema`, `SummariseOutput` type |
| 5.11 | `src/app/(admin)/summaries/page.tsx` | Admin summary review page. Calls `verifyAdminSession()`. Lists flagged summaries with `flagReason`. | Default page export |
| 5.12 | `src/features/summaries/components/SummaryReviewTable.tsx` | Admin table for reviewing flagged summaries. Actions: Approve (→ `ok`), Regenerate (→ `pending`), Disable (→ `disabled`). Requires `flagReason` on flag action. | `SummaryReviewTable` component |
| 5.13 | `src/features/summaries/queries.ts` | `getFlaggedSummaries()`, `getSummaryByArticleId()`. Used by admin review page and article detail page. | Summary query functions |

### Phase 5 Checklist

- [ ] Article detail page awaits `params` (Promise) before accessing `id`
- [ ] `generateMetadata()` awaits `params` and conditionally sets `ai-provenance` meta tag
- [ ] JSON-LD `schema.org/CreativeWork` embedded in page via `<script type="application/ld+json">`
- [ ] `X-AI-Provenance` HTTP header set in API response for articles with summaries
- [ ] `NutritionLabel` renders: model, temperature, coverage %, citations, compliance statement
- [ ] `NutritionLabel` shows sources cited list with numbered links
- [ ] `NutritionLabel` has "Verify with original source" link opening in new tab
- [ ] `NutritionLabel` has `dispatch-ember` border-left and `paper-100/40` background
- [ ] `summaryStatus === 'ok'`: full `NutritionLabel` rendered + "AI Brief" badge on feed card
- [ ] `summaryStatus === 'pending'`: `SummaryStatusPoller` polls every 5s, `<Activity>` prevents layout shift
- [ ] `summaryStatus === 'needs_review'`: editorial review notice shown, no NutritionLabel
- [ ] `summaryStatus === 'disabled'` or `'none'`: no summary UI rendered
- [ ] `requestSummary()` checks `contentAvailability` guard — rejects `title_only`/`excerpt`
- [ ] `summariseOutputSchema` enforces min/max lengths on all fields
- [ ] Admin review page requires `verifyAdminSession()` — redirects non-admins
- [ ] Admin can flag summary with `flagReason` (transitions `ok` → `needs_review`)
- [ ] Admin can approve flagged summary (transitions `needs_review` → `ok`)
- [ ] Admin can disable flagged summary (transitions `needs_review` → `disabled`)
- [ ] `flagReason` is retained for audit trail even after approval
- [ ] `generateProvenanceMetadata()` returns all three layers consistently

---

## Phase 6: Search Feature

**Objective:** Implement full-text search using PostgreSQL's native `tsvector` GIN index with `websearch_to_tsquery` for natural language queries, relevance ranking via `ts_rank_cd`, and cursor-based pagination. No external search engine — everything runs inside PostgreSQL.

**Why Seventh:** Search depends on the `articles.searchVector` generated column (defined in Phase 1), the `ArticleWithSource` type (defined in Phase 4), and the shared components (SearchBar, SearchResults). It is a self-contained feature module that adds significant value without requiring the worker service.

**Success Criteria:**
- Search bar accepts natural language queries and debounces input (300ms)
- Results are ranked by relevance (`ts_rank_cd`) with title weighted higher than excerpt
- Results show article title, excerpt, source name, published date, and relevance score
- Cursor-based pagination works for search results
- Empty search results show "No stories found" state
- API endpoint `/api/articles?q=...` returns search results as JSON
- Trigram index supports autocomplete/fuzzy matching on titles

### File List

| # | File Path | Description | Interfaces / Exports |
|---|-----------|-------------|---------------------|
| 6.1 | `src/features/search/components/SearchBar.tsx` | Client component with debounced input (300ms via `useDebounce`). Uses `UiInput` primitive. Shows search icon and clear button. Submits to search results page or API. | `SearchBar` component |
| 6.2 | `src/features/search/components/SearchResults.tsx` | Server component rendering search results as `ArticleCard`-styled items. Shows relevance indicator. Empty state for zero results. | `SearchResults` component |
| 6.3 | `src/features/search/queries.ts` | FTS query builder using `websearch_to_tsquery('english', query)`, `ts_rank_cd` for relevance scoring, `@@` operator for matching, cursor-based pagination. Joins with `sources` for source name. | `searchArticles()` |
| 6.4 | `src/app/api/articles/route.ts` | **CRITICAL FILE.** GET route handler for feed and search. Accepts `?category=`, `?q=`, `?cursor=` query params. Returns JSON array of articles. Sets `X-AI-Provenance` header when applicable. | GET handler |
| 6.5 | `src/app/(public)/search/page.tsx` | Search results page. Renders `SearchBar` + `SearchResults`. Uses `Suspense` for streaming. | Default page export |

### Phase 6 Checklist

- [ ] `searchArticles()` uses `websearch_to_tsquery` for natural language parsing
- [ ] Relevance ranking uses `ts_rank_cd` with title weight `A` (0.4) and excerpt weight `B` (0.2)
- [ ] `searchVector @@ tsQuery` condition applied in WHERE clause
- [ ] Results ordered by relevance DESC, then `publishedAt` DESC
- [ ] Cursor pagination: `LIMIT + 1` pattern for `hasNextPage`
- [ ] `SearchBar` debounces input at 300ms
- [ ] `SearchBar` shows clear button when input has text
- [ ] Zero results show "No stories found" empty state
- [ ] API endpoint `/api/articles?q=test` returns JSON array with source objects
- [ ] API endpoint `/api/articles?category=tech` returns feed articles with cursor pagination
- [ ] Trigram index on `title` supports prefix/fuzzy matching
- [ ] Raw SQL for GIN index with `fastupdate = off` documented and applied
- [ ] Partial index for recent articles (30 days) documented for performance

---

## Phase 7: Worker Service & Ingestion Pipeline

**Objective:** Build the separate Node.js 24 worker service with BullMQ v5 job queues, the RSS ingestion pipeline, the AI summarisation worker with content availability guards, the importance scoring worker, the feed-slice cache refresh worker, the job scheduler for idempotent RSS polling, and the atomic `FlowProducer` DAG (ingest → score → refresh-feed-slice). This is the data engine that keeps the platform alive.

**Why Eighth:** The worker service is the backend that populates the database with articles and summaries. The web app UI built in Phases 4–6 can be tested with seed data, but the real system requires the ingestion pipeline to be operational. The worker is a completely separate service that shares the database schema but runs independently.

**Success Criteria:**
- RSS feeds are polled on schedule via `upsertJobScheduler` (idempotent, restart-safe)
- New articles are upserted with content hash deduplication (`onConflictDoUpdate`)
- Content availability is correctly determined (`title_only`, `excerpt`, `partial_text`, `full_text`)
- Only `partial_text` and `full_text` articles are enqueued for summarisation
- Summarisation uses Claude 4.5 Haiku (primary) with GPT-5 Mini (fallback)
- Zod schema validates AI output; failures trigger BullMQ retry/DLQ
- Importance scoring is applied to all new articles
- Feed-slice cache is refreshed after scoring via `FlowProducer` DAG
- Graceful shutdown closes all workers before process exit
- BullMQ dashboard shows queue depths, active jobs, and failure rates

### File List

| # | File Path | Description | Interfaces / Exports |
|---|-----------|-------------|---------------------|
| 7.1 | `worker/src/index.ts` | Worker entry point. Initializes all queues, workers, and scheduler. Registers `SIGTERM`/`SIGINT` handlers for graceful shutdown. | Main script |
| 7.2 | `worker/src/queues/index.ts` | **CRITICAL FILE.** BullMQ Queue and Worker definitions. Redis connection with `maxRetriesPerRequest: null` + `enableOfflineQueue: false`. Default job options: 3 attempts, exponential backoff (2s/4s/8s), `removeOnComplete: 100`, `removeOnFail: 500`. Queue instances: `ingestQueue`, `summarizeQueue`, `scoreQueue`, `feedSliceQueue`. | All queue and worker exports, `flowProducer` |
| 7.3 | `worker/src/scheduler/index.ts` | Job scheduler using `upsertJobScheduler`. Reads active sources from DB, creates exactly one scheduler per source. Restart-safe (updates existing, does not duplicate). | `syncSchedulers()` |
| 7.4 | `worker/src/flows/ingest-flow.ts` | `FlowProducer` DAG: ingest → score → refresh-feed-slice. Atomic add in single Redis transaction. Parent runs only after ALL children complete. | `enqueuePostIngestFlow()` |
| 7.5 | `worker/src/jobs/ingest.ts` | Ingestion job handler. Fetches RSS/Atom feed, parses entries, normalises URLs via `normalizeCanonicalUrl()`, computes content hash, upserts with `onConflictDoUpdate` on `canonicalUrl`. Determines `contentAvailability`. Updates `sources.lastFetchedAt` and `failureCount`. | `processIngestion()` |
| 7.6 | `worker/src/jobs/summarize.ts` | **CRITICAL FILE.** Summarisation job handler. Enforces content availability guard (skips `title_only`/`excerpt`). Calls Claude 4.5 Haiku via AI SDK with `generateObject()` + `summariseOutputSchema`. On success: writes to `summaries` table, updates `articles.hasSummary = true` and `articles.summaryStatus = 'ok'`. On Zod failure: triggers BullMQ retry. On 3rd failure: sets `summaryStatus = 'needs_review'`. | `processSummarization()` |
| 7.7 | `worker/src/jobs/score.ts` | Scoring job handler. Applies `calculateImportanceScore()` from domain logic. Updates `articles.importanceScore`. | `processScoring()` |
| 7.8 | `worker/src/jobs/feed-slice.ts` | Feed-slice cache refresh job. Invalidates Next.js cache via `revalidateTag('feed:category', 'feed')`. Two-argument form mandatory. | `processFeedSliceRefresh()` |
| 7.9 | `worker/src/workers/ingestion/determineContentAvailability.ts` | Pure function determining content availability from parsed article data: no title → `title_only`, no excerpt → `excerpt`, body < 500 chars → `partial_text`, otherwise → `full_text`. | `determineContentAvailability()` |
| 7.10 | `worker/src/workers/summarization/enqueueSummarizeJob.ts` | Summarisation enqueue with content availability guard. Checks `contentAvailability` before adding to queue. Sets `summaryStatus = 'pending'` optimistically. | `enqueueSummarizeJob()` |
| 7.11 | `worker/src/lib/cacheInvalidation.ts` | Cache invalidation utilities. `invalidateFeedCache(categorySlug)` uses two-arg `revalidateTag('feed:slug', 'feed')`. `invalidateTopicShell()` and `invalidateReference()` for other cache profiles. | `invalidateFeedCache()`, `invalidateTopicShell()`, `invalidateReference()` |
| 7.12 | `src/lib/ai/prompts.ts` | AI prompt templates with system prompt for factual summarisation (temperature 0.1). Structured for `generateObject()` with Zod output schema. | Prompt template exports |
| 7.13 | `src/lib/queue/index.ts` | BullMQ Queue instances for the web app side (producer only). Used by Server Actions and API routes to enqueue jobs. Same Redis connection config. | Queue instances for web app |

### Phase 7 Checklist

- [ ] Worker service starts and connects to Redis successfully
- [ ] Redis configured with `maxRetriesPerRequest: null` (BullMQ requirement)
- [ ] Redis configured with `noeviction` policy (prevents job data loss)
- [ ] `syncSchedulers()` creates exactly one scheduler per active source
- [ ] `upsertJobScheduler` is restart-safe (does not duplicate schedulers)
- [ ] Ingestion job fetches RSS feed and parses entries correctly
- [ ] `normalizeCanonicalUrl()` deduplicates URLs (trailing slashes, query params, protocols)
- [ ] `hashContent()` produces consistent hashes for content change detection
- [ ] `onConflictDoUpdate` on `canonicalUrl` prevents duplicate articles
- [ ] `where: contentHash != excluded.content_hash` prevents unnecessary updates
- [ ] Content availability determined correctly: title_only / excerpt / partial_text / full_text
- [ ] **Summarisation guard**: only `partial_text` and `full_text` articles enqueued
- [ ] `title_only` and `excerpt` articles are NOT enqueued for summarisation (verified by logging)
- [ ] AI summarisation uses `generateObject()` with `summariseOutputSchema`
- [ ] Zod validation failure triggers BullMQ retry (up to 3 attempts with exponential backoff)
- [ ] 3rd failure sets `summaryStatus = 'needs_review'`
- [ ] Successful summarisation writes to `summaries` table and updates `articles.hasSummary`
- [ ] Importance scoring applied via `calculateImportanceScore()` domain function
- [ ] `FlowProducer` DAG enqueues atomic flow: ingest → score → feed-slice
- [ ] Parent (feed-slice) runs ONLY after ALL children (score) complete
- [ ] `revalidateTag()` called with TWO arguments: `revalidateTag('tag', 'profile')`
- [ ] Single-argument `revalidateTag()` is NOT used (causes TypeScript error in Next.js 16)
- [ ] Graceful shutdown: `SIGTERM`/`SIGINT` handlers close all workers before exit
- [ ] Worker service runs on Node.js 24 LTS
- [ ] `sources.lastFetchedAt` updated after each successful fetch
- [ ] `sources.failureCount` incremented on fetch failure, reset to 0 on success
- [ ] BullMQ dashboard accessible and shows queue depths

---

## Phase 8: API Routes

**Objective:** Build the public HTTP API endpoints for feed retrieval, search, and summarisation requests. These endpoints serve both the web app's client-side interactions and potential external consumers (Phase 4 enterprise features).

**Why Ninth:** API routes depend on the database schema (Phase 1), the auth layer (Phase 2), and the query functions from feature modules (Phases 4–6). They are the programmatic interface that enables the web app's client components to request summaries, paginate feeds, and search articles.

**Success Criteria:**
- `GET /api/articles` returns paginated feed articles with source objects
- `GET /api/articles?q=...` returns search results ranked by relevance
- `POST /api/summarize/[id]` enqueues summarisation job (requires session, checks content availability)
- API responses include proper HTTP status codes (200, 202, 400, 401, 404)
- Rate limiting is applied to public endpoints
- `X-AI-Provenance` header is set on responses for articles with AI summaries

### File List

| # | File Path | Description | Interfaces / Exports |
|---|-----------|-------------|---------------------|
| 8.1 | `src/app/api/articles/route.ts` | **CRITICAL FILE.** GET handler: accepts `?category=`, `?subcategory=`, `?q=`, `?cursor=`, `?limit=`. Returns JSON array of articles with source objects. Cursor-based pagination. When `q` param present, uses `searchArticles()`; otherwise uses `getFeedArticles()`. Sets `X-AI-Provenance` header. | GET handler |
| 8.2 | `src/app/api/summarize/[id]/route.ts` | POST handler: enqueues summarisation job. Verifies session via `verifySession()`. Checks `contentAvailability` guard (rejects `title_only`/`excerpt` with 400). Returns 202 with job ID. | POST handler |
| 8.3 | `src/app/api/categories/route.ts` | GET handler: returns all categories with subcategory counts. Used by TopicNav and search filters. | GET handler |
| 8.4 | `src/app/api/summary-status/[id]/route.ts` | GET handler: returns current summary status for an article. Used by `useSummaryPoller` hook. Returns `{ status, summary? }`. | GET handler |
| 8.5 | `src/lib/rate-limit.ts` | Rate limiting middleware using Redis counters. Sliding window: 60 requests/minute for anonymous, 200/minute for authenticated. | `rateLimit()` middleware |

### Phase 8 Checklist

- [ ] `GET /api/articles` returns JSON with `id`, `title`, `excerpt`, `source.name`, `publishedAt`
- [ ] `GET /api/articles?category=tech` returns category-filtered results
- [ ] `GET /api/articles?q=AI+regulation` returns search results with relevance scores
- [ ] `GET /api/articles?cursor=2026-06-10T12:00:00Z` returns next page of results
- [ ] `GET /api/articles` includes `X-AI-Provenance` header when article has summary
- [ ] `POST /api/summarize/[id]` returns 202 with `{ jobId }` on success
- [ ] `POST /api/summarize/[id]` returns 401 for unauthenticated users
- [ ] `POST /api/summarize/[id]` returns 400 for `title_only`/`excerpt` articles
- [ ] `POST /api/summarize/[id]` returns 404 for non-existent articles
- [ ] `GET /api/summary-status/[id]` returns `{ status: 'ok', summary: {...} }`
- [ ] `GET /api/summary-status/[id]` returns `{ status: 'pending' }` for in-progress
- [ ] Rate limiting applied: 60/min anonymous, 200/min authenticated
- [ ] Rate limit returns 429 with `Retry-After` header
- [ ] All API responses have correct `Content-Type: application/json`

---

## Phase 9: Push Notifications & User Preferences

**Objective:** Implement Web Push notifications with AI-summarised push payloads, DST-safe quiet hours evaluation using Luxon, AES-256-GCM encryption for push subscription keys at rest, and the user preferences management UI. This phase completes the daily engagement loop described in the PRD's target personas.

**Why Tenth:** Push notifications depend on the auth system (for subscription management), the worker service (for dispatch), the summarisation pipeline (for AI-generated push content), and the user preferences table (for quiet hours). All these prerequisites are in place by this phase.

**Success Criteria:**
- Users can opt in to Web Push notifications
- Push subscription keys are encrypted at rest with AES-256-GCM
- Notifications include a 1-sentence AI summary of the article
- Quiet hours evaluation is DST-safe (verified across timezone transitions)
- Users can configure favorite categories, muted sources, and quiet hours
- Daily briefing email can be scheduled (infrastructure only; email sending is Phase 2 of PRD rollout)

### File List

| # | File Path | Description | Interfaces / Exports |
|---|-----------|-------------|---------------------|
| 9.1 | `src/lib/security/encrypt.ts` | **CRITICAL FILE.** AES-256-GCM encryption/decryption for push subscription keys. `PUSH_KEY_ENCRYPTION_KEY` must be 64 hex chars (32 bytes). Format: `iv:authTag:encryptedData`. | `encryptPushKeys()`, `decryptPushKeys()` |
| 9.2 | `worker/src/workers/push/isWithinQuietHours.ts` | **CRITICAL FILE.** DST-safe quiet hours evaluation using Luxon `DateTime`. Converts UTC to user's local timezone. Handles overnight quiet periods (e.g., 22:00 → 07:00). Fails open (allows notification) if preferences are incomplete. | `isWithinQuietHours()` |
| 9.3 | `worker/src/jobs/push-dispatch.ts` | Push notification dispatch worker. Checks quiet hours, decrypts subscription keys, sends Web Push with 1-sentence AI summary payload. Respects `pushMaxPerDay` limit. | `processPushDispatch()` |
| 9.4 | `src/app/api/push/subscribe/route.ts` | POST handler: registers Web Push subscription. Encrypts keys before storing. Associates with authenticated user. | POST handler |
| 9.5 | `src/app/api/push/unsubscribe/route.ts` | POST handler: deactivates push subscription. Sets `isActive = false` rather than deleting (audit trail). | POST handler |
| 9.6 | `src/features/preferences/components/PreferencesPanel.tsx` | User preferences panel: favorite categories, muted sources, push notification toggles, quiet hours inputs, briefing time. Uses Shadcn UI form components. | `PreferencesPanel` component |
| 9.7 | `src/features/preferences/actions.ts` | Server Actions: `updatePushPreferences()`, `updateBriefingPreferences()`, `updateMutedSources()`. All verify session. | Server Action exports |
| 9.8 | `src/lib/push/vapid.ts` | VAPID key configuration and Web Push payload builder. Generates 1-sentence push summaries. | `sendPushNotification()`, VAPID config |
| 9.9 | `public/sw.js` | Service worker for Web Push. Handles `push` event, shows notification with AI summary. Handles `notificationclick` to open article. | Service worker script |

### Phase 9 Checklist

- [ ] `PUSH_KEY_ENCRYPTION_KEY` is 64 hex characters (32 bytes) validated by Zod
- [ ] `encryptPushKeys()` produces format: `iv:authTag:encryptedData`
- [ ] `decryptPushKeys()` correctly reverses encryption
- [ ] Push subscription keys stored encrypted in `pushSubscriptions.keys` column
- [ ] `isWithinQuietHours()` uses Luxon `DateTime` with user's timezone
- [ ] Overnight quiet period (22:00 → 07:00) handled correctly (wraps past midnight)
- [ ] Same-day quiet period (14:00 → 16:00) handled correctly
- [ ] Function fails OPEN (allows notification) if timezone is invalid or preferences incomplete
- [ ] Web Push subscription endpoint stored with unique constraint
- [ ] Subscription keys are decrypted only at dispatch time (never stored in plaintext)
- [ ] Push payload includes 1-sentence AI summary
- [ ] `pushMaxPerDay` limit respected (checked before dispatch)
- [ ] Service worker handles `push` event and shows notification
- [ ] Service worker handles `notificationclick` to navigate to article
- [ ] Unsubscribe sets `isActive = false` (does not delete row — audit trail)
- [ ] Preferences panel shows all configurable options
- [ ] Quiet hours inputs use time picker (not free text)
- [ ] Briefing timezone dropdown uses standard IANA timezone identifiers
- [ ] All preference mutations verify session before writing

---

## Phase 10: Testing, QA & Deployment

**Objective:** Implement the comprehensive testing strategy (unit, integration, E2E, performance, accessibility), establish CI/CD pipelines, and create deployment infrastructure. This phase validates everything built in Phases 0–9 and prepares the system for production deployment.

**Why Last:** Testing depends on having a complete, buildable application to test against. While TDD principles should be applied throughout development (writing tests alongside each phase), this phase formalises the test infrastructure, achieves coverage targets, and automates the quality gate.

**Success Criteria:**
- Unit test coverage ≥80% (Vitest)
- Integration test coverage ≥70% (Vitest + Docker PostgreSQL/Redis)
- Critical E2E paths pass (Playwright): feed navigation, search, summary toggle, admin CRUD
- API p95 latency ≤300ms (k6)
- LCP ≤1.5s on feed page
- Zero WCAG 2.1 AA violations (axe-core + Playwright)
- CI pipeline runs `lint + tsc + test` on every PR
- Production deployment works end-to-end

### File List

| # | File Path | Description | Interfaces / Exports |
|---|-----------|-------------|---------------------|
| 10.1 | `vitest.config.ts` | Vitest configuration: TypeScript path aliases, coverage thresholds (80% unit), setup files for DB test containers. | Vitest config |
| 10.2 | `playwright.config.ts` | Playwright configuration: browser targets (Chromium, Firefox, WebKit), base URL, screenshot on failure, axe-core integration. | Playwright config |
| 10.3 | `src/domain/articles/normalize.test.ts` | Unit tests: URL normalization edge cases, content hash determinism. | Test suite |
| 10.4 | `src/domain/ranking/score.test.ts` | Unit tests: scoring formula boundary conditions, source priority weighting, recency decay. | Test suite |
| 10.5 | `src/lib/ai/provenance.test.ts` | Unit tests: 3-layer provenance generation consistency, JSON-LD schema validity, header encoding. | Test suite |
| 10.6 | `src/lib/security/encrypt.test.ts` | Unit tests: AES-256-GCM encrypt/decrypt round-trip, invalid format handling, key length validation. | Test suite |
| 10.7 | `worker/src/workers/push/isWithinQuietHours.test.ts` | Unit tests: DST transition scenarios, overnight periods, same-day periods, invalid timezone fallback. | Test suite |
| 10.8 | `src/features/feed/queries.test.ts` | Integration tests: feed queries with real PostgreSQL, cursor pagination, source JOIN verification. | Test suite |
| 10.9 | `src/features/search/queries.test.ts` | Integration tests: FTS search with seeded articles, relevance ranking, pagination. | Test suite |
| 10.10 | `worker/src/jobs/ingest.test.ts` | Integration tests: RSS parsing, idempotent upsert, content availability determination. | Test suite |
| 10.11 | `worker/src/jobs/summarize.test.ts` | Integration tests: content availability guard, Zod validation on AI output, retry on failure. | Test suite |
| 10.12 | `e2e/feed.spec.ts` | E2E: navigate to category, verify article cards render, click article, verify detail page, check "AI Brief" badge. | E2E test |
| 10.13 | `e2e/search.spec.ts` | E2E: type search query, verify results, verify empty state, verify relevance ordering. | E2E test |
| 10.14 | `e2e/admin.spec.ts` | E2E: login as admin, navigate to sources, add source, flag summary, approve summary. | E2E test |
| 10.15 | `e2e/a11y.spec.ts` | Accessibility: keyboard navigation through feed, screen reader labels on AI badges, focus management. | E2E test |
| 10.16 | `perf/feed-load.ts` | k6 performance script: `GET /api/articles` p95 ≤300ms, feed page LCP ≤1.5s. | k6 script |
| 10.17 | `.github/workflows/ci.yml` | CI pipeline: `pnpm lint` → `pnpm tsc --noEmit` → `pnpm test` → `pnpm build`. PostgreSQL and Redis service containers. | GitHub Actions workflow |
| 10.18 | `.github/workflows/deploy.yml` | CD pipeline: apply migrations → deploy web app → deploy worker → verify health endpoints. | GitHub Actions workflow |
| 10.19 | `Dockerfile.web` | Multi-stage Docker build for Next.js web app. Production image with standalone output. | Docker image |
| 10.20 | `Dockerfile.worker` | Multi-stage Docker build for Node.js worker service. Production image with graceful shutdown. | Docker image |
| 10.21 | `scripts/seed.ts` | Database seed script: creates default categories (tech, finance, politics, culture, local) with subcategories, adds 5–10 sample RSS sources. | Seed script |
| 10.22 | `docker-compose.prod.yml` | Production Docker Compose: PostgreSQL, Redis, web app, worker service, with health checks and restart policies. | Docker Compose config |

### Phase 10 Checklist

- [ ] Unit tests: ≥80% line coverage on domain logic (`normalize.ts`, `score.ts`, `provenance.ts`)
- [ ] Unit tests: ≥80% line coverage on security (`encrypt.ts`)
- [ ] Unit tests: ≥80% line coverage on utilities (`isWithinQuietHours.ts`)
- [ ] Integration tests: feed queries with real PostgreSQL pass
- [ ] Integration tests: search queries with GIN index pass
- [ ] Integration tests: ingestion job with idempotent upsert passes
- [ ] Integration tests: summarisation guard (rejects `title_only`/`excerpt`) passes
- [ ] E2E: feed navigation from home → category → article → back passes
- [ ] E2E: search with results and empty state passes
- [ ] E2E: admin login, source CRUD, summary review passes
- [ ] E2E: keyboard navigation through feed (Tab, Enter, Escape) passes
- [ ] E2E: axe-core audit: zero WCAG 2.1 AA violations
- [ ] Performance: `GET /api/articles` p95 ≤300ms (k6, 100 VUs)
- [ ] Performance: feed page LCP ≤1.5s (Lighthouse / k6)
- [ ] CI pipeline: `lint + tsc + test + build` runs on every PR
- [ ] CI pipeline: PostgreSQL and Redis service containers available
- [ ] CD pipeline: migrations applied before code deploy
- [ ] CD pipeline: health endpoints verified post-deploy
- [ ] Docker builds: web app and worker images build successfully
- [ ] Seed script: creates default categories with subcategories
- [ ] Seed script: adds sample RSS sources for local development
- [ ] `pnpm lint && pnpm tsc --noEmit && pnpm test` passes (pre-commit gate)

---

## Master File Inventory

Complete list of all files to create, organized by directory:

### Root Configuration
| File | Phase |
|------|-------|
| `package.json` | 0 |
| `tsconfig.json` | 0 |
| `next.config.ts` | 0 |
| `drizzle.config.ts` | 0 |
| `tailwind.config.ts` | 0 |
| `globals.css` | 0 |
| `docker-compose.yml` | 0 |
| `.env.example` | 0 |
| `.eslintrc.json` | 0 |
| `.prettierrc` | 0 |
| `proxy.ts` | 2 |
| `vitest.config.ts` | 10 |
| `playwright.config.ts` | 10 |
| `Dockerfile.web` | 10 |
| `Dockerfile.worker` | 10 |
| `docker-compose.prod.yml` | 10 |

### Scripts
| File | Phase |
|------|-------|
| `scripts/init-extensions.sql` | 0 |
| `scripts/migrate.ts` | 1 |
| `scripts/seed.ts` | 10 |

### Source — Application Layer
| File | Phase |
|------|-------|
| `src/app/layout.tsx` | 0 |
| `src/app/page.tsx` | 0 |
| `src/app/api/auth/[...nextauth]/route.ts` | 2 |
| `src/app/(auth)/sign-in/page.tsx` | 2 |
| `src/app/(admin)/layout.tsx` | 2 |
| `src/app/(admin)/summaries/page.tsx` | 5 |
| `src/app/(admin)/sources/page.tsx` | 5 |
| `src/app/(public)/page.tsx` | 4 |
| `src/app/(public)/topics/[category]/page.tsx` | 4 |
| `src/app/(public)/topics/[category]/error.tsx` | 3 |
| `src/app/(public)/article/[id]/page.tsx` | 5 |
| `src/app/(public)/article/[id]/error.tsx` | 3 |
| `src/app/(public)/search/page.tsx` | 6 |
| `src/app/api/articles/route.ts` | 6 |
| `src/app/api/summarize/[id]/route.ts` | 8 |
| `src/app/api/categories/route.ts` | 8 |
| `src/app/api/summary-status/[id]/route.ts` | 8 |
| `src/app/api/push/subscribe/route.ts` | 9 |
| `src/app/api/push/unsubscribe/route.ts` | 9 |

### Source — Feature Modules
| File | Phase |
|------|-------|
| `src/features/feed/components/FeedGrid.tsx` | 4 |
| `src/features/feed/components/ArticleCard.tsx` | 4 |
| `src/features/feed/components/Feed.tsx` | 4 |
| `src/features/feed/components/TopicNav.tsx` | 4 |
| `src/features/feed/components/FeedPagination.tsx` | 4 |
| `src/features/feed/components/FeedSkeleton.tsx` | 3 |
| `src/features/feed/components/ArticleSkeleton.tsx` | 3 |
| `src/features/feed/queries.ts` | 4 |
| `src/features/feed/actions.ts` | 4 |
| `src/features/categories/queries.ts` | 4 |
| `src/features/summaries/components/NutritionLabel.tsx` | 5 |
| `src/features/summaries/components/SummaryPanel.tsx` | 5 |
| `src/features/summaries/components/DisclosureBadge.tsx` | 5 |
| `src/features/summaries/components/SummaryStatusPoller.tsx` | 5 |
| `src/features/summaries/components/SummaryReviewTable.tsx` | 5 |
| `src/features/summaries/actions.ts` | 5 |
| `src/features/summaries/queries.ts` | 5 |
| `src/features/summaries/lib/summariseSchema.ts` | 5 |
| `src/features/search/components/SearchBar.tsx` | 6 |
| `src/features/search/components/SearchResults.tsx` | 6 |
| `src/features/search/queries.ts` | 6 |
| `src/features/preferences/components/PreferencesPanel.tsx` | 9 |
| `src/features/preferences/actions.ts` | 9 |

### Source — Domain Layer
| File | Phase |
|------|-------|
| `src/domain/articles/types.ts` | 1 |
| `src/domain/articles/normalize.ts` | 1 |
| `src/domain/ranking/score.ts` | 1 |

### Source — Infrastructure Layer
| File | Phase |
|------|-------|
| `src/lib/db/schema.ts` | 1 |
| `src/lib/db/index.ts` | 1 |
| `src/lib/env/index.ts` | 0 |
| `src/lib/auth/index.ts` | 2 |
| `src/lib/auth/dal.ts` | 2 |
| `src/lib/ai/prompts.ts` | 7 |
| `src/lib/ai/provenance.ts` | 5 |
| `src/lib/queue/index.ts` | 7 |
| `src/lib/security/encrypt.ts` | 9 |
| `src/lib/push/vapid.ts` | 9 |
| `src/lib/rate-limit.ts` | 8 |
| `src/lib/utils/date.ts` | 3 |

### Source — Shared Components & Hooks
| File | Phase |
|------|-------|
| `src/components/primitives/PageTransition.tsx` | 3 |
| `src/shared/components/UiButton.tsx` | 3 |
| `src/shared/components/UiCard.tsx` | 3 |
| `src/shared/components/UiInput.tsx` | 3 |
| `src/shared/components/UiBadge.tsx` | 3 |
| `src/shared/components/UiSkeleton.tsx` | 3 |
| `src/shared/components/UiDialog.tsx` | 3 |
| `src/shared/components/UiTable.tsx` | 3 |
| `src/shared/hooks/useDebounce.ts` | 3 |
| `src/shared/hooks/useArticleActivity.ts` | 3 |
| `src/shared/hooks/useTopicTransition.ts` | 4 |
| `src/shared/hooks/useSummaryPoller.ts` | 5 |

### Worker Service
| File | Phase |
|------|-------|
| `worker/src/index.ts` | 7 |
| `worker/src/queues/index.ts` | 7 |
| `worker/src/scheduler/index.ts` | 7 |
| `worker/src/flows/ingest-flow.ts` | 7 |
| `worker/src/jobs/ingest.ts` | 7 |
| `worker/src/jobs/summarize.ts` | 7 |
| `worker/src/jobs/score.ts` | 7 |
| `worker/src/jobs/feed-slice.ts` | 7 |
| `worker/src/jobs/push-dispatch.ts` | 9 |
| `worker/src/workers/ingestion/determineContentAvailability.ts` | 7 |
| `worker/src/workers/summarization/enqueueSummarizeJob.ts` | 7 |
| `worker/src/workers/push/isWithinQuietHours.ts` | 9 |
| `worker/src/lib/cacheInvalidation.ts` | 7 |

### Tests
| File | Phase |
|------|-------|
| `src/domain/articles/normalize.test.ts` | 10 |
| `src/domain/ranking/score.test.ts` | 10 |
| `src/lib/ai/provenance.test.ts` | 10 |
| `src/lib/security/encrypt.test.ts` | 10 |
| `worker/src/workers/push/isWithinQuietHours.test.ts` | 10 |
| `src/features/feed/queries.test.ts` | 10 |
| `src/features/search/queries.test.ts` | 10 |
| `worker/src/jobs/ingest.test.ts` | 10 |
| `worker/src/jobs/summarize.test.ts` | 10 |
| `e2e/feed.spec.ts` | 10 |
| `e2e/search.spec.ts` | 10 |
| `e2e/admin.spec.ts` | 10 |
| `e2e/a11y.spec.ts` | 10 |
| `perf/feed-load.ts` | 10 |

### CI/CD
| File | Phase |
|------|-------|
| `.github/workflows/ci.yml` | 10 |
| `.github/workflows/deploy.yml` | 10 |

### Static Assets
| File | Phase |
|------|-------|
| `public/sw.js` | 9 |

---

## Critical Invariants Summary

These invariants must hold across ALL phases. Violation causes silent breakage or security vulnerabilities.

| # | Invariant | Consequence of Violation |
|---|-----------|--------------------------|
| 1 | `cacheComponents: true` at **top-level** of `next.config.ts` | Every `"use cache"` silently ignored. Zero caching. |
| 2 | `cacheLife` profiles at **top-level** of `next.config.ts` | `cacheLife('feed')` throws runtime error. |
| 3 | `experimental.viewTransition: true` **inside** `experimental: {}` | View transitions silently disabled. |
| 4 | **NEVER** include `experimental.ppr` or `experimental.dynamicIO` | Build error in Next.js 16. |
| 5 | Always `await params` and `await searchParams` (they are Promises) | Runtime 500 error in Next.js 16. |
| 6 | `proxy.ts` is UX-only. Real auth in DAL (`verifySession`/`verifyAdminSession`) | Security bypass. |
| 7 | Use `redirect()` not `throw new Error()` in RSC auth failures | Full-page error boundary. Bad UX. |
| 8 | Feed queries MUST `innerJoin` with `sources` table | `article.source.name` is undefined. UI broken. |
| 9 | Never summarise `title_only` or `excerpt` articles | AI hallucination. EU AI Act violation. |
| 10 | `revalidateTag()` must use **two arguments** (`tag`, `profile`) | TypeScript error / cache not invalidated. |
| 11 | Redis must have `maxRetriesPerRequest: null` + `noeviction` policy | BullMQ loses jobs. |
| 12 | Push keys encrypted at rest with AES-256-GCM | Key exposure. Security vulnerability. |
| 13 | Quiet hours use Luxon, never raw `Date` arithmetic | DST evaluation errors. Wrong notification timing. |
| 14 | Never use `any` in TypeScript. Use `unknown` + type guards | Breaks strict mode. Loss of type safety. |
| 15 | Never use Inter, Roboto, or Space Grotesk | Violates Editorial Dispatch anti-generic mandate. |
| 16 | Layouts must not fetch data (causes re-renders) | Performance degradation. Stale data. |
| 17 | `drizzle-kit push` is forbidden in production. Use `generate + migrate` only | Irreversible schema overwrite. |
| 18 | Next.js pinned to ≥16.2.6 (CVE-2025-55182 mitigation) | Remote code execution vulnerability. |

---

## Risk Register Reference

The full 14-item risk register is documented in both the PRD v4.3 and PAD v4.5. The most critical risks for the build process are:

| ID | Risk | Build Mitigation |
|----|------|------------------|
| R1 | `"use cache"` silently inert | Phase 0 checklist verifies `cacheComponents: true` at top-level |
| R2 | ViewTransition API renamed | Phase 3 isolates all usage behind `PageTransition` abstraction |
| R7 | Unpatched Next.js | Phase 0 pins to ≥16.2.6 in `package.json` |
| R9 | AI hallucination on low-quality content | Phase 7 enforces `contentAvailabilityEnum` guard |
| R14 | Unbounded feed queries | Phase 4 enforces 30-item cursor pagination |

---

*This Master Execution Plan is derived from the PRD v4.3, PAD v4.5, CLAUDE.md, and README.md. Where this plan and those documents diverge, the PRD/PAD are the source of truth.*
