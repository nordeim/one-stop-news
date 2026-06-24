Research sweep complete. Every critical finding is now locked in. Here is the full, comprehensive **Project Architecture Document** — authoritative, cross-referenced, and production-grounded.

---

# OneStopNews — Project Architecture Document (PAD) v1.0

> **Classification:** Internal Engineering Reference
> **Status:** Authoritative — supersedes all prior architecture notes
> **Companion document:** OneStopNews PRD v2.0
> **Audience:** Senior engineers, tech leads, DevOps, new team members
> **Rule:** Every architectural decision in this document traces to a specific rationale. Nothing is here "because it's popular."

---

# PART I — SYSTEM OVERVIEW & DECISIONS

---

## Section 1: Document Metadata & Purpose

### 1.1 What This Document Is

This PAD is the **single authoritative source of truth** for how OneStopNews is built. It answers: _"Exactly how is this system constructed, and precisely why was each decision made?"_

It covers:

- Every technology choice with an explicit Architecture Decision Record (ADR)
- Full system topology with annotated diagrams
- Complete directory structures with per-file annotations
- Production-grade code patterns for all critical integration points
- Database schema with every table, column, index, and relationship
- Security model with defense-in-depth enforcement points
- Operational runbooks for known failure modes

### 1.2 How to Use This Document

| You are...                   | Start at...                                                   |
| ---------------------------- | ------------------------------------------------------------- |
| New engineer onboarding      | Section 1 → 2 → 3 → your feature area                         |
| Debugging an ingestion issue | Section 5.3 (BullMQ topology) + Section 12.4 (Runbooks)       |
| Adding a new API endpoint    | Section 4.4 (Route Handlers vs. Server Actions)               |
| Modifying the DB schema      | Section 6 (complete schema) + Section 6.6 (migration runbook) |
| Investigating an auth issue  | Section 7 (auth architecture)                                 |
| Debugging a caching problem  | Section 11 (caching architecture)                             |

### 1.3 Relationship to the PRD

The PRD defines **what** and **why** (product goals, user stories, success metrics). This PAD defines **how** (system design, code patterns, operational procedures). The PRD is upstream; this PAD is downstream. Where the PRD is ambiguous, this document makes the definitive technical decision.

### 1.4 Key Terminology

| Term                | Definition                                                                              |
| ------------------- | --------------------------------------------------------------------------------------- |
| **Web App**         | The Next.js 16 deployable serving UI and public APIs                                    |
| **Worker Service**  | The Node.js 24+ deployable running BullMQ job processors                                |
| **Feed Slice**      | A Redis-cached ordered list of article IDs per `(category, subcategory, sort)`          |
| **Job Scheduler**   | A BullMQ `upsertJobScheduler` entry that produces repeatable jobs                       |
| **DAL**             | Data Access Layer — the `lib/dal/` module that enforces auth before DB access           |
| **RSC**             | React Server Component                                                                  |
| **PPR**             | Partial Pre-Rendering — Next.js 16 feature combining static shells with dynamic content |
| **Cache Component** | Next.js 16 `"use cache"` directive — opt-in, explicit caching                           |

---

## Section 2: Architecture Decision Records (ADRs)

Each ADR follows the structure: **Context → Decision → Rationale → Consequences → Alternatives Rejected**.

---

### ADR-001: Next.js 16 App Router as Web Framework

**Context:**
OneStopNews requires a framework that can serve a high-read-volume news feed with fast initial page loads, support server-side data fetching without API waterfalls, handle authentication at the network boundary, and support a mix of highly cacheable (topic feeds) and fully dynamic (article detail with live summary status) content. The team is TypeScript-first.

**Decision:**
Use **Next.js 16** with the App Router, PPR, Cache Components, and `proxy.ts`.

**Rationale:**

- Next.js 16 ships with `proxy.ts`, React Compiler, and React 19.2 — a unified, production-stable stack with no experimental flags needed.
- The App Router's RSC model means most application logic runs on the server — smaller JS bundles, no hydration waterfalls, and better Core Web Vitals for a read-heavy news interface.
- PPR enables serving a pre-rendered static shell from the CDN edge with dynamic content streamed into Suspense boundaries — ideal for topic feeds where the page structure is stable but article counts change constantly.
- Cache Components use the `"use cache"` directive — an **opt-in model** where the most critical architectural decision with Drizzle in a Next.js monorepo is never creating an eager database connection, as modules are imported during the build process where no DB is available — and the same principle applies to caching: explicit opt-in prevents accidental stale data serving.

**Consequences (Positive):**

- Zero client-side waterfalls for initial feed load.
- Fine-grained caching control per route segment.
- Server Actions eliminate the need for most internal API routes.
- `proxy.ts` provides a clean network boundary for auth redirects.

**Consequences (Negative):**

- `"use cache"` + PPR is a new mental model; engineers need to internalize opt-in caching semantics before they accidentally serve stale data or miss cache invalidation.
- React Server Components and Client Components have a strict boundary; patterns that mix them incorrectly (e.g., importing a Client Component into an RSC that passes non-serializable props) cause build-time errors.

**Alternatives Rejected:**

- **Remix v3:** Strong data loading model but less mature RSC support and smaller ecosystem for news/media use cases.
- **Next.js Pages Router:** Lacks RSC, Server Actions, and the PPR model. Explicitly a legacy path.
- **Standalone API (Express + React SPA):** Requires managing CORS, separate deployment pipeline, and loses all the server-rendering performance benefits critical for a news feed's Core Web Vitals targets.

---

### ADR-002: BullMQ on Redis as the Job Queue

**Context:**
The system needs: scheduled RSS polling per-source on varying intervals, prioritized summarization jobs (user-triggered > background), parent-child job dependencies (ingest → score → cache-refresh), a monitoring dashboard for admin visibility, and reliable job persistence across worker restarts. The worker is Node.js TypeScript.

**Decision:**
Use **BullMQ v5** backed by a managed Redis instance (Upstash or AWS ElastiCache).

**Rationale:**

- A Job Scheduler acts as a factory, producing jobs based on specified "repeat" settings. It is highly flexible, accommodating various scenarios, including jobs produced at fixed intervals, according to cron expressions, or based on custom requirements.
- `upsertJobScheduler` replaces "repeatable jobs" and is available in v5.16.0 and onwards. You can call it again with the same scheduler ID to update any settings, including repeat options and job template settings. This is exactly the behavior needed for dynamic polling interval updates from the admin panel.
- The `FlowProducer` class allows adding jobs with dependencies such that it is possible to build complex flows. A flow is a tree-like structure of jobs that depend on each other. Whenever the children of a given parent are completed, the parent will be processed.
- Jobs automatically retry with exponential backoff. You can configure attempts, delays, and custom backoff strategies.
- BullMQ can safeguard external services with rate limiting per queue or group, and can deduplicate jobs to implement debounce and throttle patterns. Critical for AI API rate limit compliance.

**Consequences (Positive):**

- All job state (pending, active, failed, completed) is persisted in Redis — survives worker restarts.
- `FlowProducer` enables atomic ingestion pipelines: the entire `ingest → score → cache-refresh` flow either commits or fails together.
- Built-in Taskforce.sh dashboard or Bull Board for real-time job monitoring.
- TypeScript-native: full type safety on job data payloads.

**Consequences (Negative):**

- Redis is now a required infrastructure dependency. Must be managed (Upstash or ElastiCache) with AOF persistence enabled and no eviction policy set.
- BullMQ's `FlowProducer` and `JobScheduler` cannot be combined directly — from BullMQ version 5.16.0 onwards, repeatable APIs are deprecated in favor of Job Schedulers. When using `FlowProducer` for defining jobs, scheduling them to run on a schedule requires a different pattern. The correct pattern is: the Job Scheduler fires a root ingestion job; that job uses `FlowProducer.add()` internally to fan out child jobs.

**Alternatives Rejected:**

- **AWS SQS:** No built-in job priorities, no parent-child flows, no native dashboard, and polling-based (not push). Correct only for simple fire-and-forget; insufficient for our multi-step pipeline.
- **RabbitMQ:** Operational overhead (cluster management, exchange topology) disproportionate to team size. AMQP semantics are more complex than Redis for Node.js engineers.
- **Trigger.dev:** Interesting but introduces external service dependency for core business logic. BullMQ keeps pipeline control in-house.
- **pg-boss (PostgreSQL-backed):** Eliminates Redis dependency but adds significant DB load for high-frequency ingestion polling (every 5 min × 200 sources = 2,400 job ops/hour minimum). PostgreSQL is the read-path hot path; don't mix it with the job queue hot path.

---

### ADR-003: Drizzle ORM for Database Access

**Context:**
The system needs type-safe, PostgreSQL-native database access that works in both the Next.js web app (where module imports happen at build time) and the Node.js worker service (where eager connections would block startup). The team uses TypeScript strict mode.

**Decision:**
Use **Drizzle ORM** with the `postgres` driver and a lazy proxy connection pattern.

**Rationale:**

- This guide covers everything from initial setup to production patterns, drawing from a codebase with 65+ Drizzle schema files, multi-tenant queries, and a lazy proxy connection pattern that works reliably in both Next.js and NestJS contexts.
- The most critical architectural decision with Drizzle in a Next.js monorepo is never creating an eager database connection. Eager connections at module load time cause issues because modules are imported during the build process where no DB is available. The connection is created only when the first query runs.
- The `postgres` package (different from `pg`) is the recommended driver for Drizzle in modern TypeScript projects — it supports connection pooling, prepared statements, and has better TypeScript types.
- postgres.js uses prepared statements by default — critical for hot query paths like feed fetching.
- Drizzle supports generating Zod-based validation schemas with `createSelectSchema()` and `createInsertSchema()` — eliminating duplicate schema definitions between the DB layer and API validation layer.

**Consequences (Positive):**

- Zero overhead: Drizzle generates near-raw SQL; no N+1 query ORM traps.
- Schema is the single source of truth for TypeScript types, Zod schemas, and migrations.
- `drizzle-kit generate + migrate` workflow enforces explicit migration files — no `push` in production.
- SQL-like API means any team member who knows SQL can read Drizzle queries without an ORM mental model.

**Consequences (Negative):**

- Relations are separate from foreign keys — you must define both for full type safety. Easy to forget; must be enforced in code review.
- Drizzle's relational query API (`db.query`) and the select API (`db.select`) have different performance characteristics; team needs clear guidelines on when to use each.
- No automatic query caching (unlike some heavier ORMs) — all caching is explicit at the application layer.

**Alternatives Rejected:**

- **Prisma:** Schema-first but generates a heavy query engine binary, has eager connection issues in Next.js module loading, and the Prisma Client's N+1 behavior under relational loads requires careful `include` management. Drizzle is faster and lighter.
- **TypeORM:** Decorator-based, requires `experimentalDecorators`, has known TypeScript strict mode compatibility issues. Not worth the friction.
- **Raw SQL (postgres driver directly):** Loses type safety on query results. The productivity cost is too high for a schema with 15+ tables.

---

### ADR-004: Better Auth as Authentication Library

**Context:**
The system requires: session-based auth for admin users, HttpOnly cookie sessions (not JWT in localStorage), RBAC with `reader` and `admin` roles, and a foundation that is actively maintained and receives security updates. Auth.js v5 was in the PRD draft but requires re-evaluation.

**Decision:**
Use **Better Auth** as the primary authentication library.

**Rationale:**

- As of late 2025, the Better Auth team took over Auth.js maintenance, and Auth.js is in security-patch-only mode. The Auth.js team's own guidance for new projects points to Better Auth. Choosing Auth.js v5 for a new project means betting on a library in maintenance mode.
- Better Auth works out of the box for local and demo use. For multi-instance production, configure a Better Auth storage adapter so sessions persist across instances, as Better Auth defaults are not shared across nodes. — This is a critical production configuration requirement documented here.
- Built on Next.js 16 + React 19 with RBAC and BetterAuth produces a polished DX out of the box.
- Better Auth provides DB-backed sessions (not JWT-only) — sessions are stored in PostgreSQL via the Drizzle adapter, giving admins the ability to revoke sessions immediately.

**Critical Security Note — CVE-2025-29927:**
CVE-2025-29927 (CVSS 9.1) demonstrated how a single HTTP header could completely bypass Next.js middleware authorization. The vulnerability has been patched in v12.3.5, v13.5.9, v14.2.25, and v15.2.3+. Next.js 16 is unaffected, but this CVE establishes the architectural principle encoded throughout our auth design: **`proxy.ts` is never the sole security boundary.**

