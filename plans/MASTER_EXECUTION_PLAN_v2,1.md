# OneStopNews — MASTER_EXECUTION_PLAN.md

> **Document Status:** Authoritative build plan derived from PRD v2.0 and PAD v1.0
> **Audience:** Engineering team executing the build
> **Rule:** Phases are designed for **maximum independence** — phases marked 🟢 PARALLEL can be worked on simultaneously by different team members
> **Format:** Every phase has a description, dependency graph, file list with per-file checklists, and exit criteria

---

## Table of Contents

| # | Phase | Track | Parallelizable | Estimated Effort |
|---|---|---|---|---|
| 0 | Repository Foundation & Tooling | Foundation | 🔴 Blocking | 1 day |
| 1 | Environment, Config & Validation | Foundation | 🔴 Blocking | 0.5 day |
| 2 | Database Schema & Migrations | Foundation | 🔴 Blocking | 2 days |
| 3 | Domain Layer (Pure Business Logic) | Backend | 🟢 PARALLEL | 1.5 days |
| 4 | Infrastructure Integrations | Backend | 🟢 PARALLEL with 3 | 1.5 days |
| 5 | Authentication & Authorization | Backend | 🟢 PARALLEL with 3,4 | 1.5 days |
| 6 | Worker Service Core | Worker | Depends on 4 | 1 day |
| 7 | Ingestion Pipeline | Worker | Depends on 6 | 2 days |
| 8 | Scoring & Feed Slice Pipeline | Worker | Depends on 6 | 1 day |
| 9 | Summarization Pipeline | Worker | Depends on 6 | 2 days |
| 10 | Design System & UI Primitives | Frontend | 🟢 PARALLEL from Phase 0 | 2 days |
| 11 | Public Feed Experience | Frontend | Depends on 10 | 2 days |
| 12 | Article Detail & AI Summary UI | Frontend | Depends on 10 | 2 days |
| 13 | Search Experience | Frontend | Depends on 10 | 1 day |
| 14 | Public API Route Handlers | Frontend | Depends on 5 | 1 day |
| 15 | Admin Workspace | Frontend | Depends on 5, 11 | 2 days |
| 16 | Observability & Runbooks | Operations | Depends on 7, 9 | 1.5 days |
| 17 | Testing Strategy & Implementation | Cross-cutting | Throughout | 3 days |
| 18 | Deployment & Production Readiness | Operations | Final phase | 1.5 days |

**Total estimated effort:** ~28 person-days (achievable in ~3 calendar weeks with 2 engineers working in parallel)

---

## Dependency Graph

```
                    ┌─── Phase 0: Repo Foundation ───┐
                    │                                │
                    ▼                                ▼
            Phase 1: Env & Config         Phase 10: Design System ◄─── (independent)
                    │                                │
                    ▼                                ├──► Phase 11: Public Feed
            Phase 2: DB Schema                       ├──► Phase 12: Article Detail
                    │                                ├──► Phase 13: Search
                    ├──► Phase 3: Domain ◄──┐        └──► Phase 15: Admin (also needs 5)
                    ├──► Phase 4: Infra ────┤                       ▲
                    └──► Phase 5: Auth ─────┤                       │
                                            │              Phase 14: Public APIs
                                            ▼
                                    Phase 6: Worker Core
                                            │
                            ┌───────────────┼───────────────┐
                            ▼               ▼               ▼
                    Phase 7: Ingest   Phase 8: Score   Phase 9: Summarize
                            │               │               │
                            └───────────────┼───────────────┘
                                            ▼
                                Phase 16: Observability
                                            │
                                            ▼
                                Phase 17: Testing (throughout)
                                            │
                                            ▼
                                Phase 18: Deployment
```

---

# Phase 0: Repository Foundation & Tooling

## Description

Establish the monorepo skeleton, TypeScript configuration, linting/formatting toolchain, and Docker Compose development environment. Nothing functional yet — this phase makes the codebase *buildable*.

**Critical decisions enforced here:**
- pnpm workspace (web + worker share dependencies and types)
- TypeScript strict mode, zero `any`
- Biome (not ESLint+Prettier) for unified linting + formatting
- Turbopack as the bundler (Next.js 16 default)

**Exit criteria:**
- ✅ `pnpm install` succeeds
- ✅ `pnpm typecheck` passes on empty project
- ✅ `pnpm lint` and `pnpm format` work
- ✅ `docker compose up` starts PostgreSQL + Redis successfully

## Files to Create

### `package.json` (root)
- **Purpose:** Root workspace manifest declaring pnpm workspaces for `web` and `worker`
- **Key scripts:** `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `db:generate`, `db:migrate`
- **Checklist:**
  - [ ] Declare pnpm workspaces (`web`, `worker`)
  - [ ] Pin Node.js engine to `>=24.0.0`
  - [ ] Add scripts for cross-workspace operations
  - [ ] Add `packageManager` field with pnpm version

### `pnpm-workspace.yaml`
- **Purpose:** pnpm workspace configuration
- **Checklist:**
  - [ ] Define `packages: ['web', 'worker']`

### `tsconfig.base.json`
- **Purpose:** Shared TypeScript configuration extended by web and worker
- **Key settings:** `strict: true`, `noUncheckedIndexedAccess: true`, `target: ES2023`
- **Checklist:**
  - [ ] Enable all strict mode flags
  - [ ] Enable `noUncheckedIndexedAccess`
  - [ ] Configure path aliases for `@/*` (shared)
  - [ ] Set `moduleResolution: bundler`

### `web/tsconfig.json`
- **Purpose:** Web-app-specific TS config extending base
- **Checklist:**
  - [ ] Extend `tsconfig.base.json`
  - [ ] Add Next.js plugin
  - [ ] Configure `@/*` → `./src/*` path alias
  - [ ] Include `.next/types/**/*.ts`

### `worker/tsconfig.json`
- **Purpose:** Worker-service-specific TS config
- **Checklist:**
  - [ ] Extend `tsconfig.base.json`
  - [ ] Add `outDir: ./dist`
  - [ ] Configure path aliases to share `@/db`, `@/domain`, `@/lib` with web

### `biome.json`
- **Purpose:** Biome configuration for unified linting + formatting
- **Checklist:**
  - [ ] Enable recommended lint rules
  - [ ] Configure 2-space indentation, single quotes, semicolons
  - [ ] Add custom rules: no `any`, no `console.log` (use logger)
  - [ ] Configure import sorting

### `docker-compose.yml`
- **Purpose:** Local development infrastructure (PostgreSQL 17 + Redis 7)
- **Checklist:**
  - [ ] PostgreSQL 17-alpine with healthcheck
  - [ ] Redis 7-alpine with AOF persistence + `noeviction` policy
  - [ ] Mount `./docker/init.sql` for PG extension setup
  - [ ] Persistent volumes for both services
  - [ ] Expose ports 5432 and 6379

### `docker/init.sql`
- **Purpose:** PostgreSQL extension initialization on first container start
- **Checklist:**
  - [ ] `CREATE EXTENSION uuid-ossp`
  - [ ] `CREATE EXTENSION pg_trgm`
  - [ ] Add comment block referencing `pg_textsearch` as Phase 2 roadmap

### `Dockerfile.web`
- **Purpose:** Multi-stage Dockerfile for web app (dev + prod targets)
- **Checklist:**
  - [ ] `development` target with hot reload support
  - [ ] `production` target with standalone Next.js output
  - [ ] Use Node.js 24 alpine base
  - [ ] Non-root user in production

### `Dockerfile.worker`
- **Purpose:** Multi-stage Dockerfile for worker service
- **Checklist:**
  - [ ] `development` target with `tsx watch`
  - [ ] `production` target with compiled output
  - [ ] Use Node.js 24 alpine base
  - [ ] Non-root user; healthcheck command

### `.env.example`
- **Purpose:** Documented template for all environment variables
- **Checklist:**
  - [ ] Every variable from PAD Section 12.2 listed with comment
  - [ ] Mark secrets with `# SECRET` comment
  - [ ] Group by category (Database, Redis, Auth, AI, Worker)

### `.gitignore`
- **Purpose:** Standard ignores for Node, Next.js, environments
- **Checklist:**
  - [ ] Ignore `node_modules`, `.next`, `dist`, `.env*` (except `.env.example`)
  - [ ] Ignore `coverage`, `*.log`
  - [ ] Ignore Drizzle migration metadata (`.drizzle/`)

### `README.md`
- **Purpose:** Project overview, quickstart, and links to PRD/PAD
- **Checklist:**
  - [ ] Quickstart commands (clone → install → docker → dev)
  - [ ] Link to PRD and PAD
  - [ ] Document tech stack at a glance

---

# Phase 1: Environment, Configuration & Validation

## Description

Create the Zod-validated environment configuration that every other module depends on. This is short but critical — every downstream service imports from `lib/env`.

**Dependencies:** Phase 0
**Exit criteria:** Importing `env` throws immediately if any required variable is missing or malformed.

## Files to Create

### `web/src/lib/env/index.ts`
- **Purpose:** Zod-validated env configuration with startup failure on missing/invalid vars
- **Exports:** `env` (typed object), `Env` (type)
- **Checklist:**
  - [ ] Zod schema covers all variables from PAD Section 12.2
  - [ ] `.coerce` for numeric values
  - [ ] Custom error messages on every field
  - [ ] `process.exit(1)` if parse fails
  - [ ] Log clean error summary (no stack trace) on failure

### `worker/src/lib/env/index.ts`
- **Purpose:** Worker-specific env validation (subset of web env + worker-only vars)
- **Exports:** `env` (typed object)
- **Checklist:**
  - [ ] Reuses base schema from web where possible (import via workspace dependency, or duplicate with shared schema source)
  - [ ] Validates `WORKER_CONCURRENCY_INGEST`, `WORKER_CONCURRENCY_SUMMARIZE`, `BULL_BOARD_*`
  - [ ] Does NOT require `NEXT_PUBLIC_*` variables

### `web/next.config.ts`
- **Purpose:** Next.js 16 configuration with Cache Components, PPR, and Turbopack defaults
- **Checklist:**
  - [ ] Enable `experimental.cacheComponents`
  - [ ] Enable `experimental.ppr: 'incremental'`
  - [ ] Configure `serverExternalPackages` for `postgres`, `bullmq`, `ioredis`
  - [ ] Image optimization settings for article thumbnails
  - [ ] No `webpack()` override (Turbopack default)

---

# Phase 2: Database Schema & Migrations

## Description

Build the complete Drizzle schema, lazy proxy DB connection, migration tooling, and seed data. This is the **single source of truth** for all data structures in the system.

**Dependencies:** Phase 1
**Exit criteria:** `pnpm db:generate` produces clean migration; `pnpm db:migrate` applies it successfully; seed data populates categories and subcategories.

## Files to Create

### `web/src/lib/db/schema.ts`
- **Purpose:** Complete Drizzle schema — every table, every column, every index
- **Exports:** All table definitions, all enums, custom `tsvector` type, relations
- **Reference:** PAD Section 6.1
- **Checklist:**
  - [ ] All enums defined (`feedTypeEnum`, `contentAvailabilityEnum`, `summaryStatusEnum`, `articleStatusEnum`, `userRoleEnum`)
  - [ ] Custom `tsvector` type defined
  - [ ] Tables: `categories`, `subcategories`, `sources`, `articles`, `summaries`, `users`, `sessions`, `userPreferences`, `ingestionJobs`, `sourceHealthSnapshots`
  - [ ] All foreign keys with explicit `onDelete` behavior
  - [ ] All indexes from PAD Section 6.5 inventory
  - [ ] `articles.searchVector` defined as generated column with `setweight()`
  - [ ] GIN index includes `fastupdate: false` ← critical
  - [ ] Partial index for recent articles (last 30 days)
  - [ ] Drizzle `relations()` declared for typed joins

