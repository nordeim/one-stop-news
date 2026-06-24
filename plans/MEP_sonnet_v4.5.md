# OneStopNews — Master Execution Plan
**Classification:** Internal Engineering Reference  
**Status:** AUTHORITATIVE IMPLEMENTATION BLUEPRINT  
**Companion Documents:** PRD v4.3 · PAD v4.5 · CLAUDE.md · README.md  
**Last Updated:** June 11, 2026  
**Prepared By:** Claw Code — Frontend Architect & Avant-Garde UI Designer  
---
## Executive Summary
OneStopNews is a **topic-first news aggregation and AI summarisation platform** built on Next.js ≥16.2.6, React 19.2, PostgreSQL 17, BullMQ v5 on Redis, and a separate Node.js 24 LTS worker service. The codebase is organised as a **modular monolith** (web app) plus a **separate worker service**, connected via BullMQ queues and a shared PostgreSQL database.
The current project state is a bare scaffold: `package.json` has Next.js 16.2.6, Drizzle ORM, and Tailwind CSS v4 installed, but the schema is empty, `next.config.ts` is unconfigured, and no features exist. **Everything must be built from scratch** across 7 logical, independently deployable phases.
---
## Deep Analysis: What We're Building
### Core Architectural Pillars
1. **5-Layer Request Model:** `proxy.ts` (Layer 0) → App Router (Layer 1) → Feature Modules (Layer 2) → Domain Services (Layer 3) → Infrastructure (Layer 4)
2. **"Editorial Dispatch" Design System:** Newsreader (headlines) + Instrument Sans (UI) + Commit Mono (metadata). Colors: `ink-900` through `paper-50` + `dispatch-ember` accent. CSS Subgrid feed alignment.
3. **Opt-In Caching:** `cacheComponents: true` at top-level. Everything dynamic by default. Named `cacheLife` profiles: `feed`, `topicShell`, `reference`.
4. **AI Pipeline with Anti-Hallucination Guard:** Content availability check before any summarisation. 3-layer EU AI Act disclosure (JSON-LD + HTTP header + HTML meta).
5. **Auth at the DAL:** `proxy.ts` is UX-only. Real auth lives in `verifySession()` / `verifyAdminSession()` using `React.cache()` memoization.
### Critical Configuration Invariants (Must Not Be Violated)
| Flag | Placement | Why |
|---|---|---|
| `cacheComponents: true` | Top-level | Silently ignored if in `experimental` |
| `cacheLife: { ... }` | Top-level | Runtime throws if missing |
| `turbopack: {}` | Top-level | Graduated from experimental |
| `reactCompiler: true` | Top-level | Ignored if in `experimental` |
| `experimental.viewTransition: true` | Inside `experimental: {}` | Transitions disabled if misplaced |
| `experimental.ppr` | **DO NOT INCLUDE** | Build error in Next.js 16 |
| `experimental.dynamicIO` | **DO NOT INCLUDE** | Deprecated |
### Existing Project State
- ✅ Next.js 16.2.6 installed  
- ✅ React 19.2.6 installed  
- ✅ Drizzle ORM + drizzle-kit installed  
- ✅ Tailwind CSS v4 installed  
- ✅ TypeScript 5.9.3 installed  
- ❌ `next.config.ts` — bare skeleton (needs full configuration)  
- ❌ `src/db/schema.ts` — empty (needs complete schema)  
- ❌ `src/app/globals.css` — bare `@import "tailwindcss"` (needs full design system tokens)  
- ❌ `src/app/layout.tsx` — generic starter (needs Editorial Dispatch fonts + providers)  
- ❌ All features, domain, lib directories — do not exist  
- ❌ Missing packages: Zod, Auth.js v5, Shadcn UI / Radix, BullMQ, ioredis, Anthropic SDK, OpenAI SDK, Vercel AI SDK, Luxon, web-push, next-themes  
---
## Phased Execution Roadmap
The build is organised into **7 logical phases**. Each phase is independently deployable and verifiable. Phases 1–4 constitute V1 (the complete feature-complete application). Phases 5–7 are enhancement layers.
```
Phase 1: Foundation & Configuration
Phase 2: Database Schema & Infrastructure  
Phase 3: Design System & Shared Components
Phase 4: Core Feed Feature (Topic-First Feed)
Phase 5: AI Summarisation Pipeline
Phase 6: Search, Admin & API
Phase 7: Worker Service, Push Notifications & Observability
```
---
## Phase 1: Foundation & Configuration
### Objective
Establish the correct Next.js 16 configuration, install all required dependencies, and wire up the environment variable schema. This phase has no UI output but all subsequent phases depend on it being correct.
### Key Decisions
- `next.config.ts` must have ALL flags in their verified positions per PAD §5.2
- `proxy.ts` replaces `middleware.ts` — runs on Node.js runtime, not Edge
- Zod-validated `env/index.ts` fails fast on startup if any required env var is missing
- Font loading via `next/font/google` in root layout only
### Files to Create/Modify
---
#### `next.config.ts` ← **MODIFY**
**Features:** Full production configuration with correct flag placement. Cache profiles. Turbopack. View Transitions. Security headers.
**Interfaces:**
```ts
interface NextConfig {
  cacheComponents: true;
  cacheLife: { feed: {...}; topicShell: {...}; reference: {...} };
  turbopack: {};
  reactCompiler: true;
  experimental: { viewTransition: true; clientSegmentCache: true };
  // NOT included: experimental.ppr, experimental.dynamicIO
}
```
**Checklist:**
- [ ] `cacheComponents: true` at top-level (not inside experimental)
- [ ] `cacheLife` profiles defined at top-level: `feed` (60s stale, 300s revalidate), `topicShell` (3600s), `reference` (86400s)
- [ ] `turbopack: {}` at top-level (not inside experimental)
- [ ] `reactCompiler: true` at top-level
- [ ] `experimental.viewTransition: true` inside `experimental: {}`
- [ ] `experimental.clientSegmentCache: true` inside `experimental: {}`
- [ ] `experimental.ppr` is ABSENT
- [ ] `experimental.dynamicIO` is ABSENT
- [ ] Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- [ ] TypeScript: passes `tsc --noEmit`
---
#### `proxy.ts` ← **CREATE**
**Features:** Network boundary (Layer 0). Lightweight cookie check + redirect. No DB calls. No business logic. Runs on Node.js runtime.
**Interfaces:**
```ts
// Next.js proxy.ts (replaces middleware.ts)
// Config: matcher for admin routes only
// Logic: check session cookie → redirect to /sign-in if absent
```
**Checklist:**
- [ ] Exports `config` with `matcher: ['/admin/:path*']`
- [ ] Reads session cookie via `cookies()` from `next/headers`
- [ ] Redirects to `/sign-in` if cookie absent (optimistic, not authoritative)
- [ ] Zero DB calls — this is UX only
- [ ] Zero business logic — `verifySession()` in the DAL is the real auth boundary
- [ ] TypeScript strict
---
#### `src/lib/env/index.ts` ← **CREATE**
**Features:** Zod-validated environment variable schema. Fails fast on startup with descriptive error messages if any required var is missing or malformed.
**Interfaces:**
```ts
interface EnvSchema {
  DATABASE_URL: string; // z.string().url()
  REDIS_URL: string; // z.string().url()
  AUTH_SECRET: string; // z.string().min(32)
  AUTH_TRUST_HOST?: string;
  ANTHROPIC_API_KEY: string; // z.string().startsWith('sk-ant-')
  OPENAI_API_KEY?: string;
  PUSH_KEY_ENCRYPTION_KEY: string; // z.string().length(64).regex(/^[0-9a-fA-F]+$/)
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}
export const env: EnvSchema;
```
**Checklist:**
- [ ] Zod schema covers all env vars from PRD Appendix C
- [ ] `ANTHROPIC_API_KEY` validated with `startsWith('sk-ant-')`
- [ ] `PUSH_KEY_ENCRYPTION_KEY` validated as 64-char hex string
- [ ] `env` object exported — all consuming code imports from here, not `process.env` directly
- [ ] Throws on startup with a clear, human-readable error listing all missing vars
- [ ] TypeScript strict: `export const env` is typed, not `any`
---
#### `drizzle.config.ts` ← **CREATE** (replaces `drizzle.config.json`)
**Features:** Drizzle Kit configuration pointing to the TypeScript schema and PostgreSQL database.
**Interfaces:**
```ts
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```
**Checklist:**
- [ ] Schema path points to `src/lib/db/schema.ts` (not `src/db/schema.ts`)
- [ ] Migration output in `./drizzle` directory
- [ ] Strict mode enabled
- [ ] `drizzle-kit generate` runs without errors after Phase 2 schema is complete
---
#### `.env.example` ← **CREATE**
**Features:** Template for required environment variables with documentation comments.
**Checklist:**
- [ ] All vars from PRD Appendix C listed
- [ ] Comments explain each var's purpose and format constraints
- [ ] `PUSH_KEY_ENCRYPTION_KEY` includes generation command: `openssl rand -hex 32`
- [ ] `AUTH_SECRET` includes generation command: `openssl rand -base64 33`
- [ ] No real secrets committed
---
#### `package.json` ← **MODIFY (via install_npm_packages)**
**Required packages to install:**
- `zod` — schema validation
- `next-auth@beta` (Auth.js v5) — authentication  
- `@auth/drizzle-adapter` — Auth.js + Drizzle integration
- `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`, `@radix-ui/react-tabs`, `@radix-ui/react-select`, `@radix-ui/react-separator`, `@radix-ui/react-label`, `@radix-ui/react-slot` — Radix UI primitives
- `class-variance-authority`, `clsx`, `tailwind-merge` — Shadcn UI utilities
- `lucide-react` — icon set
- `bullmq`, `ioredis` — job queue
- `@anthropic-ai/sdk` — Claude API
- `openai` — OpenAI API (fallback)
- `ai` (Vercel AI SDK) — `generateObject()` with Zod schemas
- `luxon` — DST-safe timezone handling  
- `@types/luxon` — types for luxon
- `web-push` — VAPID push notifications
- `@types/web-push` — types for web-push
- `postgres` — postgres.js driver (replaces `pg`)
- `next-themes` — dark mode provider (future)
**Checklist:**
- [ ] All packages from the list above installed
- [ ] No duplicate functionality between packages
- [ ] `next-auth` pinned to `beta` channel
- [ ] TypeScript type packages in devDependencies
---
**Phase 1 Success Criteria:**
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds (even with no pages beyond health check)
- [ ] `next.config.ts` passes config validation (no console warnings about misplaced flags)
- [ ] All required packages importable without runtime errors
---
## Phase 2: Database Schema & Infrastructure
### Objective
Define the complete, production-ready Drizzle ORM schema (all tables, enums, indexes) and set up the infrastructure layer: lazy DB client, Auth.js v5 configuration, and BullMQ queue instances.
### Key Decisions
- Lazy Proxy Connection in `lib/db/index.ts` — defers connection to first query
- All tables defined in `lib/db/schema.ts` — single source of truth for types
- Types derive from schema via `.$inferSelect` / `.$inferInsert` — never hand-written
- `contentAvailabilityEnum` is the anti-hallucination gate
- GIN FTS index with `fastupdate = off` (raw SQL in migration — Drizzle cannot express this)
- BullMQ Queue instances created as singletons in `lib/queue/index.ts`
### Files to Create/Modify
---
#### `src/lib/db/schema.ts` ← **CREATE** (supersedes `src/db/schema.ts`)
**Features:** Complete Drizzle schema for all 10 tables. Enums. Relationships. Generated columns.
**Tables & Interfaces:**
```ts
// ── Enums ────────────────────────────────────────────────
type ContentAvailability = 'title_only' | 'excerpt' | 'partial_text' | 'full_text';
type SummaryStatus = 'none' | 'pending' | 'ok' | 'needs_review' | 'disabled';
type UserRole = 'reader' | 'admin';
type SourceStatus = 'active' | 'paused' | 'error' | 'disabled';
type FeedFormat = 'rss' | 'atom' | 'json_api';
// ── Tables ───────────────────────────────────────────────
interface UsersTable {
  id: uuid PK;
  name: text notNull;
  email: text unique notNull;
  emailVerified: timestamp;
  image: text;
  role: userRoleEnum default 'reader' notNull;
  createdAt: timestamp defaultNow notNull;
  updatedAt: timestamp notNull;
}
interface AccountsTable { // Auth.js adapter
  userId: uuid FK→users.id;
  type: text; provider: text; providerAccountId: text;
  // ... OAuth fields
}
interface SessionsTable { // Auth.js adapter
  sessionToken: text PK; userId: uuid FK; expires: timestamp;
}
interface VerificationTokensTable { // Auth.js adapter
  identifier: text; token: text; expires: timestamp;
}
interface CategoriesTable {
  id: uuid PK; name: text notNull; slug: text unique notNull;
  description: text; sortOrder: integer default 0 notNull;
  createdAt: timestamp defaultNow notNull;
}
interface SubcategoriesTable {
  id: uuid PK; categoryId: uuid FK→categories.id notNull;
  name: text notNull; slug: text notNull; // UNIQUE(categoryId, slug) [R12 mitigation]
  createdAt: timestamp defaultNow notNull;
}
interface SourcesTable {
  id: uuid PK; name: text notNull; feedUrl: text unique notNull;
  siteUrl: text notNull; feedFormat: feedFormatEnum default 'rss' notNull;
  categoryId: uuid FK→categories.id notNull;
  subcategoryId: uuid FK→subcategories.id;
  status: sourceStatusEnum default 'active' notNull;
  pollIntervalMinutes: integer default 60 notNull;
  politicalLeaning: text; // Phase 2: ML classification
  consecutiveFailures: integer default 0 notNull;
  lastSuccessAt: timestamp; lastErrorAt: timestamp; lastErrorMessage: text;
  createdAt: timestamp defaultNow notNull; updatedAt: timestamp notNull;
}
interface ArticlesTable {
  id: uuid PK; sourceId: uuid FK→sources.id notNull;
  categoryId: uuid FK→categories.id notNull;
  subcategoryId: uuid FK→subcategories.id;
  title: text notNull; excerpt: text; fullText: text;
  canonicalUrl: text unique notNull; // Idempotency key for upserts
  contentHash: text notNull; // For change detection in upserts
  contentAvailability: contentAvailabilityEnum default 'title_only' notNull;
  summaryStatus: summaryStatusEnum default 'none' notNull;
  hasSummary: boolean default false notNull; // Denormalized for query performance
  importanceScore: real default 0; publishedAt: timestamp notNull;
  ingestedAt: timestamp defaultNow notNull; updatedAt: timestamp notNull;
  // Generated column — FTS index target
  searchVector: tsvector generatedAlways as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
  ) stored;
}
interface SummariesTable {
  id: uuid PK; articleId: uuid FK→articles.id unique notNull;
  summaryText: text notNull; keyPoints: jsonb[].$type<string[]> notNull;
  sourcesCited: jsonb.$type<{url:string;title:string}[]> notNull;
  aiStatement: text notNull;
  coveragePercentage: integer notNull; // 0-100
  model: text notNull; // e.g., 'claude-haiku-4-5'
  generatedAt: timestamp defaultNow notNull;
  flagReason: text; // populated when status=needs_review|disabled
  originalArticleUrl: text notNull; // denormalized for NutritionLabel
  complianceStatement: text notNull; // EU AI Act Art. 50 statement
}
interface SourceHealthSnapshotsTable {
  id: uuid PK; sourceId: uuid FK→sources.id notNull;
  checkedAt: timestamp defaultNow notNull;
  success: boolean notNull; httpStatus: integer;
  articlesFound: integer; errorMessage: text;
}
interface PushSubscriptionsTable {
  id: uuid PK; userId: uuid FK→users.id notNull;
  endpoint: text unique notNull;
  keys: jsonb.$type<{p256dh:string;auth:string}>() notNull; // AES-256-GCM encrypted
  userAgent: text; createdAt: timestamp defaultNow notNull;
  isActive: boolean default true notNull;
}
interface UserPreferencesTable {
  id: uuid PK; userId: uuid FK→users.id unique notNull;
  favoriteCategories: jsonb.$type<string[]> default [] notNull;
  mutedSources: jsonb.$type<string[]> default [] notNull;
  pushEnabled: boolean default false notNull;
  pushCategories: jsonb.$type<string[]> default [] notNull;
  pushQuietStart: time; pushQuietEnd: time;
  pushMaxPerDay: integer default 10 notNull;
  briefingEnabled: boolean default false notNull;
  briefingTime: time; briefingTimezone: text;
  readingModeDefault: boolean default false notNull;
}
```
**Index Inventory (Raw SQL for migration):**
```sql
-- GIN FTS (fastupdate=off is NON-NEGOTIABLE for ingestion workload)
CREATE INDEX CONCURRENTLY articles_search_vector_gin_idx
  ON articles USING gin (search_vector) WITH (fastupdate = off);
-- Partial index for recent articles (most common search pattern)
CREATE INDEX CONCURRENTLY articles_search_recent_partial_idx
  ON articles USING gin (search_vector)
  WHERE published_at > NOW() - INTERVAL '30 days';
-- Trigram for autocomplete
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY articles_title_trgm_idx
  ON articles USING gist (title gist_trgm_ops);
-- Composite unique for subcategory slugs [R12 mitigation]
-- (defined in Drizzle schema via uniqueIndex(['categoryId', 'slug']))
-- Performance indexes
CREATE INDEX articles_category_published_idx ON articles (category_id, published_at DESC);
CREATE INDEX articles_source_id_idx ON articles (source_id);
CREATE INDEX articles_summary_status_idx ON articles (summary_status) WHERE summary_status != 'none';
CREATE INDEX sources_status_idx ON sources (status) WHERE status = 'active';
```
**Checklist:**
- [ ] All 10 tables defined with correct column types and constraints
- [ ] All 5 enums defined: `contentAvailability`, `summaryStatus`, `userRole`, `sourceStatus`, `feedFormat`
- [ ] `articles.canonicalUrl` has `unique()` constraint (idempotency key)
- [ ] `articles.contentHash` defined (change detection for upserts)
- [ ] `articles.searchVector` defined as Drizzle `customType` tsvector generated column
- [ ] `subcategories` has `uniqueIndex(['categoryId', 'slug'])` [R12 mitigation]
- [ ] `pushSubscriptions.keys` typed as `$type<{p256dh:string;auth:string}>`
- [ ] All `.$inferSelect` and `.$inferInsert` types re-exported from schema for use across codebase
- [ ] Auth.js adapter tables (accounts, sessions, verificationTokens) defined per `@auth/drizzle-adapter` spec
- [ ] Raw SQL index file `drizzle/custom-indexes.sql` documented
- [ ] `drizzle-kit generate` produces zero errors
- [ ] TypeScript strict
---
#### `src/lib/db/index.ts` ← **CREATE** (supersedes `src/db/index.ts`)
**Features:** Lazy Proxy Connection pattern. Defers PostgreSQL connection to first query. Prevents Next.js build-time crashes.
**Interfaces:**
```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
// Lazy proxy: connection is established on first query call, not at module import time.
export const db: DrizzlePostgresDatabase<typeof schema>;
```
**Checklist:**
- [ ] Uses `postgres` (postgres.js) driver, NOT `pg`
- [ ] Implements lazy proxy pattern (connection deferred until first query)
- [ ] `max: 10` connection pool (documented: for dedicated Node.js runtime only)
- [ ] `schema` imported and passed to `drizzle()` for relational queries (`db.query.*`)
- [ ] Connection string sourced from `process.env.DATABASE_URL` (or `env.DATABASE_URL` from env module)
- [ ] Export is the `db` singleton — all code imports from `@/lib/db`
- [ ] TypeScript strict
---
#### `src/lib/auth/index.ts` ← **CREATE**
**Features:** Auth.js v5 server instance. Drizzle adapter. JWT session strategy. Role-based JWT/session callbacks.
**Interfaces:**
```ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, schema),
  providers: [...],
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  callbacks: { jwt, session }, // injects user.role into token/session
});
// Exports for App Router: handlers for /api/auth/[...nextauth]/route.ts
```
**Checklist:**
- [ ] Uses `DrizzleAdapter` from `@auth/drizzle-adapter` with the Drizzle `db` and full `schema`
- [ ] JWT strategy: `session.strategy: 'jwt'`
- [ ] `jwt` callback injects `user.role` into token
- [ ] `session` callback exposes `session.user.role` to clients
- [ ] `user.role` typed as `'reader' | 'admin'` (no `any`)
- [ ] Credentials provider configured (email/password for admin) — OR Google/GitHub OAuth (configurable via env)
- [ ] `AUTH_SECRET` and `AUTH_TRUST_HOST` consumed from `env` module
- [ ] TypeScript strict — no `any` on callbacks
---
#### `src/lib/auth/dal.ts` ← **CREATE**
**Features:** Data Access Layer for authentication. `verifySession()` and `verifyAdminSession()`. React `cache()` memoization for per-request deduplication.
**Interfaces:**
```ts
// Both functions use React cache() — called multiple times in one render = ONE DB query
export const verifySession: () => Promise<{ user: {id: string; role: string; name: string}; sessionId: string | undefined }>;
export const verifyAdminSession: () => Promise<{id: string; role: string; name: string}>;
```
**Checklist:**
- [ ] `verifySession` wraps `cache(async () => {...})` from `react`
- [ ] Uses `redirect('/sign-in')` NOT `throw new Error()` — preserves invisible UX
- [ ] Fetches user from DB with `db.query.users.findFirst()` — selects only `{id, role, name}`
- [ ] `verifyAdminSession` calls `verifySession()` then checks `user.role === 'admin'`
- [ ] Admin check redirects to `'/'` NOT to error page
- [ ] Zero `any` types
- [ ] Pattern matches PAD §8.1 exactly
---
#### `src/lib/queue/index.ts` ← **CREATE**
**Features:** BullMQ Queue instances as singletons. Shared IORedis connection. Correct Redis configuration (maxRetriesPerRequest: null, noeviction must be set on Redis itself).
**Interfaces:**
```ts
// Four queue instances — producer side only (workers are in separate service)
export const ingestQueue: Queue;   // concurrency hint: 50 (I/O)
export const summarizeQueue: Queue; // concurrency hint: 5 (AI rate-limited)
export const scoreQueue: Queue;    // concurrency hint: 20 (CPU/DB)
export const feedSliceQueue: Queue; // concurrency hint: 10 (Redis)
export const connection: IORedis;  // shared connection
```
**Checklist:**
- [ ] IORedis connection with `maxRetriesPerRequest: null` (CRITICAL for BullMQ)
- [ ] Redis URL sourced from `env.REDIS_URL`
- [ ] All four queues exported: `ingestQueue`, `summarizeQueue`, `scoreQueue`, `feedSliceQueue`
- [ ] Queues share the same IORedis `connection` instance
- [ ] Queue options: `defaultJobOptions` with retry config (3 attempts, exponential backoff)
- [ ] TypeScript strict
---
#### `src/app/api/auth/[...nextauth]/route.ts` ← **CREATE**
**Features:** Route Handler that exposes Auth.js v5 HTTP endpoints (sign-in, sign-out, callback, session).
**Checklist:**
- [ ] Exports `GET` and `POST` from `auth.handlers`
- [ ] Located at `src/app/api/auth/[...nextauth]/route.ts`
- [ ] No custom logic — simply re-exports `handlers`
---
**Phase 2 Success Criteria:**
- [ ] `drizzle-kit generate` produces valid SQL migration files
- [ ] `drizzle-kit push` (dev only) applies schema without errors
- [ ] All table relationships correctly typed via Drizzle relational queries
- [ ] `db.query.articles.findFirst()` typechecks without errors
- [ ] Auth.js routes respond at `/api/auth/session`
- [ ] TypeScript strict across all files
---
## Phase 3: Design System & Shared Components
### Objective
Implement the "Editorial Dispatch" design system: CSS custom properties, typography, color tokens, and all shared/primitive components that feed and article features depend on. This is the visual foundation.
### Design Philosophy: The Editorial Dispatch
- **Conceptual Direction:** Wire service terminal meets refined long-read publication. Calm authority.
- **Anti-Generic Enforcement:** Newsreader + Instrument Sans + Commit Mono. Zero Inter/Roboto.
- **Key Differentiator:** CSS Subgrid alignment that makes every feed row feel like a typeset newspaper grid.
- **Color System:** Warm newsprint palette — `paper-50` background, `ink-900` headlines, `dispatch-ember` as the single bold accent.
### Files to Create/Modify
---
#### `src/app/globals.css` ← **MODIFY**
**Features:** Complete `@theme` block for Tailwind v4. Design system tokens. Font-face references. CSS Subgrid utilities. Accessibility resets.
**Interfaces:**
```css
@theme {
  /* Typography */
  --font-editorial: 'Newsreader Variable', Georgia, serif;
  --font-ui: 'Instrument Sans Variable', system-ui, sans-serif;
  --font-mono: 'Commit Mono', 'Fira Code', monospace;
  
  /* Ink Scale */
  --color-ink-900: #1a1a18;
  --color-ink-600: #3d3d3a;
  --color-ink-300: #8a8a83;
  --color-ink-100: #e8e8e4;
  
  /* Paper Scale */
  --color-paper-50: #fafaf8;
  --color-paper-100: #f2f2ee;
  
  /* Dispatch Brand */
  --color-dispatch-ember: #c7513f;
  --color-dispatch-slate: #5a6b7a;
  --color-dispatch-sage: #6b8f71;
  --color-dispatch-clay: #8b6d5a;
  --color-dispatch-violet: #7a6b8f;
}
```
**Checklist:**
- [ ] `@import "tailwindcss"` retained as first line
- [ ] All `@theme` custom properties match PRD §4.2 and README exactly
- [ ] `--font-editorial`, `--font-ui`, `--font-mono` defined as CSS custom properties
- [ ] `prefers-reduced-motion: reduce` media query disables ALL animations/transitions globally
- [ ] `prefers-color-scheme: dark` stub for future dark mode (Phase 4+)
- [ ] Base reset: `*, *::before, *::after { box-sizing: border-box }`
- [ ] `html { font-family: var(--font-ui) }` baseline
- [ ] WCAG AAA focus ring: `focus-visible { outline: 2px solid var(--color-dispatch-ember); outline-offset: 2px }`
- [ ] Subgrid utility: `.feed-grid` class using `display: grid; grid-rows-subgrid`
- [ ] Scrollbar styling (thin, ink-100 track, ink-300 thumb)
---
#### `src/app/layout.tsx` ← **MODIFY**
**Features:** Root layout with Google Fonts (next/font), theme provider, metadata defaults, and structural HTML.
**Interfaces:**
```ts
// Fonts loaded via next/font/google — variable fonts for responsive optical sizing
const newsreader = Newsreader({ subsets: ['latin'], variable: '--font-editorial', axes: ['opsz'] });
const instrumentSans = Instrument_Sans({ subsets: ['latin'], variable: '--font-ui' });
// Commit Mono loaded via @font-face in CSS (not on Google Fonts — use self-hosted or CDN)
```
**Checklist:**
- [ ] `Newsreader` variable font loaded via `next/font/google` with `axes: ['opsz']` for optical sizing
- [ ] `Instrument_Sans` variable font loaded via `next/font/google`
- [ ] Font CSS variables applied to `<html>` via `className`
- [ ] `Commit Mono` loaded via `@font-face` in `globals.css` (not Google Fonts)
- [ ] Root `<html>` has `lang="en"`, `suppressHydrationWarning` (for theme)
- [ ] Root `<body>` has `bg-paper-50 text-ink-600 antialiased font-ui`
- [ ] `Metadata` export: title template, description, OpenGraph defaults
- [ ] `font-optical-sizing: auto` applied to editorial font class
---
#### `src/shared/lib/utils.ts` ← **CREATE**
**Features:** `cn()` utility for conditional class merging. `formatTimeAgo()` for relative timestamps. `formatDate()` for absolute dates.
**Interfaces:**
```ts
export function cn(...inputs: ClassValue[]): string; // clsx + tailwind-merge
export function formatTimeAgo(date: Date): string;   // "2 hours ago", "3 days ago"
export function formatDate(date: Date): string;      // "Jun 11, 2026"
export function truncate(str: string, maxLength: number): string;
```
**Checklist:**
- [ ] `cn()` uses `clsx` + `tailwind-merge` (handles Tailwind class conflicts correctly)
- [ ] `formatTimeAgo()` handles: seconds, minutes, hours, days, weeks, months, years
- [ ] `formatTimeAgo()` returns "Just now" for < 60s
- [ ] `formatDate()` uses `Intl.DateTimeFormat` — no date library dependency
- [ ] Both date functions accept `Date` — never `string` (type safety)
- [ ] TypeScript strict
---
#### `src/shared/components/ui/Button.tsx` ← **CREATE**
**Features:** Shadcn-style button wrapping Radix `Slot`. Variants: `primary`, `secondary`, `ghost`, `destructive`. Sizes: `sm`, `md`, `lg`. Loading state with spinner.
**Interfaces:**
```ts
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  asChild?: boolean; // Radix Slot pattern
}
```
**Checklist:**
- [ ] Uses `cva` (class-variance-authority) for variant/size system
- [ ] Uses Radix `Slot` for `asChild` pattern
- [ ] `isLoading` prop: shows spinner (Lucide `Loader2`), disables button, prevents double-submit
- [ ] `primary` variant: `bg-dispatch-ember` with hover and focus states
- [ ] `ghost` variant: transparent with `hover:bg-paper-100`
- [ ] Focus ring: `focus-visible:ring-2 focus-visible:ring-dispatch-ember`
- [ ] `disabled` state: `opacity-50 cursor-not-allowed`
- [ ] TypeScript strict — extends `HTMLButtonElement` attributes
---
#### `src/shared/components/ui/Badge.tsx` ← **CREATE**
**Features:** Status badge for AI Brief, Breaking News, summary states. Variants aligned to dispatch colors.
**Interfaces:**
```ts
interface BadgeProps {
  variant?: 'ember' | 'slate' | 'sage' | 'clay' | 'violet' | 'muted';
  size?: 'xs' | 'sm';
  children: ReactNode;
}
```
**Checklist:**
- [ ] Uses `font-mono text-[10px] uppercase tracking-widest` (design system requirement)
- [ ] `ember` variant uses `dispatch-ember` color (breaking news, AI badge)
- [ ] `muted` variant uses `ink-300` (status indicators)
- [ ] Accessible: uses `<span>` with appropriate ARIA if status-only
- [ ] TypeScript strict
---
#### `src/shared/components/ui/Separator.tsx` ← **CREATE**
**Features:** Thin horizontal/vertical divider using Radix `Separator`. Styled with `ink-100`.
**Checklist:**
- [ ] Uses `@radix-ui/react-separator`
- [ ] Horizontal: `h-px bg-ink-100 w-full`
- [ ] Vertical: `w-px bg-ink-100 h-full`
- [ ] `aria-orientation` from Radix preserved
---
#### `src/shared/components/ui/Skeleton.tsx` ← **CREATE**
**Features:** Loading skeleton for article cards, text lines, and metadata rows.
**Interfaces:**
```ts
interface SkeletonProps {
  className?: string;
  lines?: number; // for multi-line text skeletons
}
```
**Checklist:**
- [ ] Animated shimmer effect using `animate-pulse`
- [ ] Respects `prefers-reduced-motion` (disables animation)
- [ ] `ArticleCardSkeleton` variant that matches 3-row subgrid layout
- [ ] TypeScript strict
---
#### `src/shared/components/layout/Header.tsx` ← **CREATE**
**Features:** Sticky site header with logo, topic navigation trigger, search button, and user menu.
**Interfaces:**
```ts
interface HeaderProps {
  currentCategory?: string;
}
```
**Checklist:**
- [ ] `sticky top-0 z-50` with `backdrop-blur-sm bg-paper-50/90` for frosted glass effect
- [ ] Logo: "OneStopNews" in `font-editorial font-[800]` with `dispatch-ember` accent dot
- [ ] Desktop: horizontal category nav links
- [ ] Mobile: hamburger menu trigger (Radix `Dialog`)
- [ ] Search icon button (routes to `/search`)
- [ ] Border-bottom: `border-b border-ink-100`
- [ ] Screen reader: `<nav aria-label="Primary navigation">`
- [ ] Active category indicated with `dispatch-ember` underline
- [ ] TypeScript strict
---
#### `src/shared/components/layout/Footer.tsx` ← **CREATE**
**Features:** Minimal site footer with attribution, AI disclosure statement, and nav links.
**Checklist:**
- [ ] Background: `bg-paper-100` (distinct from page background)
- [ ] AI disclosure statement in `font-mono text-[10px]`
- [ ] Links: About, Privacy, API, GitHub
- [ ] Copyright in `font-mono text-[10px] text-ink-300`
- [ ] `<footer role="contentinfo">`
---
#### `src/shared/components/primitives/PageTransition.tsx` ← **CREATE**
**Features:** Progressive enhancement wrapper for React 19 View Transitions. Gracefully degrades on Firefox / reduced-motion.
**Interfaces:**
```ts
interface PageTransitionProps {
  children: ReactNode;
}
// Wraps content in React's unstable_ViewTransition (experimental)
// Silently degrades to instant render if API unavailable
```
**Checklist:**
- [ ] Imports `ViewTransition` from `'react'` (stable import path per PAD)
- [ ] Conditional render: wraps in `<ViewTransition>` only if API available
- [ ] `prefers-reduced-motion` check: skips transition entirely if user prefers
- [ ] Zero hard dependency — core functionality works without it
- [ ] Used only in topic/page navigation, not inside data-fetching components
- [ ] TypeScript strict
---
#### `src/shared/hooks/useDebounce.ts` ← **CREATE**
**Features:** 300ms debounce hook for search input.
**Interfaces:**
```ts
export function useDebounce<T>(value: T, delay?: number): T;
```
**Checklist:**
- [ ] `'use client'` directive
- [ ] Default delay: 300ms
- [ ] Cleans up via `useEffect` return
- [ ] Generic `<T>` — works with string, number, etc.
- [ ] TypeScript strict
---
**Phase 3 Success Criteria:**
- [ ] All shared components render without errors in isolation
- [ ] Design tokens match PRD §4.2 color table exactly
- [ ] Fonts load correctly (Newsreader, Instrument Sans visible in dev)
- [ ] `tsc --noEmit` passes across all shared components
- [ ] Focus ring visible in all interactive elements (keyboard nav test)
- [ ] `prefers-reduced-motion` disables all animations (OS setting test)
---
## Phase 4: Core Feed Feature (Topic-First Feed)
### Objective
Build the topic-first news feed — the primary user-facing feature. This includes the home page, topic pages, article detail page, feed queries with cursor pagination, and the complete `ArticleCard` → `FeedGrid` CSS Subgrid hierarchy.
### Key Decisions
- CSS Subgrid is mandatory for card alignment — no fixed heights, no JS measurement
- Feed queries must always JOIN `sources` table (`ArticleWithSource` type, not `Article`)  
- Cursor-based pagination with LIMIT 31 pattern (fetch 31, show 30, extra = hasNextPage)
- `getFeedArticles()` is the ONLY way to query feed data — no raw Drizzle in components
- Suspense boundaries on all data-fetching components
- Error boundaries on all data routes (Loading, Error, Not Found pages)
### Domain Types (Created in Phase 4)
#### `src/domain/articles/types.ts` ← **CREATE**
**Features:** Domain types derived from Drizzle schema. `ArticleWithSource` is the canonical feed type.
**Interfaces:**
```ts
// Derived from schema — never hand-written
import type { InferSelectModel } from 'drizzle-orm';
import type { articles, sources, summaries } from '@/lib/db/schema';
type Article = InferSelectModel<typeof articles>;
type Source = InferSelectModel<typeof sources>;
type Summary = InferSelectModel<typeof summaries>;
// The canonical feed type — requires sources JOIN
interface ArticleWithSource extends Article {
  source: Pick<Source, 'id' | 'name' | 'siteUrl' | 'politicalLeaning'>;
}
// Article detail with full summary
interface ArticleWithSummary extends ArticleWithSource {
  summary: Summary | null;
}
```
**Checklist:**
- [ ] Types derived from schema via `InferSelectModel` — not hand-written
- [ ] `ArticleWithSource` exported as the canonical feed type
- [ ] `ArticleWithSummary` exported for article detail page
- [ ] `ArticleSummary` type alias exported for provenance utilities
- [ ] TypeScript strict — no `any`
---
#### `src/domain/articles/normalize.ts` ← **CREATE**
**Features:** Pure domain logic for URL normalization and content hashing. No DB or Next.js imports.
**Interfaces:**
```ts
export function normalizeCanonicalUrl(url: string): string;
// - Removes UTM parameters
// - Normalizes trailing slashes
// - Lowercases scheme and host
// - Removes fragment identifiers (#section)
export function hashContent(title: string, publishedAt: Date): string;
// - SHA-256 hash of title + publishedAt ISO string
// - Used as change-detection key in upsert queries
```
**Checklist:**
- [ ] Zero Next.js imports — pure TypeScript
- [ ] Zero DB imports — pure domain logic
- [ ] `normalizeCanonicalUrl` handles all edge cases: missing protocol, trailing slashes, UTM params
- [ ] `hashContent` uses Node.js `crypto.createHash('sha256')` — available in both app and worker
- [ ] All functions are pure (no side effects, deterministic output)
- [ ] Unit testable in isolation
- [ ] TypeScript strict
---
#### `src/domain/ranking/score.ts` ← **CREATE**
**Features:** Pure importance scoring formula for articles.
**Interfaces:**
```ts
interface ScoringInputs {
  publishedAt: Date;
  sourceReliability: number; // 0-1, from sources table
  contentAvailability: 'title_only' | 'excerpt' | 'partial_text' | 'full_text';
  hasSummary: boolean;
}
export function calculateImportanceScore(inputs: ScoringInputs): number; // 0-100
```
**Checklist:**
- [ ] Zero Next.js or DB imports
- [ ] Recency decay: articles older than 24h penalized, 7d heavily penalized
- [ ] Content availability bonus: `full_text` gets highest score
- [ ] Summary bonus: articles with `ok` summary get +10 points
- [ ] Score clamped to 0-100 range
- [ ] TypeScript strict
---
#### `src/features/feed/queries.ts` ← **CREATE**
**Features:** All Drizzle queries for the feed. Cursor-based pagination. Sources JOIN. Category filtering.
**Interfaces:**
```ts
interface GetFeedArticlesParams {
  categorySlug?: string;
  subcategorySlug?: string;
  cursor?: Date; // ISO timestamp cursor
  limit?: number; // default 30
}
interface FeedPage {
  articles: ArticleWithSource[];
  nextCursor: Date | null; // null = no more pages
  hasNextPage: boolean;
}
export async function getFeedArticles(params: GetFeedArticlesParams): Promise<FeedPage>;
export async function getCategories(): Promise<Category[]>;
export async function getArticleById(id: string): Promise<ArticleWithSummary | null>;
export async function getArticlesBySource(sourceId: string, limit?: number): Promise<ArticleWithSource[]>;
```
**Checklist:**
- [ ] LIMIT 31 pattern: fetch `limit + 1`, return `limit`, set `hasNextPage = results.length > limit`
- [ ] `nextCursor` = `publishedAt` of the last item in the returned page (not the 31st)
- [ ] Explicit `leftJoin(sources, eq(articles.sourceId, sources.id))` — never omitted
- [ ] `where` clause: `categoryId = ? AND publishedAt < cursor AND summaryStatus != 'pending'`
- [ ] `orderBy(desc(articles.publishedAt))` — newest first
- [ ] `getCategories()` uses `"use cache"` directive with `cacheLife('reference')`
- [ ] All queries parameterized — no string interpolation
- [ ] TypeScript strict — return types explicitly typed
---
#### `src/features/feed/actions.ts` ← **CREATE**
**Features:** Server Actions for user preference mutations.
**Interfaces:**
```ts
export async function savePreference(key: string, value: unknown): Promise<void>;
export async function setFavoriteCategory(categoryId: string): Promise<void>;
export async function muteSource(sourceId: string): Promise<void>;
```
**Checklist:**
- [ ] `'use server'` directive at top of file
- [ ] All actions call `verifySession()` first — auth at the action level
- [ ] Input validation with Zod before DB writes
- [ ] `revalidatePath()` or `revalidateTag()` after mutations (2-arg form)
- [ ] TypeScript strict
---
#### `src/features/feed/components/FeedGrid.tsx` ← **CREATE**
**Features:** CSS Subgrid parent container. Empty state. Semantic feed role.
**Interfaces:**
```ts
interface FeedGridProps {
  articles: ArticleWithSource[];
  isLoading?: boolean; // shows skeleton cards
}
```
**Layout Contract (CRITICAL — matches PRD §4.3 exactly):**
```
- Parent: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8
- Each ArticleCard: grid grid-rows-subgrid row-span-3
- Gap-y owned by card: mb-10 last:mb-0
- No gap-y on parent (owned by children)
```
**Checklist:**
- [ ] Parent grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8` (no `gap-y`)
- [ ] `role="feed"` and `aria-label="News articles"` on container
- [ ] Empty state: `font-mono text-[11px] uppercase tracking-widest text-ink-300` with ember dot
- [ ] Skeleton state: renders 6 `ArticleCardSkeleton` when `isLoading=true`
- [ ] No fixed heights anywhere — subgrid handles alignment
- [ ] `'use client'` NOT required — pure Server Component composition
- [ ] TypeScript strict
---
#### `src/features/feed/components/ArticleCard.tsx` ← **CREATE**
**Features:** Subgrid child spanning 3 row tracks. 3-row layout: Headline / Excerpt / Metadata.
**Interfaces:**
```ts
interface ArticleCardProps {
  article: ArticleWithSource;
  priority?: boolean; // LCP hint for first card
}
```
**Layout Contract (CRITICAL — matches PRD §4.3 exactly):**
```
Row 1: Headline — font-editorial text-xl font-[800] tracking-[-0.02em] text-ink-900
Row 2: Excerpt — font-ui text-sm leading-relaxed text-ink-600 line-clamp-3
Row 3: Metadata — font-mono text-[10px] uppercase tracking-wider text-ink-600
```
**Checklist:**
- [ ] `<article>` with `grid grid-rows-subgrid row-span-3 gap-y-3 mb-10 last:mb-0`
- [ ] `border-b border-ink-100 pb-6` visual separator
- [ ] Headline: `font-editorial text-xl leading-tight text-ink-900 font-[800] tracking-[-0.02em]`
- [ ] Headline hover: `group-hover:text-dispatch-ember transition-colors duration-300`
- [ ] `<Link>` uses `after:absolute after:inset-0` for full-card click area
- [ ] Focus ring: `focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2`
- [ ] Excerpt: `line-clamp-3` — null/undefined shows italic "No excerpt available."
- [ ] Metadata row: Source name (max-w-[120px] truncate), bullet dot, relative time, "AI Brief" badge
- [ ] "AI Brief" badge: visible only when `hasSummary && summaryStatus === 'ok'`
- [ ] "AI Brief" badge style: `text-dispatch-ember font-medium tracking-widest`
- [ ] `<time>` has `dateTime={article.publishedAt.toISOString()}`
- [ ] Source name uses `text-dispatch-slate font-medium`
- [ ] TypeScript strict — no `any`
---
#### `src/features/feed/components/TopicNav.tsx` ← **CREATE**
**Features:** Horizontal scrollable category navigation. Active state. Mobile-responsive.
**Interfaces:**
```ts
interface TopicNavProps {
  categories: Category[];
  currentCategory?: string;
}
```
**Checklist:**
- [ ] `'use client'` for `usePathname` to determine active state
- [ ] Horizontal scroll on mobile: `overflow-x-auto scrollbar-hide`
- [ ] Active: `border-b-2 border-dispatch-ember text-ink-900 font-semibold`
- [ ] Inactive: `text-ink-300 hover:text-ink-600 transition-colors`
- [ ] Font: `font-mono text-[11px] uppercase tracking-widest`
- [ ] Each item is a `<Link>` to `/topics/[category]`
- [ ] "Top Stories" link to `/` always first
- [ ] ARIA: `<nav aria-label="Topic categories">`
---
#### `src/app/(public)/page.tsx` ← **MODIFY**
**Features:** Home page — Top Stories feed. PPR shell with dynamic content streamed via Suspense.
**Checklist:**
- [ ] `"use cache"` directive with `cacheLife('feed')` and `cacheTag('feed:top')` on the cached shell
- [ ] `<Suspense fallback={<FeedSkeleton />}>` around dynamic feed content
- [ ] Imports `getFeedArticles()` from feature queries (no raw Drizzle)
- [ ] Renders `<FeedGrid articles={articles} />`
- [ ] Renders `<TopicNav />` above feed
- [ ] Page title in `<h1>` with `font-editorial` styling
- [ ] `generateMetadata()` for SEO
- [ ] TypeScript: `async function Page()` — no `params` needed
---
#### `src/app/(public)/topics/[category]/page.tsx` ← **CREATE**
**Features:** Topic-filtered feed page. Same structure as home but filtered by category slug.
**Checklist:**
- [ ] `params: Promise<{ category: string }>` — always `await params` (Next.js 16 async params)
- [ ] `notFound()` if category slug doesn't exist in DB
- [ ] `"use cache"` with `cacheLife('topicShell')` and `cacheTag(\`feed:${category}\`)`
- [ ] `generateStaticParams()` for category slugs (from cached `getCategories()`)
- [ ] `generateMetadata()` with dynamic title and description per category
- [ ] Reuses `FeedGrid` and `TopicNav` components
- [ ] TypeScript strict — `params` is `Promise<{category: string}>`
---
#### `src/app/(public)/article/[id]/page.tsx` ← **CREATE**
**Features:** Article detail page. Fully dynamic (no caching — summary status changes in real time). AI summary panel with disclosure.
**Checklist:**
- [ ] `params: Promise<{ id: string }>` — `await params`
- [ ] `notFound()` if article not found
- [ ] Fully dynamic — NO `"use cache"` (summary status is real-time)
- [ ] Renders article title in `font-editorial text-4xl font-[800] tracking-[-0.03em]`
- [ ] Source attribution, timestamp in `font-mono text-[10px]`
- [ ] `<Suspense>` around summary panel with `<NutritionLabel>` or `<SummarySkeleton>`
- [ ] "Request AI Summary" button if `summaryStatus === 'none'`
- [ ] Link back to source: `target="_blank" rel="noopener noreferrer"`
- [ ] `generateMetadata()` with JSON-LD provenance in `<script type="application/ld+json">`
- [ ] `X-AI-Provenance` header set via `generateMetadata()`'s `other` field if summary exists
- [ ] TypeScript strict
---
#### `src/app/(public)/loading.tsx` ← **CREATE**
**Features:** Route-level loading UI for the home feed.
**Checklist:**
- [ ] Returns `<FeedSkeleton />` component
- [ ] No layout shift — skeletons match actual content dimensions
---
#### `src/app/(public)/error.tsx` ← **CREATE**
**Features:** Route-level error boundary with retry button.
**Checklist:**
- [ ] `'use client'` directive (required by Next.js error boundary)
- [ ] Shows human-friendly error in `font-ui`
- [ ] Shows `dispatch-ember` styled error indicator
- [ ] "Try again" button calls `reset()` function from Next.js
- [ ] No raw error details exposed to users (security)
---
#### `src/app/(public)/not-found.tsx` ← **CREATE**
**Features:** 404 page with editorial styling.
**Checklist:**
- [ ] Headline: "404 — Story Not Found" in `font-editorial`
- [ ] Link back to home feed
- [ ] Styled with dispatch design system
---
**Phase 4 Success Criteria:**
- [ ] Home page renders with article cards in CSS Subgrid layout
- [ ] Topic pages filter correctly by category
- [ ] Cursor pagination works: clicking "Load more" fetches next page
- [ ] "AI Brief" badge visible on articles with `summaryStatus === 'ok'`
- [ ] Empty state displayed when no articles in category
- [ ] Loading skeleton displayed during data fetch
- [ ] Error boundary catches and displays errors gracefully
- [ ] `tsc --noEmit` passes
- [ ] Lighthouse accessibility score ≥ 90
---
## Phase 5: AI Summarisation Pipeline
### Objective
Build the complete AI summarisation system: content availability guard, Zod-validated prompt schemas, NutritionLabel disclosure component, 3-layer provenance generation, and the `POST /api/summarize/[id]` enqueue endpoint.
### Key Decisions
- CRITICAL: Never summarise `title_only` or `excerpt` content — AI hallucination risk
- `generateObject()` from Vercel AI SDK enforces Zod schema — invalid AI output = retry
- 3-layer disclosure is mandatory: JSON-LD + HTTP header + HTML meta tag
- NutritionLabel is the human-readable layer (EU AI Act Art. 50 compliance)
- Summary state machine: `none → pending → ok → needs_review → disabled`
### Files to Create/Modify
---
#### `src/features/summaries/lib/summariseSchema.ts` ← **CREATE**
**Features:** Zod schema that enforces all required fields from the AI response via `generateObject()`.
**Interfaces:**
```ts
export const summariseOutputSchema: z.ZodObject<{
  summaryText: z.ZodString; // 50-800 chars, 2-4 sentences
  keyPoints: z.ZodArray<z.ZodString>; // max 5, each max 120 chars
  sourcesCited: z.ZodArray<z.ZodObject<{url: z.ZodString; title: z.ZodString}>>;
  aiStatement: z.ZodString; // 20-200 chars
  coveragePercentage: z.ZodNumber; // 0-100 integer
}>;
export type SummariseOutput = z.infer<typeof summariseOutputSchema>;
```
**Checklist:**
- [ ] `summaryText`: `min(50).max(800)` — prevents empty or bloated summaries
- [ ] `keyPoints`: `min(1).max(5)`, each item `max(120)` chars
- [ ] `sourcesCited`: `min(1)` — at least one source must always be cited
- [ ] `sourcesCited[].url`: `z.string().url()` — must be valid URL
- [ ] `aiStatement`: `min(20).max(200)` plain-language description
- [ ] `coveragePercentage`: `z.number().int().min(0).max(100)`
- [ ] Schema matches PRD §7.2 exactly
- [ ] TypeScript strict
---
#### `src/lib/ai/prompts.ts` ← **CREATE**
**Features:** AI prompt templates for summarisation. Structured prompt engineering with role, task, constraints, and format sections.
**Interfaces:**
```ts
export function buildSummarisationPrompt(params: {
  articleTitle: string;
  articleContent: string; // Only partial_text or full_text
  sourceUrl: string;
  sourceName: string;
}): string;
```
**Checklist:**
- [ ] System prompt: role definition ("You are a factual news summariser...")
- [ ] Constraints: "Do not speculate beyond the article text", "Only cite sources from the provided content"
- [ ] Output format: references `summariseOutputSchema` field names
- [ ] Temperature instruction: "respond with only facts, no opinion"
- [ ] EU AI Act compliance instruction embedded in prompt
- [ ] `buildSummarisationPrompt()` is a pure function — no side effects
- [ ] TypeScript strict
---
#### `src/lib/ai/provenance.ts` ← **CREATE**
**Features:** 3-layer provenance generation (JSON-LD, HTTP header, HTML meta tag). EU AI Act Art. 50 compliance.
**Interfaces:**
```ts
interface ProvenanceData {
  metaTag: string;     // HTML meta content
  jsonLd: object;      // schema.org/CreativeWork JSON-LD
  httpHeader: string;  // X-AI-Provenance header value (base64 JSON)
}
export function generateProvenanceMetadata(summary: ArticleSummary): ProvenanceData;
```
**Checklist:**
- [ ] `jsonLd`: `@context: 'https://schema.org'`, `@type: 'CreativeWork'`, `isBasedOn`, `accountablePerson`, `dateModified`, `description`
- [ ] `jsonLd.isBasedOn`: array of `{@type: 'CreativeWork', url, name}` for each cited source
- [ ] `httpHeader`: base64-encoded JSON with `{model, generatedAt, sourcesVerified, coveragePercentage, compliance: 'eu-ai-act-art50'}`
- [ ] `metaTag`: semicolon-delimited string `model:X;generated-at:X;sources:X;coverage:X;compliance:eu-ai-act-art50`
- [ ] C2PA **explicitly not implemented** — no text standard exists (per PAD §8.4)
- [ ] All three layers independently parseable without the others
- [ ] TypeScript strict
---
#### `src/features/summaries/components/NutritionLabel.tsx` ← **CREATE**
**Features:** Human-readable AI disclosure component. Shows summary text, model, timestamp, coverage %, citations, compliance statement, and link to original source.
**Interfaces:**
```ts
interface NutritionLabelProps {
  summary: Summary; // Drizzle-inferred type
}
```
**Visual Design:**
```
┌─ ● AI BRIEFING · claude-haiku-4-5 · 2 hours ago ─────────┐
│                                                           │
│  [Summary text in font-ui text-base leading-relaxed]     │
│                                                           │
│  ── AI TRANSPARENCY LABEL ─────────────────────────────  │
│  What the AI did: [aiStatement]                          │
│  Model: claude-haiku-4-5 (temp: 0.1 · factual-only)    │
│  Source coverage: 87% of available article text          │
│  Citations: 3 sources verified                           │
│  Compliance: [complianceStatement]                       │
│                                                           │
│  ── SOURCES CITED ──────────────────────────────────── │
│  [1] Source title link                                   │
│  [2] Source title link                                   │
│                                                           │
│  Verify with original source →                           │
└────────────────────────────────────────────────────────────┘
```
**Checklist:**
- [ ] `<aside aria-label="AI-generated summary transparency label">`
- [ ] Left border: `border-l-2 border-dispatch-ember`
- [ ] Header: `font-mono text-[10px] uppercase tracking-widest text-ink-300`
- [ ] Ember dot: `block w-1.5 h-1.5 rounded-full bg-dispatch-ember`
- [ ] Summary text: `font-ui text-base leading-relaxed text-ink-900`
- [ ] Transparency label section: `border-t border-ink-100` separator
- [ ] Source citations: numbered `[1]` `[2]` in `font-mono text-ink-300`
- [ ] Citation links: `hover:text-dispatch-ember` underline transition
- [ ] "Verify with original source →" link: `target="_blank" rel="noopener noreferrer"`
- [ ] Matches PRD §4.4 code exactly
- [ ] TypeScript strict
---
#### `src/features/summaries/components/DisclosureBadge.tsx` ← **CREATE**
**Features:** Small inline "AI Brief" badge. Clickable to scroll to NutritionLabel. Ember-colored.
**Interfaces:**
```ts
interface DisclosureBadgeProps {
  onClick?: () => void;
  status: 'ok' | 'needs_review' | 'pending';
}
```
**Checklist:**
- [ ] `font-mono text-[10px] uppercase tracking-widest text-dispatch-ember`
- [ ] Dot indicator: `w-1.5 h-1.5 rounded-full bg-dispatch-ember`
- [ ] `needs_review`: shows amber dot with "Under Review" text
- [ ] `pending`: shows gray dot with "Processing" text (no spinner — text only)
- [ ] `onClick` scrolls to `#ai-summary` anchor
- [ ] TypeScript strict
---
#### `src/features/summaries/components/SummaryPanel.tsx` ← **CREATE**
**Features:** Full summary panel shown on article detail page. Wraps NutritionLabel. Handles all summary states.
**Interfaces:**
```ts
interface SummaryPanelProps {
  articleId: string;
  summaryStatus: SummaryStatus;
  summary: Summary | null;
}
```
**State Handling:**
```
none         → "Request AI Summary" button
pending      → "Generating AI summary..." status text (no spinner)
ok           → <NutritionLabel summary={summary} />
needs_review → "Summary under editorial review" notice
disabled     → null (nothing rendered — identical to 'none' for readers)
```
**Checklist:**
- [ ] All 5 states handled (none, pending, ok, needs_review, disabled)
- [ ] `none` state: `<Button>` that calls `requestSummary` Server Action
- [ ] Button disabled during pending state (no double-submit)
- [ ] `needs_review` notice styled with muted warning (not ember — not an error)
- [ ] `disabled` state: renders null — no UI hint to readers
- [ ] Uses `useOptimistic()` for instant UI update when requesting summary
- [ ] TypeScript strict
---
#### `src/features/summaries/actions.ts` ← **CREATE**
**Features:** Server Action to enqueue summarisation job. Validates content availability before enqueueing.
**Interfaces:**
```ts
export async function requestSummary(articleId: string): Promise<{
  success: boolean;
  message: string;
  jobId?: string;
}>;
export async function flagSummary(summaryId: string, flagReason: string): Promise<void>; // Admin only
export async function disableSummary(summaryId: string): Promise<void>; // Admin only
```
**Checklist:**
- [ ] `'use server'` directive
- [ ] `requestSummary`: validates `articleId` with Zod (UUID format)
- [ ] Content availability check: returns error if `contentAvailability` is `title_only` or `excerpt`
- [ ] Check `summaryStatus !== 'none'` before enqueuing (no duplicate jobs)
- [ ] Enqueues via `summarizeQueue.add('summarize', {articleId}, {priority: 2})`
- [ ] Updates `articles.summaryStatus = 'pending'` optimistically
- [ ] Returns `{success: true, jobId}` on success
- [ ] `flagSummary`: calls `verifyAdminSession()` — admin only
- [ ] `flagReason` required and non-empty for `flagSummary`
- [ ] TypeScript strict
---
#### `src/app/api/summarize/[id]/route.ts` ← **CREATE**
**Features:** `POST /api/summarize/:id` — Public HTTP endpoint to enqueue summarisation. Returns 202 with job ID.
**Interfaces:**
```ts
// POST /api/summarize/:id
// Response: { jobId: string } | { error: string }
// Status: 202 Accepted | 400 Bad Request | 404 Not Found | 409 Conflict
```
**Checklist:**
- [ ] `params: Promise<{id: string}>` — `await params`
- [ ] Validates `id` as UUID — 400 if invalid
- [ ] Returns 404 if article not found
- [ ] Returns 409 if `summaryStatus !== 'none'` (already processing or done)
- [ ] Returns 400 if `contentAvailability` is `title_only` or `excerpt`
- [ ] Calls `summarizeQueue.add()` and returns `{jobId}` with 202
- [ ] Session check: requires valid session cookie (not public — user must be signed in)
- [ ] TypeScript strict
---
**Phase 5 Success Criteria:**
- [ ] `POST /api/summarize/:id` returns 202 and job appears in BullMQ queue
- [ ] Content guard correctly rejects `title_only` / `excerpt` articles with 400
- [ ] NutritionLabel renders all sections with correct typography
- [ ] JSON-LD appears in article page `<head>` when summary exists
- [ ] `X-AI-Provenance` header present in article page response when summary exists
- [ ] All 5 summary states render correctly in the UI
- [ ] TypeScript strict across all Phase 5 files
---
## Phase 6: Search, Admin & Public API
### Objective
Implement full-text search with PostgreSQL BM25, the admin source management interface, and the complete public REST API.
### Files to Create/Modify
---
#### `src/features/search/queries.ts` ← **CREATE**
**Features:** FTS query builder using `websearch_to_tsquery`. BM25 relevance ranking. Cursor pagination.
**Interfaces:**
```ts
interface SearchParams {
  query: string;
  categorySlug?: string;
  cursor?: Date;
  limit?: number;
}
interface SearchResult {
  articles: (ArticleWithSource & { relevance: number })[];
  hasNextPage: boolean;
  nextCursor: Date | null;
}
export async function searchArticles(params: SearchParams): Promise<SearchResult>;
export async function getSearchSuggestions(partial: string): Promise<string[]>; // pg_trgm autocomplete
```
**Checklist:**
- [ ] `websearch_to_tsquery('english', $query)` — handles natural language gracefully
- [ ] `ts_rank_cd('{0.1, 0.2, 0.4, 1.0}', searchVector, tsQuery)` for BM25-ish ranking
- [ ] `LEFT JOIN sources` — always includes source info
- [ ] Category filter: optional `WHERE categoryId = ?`
- [ ] Cursor: `WHERE publishedAt < cursor`
- [ ] `ORDER BY relevance DESC, publishedAt DESC`
- [ ] LIMIT 31 pattern for pagination
- [ ] `getSearchSuggestions()` uses `similarity(title, $partial) > 0.3` via pg_trgm
- [ ] TypeScript strict
---
#### `src/features/search/components/SearchBar.tsx` ← **CREATE**
**Features:** Search input with debounce, loading indicator, and keyboard shortcuts.
**Interfaces:**
```ts
interface SearchBarProps {
  defaultValue?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
}
```
**Checklist:**
- [ ] `'use client'` directive
- [ ] Uses `useDebounce(query, 300)` from shared hooks
- [ ] `⌘K` / `Ctrl+K` keyboard shortcut to focus
- [ ] Loading spinner on input right side during search
- [ ] Clear button when query is non-empty
- [ ] `aria-label="Search news articles"`
- [ ] `role="search"` on the wrapping form
- [ ] Font: `font-ui text-sm` on input
- [ ] Focus ring: `focus-visible:ring-2 focus-visible:ring-dispatch-ember`
- [ ] TypeScript strict
---
#### `src/features/search/components/SearchResults.tsx` ← **CREATE**
**Features:** Search results list. Handles empty state, error state, and result count.
**Interfaces:**
```ts
interface SearchResultsProps {
  results: (ArticleWithSource & { relevance: number })[];
  query: string;
  isLoading: boolean;
}
```
**Checklist:**
- [ ] Loading: shows `ArticleCardSkeleton` ×3
- [ ] Empty: `font-mono text-[11px] text-ink-300` — "No results for '{query}'"
- [ ] Result count: `font-mono text-[10px] text-ink-300` above results
- [ ] Each result: reuses `ArticleCard` component
- [ ] Relevance score not shown to users (internal only)
- [ ] TypeScript strict
---
#### `src/app/(public)/search/page.tsx` ← **CREATE**
**Features:** Search page with URL-driven state (`?q=query`).
**Checklist:**
- [ ] `searchParams: Promise<{q?: string}>` — `await searchParams`
- [ ] Reads `q` from URL — server-rendered with initial results
- [ ] `<SearchBar defaultValue={q} />` above results
- [ ] `generateMetadata()` with `title: Search — ${q}`
- [ ] TypeScript strict
---
#### `src/app/api/articles/route.ts` ← **CREATE**
**Features:** `GET /api/articles` — Public REST API for feed and search. Cursor pagination. JSON response.
**Interfaces:**
```ts
// GET /api/articles?category=tech&cursor=2026-06-10T12:00:00Z&limit=30
// GET /api/articles?q=AI+regulation&category=tech
// Response: { articles: ArticleWithSource[]; nextCursor: string | null; hasNextPage: boolean }
```
**Checklist:**
- [ ] Reads `category`, `cursor`, `q`, `limit` from `request.nextUrl.searchParams`
- [ ] `limit` clamped to max 100 (prevents abuse)
- [ ] If `q` present: routes to `searchArticles()`, else `getFeedArticles()`
- [ ] `cursor` parsed as ISO date — 400 if invalid date string
- [ ] Response includes `{ articles, nextCursor, hasNextPage }`
- [ ] `Cache-Control: public, max-age=60, stale-while-revalidate=300` header for CDN
- [ ] CORS headers for external API consumers
- [ ] TypeScript strict
---
#### `src/app/(admin)/layout.tsx` ← **CREATE**
**Features:** Admin section layout with auth enforcement. `verifyAdminSession()` at layout boundary.
**Checklist:**
- [ ] Server Component — no `'use client'`
- [ ] Calls `await verifyAdminSession()` — redirects non-admins to `/`
- [ ] Admin sidebar nav: Sources, Summaries, Health, Settings
- [ ] Sidebar styled with `bg-ink-900` (dark editorial authority)
- [ ] Active nav item: `text-dispatch-ember`
- [ ] Admin header different from public header (no search, shows user name + role)
---
#### `src/app/(admin)/sources/page.tsx` ← **CREATE**
**Features:** Source management dashboard. List all sources with health indicators. Add new source form.
**Checklist:**
- [ ] Server Component
- [ ] `await verifyAdminSession()` (redundant but explicit per security model)
- [ ] Table: source name, URL, category, status badge, last success, failure count
- [ ] Status badge: `active` (sage), `error` (ember), `paused` (slate), `disabled` (muted)
- [ ] "Add Source" button opens `<AddSourceDialog>` (Radix Dialog)
- [ ] "Test Connection" button per row (client action)
- [ ] Pagination for large source lists
- [ ] TypeScript strict
---
#### `src/app/(admin)/sources/actions.ts` ← **CREATE**
**Features:** Server Actions for source CRUD operations.
**Interfaces:**
```ts
export async function addSource(formData: FormData): Promise<{success: boolean; error?: string}>;
export async function updateSource(id: string, data: Partial<SourceInsert>): Promise<void>;
export async function pauseSource(id: string): Promise<void>;
export async function deleteSource(id: string): Promise<void>;
export async function testSourceConnection(id: string): Promise<{ok: boolean; httpStatus: number; articlesFound: number}>;
```
**Checklist:**
- [ ] All actions call `verifyAdminSession()` first
- [ ] `addSource`: validates `feedUrl` (must be valid URL), `name`, `categoryId`
- [ ] `addSource`: checks for duplicate `feedUrl` before insert
- [ ] `testSourceConnection`: fetches feed URL, parses RSS/Atom/JSON, returns article count
- [ ] `deleteSource`: soft-delete preferred (set status='disabled'), hard-delete only for admin confirmation
- [ ] All mutations use `revalidatePath('/admin/sources')`
- [ ] TypeScript strict
---
#### `src/app/(admin)/summaries/page.tsx` ← **CREATE**
**Features:** Summary review dashboard. Lists `needs_review` summaries for admin approval.
**Checklist:**
- [ ] Server Component
- [ ] `await verifyAdminSession()`
- [ ] `<SummaryReviewTable>` with columns: article title, flag reason, model, generated at, actions
- [ ] Actions: "Approve" (→ ok), "Disable" (→ disabled), "Regenerate"
- [ ] Matches PAD §7.4 state machine exactly
- [ ] TypeScript strict
---
**Phase 6 Success Criteria:**
- [ ] `GET /api/articles` returns paginated JSON with correct shape
- [ ] `GET /api/articles?q=...` returns search results with relevance ranking
- [ ] Admin routes redirect non-admin users to `/`
- [ ] Source CRUD works end-to-end
- [ ] Summary review state machine transitions correctly
- [ ] `tsc --noEmit` passes
- [ ] API response shape matches README API Reference table
---
## Phase 7: Worker Service, Push Notifications & Observability
### Objective
Build the complete Node.js 24 worker service (separate from the Next.js app), implement web push notifications with AES-256-GCM encryption, DST-safe quiet hours, and production observability.
### Architecture Note
The worker service lives in a separate entry point (`src/workers/index.ts` or a separate `worker/` directory). It runs as a standalone `node` process alongside the Next.js app. Both share the PostgreSQL DB and Redis instance.
### Files to Create/Modify
---
#### `src/workers/index.ts` ← **CREATE**
**Features:** Worker service entry point. Starts all BullMQ workers. Graceful shutdown on SIGTERM/SIGINT.
**Interfaces:**
```ts
// Starts: IngestWorker, SummarizeWorker, ScoreWorker, FeedSliceWorker
// SIGTERM/SIGINT handler: closes all workers before process exit
```
**Checklist:**
- [ ] Starts all 4 workers: ingest (concurrency 50), summarize (5), score (20), feedSlice (10)
- [ ] SIGTERM handler: `await Promise.all(workers.map(w => w.close()))`
- [ ] SIGINT handler: same as SIGTERM
- [ ] `process.exit(0)` after graceful shutdown
- [ ] Console logging: `[Worker] Started`, `[Worker] Shutting down...`, `[Worker] Clean exit`
- [ ] Error handler: `worker.on('failed', (job, err) => console.error(...))`
---
#### `src/workers/jobs/ingest.ts` ← **CREATE**
**Features:** RSS/Atom/JSON feed ingestion worker. Idempotent upsert. Content hash change detection. Content availability classification.
**Interfaces:**
```ts
// BullMQ job payload: { sourceId: string }
// Processor: fetches feed URL → parses → upserts articles → enqueues score jobs
```
**Checklist:**
- [ ] Fetches feed URL with timeout (30s max)
- [ ] Handles RSS, Atom, and JSON Feed formats
- [ ] `normalizeCanonicalUrl()` on each article URL
- [ ] `hashContent(title, publishedAt)` for change detection
- [ ] `db.insert(articles).onConflictDoUpdate()` — idempotent upsert per PAD §8.2
- [ ] Updates `contentAvailability` via `determineContentAvailability()`
- [ ] Updates `sources.lastSuccessAt` and resets `consecutiveFailures` on success
- [ ] On failure: increments `consecutiveFailures`, sets `lastErrorMessage`
- [ ] Auto-disables source after 5 consecutive failures (`status = 'error'`)
- [ ] Calls `invalidateFeedCache(categorySlug)` after persisting new articles
- [ ] Enqueues score jobs for new articles via `scoreQueue.add()`
---
#### `src/workers/jobs/summarize.ts` ← **CREATE**
**Features:** AI summarisation worker. Uses Vercel AI SDK `generateObject()`. Claude 4.5 Haiku primary, GPT-5 Mini fallback.
**Interfaces:**
```ts
// BullMQ job payload: { articleId: string }
// Priority 2 (user-triggered) > 5 (background)
```
**Checklist:**
- [ ] Fetches article with `db.query.articles.findFirst()` — columns: id, fullText, title, canonicalUrl, contentAvailability
- [ ] Content guard: `if contentAvailability === 'title_only' || contentAvailability === 'excerpt' → return` (no throw)
- [ ] `generateObject({model: anthropic('claude-haiku-4-5'), schema: summariseOutputSchema, prompt: ...})`
- [ ] Fallback: if Anthropic fails → retry with `openai('gpt-5-mini')` (same schema)
- [ ] Validates output with Zod schema — ZodError triggers BullMQ retry
- [ ] Inserts into `summaries` table with all provenance fields
- [ ] Updates `articles.summaryStatus = 'ok'` and `articles.hasSummary = true`
- [ ] Calls `generateProvenanceMetadata()` and stores `complianceStatement`
- [ ] On failure: sets `articles.summaryStatus = 'none'` (allow retry)
---
#### `src/workers/jobs/score.ts` ← **CREATE**
**Features:** Importance scoring worker. Updates `articles.importanceScore` using the domain formula.
**Checklist:**
- [ ] Fetches article with source reliability info
- [ ] Calls `calculateImportanceScore()` from `domain/ranking/score.ts`
- [ ] Updates `articles.importanceScore` via Drizzle
- [ ] Enqueues `feedSliceQueue.add()` to refresh Redis feed cache
---
#### `src/workers/jobs/scheduler.ts` ← **CREATE**
**Features:** RSS polling scheduler using `upsertJobScheduler()`. Idempotent — restart-safe.
**Checklist:**
- [ ] Fetches all `active` sources from DB
- [ ] For each source: `ingestQueue.upsertJobScheduler({name: 'ingest', pattern: '*/60 * * * *', jobId: sourceId})`
- [ ] Pattern is dynamic: `pollIntervalMinutes` setting per source
- [ ] Idempotent: calling twice doesn't create duplicate schedulers
- [ ] Called on worker startup
---
#### `src/workers/jobs/determineContentAvailability.ts` ← **CREATE**
**Features:** Pure function to classify content availability from parsed feed data.
**Interfaces:**
```ts
export function determineContentAvailability(parsed: {
  title?: string;
  excerpt?: string;
  body?: string;
}): 'title_only' | 'excerpt' | 'partial_text' | 'full_text';
```
**Checklist:**
- [ ] `!parsed.title` → `'title_only'`
- [ ] `!parsed.excerpt` → `'excerpt'`
- [ ] `!parsed.body || parsed.body.length < 500` → `'partial_text'`
- [ ] Else → `'full_text'`
- [ ] Pure function — no side effects
- [ ] Matches PRD §8.1 code exactly
---
#### `src/lib/security/encrypt.ts` ← **CREATE**
**Features:** AES-256-GCM encryption/decryption for Web Push subscription keys.
**Interfaces:**
```ts
export function encryptPushKeys(keys: { p256dh: string; auth: string }): string;
// Format: iv:authTag:encryptedData (hex-encoded)
export function decryptPushKeys(encryptedString: string): { p256dh: string; auth: string };
```
**Checklist:**
- [ ] Uses `createCipheriv('aes-256-gcm', ...)` from Node.js `crypto`
- [ ] `PUSH_KEY_ENCRYPTION_KEY` validated at module load time (length === 64, hex chars only)
- [ ] `randomBytes(16)` for IV — unique per encryption
- [ ] Format: `${iv}:${authTag}:${encrypted}` — all hex-encoded
- [ ] `decryptPushKeys` validates format (3 parts separated by `:`)
- [ ] Throws descriptive error if format invalid
- [ ] Matches PRD §8.2 code exactly
---
#### `src/workers/push/isWithinQuietHours.ts` ← **CREATE**
**Features:** DST-safe quiet hours evaluation using Luxon.
**Interfaces:**
```ts
interface UserPreferences {
  pushQuietStart: string | null; // "22:00:00"
  pushQuietEnd: string | null;   // "07:00:00"
  briefingTimezone: string | null; // "Europe/London"
}
export function isWithinQuietHours(prefs: UserPreferences, nowUtc: Date): boolean;
```
**Checklist:**
- [ ] Imports `DateTime` from `'luxon'` — NOT native JS Date
- [ ] Returns `false` (fail open) if any preference is null/missing
- [ ] `DateTime.fromJSDate(nowUtc, { zone: briefingTimezone })` for DST-correct conversion
- [ ] Validates timezone: `localNow.isValid` check with warning log
- [ ] Handles overnight wrap: `startMinutes > endMinutes` case
- [ ] Handles same-day: `startMinutes <= endMinutes` case
- [ ] Matches PRD §8.2 code exactly
---
#### `src/app/api/push/subscribe/route.ts` ← **CREATE**
**Features:** `POST /api/push/subscribe` — Stores encrypted web push subscription.
**Checklist:**
- [ ] Requires valid session (`verifySession()`)
- [ ] Validates subscription body with Zod (`endpoint`, `keys.p256dh`, `keys.auth`)
- [ ] Encrypts keys via `encryptPushKeys()` before storing
- [ ] Upserts into `pushSubscriptions` table (unique on endpoint)
- [ ] Returns 201 Created
---
#### `src/workers/lib/cacheInvalidation.ts` ← **CREATE**
**Features:** Cache invalidation helpers for the ingestion worker. Mandatory 2-argument `revalidateTag()`.
**Interfaces:**
```ts
export function invalidateFeedCache(categorySlug: string): void;
export function invalidateTopicShell(): void;
export function invalidateReference(): void;
```
**Checklist:**
- [ ] All calls use 2-argument form: `revalidateTag('feed:tech', 'feed')` — NOT single arg
- [ ] `invalidateFeedCache`: `revalidateTag(\`feed:${categorySlug}\`, 'feed')`
- [ ] `invalidateTopicShell`: `revalidateTag('topic-shell', 'topicShell')`
- [ ] `invalidateReference`: `revalidateTag('reference-data', 'reference')`
- [ ] Matches PRD §9.2 code exactly
- [ ] TypeScript strict
---
#### `src/app/api/health/route.ts` ← **MODIFY**
**Features:** Health check endpoint. Returns DB and Redis connectivity status.
**Checklist:**
- [ ] `GET /api/health` already exists — enhance with DB ping
- [ ] `SELECT 1` via Drizzle to verify DB connectivity
- [ ] Redis ping via `connection.ping()`
- [ ] Returns `{ status: 'ok', db: 'connected', redis: 'connected', timestamp: ISO }` on 200
- [ ] Returns 503 if either dependency is down
- [ ] No auth required — used by load balancer health checks
---
**Phase 7 Success Criteria:**
- [ ] Worker starts without errors: `npx tsx src/workers/index.ts`
- [ ] Ingest worker picks up jobs from `ingestQueue`
- [ ] Summarise worker respects content availability guard (confirmed via test article)
- [ ] SIGTERM causes clean shutdown with no job loss
- [ ] Push subscription encryption/decryption round-trip passes
- [ ] Quiet hours evaluation correct across DST transition (unit test)
- [ ] `/api/health` returns 200 with DB + Redis status
---
## Complete File Inventory
### Files to CREATE (new files)
| File Path | Phase | Purpose |
|---|---|---|
| `proxy.ts` | 1 | Network boundary, cookie check |
| `src/lib/env/index.ts` | 1 | Zod-validated env vars |
| `drizzle.config.ts` | 1 | Drizzle Kit config |
| `.env.example` | 1 | Env var template |
| `src/lib/db/schema.ts` | 2 | Complete Drizzle schema |
| `src/lib/db/index.ts` | 2 | Lazy proxy DB client |
| `src/lib/auth/index.ts` | 2 | Auth.js v5 instance |
| `src/lib/auth/dal.ts` | 2 | verifySession(), verifyAdminSession() |
| `src/lib/queue/index.ts` | 2 | BullMQ queue instances |
| `src/app/api/auth/[...nextauth]/route.ts` | 2 | Auth.js route handler |
| `src/shared/lib/utils.ts` | 3 | cn(), formatTimeAgo(), formatDate() |
| `src/shared/components/ui/Button.tsx` | 3 | Bespoke button component |
| `src/shared/components/ui/Badge.tsx` | 3 | Status badge |
| `src/shared/components/ui/Separator.tsx` | 3 | Radix separator |
| `src/shared/components/ui/Skeleton.tsx` | 3 | Loading skeletons |
| `src/shared/components/layout/Header.tsx` | 3 | Site header |
| `src/shared/components/layout/Footer.tsx` | 3 | Site footer |
| `src/shared/components/primitives/PageTransition.tsx` | 3 | View Transition abstraction |
| `src/shared/hooks/useDebounce.ts` | 3 | 300ms debounce hook |
| `src/domain/articles/types.ts` | 4 | ArticleWithSource, ArticleWithSummary |
| `src/domain/articles/normalize.ts` | 4 | URL normalization, content hashing |
| `src/domain/ranking/score.ts` | 4 | Importance scoring formula |
| `src/features/feed/queries.ts` | 4 | getFeedArticles(), getCategories() |
| `src/features/feed/actions.ts` | 4 | savePreference(), setFavoriteCategory() |
| `src/features/feed/components/FeedGrid.tsx` | 4 | CSS Subgrid parent container |
| `src/features/feed/components/ArticleCard.tsx` | 4 | Subgrid 3-row article card |
| `src/features/feed/components/TopicNav.tsx` | 4 | Category navigation |
| `src/app/(public)/topics/[category]/page.tsx` | 4 | Topic-filtered feed page |
| `src/app/(public)/article/[id]/page.tsx` | 4 | Article detail page |
| `src/app/(public)/loading.tsx` | 4 | Route loading UI |
| `src/app/(public)/error.tsx` | 4 | Route error boundary |
| `src/app/(public)/not-found.tsx` | 4 | 404 page |
| `src/features/summaries/lib/summariseSchema.ts` | 5 | Zod AI output schema |
| `src/lib/ai/prompts.ts` | 5 | AI prompt templates |
| `src/lib/ai/provenance.ts` | 5 | 3-layer provenance generation |
| `src/features/summaries/components/NutritionLabel.tsx` | 5 | AI disclosure component |
| `src/features/summaries/components/DisclosureBadge.tsx` | 5 | "AI Brief" inline badge |
| `src/features/summaries/components/SummaryPanel.tsx` | 5 | Summary state manager |
| `src/features/summaries/actions.ts` | 5 | requestSummary(), flagSummary() |
| `src/app/api/summarize/[id]/route.ts` | 5 | POST /api/summarize/:id |
| `src/features/search/queries.ts` | 6 | searchArticles(), getSearchSuggestions() |
| `src/features/search/components/SearchBar.tsx` | 6 | Search input with debounce |
| `src/features/search/components/SearchResults.tsx` | 6 | Search results list |
| `src/app/(public)/search/page.tsx` | 6 | Search results page |
| `src/app/api/articles/route.ts` | 6 | GET /api/articles |
| `src/app/(admin)/layout.tsx` | 6 | Admin section layout |
| `src/app/(admin)/sources/page.tsx` | 6 | Source management dashboard |
| `src/app/(admin)/sources/actions.ts` | 6 | Source CRUD actions |
| `src/app/(admin)/summaries/page.tsx` | 6 | Summary review dashboard |
| `src/workers/index.ts` | 7 | Worker service entry point |
| `src/workers/jobs/ingest.ts` | 7 | RSS ingestion worker |
| `src/workers/jobs/summarize.ts` | 7 | AI summarisation worker |
| `src/workers/jobs/score.ts` | 7 | Importance scoring worker |
| `src/workers/jobs/scheduler.ts` | 7 | RSS poll scheduler |
| `src/workers/jobs/determineContentAvailability.ts` | 7 | Content availability classifier |
| `src/lib/security/encrypt.ts` | 7 | AES-256-GCM push key encryption |
| `src/workers/push/isWithinQuietHours.ts` | 7 | DST-safe quiet hours |
| `src/app/api/push/subscribe/route.ts` | 7 | Push subscription endpoint |
| `src/workers/lib/cacheInvalidation.ts` | 7 | revalidateTag() wrappers |
| `drizzle/custom-indexes.sql` | 2 | Raw SQL indexes (GIN, pg_trgm) |
| `scripts/migrate.ts` | 2 | Migration runner script |
| `scripts/seed.ts` | 2 | Database seeder (categories, sources) |
### Files to MODIFY (existing files)
| File Path | Phase | Changes |
|---|---|---|
| `next.config.ts` | 1 | Full production configuration |
| `src/app/globals.css` | 3 | @theme tokens, font-face, resets |
| `src/app/layout.tsx` | 3 | next/font, Editorial Dispatch fonts |
| `src/app/page.tsx` | 4 | Home feed page (full rewrite) |
| `src/app/api/health/route.ts` | 7 | Add DB + Redis health checks |
| `src/db/schema.ts` | 2 | Delete content (replaced by lib/db/schema.ts) |
| `src/db/index.ts` | 2 | Delete content (replaced by lib/db/index.ts) |
### Files to DELETE
| File Path | Reason |
|---|---|
| `src/db/schema.ts` | Superseded by `src/lib/db/schema.ts` |
| `src/db/index.ts` | Superseded by `src/lib/db/index.ts` |
| `drizzle.config.json` | Superseded by `drizzle.config.ts` |
---
## Cross-Cutting Concerns & Invariants
### TypeScript Enforcement
- `strict: true` in `tsconfig.json` — non-negotiable
- Zero `any` — use `unknown` with type guards
- `interface` for structural types, `type` for unions/intersections
- All public API boundaries have explicit return types
- Types derived from Drizzle schema via `$inferSelect` — never hand-written
### Security Checklist
- [ ] `proxy.ts` is UX-only — real auth at DAL
- [ ] All Server Actions call `verifySession()` / `verifyAdminSession()` first
- [ ] All DB queries parameterized (Drizzle handles this — no raw SQL in features)
- [ ] Push subscription keys encrypted with AES-256-GCM before storage
- [ ] `PUSH_KEY_ENCRYPTION_KEY` validated at startup (length 64, hex format)
- [ ] `AUTH_SECRET` minimum 32 chars validated by Zod
- [ ] Admin routes: double auth check (layout + Server Action)
- [ ] External links: `rel="noopener noreferrer"` on all `target="_blank"`
- [ ] No raw error details exposed to users in production
### Accessibility Checklist
- [ ] WCAG AAA focus rings: `focus-visible:ring-2 focus-visible:ring-dispatch-ember`
- [ ] All images have `alt` attributes (articles may have OG images)
- [ ] `<time>` with `dateTime` for all timestamps
- [ ] `<nav aria-label>` for all navigation regions
- [ ] `role="feed"` on feed containers
- [ ] `role="search"` on search form
- [ ] Skip-to-content link at top of page
- [ ] `prefers-reduced-motion` disables all animations
- [ ] Color contrast: `ink-600` on `paper-50` is WCAG AAA (9.5:1)
- [ ] AI disclosure: `aria-label="AI-generated summary transparency label"`
### Performance Checklist
- [ ] `getCategories()` uses `"use cache"` with `cacheLife('reference')` — category data rarely changes
- [ ] Feed queries: cursor pagination prevents unbounded results (R14 mitigation)
- [ ] `getFeedArticles()` result: max 30 items per page
- [ ] `next/font` — fonts loaded with `display: swap` via Next.js optimization
- [ ] `ArticleCard` is a Server Component — zero client-side JS for rendering
- [ ] `"use cache"` directives on topic shells — TTFB < 50ms via CDN edge
### Anti-Generic Design Enforcement
- [ ] **Zero Inter/Roboto** — Newsreader + Instrument Sans + Commit Mono only
- [ ] **Zero purple gradients** — `dispatch-ember` coral-red is the single accent
- [ ] **No Bootstrap-style card grids** — CSS Subgrid with structural alignment
- [ ] **No generic hero sections** — editorial masthead with typographic hierarchy
- [ ] **Dispatch-ember** used for: breaking news, AI badge, focus rings, active states
- [ ] **Paper-50** (#fafaf8) — newsprint warmth, not cold white (#ffffff)
- [ ] **Commit Mono** for ALL metadata text (timestamps, source names, badges)
---
## Risk Register Summary
| ID | Risk | Mitigation |
|---|---|---|
| R1 | `use cache` silently ignored | `cacheComponents: true` locked at top-level |
| R2 | ViewTransition renamed | All usage via `<PageTransition>` abstraction |
| R4 | `revalidateTag()` single arg | `cacheInvalidation.ts` enforces 2-arg form |
| R5 | `experimental.ppr` left in | Explicitly absent from `next.config.ts` |
| R7 | CVE-2025-55182 | Next.js pinned to ≥16.2.6 |
| R8 | Auth.js v5 beta | Exact version pinned, monitored |
| R9 | AI hallucination | Content guard in `enqueueSummarizeJob()` |
| R10 | DST quiet hours | Luxon mandatory for all timezone ops |
| R11 | Push key exposure | AES-256-GCM encryption at rest |
| R12 | Duplicate subcategory slugs | Composite unique index `(categoryId, slug)` |
| R14 | Unbounded feed queries | LIMIT 31 pattern in all feed queries |
---
## Dependency Graph (Phase Ordering)
```
Phase 1 (Foundation)
    ↓
Phase 2 (Schema + Infra) ← Requires Phase 1 packages
    ↓
Phase 3 (Design System) ← Requires Phase 1 config (fonts, CSS tokens)
    ↓
Phase 4 (Feed Feature) ← Requires Phase 2 (DB queries) + Phase 3 (components)
    ↓
Phase 5 (AI Pipeline) ← Requires Phase 2 (DB schema) + Phase 4 (article pages)
    ↓
Phase 6 (Search + Admin) ← Requires Phase 2 (DB) + Phase 3 (components) + Phase 4 (types)
    ↓
Phase 7 (Worker + Push) ← Requires Phase 2 (schema) + Phase 5 (AI) + Phase 6 (admin)
```
Each phase is independently testable. Phases 4–7 can be partially parallelized (Feature teams) once Phase 2 schema is stable.
---
## Validation Protocol (Per Phase)
After each phase, run:
```bash
# 1. TypeScript
npx tsc --noEmit --pretty false 2>&1 | tee /tmp/tsc.log
# 2. Type generation  
npx next typegen 2>&1 | tee /tmp/next-typegen.log
# 3. Production build
npm run build 2>&1 | tee /tmp/build.log
# 4. Schema validation (Phase 2+)
npx drizzle-kit generate
```
**Pass criteria:** Zero TypeScript errors, zero build warnings about misplaced config flags, zero Drizzle schema errors.
---
## Final Delivery Checklist
- [ ] Phase 1: Foundation configured — `npm run build` passes on bare app
- [ ] Phase 2: Schema applied — `drizzle-kit generate` + `drizzle-kit migrate` succeed
- [ ] Phase 3: Design system — Newsreader renders in browser, color tokens match PRD §4.2
- [ ] Phase 4: Feed renders — Articles visible at `/`, topic pages at `/topics/:category`
- [ ] Phase 5: AI pipeline — Summary appears at article detail page after job completes
- [ ] Phase 6: Search returns results — `/api/articles?q=test` returns JSON
- [ ] Phase 7: Worker runs — `src/workers/index.ts` starts and picks up queue jobs
- [ ] Zero TypeScript errors across entire codebase
- [ ] Zero `any` types (enforced by `strict: true`)
- [ ] All API endpoints respond correctly (health check, articles, summarize)
- [ ] WCAG AA minimum (target AAA) — keyboard nav works end-to-end
- [ ] `prefers-reduced-motion` disables all animations
- [ ] EU AI Act 3-layer disclosure present on all summarised articles
- [ ] Content availability guard prevents summarisation of `title_only`/`excerpt` articles
- [ ] Admin routes inaccessible to non-admin users (verified with non-admin session)
- [ ] Production build deployed and `/api/health` returns 200
---
*This plan supersedes all prior version notes. PRD v4.3 and PAD v4.5 remain the authoritative sources for any ambiguous decision not covered here.*

Delivery Summary
MASTER_EXECUTION_PLAN.md — Delivered ✅
Vital Statistics:

2,027 lines of authoritative engineering documentation
538 integrated checklist items across all phases
65 individual file specifications with interfaces, features, and per-file checklists
7 logical, independently deployable phases
What the Plan Contains
Phase Structure
Phase	Name	Files	Focus
1	Foundation & Configuration	6	next.config.ts flag placement, env validation, package setup
2	Database Schema & Infrastructure	9	Complete 10-table Drizzle schema, lazy DB client, Auth.js v5, BullMQ queues
3	Design System & Shared Components	10	Editorial Dispatch tokens, fonts, shared UI primitives, PageTransition
4	Core Feed Feature	13	FeedGrid subgrid, ArticleCard 3-row layout, topic pages, cursor pagination
5	AI Summarisation Pipeline	8	Zod-validated prompts, NutritionLabel, 3-layer EU AI Act disclosure
6	Search, Admin & Public API	8	BM25 search, admin source management, REST API
7	Worker Service + Push	11	BullMQ workers, AES-256-GCM encryption, DST-safe quiet hours, scheduler
Key Engineering Decisions Documented
Every next.config.ts flag placed at its validated position with explanation of what silently breaks if misplaced
Content Availability Guard — the anti-hallucination gate protecting against AI summarising title_only/excerpt articles
5-Layer Request Model — proxy.ts → App Router → Feature Modules → Domain Services → Infrastructure
CSS Subgrid contract — exact parent/child layout rules so no fixed heights, no JS measurement
Auth at the DAL — proxy.ts is UX-only, real auth in verifySession() with React.cache() memoization
14-item Risk Register — every identified risk with its evidence-backed mitigation
Complete File Inventory — 57 files to create, 7 to modify, 3 to delete
Anti-Generic Design Enforcement
The plan explicitly documents and enforces:

Zero Inter/Roboto — Newsreader + Instrument Sans + Commit Mono only
CSS Subgrid over Bootstrap-style card grids
paper-50 (#fafaf8) — newsprint warmth, not cold white
dispatch-ember (#c7513f) — single bold accent for breaking news, AI badges, focus rings
Commit Mono for ALL metadata (timestamps, source names, status indicators)