**Consequences (Positive):**

- DB-backed sessions allow immediate session revocation — critical for admin accounts.
- Better Auth's plugin system supports future SAML/OIDC SSO for enterprise without library migration.
- Drizzle adapter means session tables live in the same PostgreSQL instance — no separate session store required.

**Consequences (Negative):**

- For multi-instance production, a Better Auth storage adapter must be configured so sessions persist across instances — Better Auth defaults are not shared across nodes. This is a day-one production configuration requirement, not an afterthought.
- Better Auth is newer than Auth.js; some third-party tutorials and community examples still reference Auth.js patterns. Team must rely on official docs.

**Alternatives Rejected:**

- **Auth.js v5:** In security-patch-only mode as of September 2025. New projects should not use it.
- **Clerk:** External service dependency for authentication. Introduces a third-party data processor into the auth critical path. Unacceptable for enterprise deployments with data residency requirements.
- **Custom JWT implementation:** Attempting to build custom auth for production Next.js applications in 2025 is economically irrational for most teams, with development costs of $50,000–$125,000 and ongoing maintenance consuming 20–30% of that annually.

---

### ADR-005: PostgreSQL FTS + pg_textsearch BM25 for Search

**Context:**
The system needs keyword search across article titles and excerpts, with relevance ranking, autocomplete, and filter support. The question is whether to use PostgreSQL native FTS, add an external search service (Elasticsearch, Typesense, Algolia), or use a PostgreSQL extension for BM25 ranking.

**Decision:**
Use **PostgreSQL 17 native FTS** (GIN-indexed `tsvector` generated columns) as the primary search implementation, with **`pg_textsearch` BM25 extension** for relevance ranking in Phase 2, and **`pg_trgm`** for autocomplete.

**Rationale:**

- No external search service dependency. All search data lives in the same PostgreSQL instance, with no sync pipeline to maintain.
- Generated `tsvector` columns with GIN indexes eliminate manual `tsvector` maintenance triggers — the column updates automatically on row insert/update.
- The `fastupdate = off` GIN index configuration is non-negotiable for search latency. Testing on a 10-million-row dataset showed unoptimized FTS at ~41,301ms versus optimized FTS at ~877ms — a ~50× improvement from applying this single configuration flag.
- `pg_textsearch` by Timescale brings production-grade BM25 ranking directly into PostgreSQL — no Elasticsearch cluster required, consistent with our no-external-search-service mandate.

**Consequences (Positive):**

- Zero operational overhead for a separate search cluster.
- Transactional consistency — search indexes are always in sync with article data (no async replication lag).
- `setweight()` on title (A) and excerpt (B) fields gives relevance-weighted results without external configuration.

**Consequences (Negative):**

- PostgreSQL FTS cannot match Elasticsearch for complex faceted search or ML-based semantic ranking. This is acceptable for V1 but becomes a constraint at very high article volumes (>50M rows).
- `pg_textsearch` BM25 is a third-party extension — must be installed on the PostgreSQL server. Managed PostgreSQL services (RDS, Neon) may not support it; verify before Phase 2 deployment.
- Semantic search (find articles about "market volatility" without the exact words) requires `pgvector` — roadmapped for Phase 3.

**Alternatives Rejected:**

- **Elasticsearch:** Separate cluster, separate sync pipeline, separate operational burden. The complexity/benefit ratio is wrong for V1 at our scale.
- **Typesense:** Self-hosted option with better DX than Elasticsearch, but still a separate service to operate and sync. Revisit if PostgreSQL FTS proves insufficient at scale.
- **Algolia:** SaaS, fast, but per-search pricing becomes expensive at 100k MAU with high search rates, and data leaves our infrastructure.

---

### ADR-006: Modular Monolith + Separate Worker Service

**Context:**
The system has two fundamentally different workload types: (1) synchronous, user-facing HTTP request/response (the web app), and (2) asynchronous, long-running background jobs (ingestion, scoring, summarization). These have different scaling characteristics, failure modes, and deployment lifecycles.

**Decision:**
Use a **modular monolith** for the web app (single Next.js deployable, feature-based internal organization) combined with a **separate Worker Service** (Node.js deployable), connected via BullMQ queues and sharing a PostgreSQL database.

**Rationale:**

- The ingestion and summarization workloads are **I/O-bound** (network fetches to RSS sources) and **AI-API-bound** (Anthropic/OpenAI calls) — they should not block or contend with user-facing HTTP request processing.
- Separate deployment units allow independent scaling: the web app scales based on HTTP traffic; workers scale based on queue depth.
- A modular monolith (not full microservices) means a single codebase, shared `lib/` utilities, and no distributed tracing complexity for most operations.
- The `domain/` layer is **shared logic** — business rules for articles, summaries, and ranking are defined once and used by both the web app (via Server Actions) and the worker (via job handlers). No duplication.

**Consequences (Positive):**

- Web app deploys independently from worker — summarization model changes don't require web app redeploy.
- Worker can be horizontally scaled to any depth based on queue depth metrics.
- Single PostgreSQL database simplifies data consistency — no distributed transactions.

**Consequences (Negative):**

- Two deployables to operate, monitor, and deploy. Adds CI/CD complexity vs. a true monolith.
- Schema migrations must be coordinated — both services must be compatible with the deployed schema version during rolling deploys.

**Alternatives Rejected:**

- **Full monolith:** Background jobs in the same Next.js process block HTTP request processing during heavy ingestion bursts. Unacceptable for latency SLAs.
- **Full microservices:** Team size and current scale do not justify the operational overhead of service meshes, per-service databases, and distributed tracing infrastructure.
- **Serverless functions (Lambda/Vercel Functions) for workers:** Cold start latency is unacceptable for real-time user-triggered summarization. Function timeout limits conflict with long-running ingestion jobs.

---

### ADR-007: Turbopack as Build System (Next.js 16 Default)

**Context:**
Next.js 16 ships Turbopack as the default bundler, replacing Webpack. This is no longer opt-in.

**Decision:**
Use **Turbopack** as shipped by Next.js 16. Do not revert to Webpack.

**Rationale:**

- Turbopack is the default in Next.js 16 — reverting to Webpack requires explicit configuration and gives up framework-level optimizations.
- Turbopack provides significantly faster HMR (Hot Module Replacement) for large projects — meaningful for a codebase with 15+ feature modules.
- All Shadcn UI components, Tailwind CSS v4, and Drizzle ORM are compatible with Turbopack.

**Consequences (Negative):**

- Some Webpack plugins have no Turbopack equivalent. Audit all `webpack()` overrides in `next.config.ts` before migration. For OneStopNews, no such overrides exist in the baseline — this is a clean start.

---

# PART II — SYSTEM ARCHITECTURE

---

## Section 3: High-Level System Topology

### 3.1 Full Network Topology Diagram

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                           EXTERNAL WORLD                                     ║
║                                                                              ║
║   ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐   ║
║   │  Browser         │    │  RSS/Atom Sources │    │  AI APIs             │   ║
║   │  (React 19.2)    │    │  (50–200 feeds)  │    │  Anthropic / OpenAI  │   ║
║   └────────┬─────────┘    └────────┬─────────┘    └──────────┬──────────┘   ║
╚════════════│════════════════════════│══════════════════════════│═════════════╝
             │ HTTPS                  │ HTTP (worker fetch)      │ HTTPS
             │                        │                          │
╔════════════▼════════════╗          │                          │
║       CDN EDGE           ║          │                          │
║  (Static shell, assets)  ║          │                          │
║  PPR prerendered pages   ║          │                          │
╚════════════▼════════════╝          │                          │
             │ Cache miss / dynamic   │                          │
╔════════════▼════════════════════════╗                         │
║           NEXT.JS 16 WEB APP        ║                         │
║                                     ║                         │
║  proxy.ts ──► App Router            ║                         │
║    Server Components (RSC)          ║                         │
║    Client Component Islands         ║                         │
║    Server Actions (mutations)       ║                         │
║    Route Handlers (public API)      ║                         │
║    Better Auth session layer        ║                         │
║                                     ║                         │
║  lib/db/ ──────────────────────────╫─────────────────────────╫──► [PG READ]
║  lib/queue/ (enqueue only) ────────╫──► REDIS / BullMQ       │
╚═════════════════════════════════════╝          │              │
                                                 │ BullMQ       │
╔════════════════════════════════════════════════▼══════════════▼════════════╗
║                         WORKER SERVICE (Node.js 24+)                        ║
║                                                                              ║
║  ┌──────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐  ║
║  │  Ingestion Worker │  │  Summarization       │  │  Scoring Worker       │  ║
║  │  concurrency: 50  │  │  Worker              │  │  concurrency: 10      │  ║
║  │                   │  │  concurrency: 5      │  │                       │  ║
║  │  rss-parser       │  │  AI client wrapper   │  │  importance formula   │  ║
║  │  url-normalize    │  │  Zod response schema │  │  score → PG write     │  ║
║  │  content-hash     │  │  token budget        │  │                       │  ║
║  └────────┬──────────┘  └──────────┬──────────┘  └──────────┬────────────┘  ║
║           │                        │                         │               ║
║           └────────────────────────┴─────────────────────────┘               ║
║                                    │                                          ║
║  lib/db/ (Drizzle) ────────────────┼────────────────────────────► [PG WRITE] ║
║  lib/queue/ (consume) ─────────────┘                                         ║
╚══════════════════════════════════════════════════════════════════════════════╝
         │                    │
         ▼                    ▼
╔════════════════╗   ╔════════════════════════════════════════╗
║  REDIS 7       ║   ║  POSTGRESQL 17                          ║
║  (Upstash)     ║   ║                                         ║
║                ║   ║  Primary (writes + reads)               ║
║  BullMQ queues ║   ║  Read replica (feed queries) [Phase 2]  ║
║  Feed slices   ║   ║                                         ║
║  (hot cache)   ║   ║  Tables: articles, sources, categories, ║
║                ║   ║  subcategories, summaries, users,       ║
║  AOF: enabled  ║   ║  sessions, user_preferences,            ║
║  maxmemory-    ║   ║  ingestion_jobs, source_health          ║
║  policy: noev  ║   ║                                         ║
╚════════════════╝   ╚════════════════════════════════════════╝
```

### 3.2 Traffic Flow Narratives

**Feed Page Request (Happy Path):**

```
1. Browser requests /topics/tech/ai-ml
2. CDN edge: check for cached static shell → HIT → serve HTML shell (TTFB ~50ms)
3. Shell renders; Suspense boundaries trigger RSC stream requests
4. Next.js RSC: check Redis feed slice for (tech, ai-ml, latest) → HIT
5. Hydrate article IDs with PG query: WHERE id = ANY($1) → ~20ms
6. Stream article cards into Suspense boundary
7. Browser: full page interactive ~800ms (LCP target)
```

**Feed Page Request (Cache Miss):**

```
1–3. Same as above
4. Redis feed slice → MISS
5. Drizzle query: SELECT ... FROM articles WHERE category_id = $1
   ORDER BY published_at DESC LIMIT 40 → ~80ms (GIN index)
6. Write feed slice to Redis (TTL 300s)
7. Stream response
```

**User-Triggered Summarization:**

```
1. User clicks "Summarize" in article detail
2. Client → POST /api/summarize/[id]
3. Route Handler: verify session (Better Auth) → check existing summary
4. BullMQ: enqueue summarize-article job (priority: high) → return {jobId, status: 'pending'}
5. Client: poll GET /api/summarize/[id]/status every 2s
6. Worker: dequeue job → fetch article record → check content_availability
7. Worker: retrieve full content if needed → call AI API with structured prompt
8. Worker: parse Zod-validated response → write to summaries table
9. Worker: update articles.has_summary = true → invalidate Redis key
10. Client poll: status = 'complete' → fetch summary → render via React Activity
```

---

## Section 4: Next.js 16 Web App Architecture

### 4.1 The Layer Model

Every request through the web app passes through exactly these layers in order:

```
REQUEST
   │
   ▼