### `web/src/lib/db/index.ts`
- **Purpose:** Lazy proxy database connection — never opens a connection at module load
- **Exports:** `db` (proxied DrizzleDB instance), re-exports schema
- **Reference:** PAD Section 6.3
- **Checklist:**
  - [ ] Use `postgres` (postgres.js) driver, not `pg`
  - [ ] Lazy `getDb()` returns cached instance after first call
  - [ ] Connection pool size from `env.DB_POOL_MAX`
  - [ ] `prepare` flag controlled by `env.DB_DISABLE_PREPARE`
  - [ ] Proxy intercepts all property access to lazy-init
  - [ ] Logger enabled only in development

### `worker/src/lib/db/index.ts`
- **Purpose:** Worker-side DB client (same lazy proxy pattern; can import from web workspace)
- **Checklist:**
  - [ ] Either re-export from web workspace OR duplicate with worker-specific pool sizing
  - [ ] Worker pool size typically larger (concurrent job handlers)

### `drizzle.config.ts` (root)
- **Purpose:** Drizzle Kit configuration for migration generation and application
- **Checklist:**
  - [ ] `dialect: 'postgresql'`
  - [ ] `schema: './web/src/lib/db/schema.ts'`
  - [ ] `out: './web/src/lib/db/migrations'`
  - [ ] `strict: true`, `verbose: true`
  - [ ] Credentials from `env.DATABASE_URL`

### `web/src/lib/db/migrations/0000_initial.sql` (generated)
- **Purpose:** Initial migration generated by `drizzle-kit generate`
- **Checklist:**
  - [ ] Review generated SQL for correctness
  - [ ] Verify all indexes present
  - [ ] Verify generated column syntax for `tsvector`
  - [ ] Commit to git

### `web/src/lib/db/seed.ts`
- **Purpose:** Seed script for categories, subcategories, and sample sources (dev only)
- **Exports:** `seed()` function
- **Checklist:**
  - [ ] Idempotent (uses upsert with `onConflictDoNothing`)
  - [ ] Categories from PRD Section 5.1 table
  - [ ] Subcategories with display order
  - [ ] At least 5 sample sources per category for dev testing
  - [ ] Wrapped in transaction
  - [ ] Logs progress

### `web/src/lib/db/zod-schemas.ts`
- **Purpose:** Auto-generated Zod schemas from Drizzle tables (for API validation)
- **Exports:** `*InsertSchema`, `*SelectSchema` per table
- **Checklist:**
  - [ ] Use `drizzle-zod`'s `createInsertSchema()` and `createSelectSchema()`
  - [ ] Add custom refinements (URL validation, length limits)
  - [ ] Export typed inserts/selects (`type NewArticle`, `type Article`)

---

# Phase 3: Domain Layer (Pure Business Logic) 🟢 PARALLEL

## Description

Pure TypeScript business logic with **no framework imports** (no Next.js, no React, no Drizzle, no BullMQ). This is the most testable layer — every function takes input and returns output deterministically. Used by both web and worker.

**Dependencies:** Phase 0 only
**Parallelizable with:** Phases 4 and 5

**Exit criteria:** 100% unit test coverage on domain functions; zero framework imports.

## Files to Create

### `web/src/domain/articles/normalize.ts`
- **Purpose:** Canonical URL normalization + content hashing
- **Exports:** `normalizeCanonicalUrl(url)`, `computeContentHash(url, title, publishedAt)`
- **Reference:** PAD Section 8.2
- **Checklist:**
  - [ ] Force HTTPS, strip `www.`, remove trailing slash
  - [ ] Strip tracking params (utm_*, fbclid, gclid, etc.)
  - [ ] Sort remaining query params alphabetically
  - [ ] Remove URL fragment
  - [ ] SHA-256 content hash from `(canonicalUrl, title, publishedAt)`
  - [ ] Handle malformed URLs gracefully (throw with clear message)

### `web/src/domain/articles/deduplicate.ts`
- **Purpose:** Deduplication logic against existing articles
- **Exports:** `deduplicateCandidates(candidates)`
- **Checklist:**
  - [ ] Batch lookup existing canonical URLs (single query, not N+1)
  - [ ] Returns `{ newArticles: [], updatedArticles: [], skipped: [] }`
  - [ ] Update detection: title or excerpt changed since last ingest

### `web/src/domain/articles/types.ts`
- **Purpose:** Shared TypeScript types for articles (used by web + worker)
- **Exports:** `ArticleCandidate`, `NormalizedArticle`, related types
- **Checklist:**
  - [ ] Pure types, no Drizzle imports
  - [ ] Document each field with JSDoc

### `web/src/domain/ranking/importance.ts`
- **Purpose:** Importance score calculation
- **Exports:** `computeImportanceScore(article, source, clusterSize)`
- **Reference:** PAD Section 7.3 (PRD scoring formula)
- **Checklist:**
  - [ ] Weighted formula: recency (40%) + source priority (20%) + cluster size (25%) + category relevance (15%)
  - [ ] Exponential decay for recency (half-life: 12 hours for breaking news, 7 days for evergreen)
  - [ ] Returns float in [0.0, 1.0]
  - [ ] Pure function — no DB access

### `web/src/domain/summaries/prompt.ts`
- **Purpose:** AI prompt template construction
- **Exports:** `buildSummarizationPrompt(title, content, sourceUrl, sourceName)`, `PROMPT_VERSION` constant
- **Reference:** PAD Section 9.3
- **Checklist:**
  - [ ] Template enforces fidelity-over-brevity
  - [ ] JSON output format specification
  - [ ] Source citation extraction instruction
  - [ ] Content truncation at 4000 chars with truncation notice
  - [ ] `PROMPT_VERSION` exported for tracking which prompt version generated which summary

### `web/src/domain/summaries/parse.ts`
- **Purpose:** Parse + validate AI response with Zod
- **Exports:** `parseSummaryResponse(rawText)`, `SummaryResponse` type
- **Reference:** PAD Section 9.4
- **Checklist:**
  - [ ] Strips markdown code fences before JSON.parse
  - [ ] Zod schema validates structure
  - [ ] Throws descriptive errors on schema mismatch
  - [ ] Rejects empty `summaryText` or `keyPoints`

### `web/src/domain/summaries/types.ts`
- **Purpose:** Summary domain types
- **Exports:** `SummaryResponse`, `CitedSource`
- **Checklist:**
  - [ ] Pure types
  - [ ] Inferred from Zod schemas where possible

### `web/src/domain/sources/types.ts`
- **Purpose:** Source-related types (priority tiers, feed types)
- **Checklist:**
  - [ ] `SourcePriority` enum-like type (Tier1, Tier2, Tier3)
  - [ ] `FeedFetchResult` type

---

# Phase 4: Infrastructure Integrations 🟢 PARALLEL

## Description

Adapter modules wrapping external services: Redis client, BullMQ queue producers (web-app side), and AI API clients. These are thin wrappers that hide service-specific details behind clean interfaces.

**Dependencies:** Phase 1, 2
**Parallelizable with:** Phases 3 and 5

**Exit criteria:** Each integration module exports a clean interface; importing the module does not eagerly connect.

## Files to Create

### `web/src/lib/redis/index.ts`
- **Purpose:** Lazy ioredis client (single instance, shared across web app)
- **Exports:** `redis` (proxied Redis instance)
- **Checklist:**
  - [ ] Use ioredis (BullMQ requirement)
  - [ ] `maxRetriesPerRequest: null` ← critical for BullMQ
  - [ ] `lazyConnect: true`
  - [ ] Proxy pattern: no connection until first command
  - [ ] Log connection errors with logger (not console)

### `web/src/lib/redis/feed-slices.ts`
- **Purpose:** Redis feed slice cache helpers
- **Exports:** `getFeedSlice()`, `setFeedSlice()`, `invalidateFeedSlice()`
- **Reference:** PAD Section 11.3
- **Checklist:**
  - [ ] Key schema: `feed:{categoryId}:{subcategoryId}:{sort}`
  - [ ] TTL: 300 seconds
  - [ ] JSON-encoded article ID arrays
  - [ ] Pattern delete for invalidation
  - [ ] Handle Redis miss gracefully (return null, not throw)

### `web/src/lib/queue/index.ts`
- **Purpose:** BullMQ Queue producers — web app enqueues but does NOT consume
- **Exports:** `ingestQueue`, `summarizeQueue`, `scoreQueue`, `feedSliceQueue`
- **Reference:** PAD Section 5.2
- **Checklist:**
  - [ ] Queue names match worker definitions exactly
  - [ ] Default job options: attempts, backoff, `removeOnComplete`, `removeOnFail` TTLs
  - [ ] Shared Redis connection (import from `lib/redis`)
  - [ ] No `Worker` instances — web app is producer only

### `web/src/lib/queue/types.ts`
- **Purpose:** TypeScript payload types for every job (shared with worker)
- **Exports:** `IngestJobPayload`, `SummarizeJobPayload`, `ScoreJobPayload`, `FeedSliceJobPayload`
- **Checklist:**
  - [ ] Every job has a typed payload
  - [ ] Payloads are pure JSON (no Date objects — use ISO strings)
  - [ ] Document required vs. optional fields

### `web/src/lib/ai/index.ts`
- **Purpose:** Unified AI client wrapper (Anthropic + OpenAI)
- **Exports:** `generateCompletion(request)`, `AICompletionRequest`, `AICompletionResponse`
- **Reference:** PAD Section 9.1
- **Checklist:**
  - [ ] Single function signature works for both providers
  - [ ] Detect provider from model name prefix
  - [ ] Anthropic + OpenAI clients lazily initialized
  - [ ] Returns normalized `{ text, tokensUsed, model }`
  - [ ] Handles API errors with typed error classes (`RateLimitError`, `AuthError`)

### `web/src/lib/ai/models.ts`
- **Purpose:** Model selection, token budgets, cost estimation
- **Exports:** `AI_MODELS`, `TOKEN_BUDGETS`, `estimateCost(model, tokens)`
- **Reference:** PAD Section 9.2
- **Checklist:**
  - [ ] `AI_MODELS.PRIMARY`, `AI_MODELS.FALLBACK` constants
  - [ ] Token budgets per model
  - [ ] Cost-per-1M-tokens lookup
  - [ ] `estimateCost()` returns USD float

### `worker/src/lib/queue/index.ts`
- **Purpose:** BullMQ Queue + Worker instances (worker side — consumers)
- **Checklist:**
  - [ ] Re-export Queue instances from shared types
  - [ ] Worker instances created here (not Queues only)

---

# Phase 5: Authentication & Authorization 🟢 PARALLEL

## Description

Better Auth configuration, Data Access Layer (DAL), static RBAC permissions matrix, and `proxy.ts`. The defense-in-depth model: proxy = UX, DAL = security.

**Dependencies:** Phase 2 (sessions table), Phase 1 (env)
**Parallelizable with:** Phases 3 and 4