┌─────────────────────────────────────────────────────┐
│  proxy.ts  (network boundary — optimistic redirect)  │
│  • Check cookie presence for /admin routes           │
│  • NOT a security boundary — redirects only          │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  App Router Layer  (routing + layout)                │
│  • layout.tsx files apply shared UI chrome          │
│  • loading.tsx files define Suspense skeletons      │
│  • error.tsx files define error boundaries          │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  Server Component Layer  (data fetching + rendering) │
│  • Fetch data directly via domain/feature queries   │
│  • Never expose raw DB objects to client            │
│  • Use React cache() for dedup within a request     │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  DAL Layer  (lib/dal/ — always verify session here)  │
│  • verifySession() wrapped in React cache()         │
│  • Returns typed session or throws — never returns  │
│    null silently                                    │
│  • Called in EVERY Server Component and Action      │
│    that touches protected data                      │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  Domain Layer  (domain/ — pure business logic)       │
│  • No framework imports (no Next.js, no React)      │
│  • Pure TypeScript functions                        │
│  • Shared between Web App and Worker Service        │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  Infrastructure Layer  (lib/ — DB, queue, AI)        │
│  • lib/db/: Drizzle client + schema                 │
│  • lib/queue/: BullMQ producers only (web app)      │
│  • lib/ai/: AI client wrapper                       │
│  • lib/auth/: Better Auth configuration             │
└─────────────────────────────────────────────────────┘
```

### 4.2 Complete Directory Structure (Web App)

Every file and directory is annotated. This is the definitive source of truth for code organization.

```
src/
│
├── app/                                    ← Next.js App Router root
│   │
│   ├── (public)/                           ← Route group: no auth required
│   │   ├── layout.tsx                      ← Public layout: header, topic nav ribbon
│   │   ├── page.tsx                        ← / → Top Stories feed (PPR)
│   │   ├── topics/
│   │   │   └── [category]/
│   │   │       ├── page.tsx                ← /topics/[category] (PPR + Cache Component)
│   │   │       └── [subcategory]/
│   │   │           └── page.tsx            ← /topics/[cat]/[sub] (PPR + Cache Component)
│   │   └── article/
│   │       └── [id]/
│   │           └── page.tsx                ← /article/[id] (fully dynamic — summary status)
│   │
│   ├── (admin)/                            ← Route group: admin-only
│   │   ├── layout.tsx                      ← Admin layout: verifySession() + role check
│   │   ├── page.tsx                        ← /admin → dashboard overview
│   │   ├── sources/
│   │   │   ├── page.tsx                    ← Source list + management
│   │   │   ├── new/page.tsx                ← Create source form
│   │   │   └── [id]/page.tsx              ← Edit source form
│   │   ├── jobs/
│   │   │   └── page.tsx                    ← BullMQ job monitor embed
│   │   └── summaries/
│   │       └── page.tsx                    ← Summary audit queue
│   │
│   ├── api/                                ← Route Handlers (public/external only)
│   │   ├── articles/
│   │   │   └── route.ts                    ← GET /api/articles (feed endpoint)
│   │   ├── articles/[id]/
│   │   │   └── route.ts                    ← GET /api/articles/[id]
│   │   ├── categories/
│   │   │   └── route.ts                    ← GET /api/categories
│   │   ├── summarize/
│   │   │   └── [id]/
│   │   │       ├── route.ts                ← POST /api/summarize/[id] (enqueue)
│   │   │       └── status/route.ts         ← GET /api/summarize/[id]/status (poll)
│   │   ├── source-health/
│   │   │   └── route.ts                    ← GET /api/source-health (admin-gated)
│   │   └── auth/
│   │       └── [...all]/route.ts           ← Better Auth handler (all auth routes)
│   │
│   ├── globals.css                         ← Tailwind CSS v4 entry + design tokens
│   └── layout.tsx                          ← Root layout: fonts, metadata, providers
│
├── features/                               ← Feature modules (primary code organization)
│   │
│   ├── feed/                               ← Topic feed feature
│   │   ├── components/
│   │   │   ├── FeedContainer.tsx           ← RSC: orchestrates feed layout
│   │   │   ├── LeadArticle.tsx             ← RSC: hero/lead article card
│   │   │   ├── ArticleCard.tsx             ← RSC: standard article card
│   │   │   ├── ArticleCardSkeleton.tsx     ← Loading skeleton (matches ArticleCard)
│   │   │   ├── FeedGrid.tsx                ← RSC: 3-col article grid
│   │   │   ├── FeedControls.tsx            ← CC: sort/filter controls (interactive)
│   │   │   ├── EmptyFeed.tsx               ← Empty state with editorial copy
│   │   │   └── FeedErrorBoundary.tsx       ← CC: feed-specific error UI
│   │   ├── queries.ts                      ← Drizzle queries for feed data
│   │   └── actions.ts                      ← Server Actions: save preferences
│   │
│   ├── topics/                             ← Topic navigation feature
│   │   ├── components/
│   │   │   ├── TopicRibbon.tsx             ← CC: sticky horizontal topic nav
│   │   │   ├── TopicPanel.tsx              ← CC: subcategory grid panel
│   │   │   ├── SubcategoryCard.tsx         ← RSC: subcategory tile with count
│   │   │   └── TopicTransition.tsx         ← CC: View Transitions wrapper
│   │   └── queries.ts                      ← Category + count queries
│   │
│   ├── article/                            ← Article detail feature
│   │   ├── components/
│   │   │   ├── ArticleDetail.tsx           ← RSC: full article detail panel
│   │   │   ├── ArticleMetadata.tsx         ← RSC: source, time, category badges
│   │   │   ├── SummaryPanel.tsx            ← CC: AI summary with disclosure UI
│   │   │   ├── CitationList.tsx            ← RSC: source citations component
│   │   │   ├── DisclosureBadge.tsx         ← RSC: "AI-generated" disclosure
│   │   │   ├── SummarizeButton.tsx         ← CC: trigger summarization
│   │   │   └── SummaryStatusPoller.tsx     ← CC: polls status, renders via Activity
│   │   ├── queries.ts                      ← Article + summary fetch queries
│   │   └── actions.ts                      ← Server Actions: flag summary
│   │
│   ├── search/                             ← Search feature
│   │   ├── components/
│   │   │   ├── SearchInput.tsx             ← CC: debounced search input
│   │   │   ├── SearchResults.tsx           ← RSC: result list with Suspense
│   │   │   ├── SearchFilters.tsx           ← CC: filter controls
│   │   │   └── SearchEmpty.tsx             ← Empty state with suggestions
│   │   └── queries.ts                      ← FTS queries with pg_trgm fallback
│   │
│   └── admin/                              ← Admin feature
│       ├── components/
│       │   ├── SourceForm.tsx              ← CC: create/edit source form
│       │   ├── SourceTable.tsx             ← RSC: source list table
│       │   ├── JobMonitor.tsx              ← CC: BullMQ queue status embed
│       │   ├── SummaryAuditTable.tsx       ← RSC: summary review queue
│       │   └── MetricsDashboard.tsx        ← RSC: ingestion + API metrics
│       ├── queries.ts                      ← Admin-specific DB queries
│       └── actions.ts                      ← Server Actions: CRUD sources, flag summaries
│
├── domain/                                 ← Pure business logic (NO framework deps)
│   ├── articles/
│   │   ├── normalize.ts                    ← URL normalization algorithm
│   │   ├── deduplicate.ts                  ← Content hash + dedup logic
│   │   └── types.ts                        ← Article domain types (shared with worker)
│   ├── ranking/
│   │   └── importance.ts                   ← Importance score formula
│   ├── summaries/
│   │   ├── prompt.ts                       ← AI prompt templates
│   │   ├── parse.ts                        ← Zod response parser
│   │   └── types.ts                        ← Summary domain types
│   └── sources/
│       └── types.ts                        ← Source domain types
│
├── lib/                                    ← Infrastructure integrations
│   ├── db/
│   │   ├── index.ts                        ← Drizzle client (lazy proxy pattern)
│   │   ├── schema.ts                       ← Complete schema (single source of truth)
│   │   └── migrations/                     ← Drizzle Kit generated migration files
│   ├── queue/
│   │   ├── index.ts                        ← BullMQ Queue instances (producers only)
│   │   └── types.ts                        ← Job payload type definitions
│   ├── ai/
│   │   ├── index.ts                        ← Unified AI client (Anthropic + OpenAI)
│   │   └── models.ts                       ← Model selection + token budget config
│   ├── auth/
│   │   ├── index.ts                        ← Better Auth config + Drizzle adapter
│   │   └── permissions.ts                  ← Static RBAC permissions matrix
│   ├── dal/
│   │   └── index.ts                        ← Data Access Layer: verifySession()
│   ├── redis/
│   │   └── index.ts                        ← Redis client (lazy init, ioredis)
│   └── env/
│       └── index.ts                        ← Zod-validated environment config
│
├── shared/
│   ├── components/                         ← Design system components
│   │   ├── ui/                             ← Shadcn UI wrapped components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── toast.tsx
│   │   ├── DispatchBadge.tsx               ← Category-tinted badge (design system)
│   │   ├── TimeAgo.tsx                     ← Relative timestamp component
│   │   ├── SourceAttribution.tsx           ← Source name + favicon component
│   │   └── PageSkeleton.tsx                ← Full-page loading skeleton
│   ├── hooks/
│   │   ├── useDebounce.ts                  ← 300ms debounce for search
│   │   └── useViewTransition.ts            ← View Transitions API wrapper
│   └── types/
│       └── index.ts                        ← Shared TypeScript interfaces
│
└── proxy.ts                                ← Next.js 16 network boundary
```

### 4.3 Cache Components Strategy

The new Next.js 16 opt-in caching model requires explicit `"use cache"` directives. Here is the complete cache architecture for every route:

```typescript
// Cache life profiles — defined once, used throughout
// lib/cache-profiles.ts

import { unstable_cacheLife as defineCacheProfile } from "next/cache";

// For category counts and navigation (changes rarely)
export const CACHE_STABLE = { stale: 30, revalidate: 300, expire: 3600 };

// For topic feed shells (changes with ingestion)
export const CACHE_FEED = { stale: 30, revalidate: 120, expire: 600 };

// For search results (changes continuously)
export const CACHE_SEARCH = { stale: 0, revalidate: 30, expire: 120 };
```

**Per-route cache decisions:**

| Route                 | Static Shell (PPR)                   | Dynamic Content | Cache Strategy                                     |
| --------------------- | ------------------------------------ | --------------- | -------------------------------------------------- |
| `/` (Top Stories)     | ✅ Header, nav, layout               | Article feed    | `"use cache"` on feed shell, Suspense for articles |
| `/topics/[category]`  | ✅ Category header, subcategory grid | Article feed    | Cache shell 120s, articles dynamic                 |
| `/topics/[cat]/[sub]` | ✅ Subcategory header                | Article feed    | Cache shell 120s                                   |
| `/article/[id]`       | ❌ Fully dynamic                     | All content     | No cache — summary status changes                  |
| `GET /api/categories` | N/A (Route Handler)                  | N/A             | `unstable_cache` 300s                              |
| `GET /api/articles`   | N/A (Route Handler)                  | N/A             | Redis feed slice; no HTTP cache                    |

```typescript
// Example: /topics/[category]/page.tsx
// "use cache" on the shell RSC; Suspense for dynamic feed

import { unstable_cacheLife } from 'next/cache';

// This RSC is cached — it's the static shell
async function CategoryShell({ category }: { category: string }) {
  'use cache';
  unstable_cacheLife({ stale: 30, revalidate: 120, expire: 600 });

  const categoryData = await getCategoryBySlug(category);
  if (!categoryData) return <NotFound />;

  return (
    <div className="category-shell">
      <CategoryHeader data={categoryData} />
      <SubcategoryGrid categoryId={categoryData.id} />
    </div>
  );
}

// This RSC is NOT cached — always fresh
async function LiveFeed({ categoryId, subcategoryId, sort }: FeedProps) {
  const articles = await getFeedArticles({ categoryId, subcategoryId, sort });
  return <FeedGrid articles={articles} />;
}

// Page composition: shell is cached, feed is dynamic
export default async function TopicPage({ params }: PageProps) {
  return (
    <main>
      <CategoryShell category={params.category} />
      <Suspense fallback={<FeedSkeleton />}>
        <LiveFeed
          categoryId={await getCategoryIdBySlug(params.category)}
          sort="latest"
        />
      </Suspense>
    </main>
  );
}
```

### 4.4 Server Actions vs. Route Handlers — Decision Matrix

This distinction is **critical** to maintain. Mixing them arbitrarily creates security and performance issues.

| Scenario                             | Use                                            | Reason                                                                            |
| ------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| Form submission from admin panel     | **Server Action**                              | Colocated with the form, automatic CSRF protection, no network overhead           |
| User preference mutation             | **Server Action**                              | Progressive enhancement, works without JavaScript                                 |
| Webhook receiver (external service)  | **Route Handler**                              | Webhooks call URLs, not Next.js actions                                           |
| Public feed API for external clients | **Route Handler**                              | Standard HTTP semantics, cacheable, callable from any client                      |
| User-triggered summarization         | **Route Handler** (`POST /api/summarize/[id]`) | Returns job ID immediately; needs standard HTTP response codes for polling client |
| Flagging a summary (admin)           | **Server Action**                              | Form mutation, colocated, admin-only                                              |
| File uploads                         | **Route Handler**                              | Multipart form data requires standard HTTP handling                               |

### 4.5 Client Component Islands — Explicit Map

Every `"use client"` directive is deliberate. This is the complete list:

| Component             | Why Client Component                                        |
| --------------------- | ----------------------------------------------------------- |
| `TopicRibbon`         | Active topic state, hover interactions, keyboard navigation |
| `TopicPanel`          | Animated open/close, subcategory hover states               |
| `FeedControls`        | Sort/filter interactions update URL params                  |
| `SearchInput`         | Debounced input, controlled state                           |
| `SummarizeButton`     | Async operation with loading/disabled state                 |
| `SummaryStatusPoller` | Polling interval, `useEffect` for polling lifecycle         |
| `TopicTransition`     | `useTransition` + View Transitions API                      |
| `SourceForm` (admin)  | Controlled form inputs, validation feedback                 |
| `Toast` (Shadcn)      | Global toast state                                          |

Everything else is a Server Component. When in doubt, start with RSC and add `"use client"` only when you encounter a browser API or interactive state requirement.

### 4.6 React 19.2 Feature Utilization

**View Transitions — Topic Switching:**

```typescript
// shared/hooks/useViewTransition.ts
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function useTopicTransition() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigateToTopic = (href: string) => {
    if (!document.startViewTransition) {
      router.push(href);
      return;
    }
    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }
    document.startViewTransition(() => {
      startTransition(() => {
        router.push(href);
      });
    });
  };

  return { navigateToTopic, isPending };
}
```

**React `Activity` — Background Summary Rendering:**

When a user triggers summarization, the `SummaryPanel` renders in a hidden `Activity` state while polling — no layout shift when the summary becomes available, because the DOM is already constructed.

```typescript
// features/article/components/SummaryStatusPoller.tsx
'use client';

import { Activity } from 'react'; // React 19.2
import { SummaryPanel } from './SummaryPanel';
import { useSummaryPoller } from '../hooks/useSummaryPoller';

interface Props {
  articleId: string;
  initialStatus: 'none' | 'pending' | 'ok' | 'failed';
}

export function SummaryStatusPoller({ articleId, initialStatus }: Props) {
  const { status, summary } = useSummaryPoller(articleId, initialStatus);

  return (
    // Activity keeps the DOM alive in 'hidden' mode while status is pending
    // When status becomes 'ok', mode switches to 'visible' — no remount
    <Activity mode={status === 'ok' ? 'visible' : 'hidden'}>
      {summary && <SummaryPanel summary={summary} />}
    </Activity>
  );
}
```

### 4.7 proxy.ts Configuration

`proxy.ts` replaces `middleware.ts` in Next.js 16. It runs at the Node.js network boundary (not the Edge runtime), enabling access to full Node.js APIs.

```typescript
// proxy.ts (root of project — NOT in src/)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Routes requiring admin role — proxy redirects, DAL enforces
const ADMIN_ROUTES = /^\/admin/;
// Routes requiring any authenticated session
const AUTH_ROUTES = /^\/api\/(summarize|source-health)/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Optimistic redirect for admin routes — NOT a security check
  // Security enforcement happens in (admin)/layout.tsx via DAL
  if (ADMIN_ROUTES.test(pathname)) {
    const sessionCookie = request.cookies.get("better-auth.session_token");
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)).*)",
  ],
};
```

**CRITICAL:** The cookie check in `proxy.ts` is UX-only (prevents a flash of the admin UI before redirect). The real authorization check happens in `(admin)/layout.tsx` via `verifySession()` in the DAL, and again in every Server Action.

---

## Section 5: Worker Service Architecture

### 5.1 Complete Directory Structure (Worker Service)

```
worker/
│
├── src/
│   ├── queues/
│   │   ├── index.ts                ← All Queue instances (single file)
│   │   └── connection.ts           ← Shared Redis connection config
│   │
│   ├── schedulers/
│   │   └── index.ts                ← Bootstrap: upsertJobScheduler for all sources
│   │
│   ├── workers/
│   │   ├── ingest.worker.ts        ← Ingestion job processor
│   │   ├── summarize.worker.ts     ← Summarization job processor
│   │   ├── score.worker.ts         ← Importance scoring job processor
│   │   └── feed-slice.worker.ts    ← Redis feed slice refresh processor
│   │
│   ├── jobs/
│   │   ├── ingest/
│   │   │   ├── fetch.ts            ← RSS/Atom fetch with retry
│   │   │   ├── parse.ts            ← Feed parsing (rss-parser adapter)
│   │   │   ├── normalize.ts        ← Re-exports from domain/articles/normalize
│   │   │   ├── deduplicate.ts      ← Re-exports from domain/articles/deduplicate
│   │   │   └── persist.ts          ← Drizzle upsert logic
│   │   ├── summarize/
│   │   │   ├── extract.ts          ← Content extraction (full text retrieval)
│   │   │   ├── prompt.ts           ← Re-exports from domain/summaries/prompt
│   │   │   └── store.ts            ← Summary persistence
│   │   └── score/
│   │       └── compute.ts          ← Re-exports domain/ranking/importance
│   │
│   ├── monitoring/
│   │   └── bull-board.ts           ← Bull Board express server (admin dashboard)
│   │
│   └── index.ts                    ← Worker service entry point + graceful shutdown
│
├── package.json
└── tsconfig.json                   ← Strict mode, paths mirror web app
```

### 5.2 BullMQ Queue Topology

All queue definitions live in a single file for clarity. Producers (web app) import from `lib/queue/index.ts`; consumers (worker) import from `worker/src/queues/index.ts`.

```typescript
// worker/src/queues/index.ts

import { Queue } from "bullmq";
import { connection } from "./connection";

// Queue naming convention: kebab-case, noun-verb
export const ingestQueue = new Queue("article-ingest", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 3600, count: 100 }, // Keep 1h of completed jobs
    removeOnFail: { age: 86400 }, // Keep 24h of failed jobs
  },
});

export const summarizeQueue = new Queue("article-summarize", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 10000 },
    removeOnComplete: { age: 7200, count: 500 },
    removeOnFail: { age: 604800 }, // Keep 7 days for audit
  },
});

export const scoreQueue = new Queue("article-score", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "fixed", delay: 2000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { age: 3600 },
  },
});

export const feedSliceQueue = new Queue("feed-slice-refresh", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: { count: 20 },
    removeOnFail: { age: 1800 },
  },
});
```

```typescript
// worker/src/queues/connection.ts
import { Redis } from "ioredis";

// CRITICAL: maxRetriesPerRequest must be null for BullMQ
// BullMQ uses blocking Redis commands; the default retry limit causes errors
export const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});
```

### 5.3 Job Scheduler Design

A Job Scheduler acts as a factory, producing jobs based on specified "repeat" settings. It is highly flexible, accommodating various scenarios, including jobs produced at fixed intervals, according to cron expressions, or based on custom requirements.

The scheduler bootstraps on worker startup and reads source configurations from PostgreSQL to register one `upsertJobScheduler` per active source:

```typescript
// worker/src/schedulers/index.ts

import { ingestQueue } from "../queues";
import { db } from "../../lib/db";
import { sources } from "../../lib/db/schema";
import { eq } from "drizzle-orm";
import type { IngestJobPayload } from "../../lib/queue/types";

export async function bootstrapSchedulers() {
  const activeSources = await db
    .select()
    .from(sources)
    .where(eq(sources.isActive, true));

  for (const source of activeSources) {
    const schedulerId = `ingest-source-${source.id}`;
    const intervalMs = source.pollIntervalMinutes * 60 * 1000;

    // upsertJobScheduler is idempotent — safe to call on every restart
    // If the scheduler exists with the same settings, it is not modified
    // If settings changed (e.g., admin updated poll interval), it updates
    await ingestQueue.upsertJobScheduler(
      schedulerId,
      { every: intervalMs },
      {
        name: "ingest-source",
        data: {
          sourceId: source.id,
          sourceName: source.name,
          feedUrl: source.feedUrl,
          feedType: source.feedType,
        } satisfies IngestJobPayload,
        opts: {
          priority: source.priority, // 1=high, 2=normal, 3=low
        },
      },
    );
  }

  console.log(
    `[Scheduler] Bootstrapped ${activeSources.length} source schedulers`,
  );
}
```

### 5.4 BullMQ Flow Pattern — Ingestion Pipeline

The `FlowProducer` class allows adding jobs with dependencies such that it is possible to build complex flows. A flow is a tree-like structure of jobs that depend on each other. Whenever the children of a given parent are completed, the parent will be processed, being able to access the children's result data.

The ingestion pipeline uses a Flow: the `feed-slice-refresh` job (parent) waits for all `article-score` jobs (children) to complete before refreshing the Redis cache. This guarantees cache coherency — no stale feed slices.

```typescript
// worker/src/jobs/ingest/persist.ts

import { FlowProducer } from "bullmq";
import { connection } from "../../queues/connection";
import type { NewArticle } from "../../../lib/db/schema";

const flowProducer = new FlowProducer({ connection });

export async function persistAndEnqueuePipeline(
  newArticles: NewArticle[],
  categoryId: string,
  subcategoryId: string,
) {
  if (newArticles.length === 0) return;

  // Atomic flow: score all new articles, THEN refresh the feed slice
  // If any child fails, the parent (feed-slice-refresh) does not run
  await flowProducer.add({
    name: "refresh-feed-slice",
    queueName: "feed-slice-refresh",
    data: { categoryId, subcategoryId },
    children: newArticles.map((article) => ({
      name: "score-article",
      queueName: "article-score",
      data: { articleId: article.id },
    })),
  });
}
```

### 5.5 Worker Concurrency Configuration

Different job types have fundamentally different concurrency limits driven by their bottleneck type:

```typescript
// worker/src/workers/ingest.worker.ts

import { Worker } from "bullmq";
import { connection } from "../queues/connection";
import { runIngestionJob } from "../jobs/ingest";

// INGESTION: I/O-bound (network fetches to RSS sources)
// High concurrency — each job spends most time waiting for HTTP responses
// Optimal: observe production metrics; 50 is a reasonable starting point
export const ingestWorker = new Worker("article-ingest", runIngestionJob, {
  connection,
  concurrency: 50,
  // Rate limit: max 100 ingest jobs per 10 seconds globally
  // Protects RSS sources from being hammered
  limiter: { max: 100, duration: 10_000 },
});
```

```typescript
// worker/src/workers/summarize.worker.ts

import { Worker } from "bullmq";
import { connection } from "../queues/connection";
import { runSummarizationJob } from "../jobs/summarize";

// SUMMARIZATION: AI-API-bound (Anthropic/OpenAI rate limits)
// Low concurrency — AI APIs have strict rate limits (RPM/TPM)
// 5 concurrent means max 5 in-flight AI API calls at once
// Adjust based on your API tier's RPM limit
export const summarizeWorker = new Worker(
  "article-summarize",
  runSummarizationJob,
  {
    connection,
    concurrency: 5,
    // Additional rate limiting at the queue level for AI API compliance
    limiter: { max: 10, duration: 60_000 }, // Max 10/minute
  },
);
```

### 5.6 Idempotency Design

Every job handler must be safe to run twice (retries after partial failure). The design rules:

```typescript
// worker/src/jobs/ingest/persist.ts

// IDEMPOTENCY RULE: Use INSERT ... ON CONFLICT DO UPDATE (upsert)
// Never use INSERT without conflict handling in ingestion
// If a job retries after writing 50 of 100 articles, the remaining 50
// upsert cleanly without creating duplicates

import { db } from "../../../lib/db";
import { articles } from "../../../lib/db/schema";
import { onConflictDoUpdate } from "drizzle-orm/pg-core";