**Exit criteria:** Sign-in flow works; protected routes redirect unauthenticated users; admin routes block non-admin users; DAL is called from every protected Server Component.

## Files to Create

### `web/src/lib/auth/index.ts`
- **Purpose:** Better Auth configuration with Drizzle adapter
- **Exports:** `auth`, `Session` type, `User` type
- **Reference:** PAD Section 7.1
- **Checklist:**
  - [ ] Drizzle adapter pointing at `users` and `sessions` tables
  - [ ] `emailAndPassword` enabled with email verification
  - [ ] `session.strategy: 'database'` (NOT JWT-only) for revocation
  - [ ] HttpOnly, Secure, SameSite=Lax cookies
  - [ ] `cookieCache.maxAge: 300` for read performance
  - [ ] `BETTER_AUTH_SECRET` validated >= 32 chars

### `web/src/lib/auth/permissions.ts`
- **Purpose:** Static RBAC permissions matrix — single source of truth for what each role can do
- **Exports:** `Role`, `Permission`, `ROLE_PERMISSIONS`, `hasPermission()`
- **Reference:** PAD Section 7.3
- **Checklist:**
  - [ ] `Permission` union type covers all admin + reader actions
  - [ ] `ROLE_PERMISSIONS` matrix is exhaustive
  - [ ] `hasPermission()` is a pure function
  - [ ] Document permission naming convention (`resource:action`)

### `web/src/lib/dal/index.ts`
- **Purpose:** Data Access Layer — `verifySession()` and `requirePermission()` wrapped in React `cache()`
- **Exports:** `verifySession()`, `requirePermission(permission)`
- **Reference:** PAD Section 7.2
- **Checklist:**
  - [ ] `verifySession()` wrapped in React `cache()` for request-scoped memoization
  - [ ] Throws on missing session (callers handle redirect)
  - [ ] `requirePermission()` throws `UNAUTHORIZED` or `FORBIDDEN`
  - [ ] Reads cookies via `next/headers` (works in RSC)
  - [ ] No client-side imports

### `web/proxy.ts` (project root, NOT in src/)
- **Purpose:** Next.js 16 network boundary — optimistic redirect, NOT security
- **Reference:** PAD Section 4.7
- **Checklist:**
  - [ ] File is at PROJECT ROOT (Next.js 16 convention), not `src/`
  - [ ] Matcher excludes static assets and Next.js internals
  - [ ] Cookie presence check only — never decode/verify here
  - [ ] Redirects unauthenticated users to `/auth/signin` for `/admin/*`
  - [ ] Code comment explicitly states "NOT a security boundary"

### `web/src/app/api/auth/[...all]/route.ts`
- **Purpose:** Better Auth Route Handler — handles all auth endpoints
- **Exports:** Named `GET` and `POST` handlers
- **Checklist:**
  - [ ] Delegate to `auth.handler`
  - [ ] No custom logic — Better Auth handles everything

### `web/src/app/auth/signin/page.tsx`
- **Purpose:** Sign-in page UI
- **Checklist:**
  - [ ] Email + password form
  - [ ] Calls Better Auth client `signIn.email()`
  - [ ] Handle loading, error, success states
  - [ ] Redirect to original requested URL after successful sign-in
  - [ ] Use Shadcn Form components (Phase 10 dependency — placeholder until then)

### `web/src/app/auth/signup/page.tsx`
- **Purpose:** Sign-up page UI (admin-created accounts only in V1 — disable open signup in production)
- **Checklist:**
  - [ ] Same patterns as signin
  - [ ] Disabled in production via env flag in V1

---

# Phase 6: Worker Service Core

## Description

Worker service entry point, BullMQ Worker instances, scheduler bootstrap, and graceful shutdown handling. This phase sets up the worker process without implementing any specific job handlers (those come in Phases 7–9).

**Dependencies:** Phase 4 (queue + Redis), Phase 2 (DB)
**Exit criteria:** Worker starts, registers all queues, schedules ingestion jobs from DB sources, handles SIGTERM cleanly.

## Files to Create

### `worker/src/index.ts`
- **Purpose:** Worker service entry point with bootstrap + graceful shutdown
- **Reference:** PAD Section 5.7
- **Checklist:**
  - [ ] Bootstrap all workers (imports from `workers/`)
  - [ ] Call `bootstrapSchedulers()` on startup
  - [ ] SIGTERM handler: `worker.close()` for each, with 30s timeout
  - [ ] SIGINT handler (development)
  - [ ] Fatal error handler — log and exit
  - [ ] Log "Worker started" message with service name

### `worker/src/queues/index.ts`
- **Purpose:** Queue instance definitions (worker side — same as web but adds `Worker` instances)
- **Checklist:**
  - [ ] Re-export Queue instances from `web/src/lib/queue`
  - [ ] OR define independently with shared payload types

### `worker/src/queues/connection.ts`
- **Purpose:** Shared Redis connection for BullMQ
- **Reference:** PAD Section 5.2
- **Checklist:**
  - [ ] `maxRetriesPerRequest: null`
  - [ ] `enableReadyCheck: false`
  - [ ] `lazyConnect: true`
  - [ ] Reuse `env.REDIS_URL`

### `worker/src/workers/ingest.worker.ts`
- **Purpose:** Ingestion BullMQ Worker instance with concurrency config
- **Reference:** PAD Section 5.5
- **Checklist:**
  - [ ] Concurrency from `env.WORKER_CONCURRENCY_INGEST` (default 50)
  - [ ] Rate limiter: max 100 per 10s (protect source sites)
  - [ ] Calls `runIngestionJob` from `jobs/ingest`
  - [ ] Event listeners: `completed`, `failed` log to structured logger
  - [ ] Error context includes source ID

### `worker/src/workers/summarize.worker.ts`
- **Purpose:** Summarization Worker with low concurrency for AI API rate limits
- **Checklist:**
  - [ ] Concurrency from `env.WORKER_CONCURRENCY_SUMMARIZE` (default 5)
  - [ ] Rate limiter: max 10/minute (AI API compliance)
  - [ ] Calls `runSummarizationJob`
  - [ ] Tracks token usage per job

### `worker/src/workers/score.worker.ts`
- **Purpose:** Importance scoring Worker
- **Checklist:**
  - [ ] Moderate concurrency (10)
  - [ ] Fast jobs (pure CPU + DB write)
  - [ ] Calls `runScoringJob`

### `worker/src/workers/feed-slice.worker.ts`
- **Purpose:** Redis feed slice refresh Worker
- **Checklist:**
  - [ ] Low concurrency (5) — typically very fast jobs
  - [ ] Calls `runFeedSliceRefreshJob`
  - [ ] Runs as parent in BullMQ Flow (waits for child score jobs)

### `worker/src/schedulers/index.ts`
- **Purpose:** Bootstrap `upsertJobScheduler` for each active source on startup
- **Reference:** PAD Section 5.3
- **Checklist:**
  - [ ] Query DB for `isActive: true` sources
  - [ ] One `upsertJobScheduler` per source (idempotent across restarts)
  - [ ] Scheduler ID convention: `ingest-source-{uuid}`
  - [ ] Repeat interval from `source.pollIntervalMinutes`
  - [ ] Job priority from `source.priority`
  - [ ] Log count of schedulers bootstrapped

### `worker/src/lib/logger/index.ts`
- **Purpose:** Worker-specific structured logger (same schema as web)
- **Checklist:**
  - [ ] Outputs structured JSON to stdout
  - [ ] `service: 'worker'` field on every log
  - [ ] Correlation ID = BullMQ job ID

---

# Phase 7: Ingestion Pipeline

## Description

The full ingestion job pipeline: fetch RSS/Atom/JSON feeds, parse to unified format, normalize via domain layer, deduplicate, upsert to PostgreSQL, update SourceHealthSnapshot, and trigger downstream scoring + feed slice refresh via BullMQ Flow.

**Dependencies:** Phase 6 (worker core), Phase 3 (domain), Phase 2 (DB)
**Exit criteria:** Worker successfully ingests articles from a real RSS feed end-to-end; articles appear in DB with correct dedup; SourceHealthSnapshot updated.

## Files to Create

### `worker/src/jobs/ingest/index.ts`
- **Purpose:** Top-level ingestion job orchestrator (entry point called by Worker)
- **Exports:** `runIngestionJob(job)`
- **Reference:** PAD Section 8.1
- **Checklist:**
  - [ ] Creates `ingestion_jobs` DB record on start
  - [ ] Pipeline: fetch → parse → normalize → deduplicate → persist
  - [ ] Updates job record with results (counts + duration)
  - [ ] Updates SourceHealthSnapshot
  - [ ] On error: marks job failed, updates health, re-throws for BullMQ retry
  - [ ] Returns `{ articlesNew, articlesUpdated }` for downstream Flow consumers

### `worker/src/jobs/ingest/fetch.ts`
- **Purpose:** HTTP fetch wrapper with timeout, retry, and user agent
- **Exports:** `fetchFeed(url, options)`
- **Checklist:**
  - [ ] 10-second timeout
  - [ ] Custom User-Agent header
  - [ ] Accept gzip/deflate
  - [ ] Throw typed errors: `NetworkError`, `TimeoutError`, `HttpStatusError`
  - [ ] Return raw response body as string

### `worker/src/jobs/ingest/parse.ts`
- **Purpose:** Parse raw feed text into unified `RawFeedItem[]` based on feed type
- **Exports:** `parseFeed(rawText, feedType)`
- **Checklist:**
  - [ ] Use `rss-parser` library for RSS/Atom
  - [ ] Custom JSON adapter for `json_api` feed type
  - [ ] Extract: title, link, pubDate, excerpt/description, image, author
  - [ ] Handle malformed feeds with descriptive errors
  - [ ] Return normalized intermediate format

### `worker/src/jobs/ingest/persist.ts`
- **Purpose:** Upsert articles to DB + trigger downstream Flow
- **Exports:** `upsertArticles(candidates)`, `persistAndEnqueuePipeline(newArticles, categoryId, subcategoryId)`
- **Reference:** PAD Section 5.4, 5.6
- **Checklist:**
  - [ ] `INSERT ... ON CONFLICT DO UPDATE` on `canonical_url` ← idempotency
  - [ ] Only update `title`, `excerpt`, `publishedAt` on conflict (preserve `importanceScore`, `hasSummary`)
  - [ ] Returns inserted/updated article IDs
  - [ ] `FlowProducer.add()` for parent (feed slice refresh) with children (score jobs)
  - [ ] Skip empty arrays

### `worker/src/jobs/ingest/health.ts`
- **Purpose:** SourceHealthSnapshot update logic
- **Exports:** `updateSourceHealth(sourceId, result)`
- **Checklist:**
  - [ ] On success: reset `consecutiveFailures` to 0, set `lastSuccessAt`
  - [ ] On failure: increment `consecutiveFailures`, set `lastFailureAt`
  - [ ] Update rolling average `avgDurationMs`
  - [ ] Update `articlesLast24h` (subquery to count)
  - [ ] Single upsert (one snapshot row per source, or append-only — choose one and document)

---

# Phase 8: Scoring & Feed Slice Pipeline

## Description

Importance scoring job handler + feed slice refresh job handler. These run as children/parent in the BullMQ Flow triggered by ingestion.

**Dependencies:** Phase 6 (worker), Phase 3 (domain ranking)
**Exit criteria:** New articles receive importance scores within 30 seconds of ingestion; feed slices in Redis updated atomically after batch of score jobs completes.