export async function upsertArticles(candidates: NewArticle[]) {
  if (candidates.length === 0) return [];

  return db
    .insert(articles)
    .values(candidates)
    .onConflictDoUpdate({
      target: articles.canonicalUrl, // Unique constraint = idempotency key
      set: {
        title: sql`excluded.title`, // Update if title changed
        excerpt: sql`excluded.excerpt`,
        publishedAt: sql`excluded.published_at`,
        // Do NOT update: importanceScore, hasSummary, summaryStatus
        // (preserve computed state from previous run)
      },
    })
    .returning({ id: articles.id });
}
```

### 5.7 Graceful Shutdown

```typescript
// worker/src/index.ts

import {
  ingestWorker,
  summarizeWorker,
  scoreWorker,
  feedSliceWorker,
} from "./workers";
import { bootstrapSchedulers } from "./schedulers";

const allWorkers = [
  ingestWorker,
  summarizeWorker,
  scoreWorker,
  feedSliceWorker,
];

async function main() {
  await bootstrapSchedulers();
  console.log("[Worker] All workers started");
}

async function shutdown(signal: string) {
  console.log(`[Worker] ${signal} received — graceful shutdown initiated`);

  // Close all workers: wait for in-flight jobs to complete (up to 30s timeout)
  await Promise.all(
    allWorkers.map((worker) =>
      worker.close().catch((err) => {
        console.error(`[Worker] Error closing worker ${worker.name}:`, err);
      }),
    ),
  );

  console.log("[Worker] All workers closed cleanly");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

main().catch((err) => {
  console.error("[Worker] Fatal startup error:", err);
  process.exit(1);
});
```

---

# PART III — COMPONENT DESIGN

---

## Section 6: Data Architecture

### 6.1 Complete Drizzle ORM Schema

This is the **single source of truth** for the database structure. All database changes must start here.

```typescript
// lib/db/schema.ts

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  real,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────

export const feedTypeEnum = pgEnum("feed_type", [
  "rss",
  "atom",
  "json_api",
  "custom",
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
  "failed",
]);

export const articleStatusEnum = pgEnum("article_status", [
  "pending",
  "active",
  "archived",
]);

export const userRoleEnum = pgEnum("user_role", ["reader", "admin"]);

// Custom type for tsvector (PostgreSQL native, not mapped by Drizzle by default)
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

// ─────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  displayOrder: integer("display_order").default(0),
  accentColor: text("accent_color"), // e.g., 'dispatch-amber'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const subcategories = pgTable(
  "subcategories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .references(() => categories.id, { onDelete: "cascade" })
      .notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    categorySlugUnique: uniqueIndex("subcategories_category_slug_unique").on(
      table.categoryId,
      table.slug,
    ),
  }),
);

// ─────────────────────────────────────────
// SOURCES
// ─────────────────────────────────────────

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  feedUrl: text("feed_url").notNull().unique(),
  feedType: feedTypeEnum("feed_type").notNull().default("rss"),
  categoryId: uuid("category_id").references(() => categories.id),
  subcategoryId: uuid("subcategory_id").references(() => subcategories.id),
  // Priority tier: 1=Tier1 (major outlets), 2=Normal, 3=Low
  priority: integer("priority").notNull().default(2),
  pollIntervalMinutes: integer("poll_interval_minutes").notNull().default(15),
  isActive: boolean("is_active").notNull().default(true),
  // Source importance multiplier for article ranking (0.5–2.0)
  importanceMultiplier: real("importance_multiplier").notNull().default(1.0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────
// ARTICLES
// ─────────────────────────────────────────

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .references(() => sources.id, { onDelete: "restrict" })
      .notNull(),
    categoryId: uuid("category_id").references(() => categories.id),
    subcategoryId: uuid("subcategory_id").references(() => subcategories.id),

    // Content fields
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    canonicalUrl: text("canonical_url").notNull(),
    imageUrl: text("image_url"),

    // Deduplication
    contentHash: text("content_hash").notNull(),
    // deduplication_group_id: articles about the same story across sources
    deduplicationGroupId: uuid("deduplication_group_id"),

    // Content availability level (governs whether summarization is possible)
    contentAvailability: contentAvailabilityEnum("content_availability")
      .notNull()
      .default("excerpt"),

    // Ranking
    importanceScore: real("importance_score").notNull().default(0.5),

    // Summary state machine
    hasSummary: boolean("has_summary").notNull().default(false),
    summaryStatus: summaryStatusEnum("summary_status")
      .notNull()
      .default("none"),

    // Lifecycle
    status: articleStatusEnum("status").notNull().default("active"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),

    // Full-text search: generated column (auto-maintained by PostgreSQL)
    // setweight: title = 'A' (highest), excerpt = 'B'
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
    `,
    ),
  },
  (table) => ({
    // Primary deduplication constraint
    canonicalUrlIdx: uniqueIndex("articles_canonical_url_unique").on(
      table.canonicalUrl,
    ),

    // Primary feed query indexes (most critical for performance)
    // These serve: GET /api/articles?category=X&sort=latest
    categoryPublishedIdx: index("articles_category_published_idx").on(
      table.categoryId,
      table.publishedAt.desc(),
    ),
    subcategoryPublishedIdx: index("articles_subcategory_published_idx").on(
      table.subcategoryId,
      table.publishedAt.desc(),
    ),

    // Impact sort index
    categoryScoreIdx: index("articles_category_score_idx").on(
      table.categoryId,
      table.importanceScore.desc(),
    ),

    // Summary-ready filter (for "Summary Ready" sort option)
    hasSummaryIdx: index("articles_has_summary_idx").on(
      table.hasSummary,
      table.categoryId,
    ),

    // FTS: GIN index with fastupdate=off for search latency
    // fastupdate=off is CRITICAL — prevents deferred updates that cause
    // inconsistent search latency. Testing shows ~50x improvement.
    searchVectorGinIdx: index("articles_search_vector_gin_idx")
      .using("gin")
      .on(table.searchVector)
      .with({ fastupdate: false }), // ← NON-NEGOTIABLE

    // Partial index: recent articles only for search (last 30 days)
    // Dramatically reduces index size for the most common search pattern
    recentSearchIdx: index("articles_recent_search_idx")
      .using("gin")
      .on(table.searchVector)
      .where(sql`published_at > NOW() - INTERVAL '30 days'`),

    // Deduplication group lookup
    dedupGroupIdx: index("articles_dedup_group_idx").on(
      table.deduplicationGroupId,
    ),
  }),
);

// ─────────────────────────────────────────
// SUMMARIES
// ─────────────────────────────────────────

export const summaries = pgTable("summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  articleId: uuid("article_id")
    .references(() => articles.id, { onDelete: "cascade" })
    .notNull()
    .unique(), // One summary per article

  summaryText: text("summary_text").notNull(),

  // Structured data from AI response (Zod-validated before storage)
  keyPoints: jsonb("key_points").$type<string[]>().notNull().default([]),
  sourcesCited: jsonb("sources_cited")
    .$type<Array<{ url: string; title: string; relevance: string }>>()
    .notNull()
    .default([]),

  // Provenance — required for trust disclosure
  model: text("model").notNull(), // e.g., 'claude-3-5-haiku-20241022'
  promptVersion: text("prompt_version").notNull(), // e.g., 'v1.2.0'
  tokensUsed: integer("tokens_used"),
  basedOnContent: contentAvailabilityEnum("based_on_content").notNull(),

  // Quality control
  status: summaryStatusEnum("status").notNull().default("ok"),
  flagReason: text("flag_reason"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────
// USERS & AUTH (Better Auth compatible schema)
// ─────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: userRoleEnum("role").notNull().default("reader"),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Better Auth session table (managed by Better Auth, schema must match)
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("sessions_token_unique").on(table.token),
    userIdx: index("sessions_user_idx").on(table.userId),
    expiresIdx: index("sessions_expires_idx").on(table.expiresAt),
  }),
);

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  defaultCategoryId: uuid("default_category_id").references(
    () => categories.id,
  ),
  defaultSubcategoryId: uuid("default_subcategory_id").references(
    () => subcategories.id,
  ),
  defaultSort: text("default_sort").notNull().default("latest"),
  favoriteCategories: jsonb("favorite_categories")
    .$type<string[]>()
    .default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────
// OPERATIONAL TABLES
// ─────────────────────────────────────────

export const ingestionJobs = pgTable(
  "ingestion_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .references(() => sources.id, { onDelete: "cascade" })
      .notNull(),
    bullmqJobId: text("bullmq_job_id"),
    status: text("status").notNull(), // 'running' | 'completed' | 'failed'
    articlesFound: integer("articles_found").default(0),
    articlesNew: integer("articles_new").default(0),
    articlesUpdated: integer("articles_updated").default(0),
    errorMessage: text("error_message"),
    durationMs: integer("duration_ms"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    sourceStartedIdx: index("ingestion_jobs_source_started_idx").on(
      table.sourceId,
      table.startedAt.desc(),
    ),
  }),
);

export const sourceHealthSnapshots = pgTable(
  "source_health_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .references(() => sources.id, { onDelete: "cascade" })
      .notNull(),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    avgDurationMs: real("avg_duration_ms"),
    articlesLast24h: integer("articles_last_24h").default(0),
    snapshotAt: timestamp("snapshot_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    sourceSnapshotIdx: index("source_health_source_snapshot_idx").on(
      table.sourceId,
      table.snapshotAt.desc(),
    ),
  }),
);
```

### 6.2 Entity Relationship Diagram

```
categories (1) ──────────────────────────────── (*) subcategories
     │                                                    │
     │ (1)                                               │ (1)
     │                                                    │
     ▼ (*)                                               ▼ (*)
  sources ──────────────────────────────── ingestion_jobs
     │                                          │
     │ (1)                               source_health_snapshots
     │
     ▼ (*)
  articles ────────── (1:1) ────── summaries
     │
     │ (FK)
     ▼
  categories / subcategories
  (articles belong to one category + one subcategory)

  users ──── (1:1) ──── user_preferences
    │
    └──── (1:*) ──── sessions  [Better Auth managed]
    └──── (1:*) ──── summaries.reviewed_by [nullable FK]
```

### 6.3 Lazy Proxy DB Connection Pattern

The most critical architectural decision with Drizzle in a Next.js monorepo is never creating an eager database connection. Eager connections at module load time cause issues because Next.js modules are imported during the build process where no DB is available. The connection is created only when the first query runs.

```typescript
// lib/db/index.ts

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// All Drizzle return types — inferred, never written manually
type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDB | null = null;

function getDb(): DrizzleDB {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = postgres(url, {
    max: parseInt(process.env.DB_POOL_MAX ?? "10"),
    idle_timeout: 20,
    connect_timeout: 10,
    // postgres.js uses prepared statements by default — excellent for hot paths
    // Disable ONLY if using PgBouncer in transaction mode
    prepare: process.env.DB_DISABLE_PREPARE !== "true",
  });

  _db = drizzle(client, {
    schema,
    logger: process.env.NODE_ENV === "development",
  });
  return _db;
}

// Proxy: importing this module never opens a DB connection
// The connection is created on the first query call
export const db = new Proxy({} as DrizzleDB, {
  get(_, prop: string | symbol) {
    return getDb()[prop as keyof DrizzleDB];
  },
});

export * from "./schema";
```

### 6.4 Migration Strategy

**Never use `drizzle-kit push` in production.** It applies schema changes directly without a migration file, making rollback impossible.

```bash
# Development workflow:
# 1. Edit lib/db/schema.ts
# 2. Generate migration file (review before applying)
pnpm drizzle-kit generate

# 3. Apply to local dev DB
pnpm drizzle-kit migrate

# Production workflow:
# 1. Migration files committed to git alongside schema changes
# 2. Deployed as a pre-deploy step (see Section 12.5 Deployment Checklist)
# The migration runner:
pnpm drizzle-kit migrate  # runs pending migrations in order
```

```typescript
// drizzle.config.ts

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  strict: true,
  verbose: true,
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 6.5 Index Inventory

Complete reference for every index in the system:

| Index Name                           | Table          | Type                   | Columns                                        | Justification                                    |
| ------------------------------------ | -------------- | ---------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `articles_canonical_url_unique`      | articles       | Unique B-tree          | `canonical_url`                                | Deduplication constraint                         |
| `articles_category_published_idx`    | articles       | B-tree                 | `(category_id, published_at DESC)`             | Primary feed query: latest articles per category |
| `articles_subcategory_published_idx` | articles       | B-tree                 | `(subcategory_id, published_at DESC)`          | Feed query: articles per subcategory             |
| `articles_category_score_idx`        | articles       | B-tree                 | `(category_id, importance_score DESC)`         | Impact sort feed query                           |
| `articles_has_summary_idx`           | articles       | B-tree                 | `(has_summary, category_id)`                   | "Summary Ready" filter                           |
| `articles_search_vector_gin_idx`     | articles       | GIN (`fastupdate=off`) | `search_vector`                                | FTS: all-time keyword search                     |
| `articles_recent_search_idx`         | articles       | GIN partial            | `search_vector WHERE published_at > NOW()-30d` | FTS: recent articles (common case)               |
| `articles_dedup_group_idx`           | articles       | B-tree                 | `deduplication_group_id`                       | Group size lookup for ranking                    |
| `subcategories_category_slug_unique` | subcategories  | Unique B-tree          | `(category_id, slug)`                          | Slug uniqueness within category                  |
| `sessions_token_unique`              | sessions       | Unique B-tree          | `token`                                        | Session lookup by token                          |
| `sessions_user_idx`                  | sessions       | B-tree                 | `user_id`                                      | User's active sessions                           |
| `sessions_expires_idx`               | sessions       | B-tree                 | `expires_at`                                   | Session cleanup queries                          |
| `ingestion_jobs_source_started_idx`  | ingestion_jobs | B-tree                 | `(source_id, started_at DESC)`                 | Admin job history queries                        |
| `source_health_source_snapshot_idx`  | source_health  | B-tree                 | `(source_id, snapshot_at DESC)`                | Admin health dashboard                           |

---

## Section 7: Authentication & Authorization Architecture

### 7.1 Better Auth Configuration

```typescript
// lib/auth/index.ts

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
    },
  }),

  // Email + password for admin accounts
  // Social OAuth can be added for reader accounts in Phase 2
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  session: {
    // DB-backed sessions: allows immediate revocation
    // NOT JWT-only — session validity is always DB-checked
    strategy: "database",
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5-minute client-side cache to reduce DB reads
    },
    cookieOptions: {
      httpOnly: true, // Never accessible via JavaScript
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  },

  // CRITICAL for multi-instance production:
  // Sessions must be stored in a shared DB, not in-memory
  // The Drizzle adapter above handles this correctly
  // Verify: process.env.DATABASE_URL points to the same DB across all instances
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
```

### 7.2 Data Access Layer (DAL)

The DAL is the **security enforcement layer**. It is called in every Server Component and Server Action that accesses protected data. `proxy.ts` is UX; the DAL is security.

```typescript
// lib/dal/index.ts

import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "../auth";
import { ROLE_PERMISSIONS, type Permission } from "../auth/permissions";
import type { UserRoleEnum } from "../db/schema";

// React cache() memoizes verifySession within a single request
// Multiple Server Components calling verifySession() in the same render tree
// only hit Better Auth (and the DB) once per request
export const verifySession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // Never return null silently — always throw or redirect
    // Callers handle the redirect (typically in layout.tsx)
    return null;
  }

  return session;
});

// Role-based permission check — call this in Server Actions and Route Handlers
// Uses a static permissions matrix (no DB round-trip for permission check)
export const requirePermission = cache(async (permission: Permission) => {
  const session = await verifySession();
  if (!session) throw new Error("UNAUTHORIZED");

  const role = session.user.role as UserRoleEnum["enumValues"][number];
  const permissions = ROLE_PERMISSIONS[role];

  if (!permissions.includes(permission)) {
    throw new Error(`FORBIDDEN: requires ${permission}`);
  }

  return session;
});
```

### 7.3 Static RBAC Permissions Matrix

For many startups and mid-scale SaaS platforms, storing roles in a database is overkill. Hardcoding a permissions matrix in a TypeScript file is often faster, fully type-safe, and easier to version control.

```typescript
// lib/auth/permissions.ts
// This file is the SINGLE SOURCE OF TRUTH for what each role can do.
// Change a permission here and TypeScript will find every call site.

export type Role = "reader" | "admin";

export type Permission =
  // Article permissions
  | "article:read"
  | "article:request-summary"
  // Admin: source management
  | "source:read"
  | "source:create"
  | "source:update"
  | "source:delete"
  | "source:toggle"
  // Admin: summary management
  | "summary:flag"
  | "summary:regenerate"
  | "summary:disable"
  // Admin: system monitoring
  | "monitoring:read"
  | "jobs:read"
  | "jobs:trigger";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  reader: ["article:read", "article:request-summary"],
  admin: [
    // Admins have all reader permissions plus admin permissions
    "article:read",
    "article:request-summary",
    "source:read",
    "source:create",
    "source:update",
    "source:delete",
    "source:toggle",
    "summary:flag",
    "summary:regenerate",
    "summary:disable",
    "monitoring:read",
    "jobs:read",
    "jobs:trigger",
  ],
};

// Type-safe permission checker — use at Server Component and Action level
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
```

### 7.4 Defense-in-Depth Enforcement

Every protected operation has **three independent enforcement points**. A failure in any two still prevents unauthorized access:

```
Request arrives
     │
     ▼
[1] proxy.ts
    └── Cookie present? No → Redirect to /auth/signin (UX only)
     │
     ▼
[2] (admin)/layout.tsx  ← SERVER COMPONENT
    └── verifySession() → session null? → redirect('/auth/signin')
    └── session.user.role !== 'admin'? → redirect('/403')
     │
     ▼
[3] Server Action / Route Handler
    └── requirePermission('source:create')
    └── Throws UNAUTHORIZED or FORBIDDEN
    └── Never trusts any client-side state
```

---

## Section 8: Ingestion Pipeline Design

### 8.1 Complete Ingestion Job Handler

```typescript
// worker/src/jobs/ingest/index.ts

import type { Job } from "bullmq";
import { fetchFeed } from "./fetch";
import { parseFeed } from "./parse";
import { normalizeFeedItems } from "../../../domain/articles/normalize";
import { deduplicateCandidates } from "../../../domain/articles/deduplicate";
import { upsertArticles } from "./persist";
import { updateSourceHealth } from "./health";
import { db } from "../../../lib/db";
import { ingestionJobs } from "../../../lib/db/schema";
import type { IngestJobPayload } from "../../../lib/queue/types";

export async function runIngestionJob(job: Job<IngestJobPayload>) {
  const { sourceId, feedUrl, feedType } = job.data;
  const startedAt = Date.now();

  // Record job start in DB (for admin monitoring)
  const [dbJob] = await db
    .insert(ingestionJobs)
    .values({
      sourceId,
      bullmqJobId: job.id,
      status: "running",
    })
    .returning();

  try {
    // Step 1: Fetch with timeout + retry (handled by BullMQ backoff)
    const rawFeed = await fetchFeed(feedUrl, {
      timeout: 10_000,
      userAgent: "OneStopNews/1.0 (+https://onestonews.com/bot)",
    });

    // Step 2: Parse to unified format
    const rawItems = await parseFeed(rawFeed, feedType);

    // Step 3: Normalize (domain layer — no framework deps)
    const candidates = normalizeFeedItems(rawItems, sourceId);

    // Step 4: Deduplicate against existing canonical URLs
    const { newArticles, updatedArticles } =
      await deduplicateCandidates(candidates);

    // Step 5: Persist (idempotent upsert)
    const persisted = await upsertArticles([
      ...newArticles,
      ...updatedArticles,
    ]);

    const durationMs = Date.now() - startedAt;

    // Step 6: Update job record
    await db
      .update(ingestionJobs)
      .set({
        status: "completed",
        articlesFound: rawItems.length,
        articlesNew: newArticles.length,
        articlesUpdated: updatedArticles.length,
        durationMs,
        completedAt: new Date(),
      })
      .where(eq(ingestionJobs.id, dbJob.id));

    // Step 7: Update source health
    await updateSourceHealth(sourceId, { success: true, durationMs });

    return {
      articlesNew: newArticles.length,
      articlesUpdated: updatedArticles.length,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db
      .update(ingestionJobs)
      .set({
        status: "failed",
        errorMessage,
        durationMs,
        completedAt: new Date(),
      })
      .where(eq(ingestionJobs.id, dbJob.id));

    await updateSourceHealth(sourceId, {
      success: false,
      durationMs,
      error: errorMessage,
    });

    // Re-throw so BullMQ handles retry + eventual DLQ
    throw error;
  }
}
```

### 8.2 URL Normalization Algorithm

Canonical URL normalization is the backbone of deduplication. Two URLs pointing to the same article must produce the same canonical URL:

```typescript
// domain/articles/normalize.ts

import { URL } from "url";

// Query parameters that identify the article vs. tracking/session params
const ARTICLE_PARAMS = new Set(["id", "p", "article", "story", "post"]);
const STRIP_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
  "msclkid",
  "ref",
  "source",
  "mc_cid",
  "mc_eid",
]);

export function normalizeCanonicalUrl(rawUrl: string): string {
  const url = new URL(rawUrl.trim());

  // 1. Force HTTPS
  url.protocol = "https:";

  // 2. Remove www prefix
  url.hostname = url.hostname.replace(/^www\./, "");

  // 3. Remove trailing slash (except for root)
  if (url.pathname !== "/") {
    url.pathname = url.pathname.replace(/\/$/, "");
  }

  // 4. Remove fragment (everything after #)
  url.hash = "";

  // 5. Strip tracking params; keep article-identifying params
  const paramsToDelete: string[] = [];
  url.searchParams.forEach((_, key) => {
    if (STRIP_PARAMS.has(key.toLowerCase())) {
      paramsToDelete.push(key);
    }
  });
  paramsToDelete.forEach((key) => url.searchParams.delete(key));

  // 6. Sort remaining params for consistency
  url.searchParams.sort();

  return url.toString();
}

export function computeContentHash(
  canonicalUrl: string,
  title: string,
  publishedAt: string,
): string {
  const crypto = require("crypto");
  const input = `${canonicalUrl}|${title.toLowerCase().trim()}|${publishedAt}`;
  return crypto.createHash("sha256").update(input).digest("hex");
}
```

### 8.3 Error Taxonomy and Retry Policy

| Error Type             | Examples                            | Retry Behavior                                      | Outcome                                       |
| ---------------------- | ----------------------------------- | --------------------------------------------------- | --------------------------------------------- |
| **Transient network**  | Timeout, 503, connection reset      | Exponential backoff, 3 attempts                     | DLQ after 3 failures                          |
| **Permanent source**   | 404 feed URL, domain not found      | 1 attempt only, then update source health           | `consecutiveFailures++`; alert at threshold 5 |
| **Parse error**        | Invalid XML, unexpected feed format | 1 attempt (parse errors are deterministic)          | Log + DLQ; don't retry                        |
| **Rate limit**         | 429 from source                     | Exponential backoff with longer initial delay (30s) | Back to queue                                 |
| **Content extraction** | Article page blocked, paywalled     | Mark `content_availability = excerpt`               | Continue; don't fail job                      |

---

## Section 9: AI Summarization Pipeline Design

### 9.1 AI Client Wrapper

```typescript
// lib/ai/index.ts

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// Unified interface — both providers satisfy this contract
interface AICompletionRequest {
  model: string;
  prompt: string;
  maxTokens: number;
  temperature?: number;
}