## Files to Create

### `worker/src/jobs/score/index.ts`
- **Purpose:** Importance scoring job — runs per article
- **Exports:** `runScoringJob(job)`
- **Checklist:**
  - [ ] Fetch article + source + cluster size from DB
  - [ ] Call `computeImportanceScore()` from domain
  - [ ] Update `articles.importanceScore` (single UPDATE)
  - [ ] Return new score for parent flow data
  - [ ] Idempotent (safe to re-run; produces same score)

### `worker/src/jobs/feed-slice/index.ts`
- **Purpose:** Refresh Redis feed slice for a category — runs as parent after all score children complete
- **Exports:** `runFeedSliceRefreshJob(job)`
- **Checklist:**
  - [ ] Query DB for top 40 articles per `(category, subcategory, sort)` combination
  - [ ] Write to Redis via `setFeedSlice()`
  - [ ] Three slices: `latest`, `impact`, `summary_ready`
  - [ ] Call `revalidateTag()` via Next.js revalidation API (HTTP POST to web app)
  - [ ] Or use Next.js `revalidateTag()` directly if worker shares Next.js runtime

### `worker/src/lib/revalidation/index.ts`
- **Purpose:** Trigger Next.js cache revalidation from worker (HTTP call to web app's revalidation endpoint)
- **Exports:** `triggerRevalidation(tags)`
- **Checklist:**
  - [ ] POST to internal endpoint `/api/internal/revalidate` (protected by shared secret)
  - [ ] Send tag array
  - [ ] Don't fail worker job on revalidation failure (log warning)

### `web/src/app/api/internal/revalidate/route.ts`
- **Purpose:** Internal endpoint for worker to trigger cache revalidation
- **Checklist:**
  - [ ] Validate shared secret header (`x-internal-secret`)
  - [ ] Call `revalidateTag()` for each tag in request body
  - [ ] Return 200 with revalidated tags
  - [ ] NOT exposed to public internet (block via reverse proxy if possible)

### `web/src/lib/cache/tags.ts`
- **Purpose:** Cache tag taxonomy (single source of truth)
- **Reference:** PAD Section 11.2
- **Exports:** `CACHE_TAGS` constants
- **Checklist:**
  - [ ] `feed`, `category(id)`, `subcategory(id)`, `article(id)`, `categories`
  - [ ] All tag generators are pure functions
  - [ ] Document naming convention

---

# Phase 9: Summarization Pipeline

## Description

User-triggered (and admin-triggered) AI summarization job: fetch article content, build prompt, call AI API, parse + validate response, persist summary with citations and provenance.

**Dependencies:** Phase 4 (AI client), Phase 3 (prompt + parse), Phase 6 (worker)
**Exit criteria:** Triggering summarization via `/api/summarize/[id]` produces a stored summary with source citations within 30 seconds.

## Files to Create

### `worker/src/jobs/summarize/index.ts`
- **Purpose:** Summarization job orchestrator
- **Exports:** `runSummarizationJob(job)`
- **Checklist:**
  - [ ] Fetch article from DB
  - [ ] Skip if `summaryStatus === 'ok'` and not forcing regen (idempotency)
  - [ ] Set `summaryStatus = 'pending'` at start
  - [ ] Extract content (call `extract.ts`)
  - [ ] Build prompt via `domain/summaries/prompt`
  - [ ] Call AI client
  - [ ] Parse + validate response via `domain/summaries/parse`
  - [ ] Persist summary (call `store.ts`)
  - [ ] Update article: `hasSummary = true`, `summaryStatus = 'ok'`
  - [ ] On failure: set `summaryStatus = 'failed'`, log error context
  - [ ] Trigger cache invalidation for the article

### `worker/src/jobs/summarize/extract.ts`
- **Purpose:** Article content extraction — use existing excerpt or fetch full text safely
- **Exports:** `extractContent(article, source)`
- **Checklist:**
  - [ ] If `contentAvailability === 'full_text'` → use stored content
  - [ ] If `contentAvailability === 'excerpt'` → attempt safe extraction
  - [ ] Respect robots.txt before fetching
  - [ ] Use a readability library (e.g., `@mozilla/readability`) for clean extraction
  - [ ] Time-limited fetch (10s)
  - [ ] Returns `{ content, basedOn: ContentAvailability }`
  - [ ] Falls back to excerpt if extraction fails

### `worker/src/jobs/summarize/store.ts`
- **Purpose:** Persist summary record with all provenance metadata
- **Exports:** `storeSummary(articleId, response, model, tokens, basedOn)`
- **Checklist:**
  - [ ] Upsert on `articleId` (one summary per article)
  - [ ] Store `summaryText`, `keyPoints`, `sourcesCited` (JSONB)
  - [ ] Store `model`, `promptVersion`, `tokensUsed`, `basedOnContent`
  - [ ] Set `generatedAt = NOW()`
  - [ ] Update articles table flags

---

# Phase 10: Design System & UI Primitives 🟢 PARALLEL

## Description

Tailwind v4 setup with the **"Editorial Dispatch"** design tokens, custom fonts (Newsreader, Space Grotesk, JetBrains Mono), Shadcn UI installation and Avant-Garde wrapping, and shared components.

This phase is **independent of the backend** — a frontend engineer can start here from day one of Phase 0 completion.

**Dependencies:** Phase 0 only
**Parallelizable with:** All backend phases

**Exit criteria:** Storybook (or equivalent) shows all design system primitives; Tailwind tokens resolve; fonts load with no FOUT/FOIT; Shadcn components have Editorial Dispatch styling applied.

## Files to Create

### `web/src/app/globals.css`
- **Purpose:** Tailwind v4 entry + design tokens via CSS variables
- **Reference:** PRD Section 6.1
- **Checklist:**
  - [ ] `@import "tailwindcss"`
  - [ ] `@theme` block with design tokens:
    - [ ] Color tokens: `--color-ink-{900,600,300}`, `--color-paper-{50,100}`, `--color-dispatch-{amber,sage,slate,clay,violet}`
    - [ ] Font tokens: `--font-serif` (Newsreader), `--font-sans` (Space Grotesk), `--font-mono` (JetBrains Mono)
    - [ ] Spacing scale honoring editorial rhythm
  - [ ] Dark mode tokens (Phase 2 of frontend; can stub for V1)
  - [ ] `prefers-reduced-motion` overrides for transitions

### `web/src/app/layout.tsx` (Root Layout)
- **Purpose:** Root layout with fonts, metadata, providers
- **Checklist:**
  - [ ] Load fonts via `next/font/google` (Newsreader, Space Grotesk, JetBrains Mono)
  - [ ] Apply font CSS variables to `<html>`
  - [ ] Metadata: title, description, OpenGraph
  - [ ] Better Auth provider (if needed for client components)
  - [ ] Toast provider
  - [ ] No `"use client"` on the file itself

### `web/src/shared/components/ui/button.tsx` (Shadcn wrapped)
- **Purpose:** Shadcn Button wrapped with Editorial Dispatch variants
- **Checklist:**
  - [ ] Install via `npx shadcn@latest add button`
  - [ ] Add custom variants: `dispatch`, `editorial`, `ghost-ink`
  - [ ] Override default styles to use design tokens (no purple, no rounded-full)
  - [ ] Loading state with subtle spinner
  - [ ] Disabled state preserves visual weight

### `web/src/shared/components/ui/card.tsx` (Shadcn wrapped)
- **Purpose:** Shadcn Card wrapped — for article cards
- **Checklist:**
  - [ ] Sharp corners (no `rounded-xl`)
  - [ ] Ink-weight borders
  - [ ] Hover state via subtle background shift

### `web/src/shared/components/ui/badge.tsx`
- **Purpose:** Category/status badges with Dispatch colors
- **Checklist:**
  - [ ] Variants mapped to category accent colors
  - [ ] Compact, monospace text option (for metadata)

### `web/src/shared/components/ui/{dialog,dropdown-menu,select,tabs,toast,tooltip,sheet,skeleton}.tsx`
- **Purpose:** Shadcn primitives wrapped for design system consistency
- **Checklist (per component):**
  - [ ] Install via Shadcn CLI
  - [ ] Apply Editorial Dispatch token overrides
  - [ ] Verify keyboard navigation works
  - [ ] Verify focus rings are visible (WCAG AA contrast)

### `web/src/shared/components/DispatchBadge.tsx`
- **Purpose:** Category-tinted badge component (custom, not Shadcn)
- **Props:** `category`, `subcategory?`, `size?`
- **Checklist:**
  - [ ] Maps `categorySlug` → Dispatch color
  - [ ] Tight monospace label
  - [ ] Accessible (proper contrast on all backgrounds)

### `web/src/shared/components/TimeAgo.tsx`
- **Purpose:** Relative timestamp component ("2 hours ago")
- **Props:** `date`, `showAbsolute?`
- **Checklist:**
  - [ ] Server Component (no `"use client"`)
  - [ ] Uses `Intl.RelativeTimeFormat`
  - [ ] Tooltip on hover shows absolute timestamp
  - [ ] Monospace font for the timestamp string

### `web/src/shared/components/SourceAttribution.tsx`
- **Purpose:** Source name + favicon component
- **Props:** `sourceName`, `sourceUrl`
- **Checklist:**
  - [ ] Optional favicon (lazy-loaded)
  - [ ] Source name in small caps tracking
  - [ ] Opens source URL in new tab with `rel="noopener noreferrer"`

### `web/src/shared/components/PageSkeleton.tsx`
- **Purpose:** Full-page loading skeleton for Suspense fallbacks
- **Checklist:**
  - [ ] Matches actual page layout dimensions (prevent CLS)
  - [ ] Subtle shimmer animation
  - [ ] Respects `prefers-reduced-motion`

### `web/src/shared/components/EmptyState.tsx`
- **Purpose:** Editorial empty state component — not generic "No results"
- **Props:** `title`, `description`, `action?`
- **Checklist:**
  - [ ] Editorial copy (e.g., "The wire is quiet on this topic")
  - [ ] Optional recovery action button
  - [ ] Center-aligned, generous whitespace

### `web/src/shared/hooks/useDebounce.ts`
- **Purpose:** 300ms debounce hook for search input
- **Exports:** `useDebounce(value, delay)`
- **Checklist:**
  - [ ] Cleanup on unmount
  - [ ] Works with strings and numbers
  - [ ] No re-renders within delay window

### `web/src/shared/hooks/useViewTransition.ts`
- **Purpose:** View Transitions API wrapper for topic navigation
- **Exports:** `useTopicTransition()`
- **Reference:** PAD Section 4.6
- **Checklist:**
  - [ ] Feature-detects `document.startViewTransition`
  - [ ] Respects `prefers-reduced-motion`
  - [ ] Falls back to instant navigation if unsupported

### `web/tailwind.config.ts`
- **Purpose:** Minimal Tailwind config (most config is in `@theme` block)
- **Checklist:**
  - [ ] Content paths covering all relevant directories
  - [ ] Plugin registration if needed (typography plugin for article body)

### `components.json` (Shadcn config)
- **Purpose:** Shadcn UI configuration
- **Checklist:**
  - [ ] Style: "new-york" or custom
  - [ ] Path aliases match `tsconfig`
  - [ ] CSS variables enabled

---

# Phase 11: Public Feed Experience

## Description

The default topic feed and category/subcategory pages — the heart of the app. Implements PPR with Cache Components for the shell and dynamic streaming for article lists. Uses View Transitions for topic navigation.

**Dependencies:** Phase 10 (design system), Phase 2 (DB schema for queries)
**Exit criteria:** Topic feeds render at correct Core Web Vitals targets (FCP ≤600ms, LCP ≤1.5s); switching topics uses View Transitions; cache hits visible in dev tools.

## Files to Create

### `web/src/app/(public)/layout.tsx`
- **Purpose:** Public layout — header, topic ribbon, footer
- **Checklist:**
  - [ ] Server Component (default)
  - [ ] Renders `<Header>`, `<TopicRibbon>`, `<main>`, `<Footer>`
  - [ ] Topic ribbon is sticky
  - [ ] Suspense around topic ribbon (fetches categories)

### `web/src/app/(public)/page.tsx`
- **Purpose:** Root page — defaults to Top Stories feed
- **Checklist:**
  - [ ] Redirects or renders `/topics/top-stories`
  - [ ] If rendering directly: PPR shell + dynamic feed

### `web/src/app/(public)/topics/[category]/page.tsx`
- **Purpose:** Category feed page (PPR + Cache Component)
- **Reference:** PAD Section 4.3
- **Checklist:**
  - [ ] `CategoryShell` RSC with `"use cache"` and `cacheLife({ revalidate: 120 })`
  - [ ] `LiveFeed` RSC in `<Suspense fallback={<FeedSkeleton />}>`
  - [ ] generateMetadata for SEO
  - [ ] generateStaticParams for known categories
  - [ ] 404 if category slug invalid

### `web/src/app/(public)/topics/[category]/[subcategory]/page.tsx`
- **Purpose:** Subcategory feed page
- **Checklist:**
  - [ ] Same structure as category page
  - [ ] Additional subcategory filter on feed query
  - [ ] generateStaticParams covers known (category, subcategory) pairs

### `web/src/app/(public)/loading.tsx`
- **Purpose:** Top-level loading UI for public pages
- **Checklist:**
  - [ ] Renders `<PageSkeleton>`

### `web/src/app/(public)/error.tsx`
- **Purpose:** Top-level error boundary for public pages
- **Checklist:**
  - [ ] `"use client"` (error boundaries are client)
  - [ ] Editorial error copy
  - [ ] Reset button
  - [ ] Log to client error tracker

### `web/src/features/feed/components/FeedContainer.tsx`
- **Purpose:** Orchestrates feed layout (lead + grid)
- **Props:** `categoryId`, `subcategoryId?`, `sort`
- **Checklist:**
  - [ ] Server Component
  - [ ] Fetches via `getFeedArticles()` query
  - [ ] First article → LeadArticle, rest → FeedGrid
  - [ ] Handles empty state via `<EmptyState>`

### `web/src/features/feed/components/LeadArticle.tsx`
- **Purpose:** Hero article card — large, editorial
- **Props:** `article`
- **Checklist:**
  - [ ] Server Component
  - [ ] Serif headline (Newsreader, large)
  - [ ] Generous metadata block
  - [ ] Category-tinted accent
  - [ ] Optional image with art direction

### `web/src/features/feed/components/ArticleCard.tsx`
- **Purpose:** Standard article card in grid
- **Props:** `article`, `variant?`
- **Checklist:**
  - [ ] Server Component
  - [ ] Title (serif), excerpt (sans), metadata (mono)
  - [ ] `<DispatchBadge>` for category
  - [ ] `<TimeAgo>` for timestamp
  - [ ] `<SourceAttribution>` for source
  - [ ] Optional "Summary available" indicator
  - [ ] Hover state: subtle background shift, NOT scale transform

### `web/src/features/feed/components/FeedGrid.tsx`
- **Purpose:** Multi-column grid of ArticleCards
- **Props:** `articles`
- **Checklist:**
  - [ ] CSS Grid (NOT Bootstrap-style cols)
  - [ ] Responsive: 1 col mobile, 2 col tablet, 3 col desktop
  - [ ] Maintains visual rhythm — no orphan rows

### `web/src/features/feed/components/FeedControls.tsx`
- **Purpose:** Sort + filter controls (interactive)
- **Props:** `currentSort`, `availableSorts`
- **Checklist:**
  - [ ] `"use client"`
  - [ ] Shadcn Select for sort
  - [ ] Updates URL search params (no page reload)
  - [ ] Disabled state during navigation

### `web/src/features/feed/components/FeedSkeleton.tsx`
- **Purpose:** Loading skeleton matching FeedGrid dimensions
- **Checklist:**
  - [ ] Matches grid exactly (prevent CLS)
  - [ ] 6 skeleton cards visible

### `web/src/features/feed/components/EmptyFeed.tsx`
- **Purpose:** Empty state when no articles match
- **Checklist:**
  - [ ] Editorial copy
  - [ ] "Browse other topics" action

### `web/src/features/feed/queries.ts`
- **Purpose:** Drizzle queries for feed data
- **Exports:** `getFeedArticles()`, `getCategoryCounts()`
- **Checklist:**
  - [ ] `getFeedArticles({ categoryId, subcategoryId?, sort, limit })`
  - [ ] Check Redis feed slice first
  - [ ] Fallback to DB query with appropriate index
  - [ ] Return articles + joined category/source data
  - [ ] Pure data fetching — no auth (called from public RSCs)

### `web/src/features/topics/components/TopicRibbon.tsx`
- **Purpose:** Sticky horizontal topic navigation
- **Checklist:**
  - [ ] `"use client"` (active state, hover)
  - [ ] Horizontal scroll on mobile
  - [ ] Active topic highlighted
  - [ ] Uses `useTopicTransition()` for navigation
  - [ ] Keyboard nav (arrow keys)
  - [ ] ARIA `role="navigation"`, `aria-label="Topics"`

### `web/src/features/topics/components/TopicPanel.tsx`
- **Purpose:** Subcategory grid panel
- **Checklist:**
  - [ ] `"use client"` (open/close state)
  - [ ] Shows subcategories with article counts
  - [ ] Smooth open animation (respects reduced motion)

### `web/src/features/topics/queries.ts`
- **Purpose:** Category + subcategory queries with article counts
- **Exports:** `getAllCategories()`, `getSubcategoriesWithCounts(categoryId)`
- **Checklist:**
  - [ ] Single query with JOIN + COUNT
  - [ ] Cacheable (categories rarely change)

---

# Phase 12: Article Detail & AI Summary UI

## Description

Article detail page with the **source-cited AI summary disclosure UI** — the most trust-sensitive part of the product. Uses React 19.2 `Activity` for background summary rendering.

**Dependencies:** Phase 10, Phase 14 (for summarize endpoint)
**Exit criteria:** Article detail renders; summarize button enqueues job; status poller updates without layout shift; full disclosure UI visible on every summary.

## Files to Create

### `web/src/app/(public)/article/[id]/page.tsx`
- **Purpose:** Article detail page (fully dynamic — no cache)
- **Checklist:**
  - [ ] Server Component fetching article + summary
  - [ ] 404 if article not found or archived
  - [ ] generateMetadata for OpenGraph + Twitter cards
  - [ ] No `"use cache"` (summary status must be fresh)
  - [ ] Suspense boundary around summary panel

### `web/src/features/article/components/ArticleDetail.tsx`
- **Purpose:** Main article detail layout
- **Props:** `article`, `summary?`
- **Checklist:**
  - [ ] Server Component
  - [ ] Editorial typography hierarchy (serif title, sans body)
  - [ ] Renders ArticleMetadata, SummaryPanel, "Open original source" CTA
  - [ ] Generous reading width (~65 chars per line)

### `web/src/features/article/components/ArticleMetadata.tsx`
- **Purpose:** Source, time, category badges block
- **Props:** `article`
- **Checklist:**
  - [ ] Source attribution, time ago, category, subcategory
  - [ ] Monospace timestamp
  - [ ] Compact, scannable layout

### `web/src/features/article/components/SummaryPanel.tsx`
- **Purpose:** The AI summary disclosure UI — trust-critical component
- **Props:** `summary`
- **Reference:** PRD Section 6.3 (Source-Cited Disclosure Model)
- **Checklist:**
  - [ ] `<DisclosureBadge>` at top — "AI-generated summary"
  - [ ] Model name visible (e.g., "Generated by Claude 3.5 Haiku")
  - [ ] Generation timestamp
  - [ ] Key points list (bulleted)
  - [ ] Summary text in distinct typographic block (not body style)
  - [ ] `<CitationList>` showing every source used
  - [ ] "Read original source" CTA — always primary action
  - [ ] "Report inaccuracy" link (links to flag action)
  - [ ] Coverage indicator if `basedOnContent !== 'full_text'`

### `web/src/features/article/components/CitationList.tsx`
- **Purpose:** Source citations list — links to original sources
- **Props:** `citations`
- **Checklist:**
  - [ ] Each citation shows: source title, source URL (clickable), relevance description
  - [ ] Numbered list with distinctive markers
  - [ ] External link icon
  - [ ] `rel="noopener noreferrer"` on all links

### `web/src/features/article/components/DisclosureBadge.tsx`
- **Purpose:** Prominent "AI-generated" badge
- **Checklist:**
  - [ ] Always visible at top of summary
  - [ ] Distinctive color (Dispatch amber)
  - [ ] Includes "What is this?" tooltip explaining AI summarization
  - [ ] ARIA label: "AI-generated summary, verify with original source"

### `web/src/features/article/components/SummarizeButton.tsx`
- **Purpose:** Trigger summarization for articles without one
- **Props:** `articleId`, `disabled?`
- **Checklist:**
  - [ ] `"use client"`
  - [ ] Calls `POST /api/summarize/[id]`
  - [ ] Shows loading spinner on click
  - [ ] Disabled during request
  - [ ] Error toast on failure
  - [ ] On success: triggers SummaryStatusPoller mount

### `web/src/features/article/components/SummaryStatusPoller.tsx`
- **Purpose:** Polls summarization status; uses React 19.2 `<Activity>` for no-shift rendering
- **Props:** `articleId`, `initialStatus`
- **Reference:** PAD Section 4.6
- **Checklist:**
  - [ ] `"use client"`
  - [ ] Polls `GET /api/summarize/[id]/status` every 2s
  - [ ] Stops polling on terminal status (`ok`, `failed`, `disabled`)
  - [ ] Wraps `<SummaryPanel>` in `<Activity mode={...}>`
  - [ ] `mode='hidden'` while pending, `mode='visible'` when complete
  - [ ] Cleanup polling on unmount

### `web/src/features/article/queries.ts`
- **Purpose:** Article + summary fetch queries
- **Exports:** `getArticleById(id)`, `getSummaryByArticleId(id)`
- **Checklist:**
  - [ ] Joins article + source + category
  - [ ] Returns null on not found (caller handles 404)
  - [ ] Separate summary query (parallelizable in RSC)

### `web/src/features/article/actions.ts`
- **Purpose:** Server Actions for article-related mutations
- **Exports:** `flagSummaryAction(summaryId, reason)`
- **Checklist:**
  - [ ] `requirePermission('summary:flag')` check
  - [ ] Sets `summaryStatus = 'needs_review'`
  - [ ] Revalidates article cache tag

---

# Phase 13: Search Experience

## Description

Search input, results, filters, and the FTS query implementation. Uses PostgreSQL `websearch_to_tsquery` + `ts_rank_cd` with `pg_trgm` autocomplete fallback.

**Dependencies:** Phase 10, Phase 2 (FTS indexes)
**Exit criteria:** Search returns ranked results in <300ms p95; autocomplete appears on 2+ characters; empty state shows suggestions.

## Files to Create

### `web/src/app/(public)/search/page.tsx`
- **Purpose:** Search results page with streaming results
- **Checklist:**
  - [ ] Search input always rendered (header)
  - [ ] Results in Suspense boundary
  - [ ] Query from URL search params (shareable URLs)
  - [ ] generateMetadata reflects search query

### `web/src/features/search/components/SearchInput.tsx`
- **Purpose:** Debounced search input with autocomplete
- **Checklist:**
  - [ ] `"use client"`
  - [ ] Uses `useDebounce` hook (300ms)
  - [ ] Autocomplete dropdown via Shadcn Command/Combobox
  - [ ] Keyboard navigation (arrow keys, Enter)
  - [ ] Updates URL on submit

### `web/src/features/search/components/SearchResults.tsx`
- **Purpose:** Result list with relevance scores
- **Props:** `query`, `filters`
- **Checklist:**
  - [ ] Server Component
  - [ ] Calls `searchArticles()` query
  - [ ] Renders results as ArticleCard variants
  - [ ] Shows result count
  - [ ] Cursor-based pagination
  - [ ] Empty state with suggested queries

### `web/src/features/search/components/SearchFilters.tsx`
- **Purpose:** Filter controls for search
- **Checklist:**
  - [ ] `"use client"`
  - [ ] Category, subcategory, date range, summary status
  - [ ] Updates URL params
  - [ ] Collapsible on mobile

### `web/src/features/search/components/SearchEmpty.tsx`
- **Purpose:** Empty state with editorial copy and suggestions
- **Checklist:**
  - [ ] No "No results found" — instead "The wire returned no matches for..."
  - [ ] Suggested broader queries
  - [ ] Recently popular topics

### `web/src/features/search/queries.ts`
- **Purpose:** FTS query implementation
- **Exports:** `searchArticles(params)`, `autocompleteArticles(partial)`
- **Reference:** PAD Section 10.1
- **Checklist:**
  - [ ] Uses `websearch_to_tsquery` (gracefully handles malformed input)
  - [ ] `ts_rank_cd` for proximity-aware ranking
  - [ ] Cursor-based pagination (timestamp cursor)
  - [ ] Autocomplete uses `pg_trgm` similarity
  - [ ] All filters as `WHERE` conditions
  - [ ] Recent partial index used via `published_at > NOW() - INTERVAL '30 days'` hint

---

# Phase 14: Public API Route Handlers

## Description

Route Handlers for external/public API endpoints. Internal mutations use Server Actions (covered in feature phases). This phase exists separately because these endpoints have distinct HTTP semantics and caching considerations.

**Dependencies:** Phase 5 (auth), Phase 4 (queue), Phase 2 (DB)
**Exit criteria:** Every endpoint returns correct status codes, correct error format, and respects rate limits.

## Files to Create

### `web/src/app/api/articles/route.ts`
- **Purpose:** `GET /api/articles` — feed endpoint with filters
- **Query params:** `category`, `subcategory`, `sort`, `limit`, `cursor`, `search`
- **Checklist:**
  - [ ] Zod validation of query params
  - [ ] Calls `getFeedArticles()` query
  - [ ] Returns cursor for pagination
  - [ ] Uniform error format `{ code, message, details? }`
  - [ ] No HTTP caching (Redis feed slices handle it)

### `web/src/app/api/articles/[id]/route.ts`
- **Purpose:** `GET /api/articles/[id]` — single article with summary
- **Checklist:**
  - [ ] Returns 404 for missing or archived articles
  - [ ] Includes summary if available
  - [ ] No auth required

### `web/src/app/api/categories/route.ts`
- **Purpose:** `GET /api/categories` — categories + counts
- **Checklist:**
  - [ ] Uses `unstable_cache` with 300s revalidate
  - [ ] Returns nested structure: categories with subcategories
  - [ ] Includes article counts per subcategory

### `web/src/app/api/summarize/[id]/route.ts`
- **Purpose:** `POST /api/summarize/[id]` — enqueue summarization
- **Checklist:**
  - [ ] Rate limit: 5/min anonymous, 20/min authenticated
  - [ ] Validates article exists
  - [ ] If summary already exists with `status: 'ok'`: return existing summary
  - [ ] Enqueue to `summarizeQueue` with `high` priority
  - [ ] Set `summaryStatus = 'pending'` immediately
  - [ ] Returns `{ jobId, status: 'pending' }`

### `web/src/app/api/summarize/[id]/status/route.ts`
- **Purpose:** `GET /api/summarize/[id]/status` — poll endpoint
- **Checklist:**
  - [ ] Returns current `summaryStatus` from DB
  - [ ] If status is `ok`: include full summary
  - [ ] Short cache headers (5s)

### `web/src/app/api/source-health/route.ts`
- **Purpose:** `GET /api/source-health` — admin-gated source health snapshots
- **Checklist:**
  - [ ] `requirePermission('monitoring:read')`
  - [ ] Returns latest snapshot per source
  - [ ] No caching

### `web/src/lib/api/errors.ts`
- **Purpose:** Standard API error format + helpers
- **Exports:** `apiError(code, message, status, details?)`, error code constants
- **Checklist:**
  - [ ] Consistent `{ code, message, details? }` format
  - [ ] Helpers for common cases: `notFound()`, `forbidden()`, `badRequest()`, `internalError()`
  - [ ] Log errors before returning (with request ID)

### `web/src/lib/api/rate-limit.ts`
- **Purpose:** Rate limiting middleware for Route Handlers
- **Exports:** `checkRateLimit(key, limit, windowSeconds)`
- **Checklist:**
  - [ ] Redis-backed (sliding window or token bucket)
  - [ ] Returns `{ allowed, remaining, resetAt }`
  - [ ] Caller throws `apiError('RATE_LIMITED', ...)` on deny

---

# Phase 15: Admin Workspace

## Description

Admin UI for source management, BullMQ job monitoring (Bull Board embedded), and summary audit. All routes protected by Better Auth + DAL.

**Dependencies:** Phase 5 (auth), Phase 11 (design system + feed patterns), Phase 14 (API patterns)
**Exit criteria:** Admin can sign in, create/edit/disable sources, view job queue health, flag summaries — all with proper authorization at every layer.

## Files to Create

### `web/src/app/(admin)/layout.tsx`
- **Purpose:** Admin layout with auth guard (Server Component)
- **Checklist:**
  - [ ] `verifySession()` → redirect if null
  - [ ] Check role === 'admin' → redirect to /403 if not
  - [ ] Admin nav sidebar
  - [ ] Distinct visual treatment (darker, more utilitarian than public)

### `web/src/app/(admin)/page.tsx`
- **Purpose:** Admin dashboard overview
- **Checklist:**
  - [ ] Top metrics cards: ingestion last 24h, summaries last 24h, error rate, DLQ count
  - [ ] Recent ingestion jobs table
  - [ ] Quick actions: trigger ingest, view jobs

### `web/src/app/(admin)/sources/page.tsx`
- **Purpose:** Source list with management actions
- **Checklist:**
  - [ ] Table with: name, category, priority, last success, health status
  - [ ] Filter by category, active status
  - [ ] "New source" CTA
  - [ ] Toggle active/inactive inline

### `web/src/app/(admin)/sources/new/page.tsx`
- **Purpose:** Create source form
- **Checklist:**
  - [ ] `<SourceForm>` component
  - [ ] Validate URL, test feed connectivity before save

### `web/src/app/(admin)/sources/[id]/page.tsx`
- **Purpose:** Edit source form + recent ingestion history
- **Checklist:**
  - [ ] Form pre-populated
  - [ ] Recent ingestion job history table
  - [ ] "Trigger ingest now" button

### `web/src/app/(admin)/jobs/page.tsx`
- **Purpose:** BullMQ job monitor — embeds Bull Board or custom dashboard
- **Checklist:**
  - [ ] Iframe to Bull Board (separate port) OR custom embedded view
  - [ ] Queue depths visible
  - [ ] Failed job inspection
  - [ ] Retry / remove failed jobs (admin actions)

### `web/src/app/(admin)/summaries/page.tsx`
- **Purpose:** Summary audit queue (`needs_review` summaries)
- **Checklist:**
  - [ ] Filter by status, category
  - [ ] Show original article side-by-side with summary
  - [ ] Actions: regenerate, disable, mark OK
  - [ ] Flag reason visible

### `web/src/features/admin/components/SourceForm.tsx`
- **Purpose:** Create/edit source form with validation
- **Props:** `source?` (undefined = create mode)
- **Checklist:**
  - [ ] `"use client"`
  - [ ] react-hook-form + Zod resolver
  - [ ] Fields: name, baseUrl, feedUrl, feedType, category, subcategory, priority, pollIntervalMinutes
  - [ ] "Test feed" button to verify connectivity
  - [ ] Submit via Server Action

### `web/src/features/admin/components/SourceTable.tsx`
- **Purpose:** Sortable source table
- **Checklist:**
  - [ ] Server Component for data; CC for sort interactions
  - [ ] Health indicator per source (green/amber/red)
  - [ ] Inline actions: toggle active, edit, delete

### `web/src/features/admin/components/JobMonitor.tsx`
- **Purpose:** Live job queue status panel
- **Checklist:**
  - [ ] `"use client"` with polling
  - [ ] Queue depths: waiting, active, completed, failed
  - [ ] Recent job list
  - [ ] Link to full Bull Board

### `web/src/features/admin/components/SummaryAuditTable.tsx`
- **Purpose:** Summary review queue table
- **Checklist:**
  - [ ] Pagination, filter by status
  - [ ] Click row → side-by-side comparison view
  - [ ] Bulk actions checkbox column

### `web/src/features/admin/components/MetricsDashboard.tsx`
- **Purpose:** Top-line metrics for dashboard home
- **Checklist:**
  - [ ] Server Component
  - [ ] Queries: ingestion counts, summary counts, error rates
  - [ ] Sparkline charts (use a lightweight lib like uplot or write custom SVG)

### `web/src/features/admin/queries.ts`
- **Purpose:** Admin-specific DB queries
- **Exports:** `getSources()`, `getSourceById()`, `getRecentJobs()`, `getSummariesForAudit()`, `getDashboardMetrics()`
- **Checklist:**
  - [ ] Every query starts with `await requirePermission(...)` check OR rely on caller's check
  - [ ] Document permission requirement in JSDoc

### `web/src/features/admin/actions.ts`
- **Purpose:** Server Actions for admin mutations
- **Exports:** `createSourceAction`, `updateSourceAction`, `toggleSourceAction`, `deleteSourceAction`, `flagSummaryAction`, `regenerateSummaryAction`, `disableSummaryAction`, `triggerIngestionAction`
- **Checklist:**
  - [ ] Every action calls `requirePermission()` first
  - [ ] Validate input with Zod
  - [ ] Mutations in transaction where appropriate
  - [ ] `revalidateTag()` after successful mutation
  - [ ] Return typed `{ success, error? }` shape

### `worker/src/monitoring/bull-board.ts`
- **Purpose:** Bull Board express server (separate process or embedded in worker)
- **Checklist:**
  - [ ] Mounts at `/admin/queues`
  - [ ] Basic auth via `env.BULL_BOARD_USERNAME` / `PASSWORD`
  - [ ] Registers all queues
  - [ ] Runs on `env.BULL_BOARD_PORT`

---

# Phase 16: Observability & Runbooks

## Description

Structured logging, metrics collection, health check endpoints, and the operational runbooks documented inline. Wires up the operational backbone of the system.

**Dependencies:** Phase 7, 9 (need pipeline to instrument)
**Exit criteria:** Logs are structured JSON; health endpoints return 200 when healthy; runbooks exist as Markdown docs.

## Files to Create

### `web/src/lib/logger/index.ts`
- **Purpose:** Structured logger for web app
- **Reference:** PAD Section 12.3
- **Exports:** `createLogger(service)`, `logger`
- **Checklist:**
  - [ ] Outputs JSON to stdout
  - [ ] Levels: debug, info, warn, error
  - [ ] Correlation ID propagation
  - [ ] Sensitive field masking (emails, tokens)
  - [ ] No `console.log` anywhere else in codebase (Biome rule)

### `web/src/lib/observability/correlation.ts`
- **Purpose:** Request correlation ID generation and propagation
- **Exports:** `withCorrelationId()`, `getCorrelationId()`
- **Checklist:**
  - [ ] Uses AsyncLocalStorage for request-scoped IDs
  - [ ] Falls back to generated UUID if not in request context

### `web/src/app/api/health/route.ts`
- **Purpose:** Liveness probe — is the web app running?
- **Checklist:**
  - [ ] Returns 200 with `{ status: 'ok', uptime, version }`
  - [ ] No DB access (fast)

### `web/src/app/api/ready/route.ts`
- **Purpose:** Readiness probe — can the web app serve requests?
- **Checklist:**
  - [ ] Checks DB connectivity (simple `SELECT 1`)
  - [ ] Checks Redis connectivity (`PING`)
  - [ ] Returns 503 if any check fails
  - [ ] Used by load balancer to remove instance from rotation

### `worker/src/health/index.ts`
- **Purpose:** Worker health check HTTP endpoint
- **Checklist:**
  - [ ] Express or minimal HTTP server on separate port
  - [ ] Reports queue connectivity + DB connectivity
  - [ ] Used by orchestrator (Kubernetes, ECS) for restart decisions

### `docs/runbooks/ingestion-source-failure.md`
- **Purpose:** Runbook for source ingestion failures
- **Reference:** PAD Section 12.5
- **Checklist:**
  - [ ] Symptoms, diagnosis steps, fix actions, escalation criteria
  - [ ] Commands runnable from terminal
  - [ ] Last-updated date

### `docs/runbooks/ai-summarization-incident.md`
- **Purpose:** Runbook for AI summarization failures
- **Reference:** PAD Section 12.6
- **Checklist:**
  - [ ] Categorize error types
  - [ ] Mitigation per error type
  - [ ] Recovery verification steps

### `docs/runbooks/database-incident.md`
- **Purpose:** Runbook for DB connection exhaustion, slow queries, disk full
- **Checklist:**
  - [ ] Connection pool diagnostics
  - [ ] Slow query identification (`pg_stat_statements`)
  - [ ] Emergency mitigation steps

### `docs/runbooks/redis-memory-pressure.md`
- **Purpose:** Runbook for Redis memory issues
- **Checklist:**
  - [ ] Identify memory hogs (`MEMORY USAGE` per key)
  - [ ] BullMQ cleanup commands
  - [ ] Feed slice eviction strategy
  - [ ] `MAXMEMORY` configuration

### `docs/runbooks/zero-downtime-migration.md`
- **Purpose:** Database schema migration procedure
- **Reference:** PAD Section 12.7
- **Checklist:**
  - [ ] Pre-migration checklist (backward compatibility)
  - [ ] Step-by-step deployment order
  - [ ] Rollback procedure

### `docs/runbooks/deployment.md`
- **Purpose:** Deployment checklist
- **Reference:** PAD Section 12.8
- **Checklist:**
  - [ ] Pre-deploy, deploy, post-deploy phases
  - [ ] Per-phase verification steps

---

# Phase 17: Testing Strategy & Implementation

## Description

Testing happens throughout — this phase formalizes the strategy and provides the testing infrastructure. **Critical:** TDD where applicable; domain layer aims for ~100% coverage; integration tests for critical paths.

**Dependencies:** Runs throughout — tests written alongside each feature
**Exit criteria:** All tests pass in CI; coverage targets met; smoke E2E test runs successfully against deployed staging environment.

## Files to Create

### `vitest.config.ts` (root)
- **Purpose:** Vitest configuration for unit + integration tests
- **Checklist:**
  - [ ] TypeScript support
  - [ ] Coverage thresholds: domain 95%, lib 80%, features 70%
  - [ ] Watch mode config
  - [ ] Global setup for test DB

### `vitest.setup.ts`
- **Purpose:** Global test setup (DB initialization, env stubs)
- **Checklist:**
  - [ ] Test DB connection via `TEST_DATABASE_URL`
  - [ ] Truncate tables between tests
  - [ ] Mock Redis with `ioredis-mock` for unit tests

### `web/src/test/factories.ts`
- **Purpose:** Test data factory pattern — `getMockArticle()`, `getMockSummary()`, etc.
- **Exports:** `getMockX(overrides?)` for every entity
- **Checklist:**
  - [ ] Sensible defaults for every field
  - [ ] Partial overrides via TypeScript `Partial<T>`
  - [ ] No DB writes (pure data objects)

### `web/src/domain/articles/normalize.test.ts`
- **Purpose:** Unit tests for URL normalization
- **Checklist:**
  - [ ] Test: strips utm params
  - [ ] Test: forces HTTPS
  - [ ] Test: handles malformed URLs
  - [ ] Test: idempotent (normalize(normalize(x)) === normalize(x))

### `web/src/domain/ranking/importance.test.ts`
- **Purpose:** Unit tests for importance scoring formula
- **Checklist:**
  - [ ] Test: recency dominates for breaking news
  - [ ] Test: tier 1 source > tier 3 with same recency
  - [ ] Test: cluster size affects score
  - [ ] Test: score bounded [0, 1]

### `web/src/domain/summaries/parse.test.ts`
- **Purpose:** Unit tests for AI response parsing
- **Checklist:**
  - [ ] Test: handles JSON in markdown code fences
  - [ ] Test: rejects malformed JSON
  - [ ] Test: rejects responses missing required fields
  - [ ] Test: validates citation URL format

### `worker/src/jobs/ingest/persist.test.ts`
- **Purpose:** Integration tests for ingestion persistence (uses test DB)
- **Checklist:**
  - [ ] Test: new article inserted
  - [ ] Test: duplicate canonical URL updates existing
  - [ ] Test: importance score NOT overwritten on update
  - [ ] Test: idempotent (running twice = same DB state)

### `web/src/features/feed/queries.test.ts`
- **Purpose:** Integration tests for feed queries
- **Checklist:**
  - [ ] Test: returns articles in correct sort order
  - [ ] Test: respects category filter
  - [ ] Test: Redis cache hit path
  - [ ] Test: Redis cache miss path

### `web/src/lib/dal/dal.test.ts`
- **Purpose:** Integration tests for DAL auth enforcement
- **Checklist:**
  - [ ] Test: verifySession returns null without cookie
  - [ ] Test: verifySession returns user with valid cookie
  - [ ] Test: requirePermission throws for missing permission
  - [ ] Test: requirePermission grants admin all reader permissions

### `e2e/smoke.spec.ts`
- **Purpose:** Playwright smoke E2E test — verifies critical paths post-deploy
- **Checklist:**
  - [ ] Test: home page loads
  - [ ] Test: topic navigation works
  - [ ] Test: article detail loads
  - [ ] Test: search returns results
  - [ ] Test: sign-in flow works
  - [ ] Runs against staging post-deploy

### `playwright.config.ts`
- **Purpose:** Playwright configuration for E2E tests
- **Checklist:**
  - [ ] Multi-browser (Chrome, Firefox, Safari)
  - [ ] Mobile viewport projects
  - [ ] Base URL from env
  - [ ] Retry on flake (1 retry in CI)

### `.github/workflows/test.yml`
- **Purpose:** CI workflow for tests
- **Checklist:**
  - [ ] Trigger on PR + main
  - [ ] Services: PostgreSQL 17, Redis 7
  - [ ] Steps: install, typecheck, lint, unit tests, integration tests
  - [ ] Coverage upload to Codecov

---

# Phase 18: Deployment & Production Readiness

## Description

Production Dockerfiles, CI/CD pipeline, infrastructure-as-code, secrets management, and production observability wiring. Final phase before launch.

**Dependencies:** All prior phases
**Exit criteria:** Production deployment succeeds; all health checks green; rolling deploy works without downtime; alerts wired to Slack/PagerDuty.

## Files to Create

### `Dockerfile.web` (production target)
- **Purpose:** Production Dockerfile for web app
- **Checklist:**
  - [ ] Multi-stage: deps → build → runtime
  - [ ] Next.js standalone output
  - [ ] Non-root user
  - [ ] HEALTHCHECK directive pointing at `/api/health`
  - [ ] Final image <300MB

### `Dockerfile.worker` (production target)
- **Purpose:** Production Dockerfile for worker
- **Checklist:**
  - [ ] Multi-stage build with `tsc` compilation
  - [ ] Production deps only in runtime stage
  - [ ] Non-root user
  - [ ] HEALTHCHECK pointing at worker health port
  - [ ] Final image <250MB

### `.github/workflows/deploy.yml`
- **Purpose:** CI/CD deployment pipeline
- **Checklist:**
  - [ ] Trigger on push to `main`
  - [ ] Run tests first (block on failure)
  - [ ] Build + push Docker images (tagged with commit SHA)
  - [ ] Run DB migration as separate step BEFORE app deploy
  - [ ] Deploy web app (rolling, 2+ instances)
  - [ ] Deploy worker (graceful)
  - [ ] Post-deploy smoke E2E
  - [ ] Slack notification on success/failure

### `infrastructure/terraform/` or `infrastructure/pulumi/` (chosen IaC)
- **Purpose:** Infrastructure-as-code for production environment
- **Checklist:**
  - [ ] VPC, security groups
  - [ ] Managed PostgreSQL 17 (RDS / Neon / Supabase)
  - [ ] Managed Redis (Upstash / ElastiCache)
  - [ ] Web app on container platform (ECS / Fly.io / Railway)
  - [ ] Worker on same platform
  - [ ] Secrets manager (AWS Secrets Manager / Doppler)
  - [ ] CDN configuration

### `docs/architecture/runbook-deployment.md` (extended)
- **Purpose:** Production deployment guide
- **Checklist:**
  - [ ] First-time deployment instructions
  - [ ] Rollback procedure
  - [ ] Emergency contact list

### `docs/architecture/incident-response.md`
- **Purpose:** On-call incident response guide
- **Checklist:**
  - [ ] Severity definitions (P1, P2, P3)
  - [ ] Initial response steps
  - [ ] Communication templates
  - [ ] Post-mortem template

### `web/instrumentation.ts`
- **Purpose:** Next.js instrumentation hook for OpenTelemetry / APM
- **Checklist:**
  - [ ] Initialize tracer (Datadog / Sentry / OpenTelemetry)
  - [ ] Auto-instrument Next.js
  - [ ] Custom span for Drizzle queries

### `worker/src/instrumentation.ts`
- **Purpose:** Worker APM initialization
- **Checklist:**
  - [ ] Mirror web app instrumentation
  - [ ] Auto-instrument BullMQ + Drizzle

### `.dockerignore`
- **Purpose:** Exclude dev files from Docker build context
- **Checklist:**
  - [ ] node_modules, .next, .git, dist, coverage, docs, *.md

---

# Cross-Cutting Concerns & Quality Gates

## Definition of Done — Applied to Every File

Every file across every phase must satisfy these before merge:

- [ ] TypeScript strict mode: no `any`, no `@ts-ignore`
- [ ] Biome lint passes
- [ ] Biome format applied
- [ ] No `console.log` (use structured logger)
- [ ] All `useEffect` calls have cleanup if applicable
- [ ] All async functions have error handling
- [ ] All UI states handled: loading, error, empty, success
- [ ] Accessibility: keyboard nav works, ARIA labels present, contrast meets WCAG AA
- [ ] If Server Action: starts with `requirePermission()` or documented public exception
- [ ] If touches DB: uses prepared statements (postgres.js default)
- [ ] If new feature: at least one test exists
- [ ] If modifies schema: migration generated and reviewed

## Phase Exit Criteria — Master Checklist

Each phase is considered "Done" when:

- [ ] All files in phase are merged to main
- [ ] All file-level checklists complete
- [ ] Phase-specific exit criteria met (stated in phase description)
- [ ] Tests for phase pass in CI
- [ ] Documentation updated (README, PAD, runbooks)
- [ ] No critical issues in observability dashboards (post-Phase 16)

---

# Suggested Sprint Plan (2 engineers, ~3 calendar weeks)

| Week | Engineer A (Backend) | Engineer B (Frontend) |
|---|---|---|
| **Week 1** | Phase 0 → 1 → 2 (foundation) | Phase 0 → 10 (design system) |
| **Week 1** | Phase 3 + 4 + 5 (parallel) | Phase 10 (continued) |
| **Week 2** | Phase 6 → 7 → 8 → 9 (worker pipelines) | Phase 11 → 12 (feed + article) |
| **Week 2** | Phase 14 (APIs) | Phase 13 (search) |
| **Week 3** | Phase 16 (observability) | Phase 15 (admin) |
| **Week 3** | Phase 17 (testing — joint) | Phase 17 (testing — joint) |
| **Week 3** | Phase 18 (deployment — joint) | Phase 18 (deployment — joint) |

---

# Appendix A — File Count Summary

| Category | Approximate File Count |
|---|---|
| Configuration & tooling | 14 |
| Database schema + migrations | 5 |
| Domain layer | 9 |
| Infrastructure (Redis, queue, AI) | 8 |
| Auth + DAL | 7 |
| Worker service | 15 |
| Design system + UI primitives | 18 |
| Feature: feed | 8 |
| Feature: topics | 3 |
| Feature: article + summary | 11 |
| Feature: search | 6 |
| API Route Handlers | 8 |
| Admin workspace | 16 |
| Observability + runbooks | 11 |
| Tests | 12+ |
| Deployment & infrastructure | 10 |
| **TOTAL** | **~161 files** |

---

# Appendix B — Reference Map

| Reference Need | Document & Section |
|---|---|
| Why Better Auth not Auth.js | PAD §2, ADR-004 |
| Why BullMQ not SQS | PAD §2, ADR-002 |
| Lazy DB connection pattern | PAD §6.3 |
| GIN `fastupdate=off` rationale | PAD §6.1 + ADR-005 |
| Cache Components opt-in model | PAD §4.3 |
| Source-cited AI disclosure UI | PRD §6.3, PAD §9 |
| `proxy.ts` vs DAL security boundary | PAD §7.4 |
| Idempotent job design | PAD §5.6 |
| BullMQ Flow pattern | PAD §5.4 |
| Worker concurrency tuning | PAD §5.5 |
| Cache invalidation tag taxonomy | PAD §11.2 |
| Editorial Dispatch design tokens | PRD §6.1 |
| RBAC permissions matrix | PAD §7.3 |
| Migration strategy | PAD §6.4 + §12.7 |

---

*End of MASTER_EXECUTION_PLAN.md*

I have meticulously reviewed and compared the two attached execution plan documents: `plan_MEP.md` and `Master_Execution_Plan.md`. 

Below is my comprehensive analysis, structured into four phases: **(1) Executive Summary**, **(2) Comparative Matrix**, **(3) Deep Critique of Each Document**, and **(4) Final Consolidation Recommendation**.

---

### Phase 1: Executive Summary
The two documents represent two different stages of the planning lifecycle:
*   **`plan_MEP.md`** is a **Meta-Planning Document**. It outlines the *philosophy, structure, and rules* for how an execution plan *should* be built. It proposes a 12-phase structure and provides templates for how file-level tasks should be defined.
*   **`Master_Execution_Plan.md`** is the **Actual Execution Playbook**. It is the fully realized, exhaustive implementation of the philosophy proposed in `plan_MEP.md`. It expands the scope to 19 highly granular phases, provides exact file paths, explicit checklists, and direct cross-references to the PRD and PAD.

**Verdict:** `Master_Execution_Plan.md` is the superior, production-ready artifact. However, `plan_MEP.md` contains a few excellent philosophical guardrails (like the "Change Management Rule" and specific "Definition of Done" criteria) that should be injected into the final master document to make it bulletproof.

---

### Phase 2: Comparative Matrix

| Dimension | `plan_MEP.md` (The Meta-Plan) | `Master_Execution_Plan.md` (The Playbook) |
| :--- | :--- | :--- |
| **Primary Purpose** | Defines the *rules of engagement* and template for planning. | Provides the *step-by-step build instructions* for engineers. |
| **Phase Structure** | 12 broad phases (Phase 0 to Phase 11). | 19 granular phases (Phase 0 to Phase 18), explicitly marking parallelizable tracks (🟢). |
| **File-Level Detail** | Provides *examples* of how a file entry should look (e.g., `src/lib/db/index.ts`). | Provides an *exhaustive, actual inventory* of ~161 specific files with unique checklists per file. |
| **PRD/PAD Alignment** | States the *intent* to align with the PAD. | Explicitly cites PAD sections (e.g., "Reference: PAD Section 6.3") and PRD sections in every checklist. |
| **Team Resourcing** | Abstract; assumes a generic team. | Concrete; includes a realistic 3-week sprint plan for 2 engineers (Backend + Frontend split). |
| **Actionability** | Low (requires further expansion to be executed). | High (a senior engineer can pick up any phase and start coding immediately). |

---

### Phase 3: Deep Critique of Each Document

#### 1. `plan_MEP.md` (The Meta-Plan)
*   **Strengths**:
    *   **Excellent Philosophical Foundation**: The "Core assumptions" and "Risks I’m accounting for" sections are brilliant. The insight that "If a phase requires half-finished work from three later phases, it is a dependency trap" is a masterclass in project management.
    *   **Perfect File-Entry Template**: The proposed table structure (`File | Action | Responsibility | Interfaces In | Interfaces Out | Checklist`) is the gold standard for preventing file sprawl and ensuring clear ownership.
    *   **Strong Guardrails**: The "Change Management Rule" (stop and document if code diverges from PAD) and "Anti-generic enforcement" are vital cultural artifacts for this specific project.
*   **Weaknesses**:
    *   **Not Executable**: It is a plan *about* a plan. It lacks the actual file names, specific API routes, and concrete Drizzle schema tasks needed to start coding.
    *   **Phases are Too Broad**: Grouping "Feed Query APIs & Topic Feed UI" into a single phase (as proposed in its Phase 6) is too large for a single, independently verifiable sprint milestone.

#### 2. `Master_Execution_Plan.md` (The Playbook)
*   **Strengths**:
    *   **Exhaustive Granularity**: Breaking the frontend into distinct phases (Design System → Public Feed → Article Detail → Search → Admin) perfectly matches modern feature-flagged, parallel development workflows.
    *   **Explicit Cross-Referencing**: Every major file checklist includes a "Reference: PAD Section X.X" or "Reference: PRD Section Y.Y". This guarantees architectural drift is minimized.
    *   **Realistic Resourcing**: The 3-week, 2-engineer sprint plan is highly realistic and correctly identifies the critical path (Backend foundation must precede Worker pipelines, which must precede Frontend integration).
    *   **Idempotency & Safety Focus**: Checklists explicitly call out critical safety patterns (e.g., `[ ] GIN index includes fastupdate: false ← critical`, `[ ] Lazy proxy pattern`).
*   **Weaknesses**:
    *   **Slight Redundancy in Phase 14 & 15**: "Public API Route Handlers" (Phase 14) and "Admin Workspace" (Phase 15) could theoretically bleed into the feature phases (e.g., Admin APIs built alongside Admin UI), though keeping them separate enforces the "Route Handlers = Public, Server Actions = Internal" rule.
 to keep them separate is actually a *strength* for teaching the pattern, even if it adds a phase.
    *   **Missing the "Change Management" Escape Hatch**: It lacks the explicit "If implementation reveals a major mismatch between PAD and code, STOP" rule found in `plan_MEP.md`.

---

### Phase 4: Final Consolidation Recommendation

Do not use `plan_MEP.md` as the execution document. **`Master_Execution_Plan.md` is already the definitive, production-ready artifact.** 

However, to make `Master_Execution_Plan.md` absolutely flawless, we should inject **four specific philosophical guardrails** from `plan_MEP.md` directly into its introductory sections.

**Recommended Injections into `Master_Execution_Plan.md`:**

1. **Adopt the "Definition of Done — Applied to Every File" Checklist**: 
   Add this exact block from `plan_MEP.md` to the "Cross-Cutting Concerns" section of the Master Plan:
   > *Every file across every phase must satisfy these before merge:*
   > - [ ] TypeScript strict mode: no `any`, no `@ts-ignore`
   > - [ ] Biome lint/format passes
   > - [ ] No `console.log` (use structured logger)
   > - [ ] All UI states handled: loading, error, empty, success
   > - [ ] Accessibility: keyboard nav works, ARIA labels present, WCAG AA contrast
   > - [ ] If Server Action: starts with `requirePermission()` or documented public exception

2. **Adopt the "Change Management Rule"**:
   Add this to the "Rules" section at the top of the Master Plan:
   > **Rule: Change Management.** If implementation reveals a major mismatch between the PAD and code reality: **STOP**. Document the mismatch. Decide whether the PAD or execution plan must change. Do not silently improvise a new architecture.

3. **Refine the Phase Exit Gate**:
   Ensure the "Phase Exit Criteria — Master Checklist" in the Master Plan explicitly includes: *"No critical issues in observability dashboards (post-Phase 16)"* and *"Documentation updated (README, PAD, runbooks)"*, as elegantly stated in `plan_MEP.md`.

4. **Clarify the "File Ownership Intent"**:
   In the Master Plan's appendix, add a note that every file must implicitly answer: *What do I own? What do I depend on? What do I export? Why do I exist?* If a file cannot answer this, it must be split or simplified.

---

### 🚀 Next Step
The **`Master_Execution_Plan.md`** is ready to be used as the single source of truth for your engineering team. 

Would you like me to generate the **updated, final version of `Master_Execution_Plan.md`** with these four philosophical guardrails seamlessly integrated into its header and cross-cutting sections, or are you ready to begin executing **Phase 0 (Repository Foundation & Tooling)**?