interface AICompletionResponse {
  text: string;
  tokensUsed: number;
  model: string;
}

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Primary: Anthropic Claude 3.5 Haiku (cost-effective, fast, good quality)
// Fallback: OpenAI GPT-4o-mini (if Anthropic quota exceeded)
export async function generateCompletion(
  request: AICompletionRequest,
): Promise<AICompletionResponse> {
  const isAnthropic = request.model.startsWith("claude");

  if (isAnthropic) {
    const response = await anthropicClient.messages.create({
      model: request.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature ?? 0.3,
      messages: [{ role: "user", content: request.prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return {
      text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      model: request.model,
    };
  }

  // OpenAI fallback
  const response = await openaiClient.chat.completions.create({
    model: request.model,
    max_tokens: request.maxTokens,
    temperature: request.temperature ?? 0.3,
    messages: [{ role: "user", content: request.prompt }],
    response_format: { type: "json_object" },
  });

  return {
    text: response.choices[0].message.content ?? "",
    tokensUsed: response.usage?.total_tokens ?? 0,
    model: request.model,
  };
}
```

### 9.2 AI Model Configuration

```typescript
// lib/ai/models.ts

export const AI_MODELS = {
  // Primary: fast, cheap, good quality for news summarization
  PRIMARY: "claude-3-5-haiku-20241022",
  // Fallback: comparable quality, different provider
  FALLBACK: "gpt-4o-mini",
} as const;

export const TOKEN_BUDGETS = {
  // Input: enough for ~2000 words of article content + system prompt
  INPUT_MAX: 3000,
  // Output: enough for a quality summary with citations
  OUTPUT_MAX: 800,
} as const;

// Cost proxy for monitoring (USD per 1M tokens — update when pricing changes)
export const COST_PER_1M_TOKENS = {
  [AI_MODELS.PRIMARY]: { input: 0.8, output: 4.0 },
  [AI_MODELS.FALLBACK]: { input: 0.15, output: 0.6 },
} as const;

export function estimateCost(model: string, tokensUsed: number): number {
  const pricing = COST_PER_1M_TOKENS[model as keyof typeof COST_PER_1M_TOKENS];
  if (!pricing) return 0;
  // Approximate split: 75% input, 25% output
  const inputTokens = tokensUsed * 0.75;
  const outputTokens = tokensUsed * 0.25;
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}
```

### 9.3 Prompt Template

```typescript
// domain/summaries/prompt.ts

export function buildSummarizationPrompt(
  title: string,
  content: string,
  sourceUrl: string,
  sourceName: string,
): string {
  return `You are a news summarization assistant. Your task is to summarize the following article with strict fidelity to the source material.

RULES:
1. Summarize ONLY what is stated in the article — no interpretation, no speculation
2. Use clear, direct language accessible to a general audience
3. Extract 3–5 key points as bullet points
4. Identify which specific facts came from which sources if multiple sources are mentioned
5. Never add information not present in the source article
6. If the article is paywalled or incomplete, note this in your response

ARTICLE:
Title: ${title}
Source: ${sourceName} (${sourceUrl})
Content:
${content.slice(0, 4000)} ${content.length > 4000 ? "\n[Content truncated for length]" : ""}

Respond with valid JSON matching this exact structure:
{
  "summaryText": "2–3 paragraph summary of the article",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "sourcesCited": [
    {
      "url": "https://source-url.com/article",
      "title": "Source article title",
      "relevance": "This source provided the market data in paragraph 2"
    }
  ],
  "contentComplete": true
}`;
}
```

### 9.4 Zod Response Schema

````typescript
// domain/summaries/parse.ts

import { z } from "zod";

const SummaryResponseSchema = z.object({
  summaryText: z
    .string()
    .min(50, "Summary too short")
    .max(2000, "Summary too long"),
  keyPoints: z.array(z.string().min(10).max(300)).min(1).max(7),
  sourcesCited: z
    .array(
      z.object({
        url: z.string().url(),
        title: z.string().min(3).max(200),
        relevance: z.string().min(10).max(300),
      }),
    )
    .default([]),
  contentComplete: z.boolean(),
});

export type SummaryResponse = z.infer<typeof SummaryResponseSchema>;

export function parseSummaryResponse(rawText: string): SummaryResponse {
  let parsed: unknown;

  try {
    // Handle model responses that wrap JSON in markdown code blocks
    const jsonMatch =
      rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      rawText.match(/(\{[\s\S]*\})/);
    const jsonText = jsonMatch ? jsonMatch[1] : rawText;
    parsed = JSON.parse(jsonText.trim());
  } catch {
    throw new Error(`AI response is not valid JSON: ${rawText.slice(0, 200)}`);
  }

  // Zod parse: throws if model output doesn't match schema
  // This is the output filter that rejects malformed or injection attempts
  return SummaryResponseSchema.parse(parsed);
}
````

---

## Section 10: Search Architecture

### 10.1 FTS Query Builder

```typescript
// features/search/queries.ts

import { db } from "../../lib/db";
import {
  articles,
  categories,
  subcategories,
  sources,
} from "../../lib/db/schema";
import { sql, and, gte, lte, eq, desc } from "drizzle-orm";

interface SearchParams {
  query: string;
  categoryId?: string;
  subcategoryId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  cursor?: string; // Cursor-based pagination (not offset)
}

export async function searchArticles(params: SearchParams) {
  const {
    query,
    categoryId,
    subcategoryId,
    fromDate,
    toDate,
    limit = 20,
    cursor,
  } = params;

  // websearch_to_tsquery handles natural language input gracefully:
  // "apple AI chip" → 'apple' & 'ai' & 'chip'
  // "apple OR google" → 'apple' | 'google'
  // It does NOT throw on malformed input (unlike to_tsquery)
  const tsQuery = sql`websearch_to_tsquery('english', ${query})`;

  // ts_rank_cd: cover density ranking — considers term proximity
  const relevanceScore = sql`ts_rank_cd(search_vector, ${tsQuery})`;

  const conditions = [
    sql`search_vector @@ ${tsQuery}`,
    eq(articles.status, "active"),
    ...(categoryId ? [eq(articles.categoryId, categoryId)] : []),
    ...(subcategoryId ? [eq(articles.subcategoryId, subcategoryId)] : []),
    ...(fromDate ? [gte(articles.publishedAt, fromDate)] : []),
    ...(toDate ? [lte(articles.publishedAt, toDate)] : []),
    ...(cursor ? [sql`published_at < ${new Date(cursor)}`] : []),
  ];

  const results = await db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      canonicalUrl: articles.canonicalUrl,
      publishedAt: articles.publishedAt,
      hasSummary: articles.hasSummary,
      relevance: relevanceScore,
      categorySlug: categories.slug,
      sourceName: sources.name,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(sources, eq(articles.sourceId, sources.id))
    .where(and(...conditions))
    .orderBy(desc(relevanceScore), desc(articles.publishedAt))
    .limit(limit + 1); // Fetch one extra to determine hasNextPage

  const hasNextPage = results.length > limit;
  const items = hasNextPage ? results.slice(0, limit) : results;
  const nextCursor = hasNextPage
    ? items[items.length - 1].publishedAt.toISOString()
    : null;

  return { items, nextCursor, hasNextPage };
}

// Autocomplete: pg_trgm trigram similarity
// Runs on title only — much faster than full FTS for suggestions
export async function autocompleteArticles(partial: string) {
  if (partial.length < 2) return [];

  return db
    .select({ id: articles.id, title: articles.title })
    .from(articles)
    .where(
      and(
        sql`title % ${partial}`, // pg_trgm similarity operator
        sql`similarity(title, ${partial}) > 0.2`,
        eq(articles.status, "active"),
        sql`published_at > NOW() - INTERVAL '7 days'`,
      ),
    )
    .orderBy(sql`similarity(title, ${partial}) DESC`)
    .limit(5);
}
```

---

## Section 11: Caching & Performance Architecture

### 11.1 Complete Cache Topology

```
INCOMING REQUEST
       │
       ▼
┌─────────────────────────────────────────────┐
│  CDN Edge (Cloudflare / Vercel Edge)         │
│  Serves: PPR static shells (HTML + assets)   │
│  TTL: until Next.js invalidates via          │
│        revalidateTag()                       │
│  Cache key: URL path                         │
└──────────────────┬──────────────────────────┘
                   │ Dynamic content / cache miss
                   ▼
┌─────────────────────────────────────────────┐
│  Next.js Cache Layer                         │
│  ("use cache" directives)                    │
│                                              │
│  CategoryShell RSC: 120s revalidate          │
│  SubcategoryGrid RSC: 300s revalidate        │
│  CategoryCounts RSC: 300s revalidate         │
│                                              │
│  Cache tags: 'feed', 'category-{id}',        │
│  'subcategory-{id}', 'article-{id}'          │
└──────────────────┬──────────────────────────┘
                   │ Article feed data
                   ▼
┌─────────────────────────────────────────────┐
│  Redis Feed Slices                           │
│                                              │
│  Key: feed:{categoryId}:{subcatId}:{sort}    │
│  Value: JSON array of article IDs            │
│  TTL: 300 seconds                            │
│  Populated by: Worker after ingestion        │
│  Invalidated by: Worker on new articles      │
│                                              │
│  Hot categories (pre-warmed):                │
│  top-stories, tech/ai-ml, finance/markets    │
└──────────────────┬──────────────────────────┘
                   │ ID list → hydrate articles
                   ▼
┌─────────────────────────────────────────────┐
│  PostgreSQL 17                               │
│  WHERE id = ANY($1) — single indexed lookup  │
│  Prepared statement (postgres.js default)    │
│  Connection pool: max 10 per instance        │
└─────────────────────────────────────────────┘
```

### 11.2 Cache Invalidation Strategy

```typescript
// lib/cache/invalidation.ts
// Called by the Worker Service after ingestion via a Next.js revalidation API

import { revalidateTag } from "next/cache";

// Tags used throughout the codebase — defined once, used everywhere
export const CACHE_TAGS = {
  feed: "feed",
  category: (id: string) => `category-${id}`,
  subcategory: (id: string) => `subcategory-${id}`,
  article: (id: string) => `article-${id}`,
  categories: "categories", // Category list and counts
} as const;

// Called by worker after ingestion for a category
// Invalidates the feed shell + any cached category data
export function invalidateCategoryCache(
  categoryId: string,
  subcategoryId?: string,
) {
  revalidateTag(CACHE_TAGS.category(categoryId));
  if (subcategoryId) {
    revalidateTag(CACHE_TAGS.subcategory(subcategoryId));
  }
  revalidateTag(CACHE_TAGS.feed);
}

// Called by worker after article summarization completes
export function invalidateArticleCache(articleId: string) {
  revalidateTag(CACHE_TAGS.article(articleId));
}
```

### 11.3 Redis Feed Slice Pattern

```typescript
// lib/redis/feed-slices.ts

import { redis } from "./index";

const FEED_SLICE_TTL = 300; // seconds

function feedSliceKey(
  categoryId: string,
  subcategoryId: string,
  sort: string,
): string {
  return `feed:${categoryId}:${subcategoryId}:${sort}`;
}

export async function getFeedSlice(
  categoryId: string,
  subcategoryId: string,
  sort: string,
): Promise<string[] | null> {
  const key = feedSliceKey(categoryId, subcategoryId, sort);
  const cached = await redis.get(key);
  if (!cached) return null;
  return JSON.parse(cached) as string[];
}

export async function setFeedSlice(
  categoryId: string,
  subcategoryId: string,
  sort: string,
  articleIds: string[],
): Promise<void> {
  const key = feedSliceKey(categoryId, subcategoryId, sort);
  await redis.setex(key, FEED_SLICE_TTL, JSON.stringify(articleIds));
}

export async function invalidateFeedSlice(
  categoryId: string,
  subcategoryId?: string,
): Promise<void> {
  // Pattern delete — invalidate all sort variants for this category
  const pattern = subcategoryId
    ? `feed:${categoryId}:${subcategoryId}:*`
    : `feed:${categoryId}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### 11.4 Core Web Vitals Targets Per Route

| Route             | FCP Target | LCP Target | CLS Target | INP Target | Mechanism                                |
| ----------------- | ---------- | ---------- | ---------- | ---------- | ---------------------------------------- |
| `/` (Top Stories) | ≤500ms     | ≤1.2s      | <0.1       | <200ms     | PPR static shell from CDN                |
| `/topics/[cat]`   | ≤600ms     | ≤1.5s      | <0.1       | <200ms     | PPR + 120s cache                         |
| `/article/[id]`   | ≤800ms     | ≤2.0s      | <0.1       | <200ms     | Dynamic; summary Activity prevents shift |
| Search results    | ≤600ms     | ≤1.5s      | <0.1       | <200ms     | Suspense + skeleton                      |

---

# PART IV — OPERATIONS & DELIVERY

---

## Section 12: Infrastructure, Observability & Runbooks

### 12.1 Docker Compose (Development)

```yaml
# docker-compose.yml

services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: onestonews
      POSTGRES_PASSWORD: dev_password_change_in_prod
      POSTGRES_DB: onestonews_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      # Enable pg_trgm and pg_textsearch extensions on init
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U onestonews"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory-policy noeviction
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
      target: development
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://onestonews:dev_password_change_in_prod@postgres:5432/onestonews_dev
      REDIS_URL: redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
      target: development
    environment:
      DATABASE_URL: postgresql://onestonews:dev_password_change_in_prod@postgres:5432/onestonews_dev
      REDIS_URL: redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:
```

```sql
-- docker/init.sql
-- PostgreSQL extensions required by OneStopNews

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- Trigram similarity for autocomplete
-- pg_textsearch (BM25) installed in Phase 2 — verify managed PG support first
```

### 12.2 Environment Variable Schema

All environment variables are validated at startup via Zod. Absence of a required variable causes immediate startup failure with a clear error — never a silent bug.

```typescript
// lib/env/index.ts

import { z } from "zod";

const envSchema = z.object({
  // ── Database ──────────────────────────────────
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid PostgreSQL connection URL"),
  DB_POOL_MAX: z.coerce.number().default(10),
  DB_DISABLE_PREPARE: z.enum(["true", "false"]).default("false"),

  // ── Redis ─────────────────────────────────────
  REDIS_URL: z.string().url("REDIS_URL must be a valid Redis connection URL"),

  // ── Better Auth ───────────────────────────────
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url(),

  // ── AI APIs ───────────────────────────────────
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
  OPENAI_API_KEY: z.string().startsWith("sk-").optional(),

  // ── Application ───────────────────────────────
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // ── Worker-only (not required in web app) ─────
  WORKER_CONCURRENCY_INGEST: z.coerce.number().default(50),
  WORKER_CONCURRENCY_SUMMARIZE: z.coerce.number().default(5),
  BULL_BOARD_PORT: z.coerce.number().default(3001),
  BULL_BOARD_USERNAME: z.string().optional(),
  BULL_BOARD_PASSWORD: z.string().optional(),
});

// Validate at module load — will throw on startup if vars are missing
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parseResult.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parseResult.data;
export type Env = typeof env;
```

**Secret vs. Non-Secret classification:**

| Variable              | Secret        | Reason                                                     |
| --------------------- | ------------- | ---------------------------------------------------------- |
| `DATABASE_URL`        | ✅ Secret     | Contains DB credentials                                    |
| `REDIS_URL`           | ✅ Secret     | May contain auth token                                     |
| `BETTER_AUTH_SECRET`  | ✅ Secret     | Signs session tokens — rotation = all sessions invalidated |
| `ANTHROPIC_API_KEY`   | ✅ Secret     | API billing                                                |
| `OPENAI_API_KEY`      | ✅ Secret     | API billing                                                |
| `BULL_BOARD_PASSWORD` | ✅ Secret     | Admin dashboard auth                                       |
| `NODE_ENV`            | ❌ Not secret | Build-time configuration                                   |
| `NEXT_PUBLIC_APP_URL` | ❌ Not secret | Public URL                                                 |
| `DB_POOL_MAX`         | ❌ Not secret | Tuning parameter                                           |

### 12.3 Structured Logging Schema

```typescript
// lib/logger/index.ts

interface LogEntry {
  timestamp: string; // ISO 8601
  level: "debug" | "info" | "warn" | "error";
  message: string;
  service: "web" | "worker";
  correlationId?: string; // Request ID or Job ID — propagated through all calls
  jobId?: string;
  jobName?: string;
  sourceId?: string;
  articleId?: string;
  userId?: string; // Hashed — never raw user ID in logs
  durationMs?: number;
  error?: {
    message: string;
    stack?: string; // Only in development
    code?: string;
  };
  // Sensitive fields NEVER logged:
  // session tokens, email addresses, raw content, AI prompts
}

export function createLogger(service: "web" | "worker") {
  return {
    info: (message: string, meta?: Partial<LogEntry>) =>
      log("info", message, service, meta),
    warn: (message: string, meta?: Partial<LogEntry>) =>
      log("warn", message, service, meta),
    error: (message: string, meta?: Partial<LogEntry>) =>
      log("error", message, service, meta),
  };
}

function log(
  level: LogEntry["level"],
  message: string,
  service: "web" | "worker",
  meta?: Partial<LogEntry>,
) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service,
    ...meta,
  };
  // Output structured JSON for log aggregation (Datadog, Logtail, CloudWatch)
  process.stdout.write(JSON.stringify(entry) + "\n");
}
```

### 12.4 Alerting Rules

| Alert Name              | Condition                                     | Severity | Channel        |
| ----------------------- | --------------------------------------------- | -------- | -------------- |
| `IngestSourceDown`      | `consecutiveFailures >= 5` for any source     | P2       | Slack #alerts  |
| `IngestHighFailureRate` | >20% of ingest jobs failed in last 1h         | P1       | PagerDuty      |
| `SummarizeErrorSpike`   | Summarize error rate >10% in last 15min       | P2       | Slack #alerts  |
| `FeedFreshnessLow`      | Top Stories feed has <10 articles in last 24h | P1       | PagerDuty      |
| `APILatencyHigh`        | p95 `/api/articles` >1000ms for 5min          | P2       | Slack #alerts  |
| `BullMQDLQGrowing`      | DLQ items >50 for any queue                   | P2       | Slack #alerts  |
| `RedisMemoryHigh`       | Redis memory >80% of max                      | P1       | PagerDuty      |
| `DBConnectionsHigh`     | PG active connections >80% of max_connections | P2       | Slack #alerts  |
| `SummarizeCostSpike`    | Daily AI cost estimate >2× 7-day average      | P3       | Slack #finance |

### 12.5 Runbook: Ingestion Source Failure

**Symptom:** Alert `IngestSourceDown` fires for source X.

```
1. CHECK: Admin UI → /admin/jobs → Filter by source X
   → Review last 5 job failure messages

2. DIAGNOSE common causes:
   a. Feed URL changed    → Check source's website manually; update feed URL in /admin/sources
   b. Source is down      → Check source uptime externally; wait and re-enable when back
   c. Parse error         → Feed format changed; check error message for XML/JSON parse failure
   d. Rate limited (429)  → Increase pollIntervalMinutes for this source
   e. IP blocked          → Contact source; check if a CDN/proxy is needed

3. FIX:
   a. Update source in /admin/sources
   b. Click "Test connection" to verify fix
   c. Re-enable source
   d. Manually trigger ingestion: POST /api/ingest (admin-only) with { sourceId }

4. VERIFY: Source health snapshot shows lastSuccessAt within last poll interval

5. ESCALATE if: Source has been down >24h AND it's a Tier 1 source → P1
```

### 12.6 Runbook: AI Summarization API Incident

**Symptom:** Alert `SummarizeErrorSpike` fires; admin summary audit shows `failed` status on recent summaries.

```
1. CHECK: Worker logs → grep for 'summarize' + 'error'
   → Identify error type: RateLimit, AuthenticationError, NetworkError

2. DIAGNOSE:
   a. RateLimitError (429)    → AI API quota exceeded
   b. AuthenticationError     → API key expired or revoked
   c. NetworkError            → Connectivity issue to AI API endpoint
   d. SchemaValidationError   → Model response changed format (check Zod error)

3. IMMEDIATE MITIGATION:
   a. RateLimit → Reduce WORKER_CONCURRENCY_SUMMARIZE to 2; increase limiter.duration
   b. AuthError → Rotate API key in secrets manager; restart worker
   c. NetworkError → Check AI provider status page; temporary — wait and retry
   d. SchemaError → Pause summarize queue: redis-cli> PAUSE bullmq:article-summarize
                    → Fix Zod schema → Deploy worker → Resume queue

4. VERIFY: Summarize error rate drops below 5% within 15 minutes of fix

5. REVIEW: All summaries with status='failed' during incident → consider mass retry:
   redis-cli> LRANGE bullmq:article-summarize:failed 0 -1
```

### 12.7 Zero-Downtime Migration Procedure

```bash
# Step 1: Generate migration (developer workstation)
pnpm drizzle-kit generate
# Review generated SQL in src/lib/db/migrations/

# Step 2: Test migration against staging DB
DATABASE_URL=$STAGING_DB pnpm drizzle-kit migrate
# Run full test suite against staging

# Step 3: Verify backward compatibility
# New columns MUST have defaults OR be nullable
# No column renames (add new, migrate data, drop old in separate deploy)
# No index removal without confirming no queries depend on it

# Step 4: Deploy migration BEFORE deploying application code
# Both old and new application code must work with the migrated schema
DATABASE_URL=$PRODUCTION_DB pnpm drizzle-kit migrate

# Step 5: Deploy web app (no downtime — stateless)
# Deploy worker (graceful shutdown waits for in-flight jobs)

# Step 6: Post-deploy verification
# Check: all API endpoints return 200
# Check: ingestion job completes successfully
# Check: worker logs show no schema errors
```

### 12.8 Deployment Checklist

**Pre-Deploy:**

- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript strict mode passes (`pnpm typecheck`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] Migration reviewed and tested on staging
- [ ] Environment variables for new features set in production secrets
- [ ] AI API rate limit capacity verified for any new summarization features

**Deploy:**

- [ ] Run database migrations FIRST (before application deploy)
- [ ] Deploy web app (rolling deploy — maintain 2+ instances during rollout)
- [ ] Deploy worker (SIGTERM graceful shutdown confirmed)
- [ ] Redis feed slices auto-warm on first post-deploy ingestion cycle

**Post-Deploy:**

- [ ] Verify `GET /api/categories` returns 200
- [ ] Verify `GET /api/articles` returns feed data
- [ ] Verify `/` renders correctly in production
- [ ] Verify BullMQ job monitor shows schedulers active
- [ ] Confirm first ingestion cycle completes after deploy
- [ ] Monitor Slack #alerts for 30 minutes post-deploy

---

## Appendix A: Complete Technology Stack Reference

| Layer             | Technology                 | Version              | Purpose                                     |
| ----------------- | -------------------------- | -------------------- | ------------------------------------------- |
| Web Framework     | Next.js                    | 16                   | Full-stack web app + API                    |
| UI Runtime        | React                      | 19.2                 | Component model, View Transitions, Activity |
| Language          | TypeScript                 | 5.x strict           | Type safety across web + worker             |
| Build System      | Turbopack                  | (Next.js 16 default) | Bundling + HMR                              |
| Styling           | Tailwind CSS               | v4                   | Utility-first styling                       |
| Component Library | Shadcn UI + Radix          | Latest               | Accessible UI primitives                    |
| ORM               | Drizzle ORM                | Latest               | Type-safe PostgreSQL access                 |
| DB Driver         | postgres (postgres.js)     | Latest               | Prepared statements, pooling                |
| Validation        | Zod                        | 3.x                  | Runtime type validation everywhere          |
| Auth              | Better Auth                | Latest               | Session auth + RBAC                         |
| Database          | PostgreSQL                 | 17                   | Primary datastore                           |
| FTS Extension     | pg_trgm                    | (bundled)            | Autocomplete + fuzzy search                 |
| FTS Extension     | pg_textsearch BM25         | Latest               | BM25 relevance ranking (Phase 2)            |
| Queue             | BullMQ                     | 5.x                  | Job queue + scheduling                      |
| Queue Backend     | Redis (Upstash)            | 7.x                  | BullMQ persistence + feed slices            |
| Worker Runtime    | Node.js                    | 24 LTS               | Worker service runtime                      |
| AI: Primary       | Anthropic Claude 3.5 Haiku | Latest               | Summarization                               |
| AI: Fallback      | OpenAI GPT-4o-mini         | Latest               | Summarization fallback                      |
| RSS Parsing       | rss-parser                 | Latest               | Feed parsing                                |
| Container         | Docker + Docker Compose    | Latest               | Local development                           |

## Appendix B: Key Architectural Principles (Quick Reference)

1. **Proxy is UX; DAL is security.** Never treat `proxy.ts` as the authorization boundary.
2. **Never eager-connect the database.** Always use the lazy proxy pattern.
3. **GIN index `fastupdate=off` is mandatory.** Without it, FTS latency is ~50× worse.
4. **BullMQ `maxRetriesPerRequest: null` is mandatory.** Without it, blocking commands throw.
5. **`upsertJobScheduler` is idempotent.** Call it on every worker restart — safe.
6. **FlowProducer is not a Job Scheduler.** Use Job Scheduler to trigger root jobs; use FlowProducer inside a job handler to fan out child jobs.
7. **All DB mutations are upserts.** Every ingestion write uses `onConflictDoUpdate` for retry safety.
8. **Every AI summary must show sources.** No exceptions — it's a trust requirement, not a UX preference.
9. **Server Components by default.** Only add `"use client"` when you have a concrete, specific reason.
10. **Migrations before application code.** Never deploy application code first — schema must be backward-compatible for the duration of a rolling deploy.

---

_End of OneStopNews Project Architecture Document v1.0_

_Next recommended step: Phase 1 Implementation Plan — breaking this PAD into a sequenced sprint plan with acceptance criteria per feature._
