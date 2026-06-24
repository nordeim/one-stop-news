Research locked and loaded. All 4 dimensions confirmed with authoritative 2025–2026 sources. Now executing the full PAD — no more research needed.

OneStopNews — Project Architecture Document (PAD) v1.0
Classification: Internal Technical Reference Status: Authoritative Companion to: PRD v2.0 Last Updated: June 2026 Audience: Engineers, Tech Leads, DevOps

Table of Contents
text

PART I   — SYSTEM OVERVIEW & DECISIONS
  §1  Document Metadata & How to Use This PAD
  §2  Architecture Decision Records (ADRs 001–007)

PART II  — SYSTEM ARCHITECTURE
  §3  High-Level System Topology
  §4  Next.js 16 Web App Architecture
  §5  Worker Service Architecture
  §6  Data Architecture

PART III — COMPONENT DESIGN
  §7  Authentication & Authorization Architecture
  §8  Ingestion Pipeline Design
  §9  AI Summarization Pipeline Design
  §10 Search Architecture
  §11 Caching & Performance Architecture

PART IV  — OPERATIONS & DELIVERY
  §12 Infrastructure, Observability & Runbooks
PART I — SYSTEM OVERVIEW & DECISIONS
§1 — Document Metadata & How to Use This PAD
1.1 Purpose
This Project Architecture Document is the single authoritative technical reference for OneStopNews. It answers the question every senior engineer asks before writing their first line of code: "How is this system built, and exactly why?"

It is not a summary. Every section is written at a depth sufficient to onboard a new engineer without additional verbal explanation. Code samples are production-representative, not pseudocode.

1.2 Relationship to Other Documents
Document	Relationship
PRD v2.0	Defines what the system does and why. This PAD defines how.
ADRs (§2)	Embedded in this PAD. Each major technology choice is a formal decision record.
Runbooks (§12)	Operational procedures derived from the architecture defined here.
1.3 How to Navigate
Starting a new feature? Read §4 (Web App layer model) + §6 (schema) + the relevant component section (§7–§11).
Debugging ingestion? Read §5 (Worker architecture) + §8 (Ingestion pipeline) + §12 (Runbooks).
Reviewing a technology choice? Go directly to the relevant ADR in §2.
Setting up local dev? Go to §12.1 (Docker Compose + env vars).
1.4 Conventions Used in This Document
text

// CODE BLOCKS: Production-representative TypeScript.
//              All imports shown. No implicit dependencies.

[CRITICAL]    → Must not be violated. Security or data integrity risk.
[IMPORTANT]   → Should not be violated without explicit team decision.
[NOTE]        → Informational. Rationale or context.
[ROADMAP]     → Documented future work; not in V1 scope.
§2 — Architecture Decision Records
Each ADR follows the structure: Context → Decision → Rationale → Consequences → Alternatives Rejected.

ADR-001: Next.js 16 App Router as the Web Framework
Status: Accepted Date: June 2026

Context
OneStopNews needs a production-grade web framework capable of:

Server-side rendering for SEO and fast initial loads on news feeds.
A component model that blends static pre-rendering with dynamic, per-request data.
A clean API layer without a separate backend service.
TypeScript-native development with strong ecosystem support.
Decision
Next.js 16 with App Router, Partial Pre-Rendering (PPR), and Cache Components.

Rationale
31
 Cache Components are a new set of features designed to make caching both more explicit and more flexible. They center around the `"use cache"` directive, which can be used to cache pages, components, and functions, and which leverages the compiler to automatically generate cache keys wherever it's used. Unlike the implicit caching found in previous versions of the App Router, caching with Cache Components is entirely opt-in. This is precisely what a news feed requires: dynamic article counts and breaking news must never be accidentally cached, while category navigation, layouts, and stable content can be aggressively cached at the component level. 
31
 Next.js 16 ships with React 19.2, including View Transitions, `useEffectEvent()`, and the `<Activity/>` component. These React features are directly useful for OneStopNews: View Transitions animate topic-switching navigation; `<Activity>` renders the AI summary panel in the background without blocking the feed. 
35
 Next.js 16 requires Node.js 20.9.0 minimum (Node.js 18 is dropped). This is consistent with our Worker's Node.js 24+ requirement — no divergence in runtime assumptions.
Consequences
Positive:

Cache Components eliminate the "everything is statically cached by default" footgun of Next.js 13/14.
PPR delivers sub-100ms TTFB for the static shell while streaming dynamic feed content.
Server Actions replace the boilerplate of separate API routes for most mutations.
Turbopack is now the default bundler — significantly faster HMR in development.
Negative:

"use cache" has a hard rule: 
35
you cannot call cookies(), headers(), or read params directly inside a "use cache" function. Every cached component must receive runtime values as arguments from an uncached parent. This requires discipline in component structure.
PPR is route-level — every page must be explicitly designed around its static/dynamic boundary.
Alternatives Rejected
Alternative	Reason Rejected
Next.js 15 (Pages Router)	No RSC, no Cache Components, no PPR. Inferior rendering model for a data-heavy news app.
Remix v3	Excellent routing model but smaller ecosystem; no PPR equivalent.
SvelteKit	Compelling but React 19.2 Activity and View Transitions are specifically useful here; team alignment on React.
Express + React SPA	Requires separate SSR infrastructure; no first-class caching; much higher operational overhead.
ADR-002: BullMQ on Redis as the Job Queue
Status: Accepted Date: June 2026

Context
OneStopNews requires a job queue that handles:

Scheduled RSS polling (50–200 sources, every 5–30 minutes each).
Priority-differentiated summarization jobs (user-triggered = high priority; background batch = low).
Dependent job chains (ingest → score → refresh feed slice).
Failed job handling with dead-letter queues.
A monitoring dashboard for the admin interface.
Resilience: jobs must not be lost if a worker crashes mid-execution.
Decision
BullMQ v5 on Redis (Upstash managed).

Rationale
13
 BullMQ supports configurable concurrency per worker and powers video transcoding, AI pipelines, payment processing, and millions of background jobs at companies worldwide since 2011. It is the established Node.js solution for exactly this workload profile. 
15
 Flows are added to a queue using the `FlowProducer` class. In order to create "flows" you must use the `FlowProducer` class. The `add` method accepts an object with a `name`, `queueName`, optional `data`, and optional `children`. This maps directly to our ingest → score → refresh pipeline: the parent job (`refresh-feed-slice`) only runs after all child jobs complete. 
11
 The `upsertJobScheduler` is used instead of `add` to simplify management of recurring jobs, especially in production deployments. It ensures the scheduler is updated or created without duplications. This is critical for our RSS polling scheduler — on every worker restart, `upsertJobScheduler` is called idempotently for all 200 sources.
Consequences
Positive:

Job persistence in Redis: no lost jobs on worker crash.
Priority queues: user-triggered summarization (priority 1) bypasses background scoring jobs (priority 10).
FlowProducer for DAG job chains.
Built-in concurrency: I/O-bound ingestion workers can run 50–100 concurrent jobs.
Taskforce.sh / BullMQ Board for real-time monitoring dashboard.
Negative:

Redis is a required infrastructure dependency. Upstash managed Redis removes operational burden, but it adds one more external service.
11
 The scheduler only generates new jobs when the last job begins processing. Therefore, if the queue is very busy or there are not enough workers, jobs may run less frequently than the specified interval. Under extreme load, low-priority sources may miss a polling cycle. This is acceptable behavior — the health snapshot tracks lag.
Alternatives Rejected
Alternative	Reason Rejected
AWS SQS	No job priorities, no parent-child job dependencies, no built-in monitoring dashboard, no per-job retry state. Suited for simple fire-and-forget.
RabbitMQ	Powerful but adds significant operational complexity (AMQP protocol, Erlang runtime, exchange/queue topology). Overkill for a small team.
Trigger.dev	Managed service with good DX but vendor lock-in and usage-based pricing that could spike with 100k+ daily ingestion jobs.
pg-boss	PostgreSQL-backed queue avoids Redis dependency, but does not match BullMQ's concurrency model or dashboard tooling.
ADR-003: Drizzle ORM for Database Access
Status: Accepted Date: June 2026

Context
OneStopNews requires database access that is:

TypeScript-native with zero any types.
Compatible with strict mode TypeScript.
Capable of generating and managing PostgreSQL 17 migrations.
Performant — no query engine overhead in the hot path.
Compatible with pgvector and generated columns (for FTS tsvector).
Decision
Drizzle ORM with the postgres (postgres.js) driver.

Rationale
27
 Drizzle doesn't generate a runtime client, so the production bundle is significantly smaller (especially in edge environments). Queries compile directly to SQL with no proxy overhead. 
27
 Type inference comes from the schema definition. There is no code generation step — the types are the schema. This eliminates the Prisma "run `prisma generate` before TypeScript compiles" footgun entirely. 
25
 The recommended pattern for PostgreSQL primary keys in Drizzle is `integer().primaryKey().generatedAlwaysAsIdentity()` — the SQL-standard identity column rather than the deprecated `serial()`. We use `uuid().defaultRandom()` for entity PKs that must be externally referenceable (articles, summaries) and `integer().generatedAlwaysAsIdentity()` for join/lookup tables. 
27
 Using `drizzle-kit push` in production overwrites whatever schema is there. Use `generate + migrate` so changes are versioned. [CRITICAL] This project uses `generate + migrate` exclusively. `push` is git-ignored in production CI.
Consequences
Positive:

Schema-as-source-of-truth: .$inferSelect and .$inferInsert provide types for free.
sql template literal parameterizes all user input automatically — no SQL injection surface.
Migrations are plain SQL files — readable, version-controlled, manually editable when needed.
drizzle-zod (now in core) generates Zod schemas from Drizzle table definitions directly.
Negative:

27
 If two developers generate migrations on the same base, they conflict. Resolve manually by editing the generated SQL and re-snapshotting. Team discipline required: migration generation should happen on `main` branch, not feature branches.
No GUI comparable to Prisma Studio. Mitigation: drizzle-kit studio is functional if less polished.
Alternatives Rejected
Alternative	Reason Rejected
Prisma	Runtime client adds bundle weight; code generation step adds CI friction; edge support is limited.
TypeORM	Decorator-based; incompatible with strict-mode TypeScript patterns.
Kysely	Excellent query builder but no migration system — requires a separate tool.
Raw postgres.js	Maximum performance but no migration management; schema drift risk at scale.
ADR-004: Better Auth as the Authentication Library
Status: Accepted Date: June 2026

Context
OneStopNews requires authentication for:

Admin users protecting source management and monitoring routes.
(Roadmap) Reader accounts for saved preferences and read-later.
Session management with database-backed sessions (not JWT-only, for instant revocation).
Integration with Next.js 16 proxy.ts.
Auth.js v5 was specified in PRD v2.0 as the initial recommendation. Research has since revealed a critical change in the library's status.

Finding: As documented by the Auth.js project itself at authjs.dev, 
8
Auth.js is now maintained by Better Auth Inc. The library is in security-patch mode. 
5
Better Auth offers greater flexibility and more features; for new projects, the Auth.js team directs users to Better Auth, which has a complete Next.js demo app and extensive documentation.

Decision
Better Auth for all new development. Auth.js v5 is documented here only as a migration reference.

Rationale
2
 Better Auth is a modern authentication library built specifically for frameworks like Next.js, focusing on security-first architecture, high performance, simple API design, session and token support, and OAuth. 
1
 In Next.js `proxy.ts`, it's recommended to only check for the existence of a session cookie to handle redirection, avoiding API or database calls that would block requests. Next.js 16 replaces "middleware" with "proxy". Better Auth provides `getSessionCookie()` for exactly this optimistic-redirect pattern, plus `auth.api.getSession()` for full database-validated session checks in Server Components. 
1
 In Next.js 16, you can use the full Node.js runtime in `proxy.ts` for complete session validation with database checks, using `auth.api.getSession({ headers: await headers() })`. This removes the historical limitation of edge-runtime-only middleware.
Consequences
Positive:

Database-backed sessions with instant revocation.
Drizzle ORM schema integration via official adapter.
authClient.useSession() hook for Client Components.
auth.api.getSession() for Server Components and Server Actions.
Plugin system for future RBAC, organization, and SSO extensions.
Negative:

Newer library than Auth.js — smaller StackOverflow surface area for obscure edge cases.
Migration path for teams already on Auth.js v5 exists but requires schema migration.
Alternatives Rejected
Alternative	Reason Rejected
Auth.js v5	Officially in security-patch mode; Better Auth is the successor recommended by its own maintainers.
Clerk	Vendor lock-in; usage-based pricing; external service dependency for core auth.
WorkOS	Excellent for enterprise SSO but overkill and expensive for V1 scale.
Custom JWT	Significant security surface; session management complexity; not justified when libraries exist.
ADR-005: PostgreSQL FTS + pg_textsearch BM25 (No External Search Engine)
Status: Accepted Date: June 2026

Context
OneStopNews requires keyword search across article titles and excerpts with:

Relevance ranking (not just boolean match).
Autocomplete / fuzzy matching for zero-result queries.
No additional infrastructure services in V1.
A clear upgrade path to semantic search in Phase 3.
Decision
PostgreSQL 17 GIN-indexed tsvector for FTS + pg_textsearch BM25 extension for relevance ranking + pg_trgm for autocomplete. No Elasticsearch.

Rationale
The tsvector generated column with setweight() eliminates manual trigger maintenance. The GIN index with fastupdate = off is critical — without this, index updates are batched and search results during heavy ingestion can be stale. The combination of a partial index on published_at > NOW() - INTERVAL '7 days' for recent-content searches dramatically reduces index scan time for the most common query pattern.

pg_textsearch by Timescale brings BM25 ranking natively into PostgreSQL. BM25 is the algorithm behind Elasticsearch's relevance scoring — running it inside Postgres eliminates the need for a separate search cluster entirely.

pg_trgm GiST index on title enables sub-100ms fuzzy autocomplete — essential for the search UX where users type partial phrases.

[ROADMAP] pgvector for semantic search is Phase 3 — it runs in the same database instance, so no new infrastructure is required when the time comes.

Consequences
Positive:

Zero additional infrastructure services for search.
ACID consistency: a newly ingested article is immediately searchable (no sync lag).
BM25 relevance matching matches Elasticsearch quality for our text corpus size.
Single connection pool shared between feed queries and search queries.
Negative:

FTS at >50M articles may require dedicated read replicas or horizontal sharding. Mitigation: this is a V1 concern; the architecture supports read replicas.
pg_textsearch is an extension requiring explicit installation in the PostgreSQL instance. Not all managed PG providers support it by default — verify at deployment time.
Alternatives Rejected
Alternative	Reason Rejected
Elasticsearch	Significant operational overhead; separate index sync; another service to monitor; not justified at V1 scale.
Typesense	Good DX but another service; no native BM25-equivalent in our Postgres schema.
Algolia	Excellent DX but vendor lock-in and prohibitive cost at 100k+ daily article volume.
Meilisearch	Good option but another service to operate; Postgres FTS is sufficient for V1.
ADR-006: Modular Monolith + Separate Worker Service
Status: Accepted Date: June 2026

Context
OneStopNews must support:

Concurrent ingestion from 50–200 sources without affecting web app response times.
Background AI summarization without blocking user requests.
Independent scaling of ingestion throughput vs. web traffic.
Deployable by a small team without microservice operational overhead.
Decision
Two deployable units: Next.js 16 Web App (monolith) + Node.js Worker Service (separate process), connected via BullMQ on Redis and sharing a PostgreSQL 17 database.

Rationale
The Web App handles all user-facing concerns: rendering, API endpoints, Server Actions, and auth. It only enqueues jobs — it never runs long-running work.

The Worker Service handles all background processing: RSS ingestion, importance scoring, feed slice refreshes, and AI summarization. It consumes BullMQ queues and writes results to the shared PostgreSQL database.

This separation means a CPU-spike in the Worker (e.g., 50 concurrent RSS parses during a major news event) does not degrade Web App response times. They are separate OS processes.

The shared PostgreSQL database is the only coupling point. This is intentional — it avoids distributed transaction complexity while preserving the ability to split into independent services later by introducing an API boundary between them.

Consequences
Positive:

Worker scaling is independent of web scaling — scale on queue depth, not web traffic.
Web App deploys independently of Worker — UI changes ship without worker restarts.
No distributed transaction complexity in V1.
Simple to reason about: two services, one database, one queue.
Negative:

Schema changes require coordinated deployment between Web App and Worker. Mitigation: additive migrations only; never drop a column in the same deploy that removes code that reads it.
Direct database access from both services means schema governance must be strict.
Alternatives Rejected
Alternative	Reason Rejected
Full microservices	Distributed transactions, service discovery, network latency between services — unjustified complexity for current team size and scale.
Single monolith (no worker)	Ingestion on web app instances causes response time degradation under ingestion load. Cannot scale ingestion independently.
Serverless functions (e.g., Lambda)	Cold starts unacceptable for continuous RSS polling; 15-minute Lambda timeout insufficient for heavy summarization jobs; cost unpredictable at 100k+ daily jobs.
ADR-007: Turbopack as the Default Build Tool
Status: Accepted Date: June 2026

Context
Next.js 16 ships with Turbopack as the default bundler, replacing Webpack. This is a breaking change from Next.js 15 where Turbopack was opt-in.

Decision
Turbopack as default. Webpack is retained as a documented fallback (next build --webpack) for specific incompatible dependencies.

Rationale
35
 Start with `next build --webpack` to confirm the app builds correctly with the known-good bundler. Then run `next build` without the flag. If the Turbopack build fails, the error message will tell you exactly what configuration is incompatible.
Turbopack provides significantly faster HMR in development — critical for a developer experience working across a large Next.js codebase with many routes and components.

Consequences
Positive:

HMR times drop from seconds (Webpack) to sub-100ms in development.
Production build times improve significantly for large codebases.
Negative:

Some Webpack-specific plugins (custom loaders, legacy PostCSS plugins) may be incompatible. Audit dependencies at project bootstrap.
next.config.ts has a slightly different structure for Turbopack configuration. 
35
The codemod handles the Turbopack config move, next lint removal, middleware-to-proxy rename, unstable_ prefix removal from cacheTag and cacheLife, and experimental_ppr segment config removal.
Alternatives Rejected
Alternative	Reason Rejected
Webpack (default)	Now the fallback, not the default. Retained only for dependency-incompatibility edge cases.
Vite	Not compatible with Next.js App Router.
PART II — SYSTEM ARCHITECTURE
§3 — High-Level System Topology
3.1 Network & Service Topology Diagram
text

┌──────────────────────────────────────────────────────────────────────────────────┐
│                              PUBLIC INTERNET                                     │
│                                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                      │
│   │   Browser    │    │  Mobile App  │    │  Admin User  │                       │
│   │  (React 19)  │    │  (Future)    │    │  (Browser)   │                       │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                      │
│          │ HTTPS             │ HTTPS             │ HTTPS                         │
└──────────┼───────────────────┼───────────────────┼────────────────────────────-─┘
           │                   │                   │
           ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           CDN EDGE LAYER                                         │
│                  (Vercel Edge / CloudFront / Cloudflare)                         │
│                                                                                  │
│   Static Shell (PPR) ─── served from edge, sub-50ms TTFB                        │
│   Static assets ──────── CSS, fonts, JS chunks                                  │
│   Cache-Control headers ─ varies per route (see §11)                            │
└──────────────────────────────┬───────────────────────────────────────────────────┘
                               │ Cache Miss / Dynamic Requests
                               ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 16 WEB APP                                        │
│                    (Node.js 24+, Multiple Instances)                             │
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │   proxy.ts      │  │  App Router     │  │  Route Handlers (/api/*)        │  │
│  │  (lightweight   │  │  (RSC + PPR +   │  │  (public HTTP endpoints)        │  │
│  │   cookie check) │  │   Cache Comps)  │  │                                 │  │
│  └─────────────────┘  └────────┬────────┘  └────────────────┬────────────────┘  │
│                                │                             │                   │
│  ┌─────────────────────────────▼─────────────────────────────▼─────────────┐    │
│  │                    APPLICATION LAYER                                      │    │
│  │         Server Actions  ·  Feature Queries  ·  Domain Services           │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                │                                                 │
│  ┌─────────────────────────────▼─────────────────────────────────────────────┐  │
│  │                    INFRASTRUCTURE LAYER                                    │  │
│  │     Drizzle ORM  ·  Better Auth client  ·  BullMQ Producer  ·  AI SDK    │  │
│  └──────────────┬────────────────────────────────────────┬───────────────────┘  │
└─────────────────┼────────────────────────────────────────┼──────────────────────┘
                  │ SQL (postgres.js)                       │ BullMQ enqueue
                  │                                         │
    ┌─────────────▼──────────────┐         ┌───────────────▼──────────────────┐
    │     POSTGRESQL 17          │         │   REDIS (Upstash Managed)        │
    │  (Primary + Read Replica)  │         │                                  │
    │                            │         │  • BullMQ job queues             │
    │  • articles                │◄────────│  • Feed slice cache (hot feeds)  │
    │  • summaries               │  Direct │  • Session store (Better Auth)   │
    │  • sources                 │  writes │  • Rate limit counters           │
    │  • categories              │  from   │                                  │
    │  • ingestion_jobs          │  worker │  Redis config:                   │
    │  • GIN FTS indexes         │         │  • maxRetriesPerRequest: null     │
    │  • BM25 extension          │         │  • enableOfflineQueue: false      │
    │  • Better Auth tables      │         │  • No eviction policy (allkeys-   │
    │                            │         │    lru is FORBIDDEN for BullMQ)  │
    └─────────────────────────────┘         └──────────────────┬───────────────┘
                                                               │ BullMQ consume
                                                               ▼
                                            ┌──────────────────────────────────┐
                                            │       WORKER SERVICE             │
                                            │   (Node.js 24+, Scalable)        │
                                            │                                  │
                                            │  ┌────────────────────────────┐  │
                                            │  │    Job Scheduler            │  │
                                            │  │  upsertJobScheduler()      │  │
                                            │  │  (RSS poll schedule)       │  │
                                            │  └────────────┬───────────────┘  │
                                            │               │                  │
                                            │  ┌────────────▼───────────────┐  │
                                            │  │    Worker Processes         │  │
                                            │  │  • ingest (concurrency:50) │  │
                                            │  │  • summarize  (concurr:5)  │  │
                                            │  │  • score      (concurr:20) │  │
                                            │  │  • feed-slice (concurr:10) │  │
                                            │  └────────────────────────────┘  │
                                            └──────────────────────────────────┘
                                                               │
                                            ┌──────────────────▼───────────────┐
                                            │     EXTERNAL SERVICES            │
                                            │                                  │
                                            │  • RSS/Atom sources (200)        │
                                            │  • Anthropic API (Claude)        │
                                            │  • OpenAI API (GPT-4o-mini)      │
                                            │  • Content extractor (Readability)│
                                            └──────────────────────────────────┘
3.2 Deployable Units Summary
Unit	Runtime	Scaling	Coupling
Web App	Node.js 24+ (Next.js 16)	Horizontal, stateless, behind load balancer	Reads/writes PG; enqueues to Redis/BullMQ
Worker Service	Node.js 24+ (standalone)	Horizontal, scaled on queue depth	Reads/writes PG; consumes from Redis/BullMQ
PostgreSQL 17	Managed PG (Primary + Read Replica)	Vertical (primary); horizontal reads via replica	Shared between Web App + Worker
Redis	Upstash managed Redis 7.x	Managed (Upstash handles scaling)	Shared between Web App + Worker
3.3 External Integration Points
Integration	Direction	Protocol	Auth
RSS/Atom feeds (200 sources)	Worker → External	HTTPS/HTTP	None / Basic Auth per source
Anthropic API	Worker → External	HTTPS REST	API Key (secret env var)
OpenAI API	Worker → External	HTTPS REST	API Key (secret env var)
Content extractor	Worker → External	HTTPS	None (rate limited by domain)
CDN	External → Web App	HTTPS	CDN shared secret
§4 — Next.js 16 Web App Architecture
4.1 Layer Model
Every request through the Web App passes through a defined sequence of layers. This is not optional architecture — deviating from this order creates security and consistency bugs.

text

REQUEST
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 0: proxy.ts                                              │
│  Role: Optimistic routing only. Cookie presence check.         │
│  Rule: NO database calls. NO business logic. Redirect only.    │
│  File: /proxy.ts                                               │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ passes through
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: App Router (Layouts + Pages)                         │
│  Role: Route structure, metadata, PPR boundaries, Suspense.    │
│  Rule: Layouts must not fetch data (causes layout re-renders). │
│        Pages are the data-fetching boundary.                   │
│  Files: app/**/layout.tsx, app/**/page.tsx                     │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ calls
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: Feature Modules (Server Components + Server Actions) │
│  Role: UI composition, data binding, mutation entry points.    │
│  Rule: All data access through queries.ts. No direct DB calls  │
│        from components.                                        │
│  Files: features/**/components/*.tsx, features/**/actions.ts  │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ calls
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: Domain Services                                      │
│  Role: Pure business logic. No framework dependencies.         │
│  Rule: No Next.js imports. No DB client imports. Pure TS.      │
│  Files: domain/**/index.ts                                     │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ calls
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: Infrastructure (DB, Queue, AI, Auth)                 │
│  Role: Side-effecting operations. DB reads/writes. Queue ops.  │
│  Rule: All DB access via Drizzle. All queries parameterized.   │
│  Files: lib/db/*, lib/queue/*, lib/ai/*, lib/auth/*            │
└─────────────────────────────────────────────────────────────────┘
4.2 Annotated Directory Structure
Every file and directory in the Web App is documented here. Nothing should be created without a clear home in this structure.

text

onesopnews-web/
│
├── proxy.ts                     ← Next.js 16 network boundary (Layer 0)
│                                  Optimistic cookie check + redirect only.
│                                  Export: `export function proxy(req)`
│
├── next.config.ts               ← Next.js + Turbopack configuration
│                                  PPR enabled, cacheLife profiles defined,
│                                  image domains, security headers.
│
├── drizzle.config.ts            ← Drizzle Kit configuration
│                                  Points to lib/db/schema.ts.
│                                  Output: ./drizzle/ (SQL migration files)
│
├── app/                         ← Next.js App Router (Layer 1)
│   │
│   ├── layout.tsx               ← Root layout: HTML shell, fonts, providers.
│   │                              No data fetching here — ever.
│   │
│   ├── (public)/                ← Route group: unauthenticated routes
│   │   │
│   │   ├── page.tsx             ← / — Top Stories feed (PPR)
│   │   │                          PPR: static topic nav shell + dynamic feed
│   │   │
│   │   ├── topics/
│   │   │   └── [category]/
│   │   │       ├── page.tsx     ← /topics/[category] — Category feed
│   │   │       └── [sub]/
│   │   │           └── page.tsx ← /topics/[category]/[sub] — Subcategory feed
│   │   │
│   │   └── article/
│   │       └── [id]/
│   │           └── page.tsx     ← /article/[id] — Article detail (always dynamic)
│   │
│   ├── (admin)/                 ← Route group: protected admin routes
│   │   ├── layout.tsx           ← Admin layout: verifies session via auth.api.getSession()
│   │   │                          [CRITICAL] This is the REAL auth check (not proxy.ts)
│   │   ├── page.tsx             ← /admin — Dashboard overview
│   │   ├── sources/
│   │   │   └── page.tsx         ← /admin/sources — Source management
│   │   └── jobs/
│   │       └── page.tsx         ← /admin/jobs — BullMQ job monitor
│   │
│   ├── api/                     ← Route Handlers: public HTTP API only
│   │   │                          Rule: Only for external callers (webhooks,
│   │   │                          public feed, external service integrations).
│   │   │                          Internal mutations → Server Actions instead.
│   │   │
│   │   ├── categories/
│   │   │   └── route.ts         ← GET /api/categories
│   │   ├── articles/
│   │   │   └── route.ts         ← GET /api/articles (feed + search)
│   │   ├── articles/[id]/
│   │   │   └── route.ts         ← GET /api/articles/[id]
│   │   ├── summarize/[id]/
│   │   │   └── route.ts         ← POST /api/summarize/[id] (enqueue only)
│   │   └── source-health/
│   │       └── route.ts         ← GET /api/source-health (admin-gated)
│   │
│   └── (auth)/                  ← Better Auth catch-all route
│       └── api/
│           └── auth/
│               └── [...all]/
│                   └── route.ts ← Better Auth handler mount point
│
├── features/                    ← Feature modules (Layer 2)
│   │                              Each feature owns: components, queries, actions.
│   │                              No cross-feature imports at component level.
│   │
│   ├── feed/
│   │   ├── components/
│   │   │   ├── Feed.tsx          ← Feed container (RSC): fetches + renders list
│   │   │   ├── ArticleCard.tsx   ← Individual card (RSC): accepts article prop
│   │   │   ├── LeadStory.tsx     ← Hero card (RSC): full-width lead article
│   │   │   ├── FeedSkeleton.tsx  ← Suspense fallback: matches card dimensions
│   │   │   ├── EmptyFeed.tsx     ← Empty state: editorial message, no generic UI
│   │   │   └── TopicNav.tsx      ← Sticky topic ribbon (Client Component)
│   │   │                            "use client" — only because of scroll interaction
│   │   ├── queries.ts            ← Drizzle queries for feed data
│   │   └── actions.ts            ← Server Actions: savePreference, setFavoriteCategory
│   │
│   ├── summaries/
│   │   ├── components/
│   │   │   ├── SummaryPanel.tsx  ← Summary display with citations (RSC)
│   │   │   ├── CitationList.tsx  ← Source citations component
│   │   │   ├── DisclosureBadge.tsx ← "AI-generated" label with tooltip
│   │   │   ├── SummaryRequest.tsx ← "Generate summary" button (Client Component)
│   │   │   └── SummarySkeleton.tsx ← Loading state for pending summaries
│   │   ├── queries.ts
│   │   └── actions.ts            ← Server Action: requestSummary (calls /api/summarize)
│   │
│   ├── search/
│   │   ├── components/
│   │   │   ├── SearchBar.tsx     ← Debounced search input (Client Component)
│   │   │   ├── SearchResults.tsx ← Results list (RSC, receives query prop)
│   │   │   └── SearchFilters.tsx ← Filter panel (Client Component)
│   │   ├── queries.ts            ← FTS query builder
│   │   └── actions.ts
│   │
│   ├── articles/
│   │   ├── components/
│   │   │   ├── ArticleDetail.tsx ← Detail panel (RSC)
│   │   │   ├── SourceBadge.tsx   ← Source + timestamp display
│   │   │   └── CategoryTag.tsx   ← Category + subcategory pill
│   │   └── queries.ts
│   │
│   └── admin/
│       ├── components/
│       │   ├── SourceForm.tsx    ← Source CRUD form (Client Component + Zod)
│       │   ├── SourceTable.tsx   ← Source list with enable/disable (Client Comp.)
│       │   ├── JobMonitor.tsx    ← BullMQ queue status table (Client Component)
│       │   ├── SummaryAudit.tsx  ← Summary review queue
│       │   └── MetricsDashboard.tsx ← Ingestion/summarization metrics
│       ├── queries.ts
│       └── actions.ts            ← createSource, updateSource, toggleSource,
│                                    flagSummary, regenerateSummary
│
├── domain/                      ← Pure domain logic (Layer 3)
│   │                              NO Next.js imports. NO Drizzle imports.
│   │                              Pure TypeScript functions and interfaces.
│   │
│   ├── articles/
│   │   ├── types.ts             ← Article, ArticleCard, ArticleDetail interfaces
│   │   ├── normalize.ts         ← URL normalization, content hashing functions
│   │   └── deduplicate.ts       ← Deduplication logic (canonical URL + hash)
│   │
│   ├── ranking/
│   │   ├── types.ts             ← RankingInput, RankingResult interfaces
│   │   └── score.ts             ← Importance scoring formula implementation
│   │
│   ├── summaries/
│   │   ├── types.ts             ← Summary, SummaryRequest, CitedSource interfaces
│   │   └── validate.ts          ← Summary quality validation rules
│   │
│   └── sources/
│       ├── types.ts             ← Source, SourceConfig, SourceHealth interfaces
│       └── classify.ts          ← Category/subcategory classification rules
│
├── lib/                         ← Infrastructure integrations (Layer 4)
│   │
│   ├── db/
│   │   ├── index.ts             ← Lazy DB client (Proxy pattern — see §6.4)
│   │   ├── schema.ts            ← Complete Drizzle schema (all tables)
│   │   └── migrations/          ← Generated SQL migration files (drizzle-kit output)
│   │       └── *.sql
│   │
│   ├── queue/
│   │   ├── index.ts             ← BullMQ Queue instances (producer side)
│   │   └── types.ts             ← Job type definitions (discriminated unions)
│   │
│   ├── ai/
│   │   ├── client.ts            ← Unified AI client (Anthropic + OpenAI)
│   │   └── prompts.ts           ← Prompt templates with Zod response schemas
│   │
│   └── auth/
│       ├── index.ts             ← Better Auth server instance
│       ├── client.ts            ← Better Auth client instance (for Client Components)
│       ├── dal.ts               ← Data Access Layer: verifySession(), getUser()
│       └── permissions.ts       ← RBAC: role definitions, permission checks
│
├── shared/
│   │
│   ├── components/              ← Design system: Shadcn wrapped with bespoke styling
│   │   ├── ui/                  ← Shadcn primitives (Button, Card, Badge, etc.)
│   │   ├── layout/              ← Page layout components (Grid, Panel, Sidebar)
│   │   └── typography/          ← Heading, Body, Label, Mono components
│   │
│   ├── hooks/
│   │   ├── useDebounce.ts       ← 300ms debounce for search
│   │   └── useArticleActivity.ts ← React 19.2 Activity hook for summary panel
│   │
│   └── types/
│       └── index.ts             ← Shared TypeScript interfaces (API response shapes)
│
└── public/                      ← Static assets (fonts, icons, OG images)
    ├── fonts/                   ← Self-hosted: Newsreader, Space Grotesk, JetBrains Mono
    └── icons/
4.3 Key File Implementations
proxy.ts — Network Boundary
3
 The documentation notes that `proxy.ts` is not intended for full session management or complex authorization. Keep it light: use `proxy.ts` for high-level traffic control, such as redirecting users who lack a session cookie. Move complexity downstream — detailed authentication (like validating JWT signatures) and granular authorization (like checking specific user permissions) should live closer to your data in Server Components or Server Actions.
TypeScript

// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export function proxy(request: NextRequest) {
  // CRITICAL: This is an OPTIMISTIC check only.
  // It provides UX (smooth redirect) — NOT security.
  // Real auth validation happens in admin/layout.tsx via auth.api.getSession()
  const sessionCookie = getSessionCookie(request)

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  if (isAdminRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Run on all routes — auth, it's recommended Proxy runs on all routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
app/(admin)/layout.tsx — Real Auth Enforcement
TypeScript

// app/(admin)/layout.tsx
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'

// [CRITICAL] This is the REAL security boundary.
// proxy.ts gave users a smooth redirect experience.
// This layout enforces the actual session check against the database.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect('/sign-in')
  }

  if (!hasPermission(session.user, 'admin:access')) {
    redirect('/')
  }

  return (
    <div className="admin-layout">
      {children}
    </div>
  )
}
app/(public)/topics/[category]/page.tsx — PPR Pattern
TypeScript

// app/(public)/topics/[category]/page.tsx
import { Suspense } from 'react'
import { cacheLife, cacheTag } from 'next/cache'
import { Feed } from '@/features/feed/components/Feed'
import { FeedSkeleton } from '@/features/feed/components/FeedSkeleton'
import { TopicNav } from '@/features/feed/components/TopicNav'
import { getCategories } from '@/features/feed/queries'

interface PageProps {
  params: Promise<{ category: string }>
}

// PPR: The topic nav shell is prerendered statically at the edge.
// The Feed component streams dynamically — no cache here.
export default async function TopicPage({ params }: PageProps) {
  const { category } = await params

  return (
    <main className="topic-layout">
      {/* Static shell — prerendered, served from CDN edge */}
      <CachedTopicNav category={category} />

      {/* Dynamic boundary — streams fresh from server */}
      <Suspense fallback={<FeedSkeleton />}>
        <Feed category={category} />
      </Suspense>
    </main>
  )
}

// Cached component: topic nav changes rarely
// Runtime values (category) passed as arguments — never read inside "use cache"
async function CachedTopicNav({ category }: { category: string }) {
  'use cache'
  cacheLife('hours')
  cacheTag('categories', `category-nav-${category}`)

  const categories = await getCategories()

  return <TopicNav categories={categories} activeCategory={category} />
}
next.config.ts — Full Configuration
TypeScript

// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack is default in Next.js 16
  // No explicit flag needed — it's the default bundler

  // cacheLife profiles for "use cache" directive
  experimental: {
    cacheLife: {
      // News feed: stale for 30s, revalidate every 120s, expire after 600s
      'feed': {
        stale: 30,
        revalidate: 120,
        expire: 600,
      },
      // Category navigation: stale for 5min, revalidate every hour
      'nav': {
        stale: 300,
        revalidate: 3600,
        expire: 86400,
      },
      // Stable data: source lists, category trees
      'stable': {
        stale: 3600,
        revalidate: 86400,
        expire: 604800,
      },
    },
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'", // Required for RSC inline scripts
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Add trusted news source image domains
    ],
  },
}

export default nextConfig
4.4 Server Actions vs. Route Handlers — Decision Matrix
[IMPORTANT] This rule must be consistently applied. Mixed usage creates confusion about where mutations live.

Scenario	Use	Reason
Form submission (create source, save preference)	Server Action	Direct DB access; no separate HTTP round-trip; CSRF built-in
Toggle (enable/disable source, flag summary)	Server Action	Mutation from UI; no external caller
Admin mutation (regenerate summary)	Server Action	Protected by layout auth check
Summarization trigger (user-facing)	Route Handler /api/summarize/[id]	Workers consume via HTTP; needs stable URL
Feed data (external caller possible)	Route Handler /api/articles	Public API; external integrations
Category list (external caller possible)	Route Handler /api/categories	Public API
Webhooks (future external triggers)	Route Handler	HTTP callback from external service
4.5 Client Component Islands
[IMPORTANT] The default is Server Component. Only add "use client" when a component requires browser APIs, event handlers, or React state. Every Client Component boundary creates a serialization point.

Component	Why "use client"	What Stays Server-Side
TopicNav.tsx	Scroll position tracking, active state hover	Category data fetching
SearchBar.tsx	onChange handler, useState for input	Search results (separate RSC)
SearchFilters.tsx	Filter toggle state	Query execution
SummaryRequest.tsx	onClick handler for summary enqueue	Summary display (RSC)
SourceForm.tsx	Form state, validation feedback	Form submission (Server Action)
JobMonitor.tsx	Polling for queue status	Initial data (RSC)
ArticleCard.tsx	NONE — pure RSC	Everything
Feed.tsx	NONE — pure RSC	Everything
SummaryPanel.tsx	NONE — pure RSC	Everything
§5 — Worker Service Architecture
5.1 Service Structure
text

onesopnews-worker/
│
├── src/
│   │
│   ├── index.ts                 ← Entry point: initialise queues, workers, scheduler
│   │                              Handles SIGTERM gracefully (in-flight job completion)
│   │
│   ├── queues/
│   │   └── index.ts             ← BullMQ Queue + Worker definitions
│   │                              Exports: ingestQueue, summarizeQueue,
│   │                              scoreQueue, feedSliceQueue
│   │
│   ├── scheduler/
│   │   └── index.ts             ← RSS poll scheduler
│   │                              Calls upsertJobScheduler() for each active source
│   │                              on startup and when source config changes
│   │
│   ├── jobs/
│   │   ├── ingest.ts            ← Ingestion job handler
│   │   ├── summarize.ts         ← Summarization job handler
│   │   ├── score.ts             ← Importance scoring job handler
│   │   ├── feed-slice.ts        ← Feed slice refresh job handler
│   │   └── source-health.ts     ← SourceHealthSnapshot update handler
│   │
│   ├── flows/
│   │   └── ingest-flow.ts       ← FlowProducer: ingest → score → feed-slice DAG
│   │
│   ├── parsers/
│   │   ├── rss.ts               ← RSS/Atom parser (rss-parser library)
│   │   ├── json-api.ts          ← JSON API feed parser
│   │   └── extractor.ts         ← Full-text content extractor (Readability)
│   │
│   └── lib/                     ← Shared with web app (symlinked or package)
│       ├── db/                  ← Same Drizzle client + schema
│       ├── ai/                  ← Same AI client wrapper
│       └── queue/               ← Same BullMQ type definitions
│
└── package.json
5.2 BullMQ Queue Topology
text

┌─────────────────────────────────────────────────────────────────────────┐
│                         BULLMQ QUEUE TOPOLOGY                          │
│                                                                         │
│  QUEUE: "ingest"              QUEUE: "summarize"                        │
│  ├── concurrency: 50          ├── concurrency: 5 (AI rate limit)        │
│  ├── priority: normal         ├── priority: high (user-triggered)       │
│  ├── removeOnComplete: 100    │   priority: low  (batch background)     │
│  └── removeOnFail: 500        ├── removeOnComplete: 100                 │
│                               └── removeOnFail: 500                     │
│                                                                         │
│  QUEUE: "score"               QUEUE: "feed-slice"                       │
│  ├── concurrency: 20          ├── concurrency: 10                       │
│  ├── priority: normal         ├── priority: high (post-ingest refresh)  │
│  ├── removeOnComplete: 50     ├── removeOnComplete: 20                  │
│  └── removeOnFail: 100        └── removeOnFail: 50                      │
│                                                                         │
│  DEAD LETTER:                                                           │
│  Failed jobs stay in Redis (removeOnFail: 500) for admin inspection.   │
│  Admin can retry via BullMQ Board or /admin/jobs Route Handler.        │
└─────────────────────────────────────────────────────────────────────────┘
5.3 Queue Definitions
TypeScript

// src/queues/index.ts
import { Queue, Worker, FlowProducer } from 'bullmq'
import { Redis } from 'ioredis'

// [CRITICAL] maxRetriesPerRequest: null is REQUIRED for BullMQ Workers.
// Without it, ioredis throws on blocking commands used by BullMQ internals.
// enableOfflineQueue: false prevents job buildup during Redis disconnects.
const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
})

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000, // 2s, 4s, 8s
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
}

export const ingestQueue = new Queue('ingest', {
  connection,
  defaultJobOptions,
})

export const summarizeQueue = new Queue('summarize', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
})

export const scoreQueue = new Queue('score', { connection, defaultJobOptions })
export const feedSliceQueue = new Queue('feed-slice', { connection, defaultJobOptions })

// FlowProducer for DAG job chains
export const flowProducer = new FlowProducer({ connection })
5.4 Job Type Definitions
All job data is strictly typed via discriminated unions. No any in job payloads.

TypeScript

// lib/queue/types.ts

export interface IngestJobData {
  sourceId: string
  schedulerId: string
}

export interface SummarizeJobData {
  articleId: string
  priority: 'user-triggered' | 'background'
  requestedBy?: string // userId if authenticated
}

export interface ScoreJobData {
  articleId: string
  categoryId: string
}

export interface FeedSliceJobData {
  categoryId: string
  subcategoryId?: string
  sort: 'latest' | 'impact'
}
5.5 RSS Poll Scheduler
11
 `upsertJobScheduler` is used instead of `add` to simplify management of recurring jobs, especially in production deployments. It ensures the scheduler is updated or created without duplications.
TypeScript

// src/scheduler/index.ts
import { ingestQueue } from '../queues'
import { db } from '../lib/db'
import { sources } from '../lib/db/schema'
import { eq } from 'drizzle-orm'
import type { IngestJobData } from '../lib/queue/types'

// Called on worker startup and on source config changes.
// Idempotent: safe to call multiple times.
export async function syncSchedulers() {
  const activeSources = await db
    .select({
      id: sources.id,
      pollIntervalMinutes: sources.pollIntervalMinutes,
      priority: sources.priority,
    })
    .from(sources)
    .where(eq(sources.isActive, true))

  for (const source of activeSources) {
    const schedulerId = `ingest-source-${source.id}`
    const jobData: IngestJobData = {
      sourceId: source.id,
      schedulerId,
    }

    // upsertJobScheduler ensures exactly one scheduler per source.
    // On restart, existing schedulers are updated (not duplicated).
    await ingestQueue.upsertJobScheduler(
      schedulerId,
      {
        every: source.pollIntervalMinutes * 60 * 1000,
      },
      {
        name: 'ingest-source',
        data: jobData,
        opts: {
          // Source priority maps to BullMQ job priority (1=highest)
          priority: source.priority,
        },
      }
    )
  }

  console.log(`[Scheduler] Synced ${activeSources.length} source schedulers`)
}
5.6 Ingestion Flow (FlowProducer DAG)
15
 The `FlowProducer` atomically adds a parent job and its children. When all jobs in the children queue are completed, the parent job in the parent queue is processed as a regular job.
TypeScript

// src/flows/ingest-flow.ts
import { flowProducer } from '../queues'
import type { ScoreJobData, FeedSliceJobData } from '../lib/queue/types'

// Called after ingestion completes for a batch of new articles.
// The feed-slice refresh (parent) only runs after ALL scoring jobs (children) complete.
export async function enqueuePostIngestFlow(
  newArticleIds: string[],
  categoryId: string,
  subcategoryId?: string
) {
  if (newArticleIds.length === 0) return

  const scoreChildren = newArticleIds.map((articleId) => ({
    name: 'score-article',
    queueName: 'score' as const,
    data: {
      articleId,
      categoryId,
    } satisfies ScoreJobData,
  }))

  const feedSliceData: FeedSliceJobData = {
    categoryId,
    subcategoryId,
    sort: 'latest',
  }

  // Atomic add: all children + parent enqueued in a single Redis transaction
  await flowProducer.add({
    name: 'refresh-feed-slice',
    queueName: 'feed-slice',
    data: feedSliceData,
    opts: { priority: 1 }, // High priority: users see fresh feeds quickly
    children: scoreChildren,
  })
}
5.7 Graceful Shutdown
[CRITICAL] Workers must finish in-flight jobs before exiting. Missing this causes jobs to be marked as stalled and retried unnecessarily.

TypeScript

// src/index.ts (partial — shutdown section)
import { ingestWorker, summarizeWorker, scoreWorker, feedSliceWorker } from './queues'

async function gracefulShutdown(signal: string) {
  console.log(`[Worker] Received ${signal}. Closing workers...`)

  // Close each worker — waits for in-flight jobs to complete
  await Promise.all([
    ingestWorker.close(),
    summarizeWorker.close(),
    scoreWorker.close(),
    feedSliceWorker.close(),
  ])

  console.log('[Worker] All workers closed. Exiting.')
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
5.8 Worker Concurrency Configuration
Worker	Concurrency	Rationale
ingest	50	I/O-bound: network fetches to RSS sources. High concurrency safe.
summarize	5	AI-API-bound: rate limited by Anthropic/OpenAI. Max 5 concurrent calls.
score	20	CPU + DB: scoring formula is fast; DB writes are the bottleneck.
feed-slice	10	Redis writes: fast but Redis connection pool limits concurrency.
§6 — Data Architecture
6.1 Entity Relationship Diagram
text

┌──────────────────┐       ┌──────────────────────┐       ┌──────────────────┐
│    categories    │       │      subcategories    │       │     sources      │
├──────────────────┤       ├──────────────────────┤       ├──────────────────┤
│ id (uuid PK)     │◄─────┤ category_id (FK)      │       │ id (uuid PK)     │
│ name             │       │ id (uuid PK)          │       │ name             │
│ slug             │       │ name                  │       │ url              │
│ description      │       │ slug                  │       │ feed_url         │
│ display_order    │       │ display_order         │       │ feed_type        │
│ color_token      │       │ color_token           │       │ category_id (FK) │
│ is_active        │       └──────────────────────┘       │ priority         │
└──────────────────┘                   ▲                   │ poll_interval    │
         ▲                             │                   │ is_active        │
         │                             │                   │ created_at       │
         │                   ┌─────────┴────────────────────────────┐
         │                   │            articles                  │
         │                   ├──────────────────────────────────────┤
         └───────────────────┤ id (uuid PK)                         │
                             │ source_id (FK → sources)             │
                             │ category_id (FK → categories)        │
                             │ subcategory_id (FK → subcategories)  │
                             │ title                                │
                             │ excerpt                              │
                             │ canonical_url (UNIQUE)               │
                             │ content_hash                         │
                             │ content_availability (enum)         │
                             │ importance_score (real)              │
                             │ has_summary (bool)                   │
                             │ summary_status (enum)                │
                             │ published_at                         │
                             │ ingested_at                          │
                             │ search_vector (tsvector, GENERATED)  │
                             └──────────────────┬───────────────────┘
                                                │ 1:1
                        ┌───────────────────────┘
                        ▼
              ┌──────────────────────────┐
              │        summaries         │
              ├──────────────────────────┤
              │ id (uuid PK)             │
              │ article_id (FK, UNIQUE)  │
              │ summary_text             │
              │ key_points (jsonb[])     │
              │ sources_cited (jsonb[])  │
              │ model                    │
              │ tokens_used              │
              │ generated_at             │
              │ status (enum)            │
              │ flag_reason              │
              └──────────────────────────┘

┌──────────────────────┐     ┌────────────────────────────┐
│    users             │     │   source_health_snapshots  │
├──────────────────────┤     ├────────────────────────────┤
│ id (uuid PK)         │     │ id (int, identity PK)      │
│ email (UNIQUE)       │     │ source_id (FK)             │
│ name                 │     │ checked_at                 │
│ role (enum)          │     │ last_success_at            │
│ created_at           │     │ consecutive_failures       │
└──────────────────────┘     │ articles_fetched           │
         │                   │ avg_latency_ms             │
         ▼                   │ error_message              │
┌──────────────────────┐     └────────────────────────────┘
│  user_preferences    │
├──────────────────────┤
│ id (int, identity PK)│
│ user_id (FK, UNIQUE) │
│ default_category     │
│ favorite_categories  │
│ default_sort         │
│ updated_at           │
└──────────────────────┘

[Better Auth tables — auto-generated by Better Auth migration]
  • ba_users        (maps to Better Auth user model)
  • ba_sessions     (database-backed sessions)
  • ba_accounts     (OAuth account links)
  • ba_verifications (email verification tokens)
6.2 Complete Drizzle Schema
TypeScript

// lib/db/schema.ts
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  real,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  customType,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const feedTypeEnum = pgEnum('feed_type', ['rss', 'atom', 'json_api'])

export const contentAvailabilityEnum = pgEnum('content_availability', [
  'title_only',
  'excerpt',
  'partial_text',
  'full_text',
])

export const summaryStatusEnum = pgEnum('summary_status', [
  'none',
  'pending',
  'ok',
  'needs_review',
  'disabled',
  'failed',
])

export const articleStatusEnum = pgEnum('article_status', [
  'pending',
  'active',
  'archived',
])

export const userRoleEnum = pgEnum('user_role', ['reader', 'admin'])

// ─── Custom tsvector type (Drizzle doesn't ship this natively) ────────────────

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

// ─── Tables ───────────────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  displayOrder: integer('display_order').default(0),
  colorToken: text('color_token'), // e.g. 'dispatch-amber', 'dispatch-sage'
  isActive: boolean('is_active').default(true).notNull(),
})

export const subcategories = pgTable(
  'subcategories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id')
      .references(() => categories.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    displayOrder: integer('display_order').default(0),
    colorToken: text('color_token'),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex('subcategories_category_slug_idx').on(
      table.categoryId,
      table.slug
    ),
  })
)

export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull().unique(),
  feedUrl: text('feed_url').notNull(),
  feedType: feedTypeEnum('feed_type').notNull().default('rss'),
  categoryId: uuid('category_id').references(() => categories.id),
  priority: integer('priority').default(2).notNull(), // 1=high, 2=normal, 3=low
  pollIntervalMinutes: integer('poll_interval_minutes').default(15).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .references(() => sources.id, { onDelete: 'restrict' })
      .notNull(),
    categoryId: uuid('category_id').references(() => categories.id),
    subcategoryId: uuid('subcategory_id').references(() => subcategories.id),
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    canonicalUrl: text('canonical_url').notNull(),
    contentHash: text('content_hash').notNull(),
    contentAvailability: contentAvailabilityEnum('content_availability')
      .default('excerpt')
      .notNull(),
    status: articleStatusEnum('status').default('active').notNull(),
    importanceScore: real('importance_score').default(0.5).notNull(),
    hasSummary: boolean('has_summary').default(false).notNull(),
    summaryStatus: summaryStatusEnum('summary_status').default('none').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    // Generated column: GIN-indexed for FTS
    // [NOTE] Title gets weight A (highest), excerpt gets weight B
    // This is a GENERATED ALWAYS column — Drizzle cannot insert/update it directly
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
      `
    ),
  },
  (table) => ({
    // [CRITICAL] Deduplication: canonical URL must be unique
    canonicalUrlIdx: uniqueIndex('articles_canonical_url_idx').on(
      table.canonicalUrl
    ),

    // Primary feed query pattern: category + time descending
    categoryPublishedIdx: index('articles_category_published_idx').on(
      table.categoryId,
      table.publishedAt
    ),

    // Subcategory feed query pattern
    subcategoryPublishedIdx: index('articles_subcategory_published_idx').on(
      table.subcategoryId,
      table.publishedAt
    ),

    // Impact sort query pattern
    categoryScoreIdx: index('articles_category_score_idx').on(
      table.categoryId,
      table.importanceScore
    ),

    // [CRITICAL] GIN index with fastupdate=off for consistent FTS during ingestion
    // fastupdate=on (default) batches index updates and can serve stale results
    // fastupdate=off ensures every ingested article is immediately searchable
    searchVectorGinIdx: index('articles_search_vector_gin_idx')
      .using('gin')
      .on(table.searchVector)
      // Note: fastupdate=off must be set via raw SQL in migration:
      // CREATE INDEX ... USING gin (search_vector) WITH (fastupdate = off);
  })
)

export const summaries = pgTable('summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  articleId: uuid('article_id')
    .references(() => articles.id, { onDelete: 'cascade' })
    .notNull()
    .unique(), // 1:1 with articles
  summaryText: text('summary_text').notNull(),
  keyPoints: jsonb('key_points')
    .$type<string[]>()
    .default([])
    .notNull(),
  // [CRITICAL] sourcesCited is the trust mechanism — must always be populated
  sourcesCited: jsonb('sources_cited')
    .$type<Array<{ url: string; title: string; sourceId: string }>>()
    .default([])
    .notNull(),
  model: text('model').notNull(), // e.g. 'claude-3-5-haiku-20241022'
  modelVersion: text('model_version'),
  tokensUsed: integer('tokens_used'),
  generatedAt: timestamp('generated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  status: summaryStatusEnum('status').default('ok').notNull(),
  flagReason: text('flag_reason'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Better Auth user ID reference (Better Auth manages its own user table)
  betterAuthId: text('better_auth_id').unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: userRoleEnum('role').default('reader').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const userPreferences = pgTable('user_preferences', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  defaultCategoryId: uuid('default_category_id').references(
    () => categories.id
  ),
  favoriteCategories: jsonb('favorite_categories')
    .$type<string[]>()
    .default([])
    .notNull(),
  defaultSort: text('default_sort', {
    enum: ['latest', 'impact', 'summary_ready'],
  })
    .default('latest')
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const sourceHealthSnapshots = pgTable(
  'source_health_snapshots',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    sourceId: uuid('source_id')
      .references(() => sources.id, { onDelete: 'cascade' })
      .notNull(),
    checkedAt: timestamp('checked_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
    consecutiveFailures: integer('consecutive_failures').default(0).notNull(),
    articlesFetched: integer('articles_fetched').default(0).notNull(),
    articlesNew: integer('articles_new').default(0).notNull(),
    avgLatencyMs: integer('avg_latency_ms'),
    errorMessage: text('error_message'),
    errorCode: text('error_code'),
  },
  (table) => ({
    sourceCheckedIdx: index('source_health_source_checked_idx').on(
      table.sourceId,
      table.checkedAt
    ),
  })
)

// ─── Drizzle inference types (use these, not hand-written interfaces) ─────────

export type Category = typeof categories.$inferSelect
export type InsertCategory = typeof categories.$inferInsert
export type Source = typeof sources.$inferSelect
export type InsertSource = typeof sources.$inferInsert
export type Article = typeof articles.$inferSelect
export type InsertArticle = typeof articles.$inferInsert
export type Summary = typeof summaries.$inferSelect
export type InsertSummary = typeof summaries.$inferInsert
export type User = typeof users.$inferSelect
export type SourceHealthSnapshot = typeof sourceHealthSnapshots.$inferSelect
6.3 Index Inventory
Index Name	Table	Type	Columns	Purpose
articles_canonical_url_idx	articles	UNIQUE BTREE	canonical_url	Deduplication enforcement
articles_category_published_idx	articles	BTREE	category_id, published_at DESC	Category feed query (latest sort)
articles_subcategory_published_idx	articles	BTREE	subcategory_id, published_at DESC	Subcategory feed query
articles_category_score_idx	articles	BTREE	category_id, importance_score DESC	Category feed (impact sort)
articles_search_vector_gin_idx	articles	GIN	search_vector	Full-text keyword search
subcategories_category_slug_idx	subcategories	UNIQUE BTREE	category_id, slug	Slug lookup + uniqueness
source_health_source_checked_idx	source_health_snapshots	BTREE	source_id, checked_at DESC	Health history queries
Additional indexes via raw SQL migration (Drizzle cannot express all PG-specific options):

SQL

-- GIN index with fastupdate=off for consistent FTS during active ingestion
-- [CRITICAL] Do not use the default fastupdate=on for this workload
CREATE INDEX CONCURRENTLY articles_search_vector_gin_idx
ON articles USING gin (search_vector)
WITH (fastupdate = off);

-- Partial index for recent-article search (most common search pattern)
-- Only indexes articles from the past 30 days — dramatically reduces index size
CREATE INDEX CONCURRENTLY articles_search_recent_partial_idx
ON articles USING gin (search_vector)
WHERE published_at > NOW() - INTERVAL '30 days';

-- Trigram index on title for autocomplete / fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY articles_title_trgm_idx
ON articles USING gist (title gist_trgm_ops);
6.4 Lazy Database Connection (Proxy Pattern)
28
 Use a Proxy pattern to defer connection until first query — lazy connections prevent issues caused by Next.js module loading during the build process where no database is available.
TypeScript

// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// [CRITICAL] Never eagerly create the database connection.
// Next.js imports modules at build time. An eager connection
// attempt at module load crashes the build in environments
// where DATABASE_URL is not available (CI, static export, etc.)

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null
let _client: ReturnType<typeof postgres> | null = null

function getDb() {
  if (_db) return _db

  if (!process.env.DATABASE_URL) {
    throw new Error('[DB] DATABASE_URL is not set. Check environment variables.')
  }

  _client = postgres(process.env.DATABASE_URL, {
    max: process.env.NODE_ENV === 'production' ? 10 : 3,
    idle_timeout: 20,
    connect_timeout: 10,
  })

  _db = drizzle(_client, { schema, logger: process.env.NODE_ENV === 'development' })
  return _db
}

// Exported as a Proxy — the connection is only initialized on first property access
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    return getDb()[prop as keyof ReturnType<typeof getDb>]
  },
})
6.5 Migration Strategy
[CRITICAL] Production migration rules:

text

1. NEVER use `drizzle-kit push` in production.
   push overwrites the database schema directly — no migration history.
   Use `drizzle-kit generate` to create SQL files, then `drizzle-kit migrate` to apply.

2. Additive-only migrations in hot deploys.
   When removing a column:
     Deploy 1: Remove code that reads the column. Keep the column.
     Deploy 2 (next release): Drop the column.
   Never drop a column in the same deploy that removes the code reading it.

3. Migrations are version-controlled SQL files.
   They live in ./drizzle/ and must be committed to git.
   Never edit a migration after it has been applied to production.

4. Run migrations as a pre-deployment step, not in application startup.
   Application code must be backward compatible with both old and new schema.
TypeScript

// scripts/migrate.ts — run via: npx tsx scripts/migrate.ts
import 'dotenv/config'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

async function runMigrations() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 })
  const db = drizzle(client)

  console.log('[Migrate] Running migrations...')
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('[Migrate] Migrations complete.')

  await client.end()
}

runMigrations().catch((err) => {
  console.error('[Migrate] Migration failed:', err)
  process.exit(1)
})
PART III — COMPONENT DESIGN
§7 — Authentication & Authorization Architecture
7.1 Better Auth Setup
TypeScript

// lib/auth/index.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    // Better Auth manages its own session/account tables
    // Our `users` table is a separate application-level user record
  }),

  // Database-backed sessions (not JWT) — supports instant revocation
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // Refresh session if > 1 day old
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5-minute client-side cache to reduce DB calls
    },
  },

  emailAndPassword: {
    enabled: true,
    // [NOTE] Social OAuth (GitHub, Google) added here for Phase 2
  },

  // [CRITICAL] Cookie security settings
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    cookiePrefix: 'osn', // 'osn-session', 'osn-csrf' etc.
    generateId: () => crypto.randomUUID(),
  },
})
TypeScript

// lib/auth/client.ts — for Client Components only
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})

// Usage in Client Components:
// const { data: session, isPending } = authClient.useSession()
7.2 Data Access Layer (DAL)
7
 The Next.js team recommends creating a DAL to centralize data requests and authorization logic. The DAL should include a function that verifies the user's session as they interact with the application. At the very least, the function should check if the session is valid, then redirect or return the user information needed to make further requests. Use React's `cache` API to memoize the return value of the function during a React render pass.
TypeScript

// lib/auth/dal.ts
import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './index'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// React cache() memoizes this per-request.
// Multiple Server Components calling verifySession() in one render
// only execute ONE database query.
export const verifySession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect('/sign-in')
  }

  return session
})

// Get the application-level user record (not just the auth session)
export const getUser = cache(async () => {
  const session = await verifySession()

  const user = await db.query.users.findFirst({
    where: eq(users.betterAuthId, session.user.id),
    columns: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  })

  if (!user) {
    // Auth session exists but no app user record — shouldn't happen after signup
    redirect('/sign-in')
  }

  return user
})
7.3 RBAC — Permissions Model
TypeScript

// lib/auth/permissions.ts
import type { User } from '@/lib/db/schema'

// Exhaustive permission list — add new permissions here first, then use them
type Permission =
  | 'admin:access'
  | 'sources:read'
  | 'sources:write'
  | 'summaries:review'
  | 'summaries:regenerate'
  | 'jobs:monitor'
  | 'metrics:view'

const ROLE_PERMISSIONS: Record<User['role'], Permission[]> = {
  reader: [],
  admin: [
    'admin:access',
    'sources:read',
    'sources:write',
    'summaries:review',
    'summaries:regenerate',
    'jobs:monitor',
    'metrics:view',
  ],
}

export function hasPermission(
  user: Pick<User, 'role'>,
  permission: Permission
): boolean {
  return ROLE_PERMISSIONS[user.role].includes(permission)
}

// Usage in Server Actions:
// const user = await getUser()
// if (!hasPermission(user, 'sources:write')) {
//   throw new Error('Unauthorized')
// }
7.4 Defense in Depth — Auth Enforcement Points
[CRITICAL] Auth must be enforced at ALL three points. Each layer is independent.

text

LAYER 1: proxy.ts
  → Cookie presence check ONLY
  → Provides smooth UX redirect
  → NOT a security boundary
  → Cannot make DB calls

LAYER 2: (admin)/layout.tsx
  → auth.api.getSession() with DB check
  → Redirects if session invalid or expired
  → Checks user.role === 'admin'
  → Enforced on every admin page render

LAYER 3: Server Actions + Route Handlers
  → getUser() or verifySession() called at action start
  → hasPermission() check for specific operations
  → Returns 401/403 JSON for Route Handlers
  → Throws structured error for Server Actions

[SECURITY NOTE] CVE-2025-29927 (CVSS 9.1): A critical middleware bypass
vulnerability in Next.js allowed attackers to skip auth checks by sending
a specific HTTP header. This is patched in Next.js ≥15.2.3 and ≥16.x.
Our proxy.ts is not the security boundary (by design), so this class of
vulnerability is mitigated architecturally — auth is enforced at the data
layer, not just at the edge.
§8 — Ingestion Pipeline Design
8.1 Ingestion Job Handler
TypeScript

// src/jobs/ingest.ts
import { Worker, type Job } from 'bullmq'
import { db } from '../lib/db'
import { sources, articles, sourceHealthSnapshots } from '../lib/db/schema'
import { eq } from 'drizzle-orm'
import { parseRssFeed } from '../parsers/rss'
import { parseJsonApiFeed } from '../parsers/json-api'
import { normalizeCanonicalUrl, hashContent } from '../../domain/articles/normalize'
import { classifyArticle } from '../../domain/sources/classify'
import { enqueuePostIngestFlow } from '../flows/ingest-flow'
import type { IngestJobData } from '../lib/queue/types'
import { connection } from '../queues'

export const ingestWorker = new Worker<IngestJobData>(
  'ingest',
  async (job: Job<IngestJobData>) => {
    const { sourceId } = job.data
    const startTime = Date.now()

    // 1. Load source configuration
    const source = await db.query.sources.findFirst({
      where: eq(sources.id, sourceId),
    })

    if (!source || !source.isActive) {
      return { skipped: true, reason: 'source_inactive' }
    }

    // 2. Fetch feed with timeout and retry (BullMQ handles retry on throw)
    let rawFeed: string
    try {
      const response = await fetch(source.feedUrl, {
        signal: AbortSignal.timeout(10_000), // 10s timeout
        headers: { 'User-Agent': 'OneStopNews/1.0 (+https://onesopnews.com/bot)' },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${source.feedUrl}`)
      }

      rawFeed = await response.text()
    } catch (error) {
      // Update health snapshot with failure — then re-throw for BullMQ retry
      await recordHealthSnapshot(sourceId, { error, startTime })
      throw error // BullMQ will retry with exponential backoff
    }

    // 3. Parse feed based on type
    const candidates =
      source.feedType === 'json_api'
        ? await parseJsonApiFeed(rawFeed, source)
        : await parseRssFeed(rawFeed, source)

    // 4. Deduplicate and persist
    const newArticleIds: string[] = []

    for (const candidate of candidates) {
      const canonicalUrl = normalizeCanonicalUrl(candidate.url)
      const contentHash = hashContent(candidate.title, candidate.publishedAt)
      const classification = classifyArticle(candidate, source)

      // Upsert: insert new, update changed metadata, skip exact duplicates
      const result = await db
        .insert(articles)
        .values({
          sourceId: source.id,
          categoryId: classification.categoryId ?? source.categoryId,
          subcategoryId: classification.subcategoryId,
          title: candidate.title,
          excerpt: candidate.excerpt ?? null,
          canonicalUrl,
          contentHash,
          publishedAt: candidate.publishedAt,
        })
        .onConflictDoUpdate({
          target: articles.canonicalUrl,
          set: {
            // Only update mutable fields — never overwrite scores or summary status
            title: candidate.title,
            excerpt: candidate.excerpt ?? null,
            updatedAt: new Date(),
          },
          // [IMPORTANT] Only update if contentHash changed — avoids unnecessary writes
          where: sql`articles.content_hash != excluded.content_hash`,
        })
        .returning({ id: articles.id, isNew: sql<boolean>`(xmax = 0)` })

      if (result[0]?.isNew) {
        newArticleIds.push(result[0].id)
      }
    }

    // 5. Update source health snapshot
    await recordHealthSnapshot(sourceId, {
      startTime,
      articlesFetched: candidates.length,
      articlesNew: newArticleIds.length,
    })

    // 6. Enqueue post-ingest flow (score new articles → refresh feed slice)
    if (newArticleIds.length > 0 && source.categoryId) {
      await enqueuePostIngestFlow(newArticleIds, source.categoryId)
    }

    return { articlesFetched: candidates.length, articlesNew: newArticleIds.length }
  },
  {
    connection,
    concurrency: 50, // I/O-bound — safe to run many concurrently
  }
)

// Worker-level error handler (catches uncaught errors in processor)
ingestWorker.on('failed', (job, error) => {
  console.error(`[Ingest] Job ${job?.id} failed for source ${job?.data.sourceId}:`, error.message)
})
8.2 URL Normalization Algorithm
TypeScript

// domain/articles/normalize.ts
import { createHash } from 'crypto'

// Canonical URL normalization rules:
// 1. Lowercase scheme and host
// 2. Remove trailing slash (except root)
// 3. Remove common tracking parameters (utm_*, fbclid, gclid, ref, etc.)
// 4. Remove fragment (#)
// 5. Sort remaining query parameters alphabetically
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'ref', 'source', 'mc_cid', 'mc_eid',
])

export function normalizeCanonicalUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim())

    // Remove tracking parameters
    for (const param of TRACKING_PARAMS) {
      url.searchParams.delete(param)
    }

    // Sort remaining params for consistency
    url.searchParams.sort()

    // Remove fragment
    url.hash = ''

    // Remove trailing slash (except root path)
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1)
    }

    return url.toString().toLowerCase()
  } catch {
    // Invalid URL — return as-is (will fail uniqueness constraint if duplicate)
    return rawUrl.trim().toLowerCase()
  }
}

export function hashContent(title: string, publishedAt: Date): string {
  return createHash('sha256')
    .update(`${title}::${publishedAt.toISOString()}`)
    .digest('hex')
    .slice(0, 32) // 32 hex chars (128 bits) — sufficient for deduplication
}
8.3 Importance Scoring Formula
TypeScript

// domain/ranking/score.ts

interface ScoringInput {
  publishedAt: Date
  sourcePriority: 1 | 2 | 3       // 1=highest, 3=lowest
  clusterSize: number              // How many sources cover this story
  categoryRelevanceBoost: number   // Manual boost/penalty: -0.2 to +0.2
}

// Coefficient weights — must sum to 1.0
const WEIGHTS = {
  recency: 0.40,
  sourcePriority: 0.20,
  clusterSize: 0.25,
  categoryRelevance: 0.15,
} as const

export function computeImportanceScore(input: ScoringInput): number {
  // Recency: exponential decay. Half-life ≈ 12 hours.
  const ageHours = (Date.now() - input.publishedAt.getTime()) / (1000 * 60 * 60)
  const recencyScore = Math.exp(-0.0578 * ageHours) // e^(-ln2/12 * ageHours)

  // Source priority: invert (1=best → 1.0 score, 3=lowest → 0.33 score)
  const priorityScore = 1 / input.sourcePriority

  // Cluster size: logarithmic scale (10+ sources → max score)
  const clusterScore = Math.min(Math.log10(input.clusterSize + 1) / Math.log10(11), 1)

  // Category relevance: direct boost/penalty applied to weighted sum
  const baseScore =
    WEIGHTS.recency * recencyScore +
    WEIGHTS.sourcePriority * priorityScore +
    WEIGHTS.clusterSize * clusterScore

  const boostedScore = baseScore + WEIGHTS.categoryRelevance * input.categoryRelevanceBoost

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, boostedScore))
}
8.4 Error Taxonomy and Retry Policy
Error Type	Example	BullMQ Behavior	Health Impact
Transient — Network	Connection timeout, DNS failure	Retry × 3 (exponential backoff: 2s, 4s, 8s)	Increment consecutive_failures
Transient — Rate Limit	HTTP 429	Retry × 3 with longer delay (30s, 60s, 120s)	Log error_code: 'rate_limited'
Permanent — Feed URL	HTTP 404, invalid XML	Fail after 1 attempt; alert admin	Set source consecutive_failures threshold → disable
Soft — Parse Error	Malformed item in valid feed	Skip item, continue parsing	Log warning; count in error_message
Permanent — Auth	HTTP 401/403	Fail after 1 attempt; disable source	Alert admin for credential update
Source auto-disable rule: if consecutive_failures >= 5, set sources.is_active = false and fire an alert. Admin must re-enable manually after resolving the issue.

§9 — AI Summarization Pipeline Design
9.1 Model Selection Matrix
Model	Cost/1M tokens	Latency (p50)	Quality	Use Case
claude-3-5-haiku-20241022	~$1 in / $5 out	~800ms	★★★★☆	Default: user-triggered summaries
gpt-4o-mini	~$0.15 in / $0.60 out	~600ms	★★★☆☆	Fallback / batch background summaries
claude-3-5-sonnet-20241022	~$3 in / $15 out	~2000ms	★★★★★	Admin-triggered high-quality regeneration only
Model selection logic: use Haiku by default; fall back to GPT-4o-mini if Anthropic API is unavailable or rate-limited; Sonnet only on explicit admin re-generation request.

9.2 Prompt Template and Zod Response Schema
TypeScript

// lib/ai/prompts.ts
import { z } from 'zod'

// [CRITICAL] Zod schema for structured output parsing.
// If the model response doesn't match this schema, the job fails cleanly.
// This prevents malformed summaries from reaching the database.
export const summaryResponseSchema = z.object({
  summary: z.string().min(50).max(800),
  keyPoints: z.array(z.string().min(10).max(200)).min(2).max(5),
  sourcesCited: z.array(
    z.object({
      url: z.string().url(),
      title: z.string(),
      relevantQuote: z.string().optional(),
    })
  ),
  confidence: z.enum(['high', 'medium', 'low']),
  caveat: z.string().optional(), // e.g. "Summary based on excerpt only"
})

export type SummaryResponse = z.infer<typeof summaryResponseSchema>

export function buildSummaryPrompt(article: {
  title: string
  excerpt: string | null
  fullText: string | null
  sourceUrl: string
  sourceName: string
  publishedAt: Date
}): string {
  const content = article.fullText ?? article.excerpt ?? article.title
  const contentNote = article.fullText
    ? 'full article text'
    : article.excerpt
      ? 'article excerpt (full text unavailable)'
      : 'article title only (limited information available)'

  return `You are a factual news summarizer. Your task is to summarize the following article accurately and concisely.

STRICT RULES:
1. Report only facts stated in the article. Do NOT speculate, interpret, or add context not present in the source.
2. Do NOT express opinions or use evaluative language ("importantly", "surprisingly", etc.).
3. If the available content is insufficient for a reliable summary, set confidence to "low" and explain in caveat.
4. Extract the specific source URLs cited in your summary.

ARTICLE DETAILS:
Title: ${article.title}
Source: ${article.sourceName} (${article.sourceUrl})
Published: ${article.publishedAt.toISOString()}
Content type: ${contentNote}

CONTENT:
${content.slice(0, 4000)} ${content.length > 4000 ? '[truncated]' : ''}

Respond with a JSON object matching this exact structure:
{
  "summary": "2-4 sentence factual summary",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "sourcesCited": [{"url": "...", "title": "...", "relevantQuote": "optional short quote"}],
  "confidence": "high|medium|low",
  "caveat": "optional note about content limitations"
}`
}
9.3 Summarization Job Handler
TypeScript

// src/jobs/summarize.ts
import { Worker, type Job } from 'bullmq'
import { db } from '../lib/db'
import { articles, summaries } from '../lib/db/schema'
import { eq } from 'drizzle-orm'
import { buildSummaryPrompt, summaryResponseSchema } from '../lib/ai/prompts'
import { callAiModel } from '../lib/ai/client'
import { extractFullText } from '../parsers/extractor'
import { connection } from '../queues'
import type { SummarizeJobData } from '../lib/queue/types'

export const summarizeWorker = new Worker<SummarizeJobData>(
  'summarize',
  async (job: Job<SummarizeJobData>) => {
    const { articleId } = job.data

    // 1. Fetch article record
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, articleId),
      with: { source: true },
    })

    if (!article) {
      throw new Error(`Article ${articleId} not found`)
    }

    // Idempotency: if summary already exists and is OK, skip
    if (article.hasSummary && article.summaryStatus === 'ok') {
      return { skipped: true, reason: 'already_summarized' }
    }

    // Mark as pending immediately (user can see this in UI)
    await db
      .update(articles)
      .set({ summaryStatus: 'pending' })
      .where(eq(articles.id, articleId))

    // 2. Attempt full-text extraction if excerpt only
    let fullText: string | null = null
    if (article.contentAvailability === 'excerpt' || article.contentAvailability === 'title_only') {
      try {
        fullText = await extractFullText(article.canonicalUrl)
        if (fullText && fullText.length > 200) {
          await db
            .update(articles)
            .set({ contentAvailability: 'full_text' })
            .where(eq(articles.id, articleId))
        }
      } catch {
        // Extraction failed — proceed with excerpt. Not a fatal error.
        console.warn(`[Summarize] Full text extraction failed for ${articleId}`)
      }
    }

    // 3. Build prompt and call AI model
    const prompt = buildSummaryPrompt({
      title: article.title,
      excerpt: article.excerpt,
      fullText,
      sourceUrl: article.canonicalUrl,
      sourceName: article.source.name,
      publishedAt: article.publishedAt,
    })

    const { rawResponse, model, tokensUsed } = await callAiModel(prompt, {
      maxTokens: 1000,
      priority: job.data.priority,
    })

    // 4. Parse and validate response with Zod
    let parsedResponse
    try {
      const jsonStart = rawResponse.indexOf('{')
      const jsonEnd = rawResponse.lastIndexOf('}') + 1
      const jsonStr = rawResponse.slice(jsonStart, jsonEnd)
      parsedResponse = summaryResponseSchema.parse(JSON.parse(jsonStr))
    } catch (parseError) {
      // Model returned non-parseable output — fail job for retry
      await db
        .update(articles)
        .set({ summaryStatus: 'failed' })
        .where(eq(articles.id, articleId))
      throw new Error(`AI response parsing failed: ${parseError}`)
    }

    // 5. Store summary
    await db
      .insert(summaries)
      .values({
        articleId,
        summaryText: parsedResponse.summary,
        keyPoints: parsedResponse.keyPoints,
        sourcesCited: parsedResponse.sourcesCited.map((s) => ({
          url: s.url,
          title: s.title,
          sourceId: article.sourceId,
        })),
        model,
        tokensUsed,
        status: 'ok',
      })
      .onConflictDoUpdate({
        target: summaries.articleId,
        set: {
          summaryText: parsedResponse.summary,
          keyPoints: parsedResponse.keyPoints,
          sourcesCited: parsedResponse.sourcesCited.map((s) => ({
            url: s.url,
            title: s.title,
            sourceId: article.sourceId,
          })),
          model,
          tokensUsed,
          status: 'ok',
          flagReason: null,
          generatedAt: new Date(),
        },
      })

    // 6. Update article status
    await db
      .update(articles)
      .set({ hasSummary: true, summaryStatus: 'ok' })
      .where(eq(articles.id, articleId))

    return { success: true, model, tokensUsed, confidence: parsedResponse.confidence }
  },
  {
    connection,
    concurrency: 5, // AI API rate limit — do not increase without checking quota
  }
)
9.4 Unified AI Client
TypeScript

// lib/ai/client.ts
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

interface AiCallOptions {
  maxTokens: number
  priority: 'user-triggered' | 'background'
}

interface AiCallResult {
  rawResponse: string
  model: string
  tokensUsed: number
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Model selection: prefer Haiku for quality; fall back to GPT-4o-mini
const PRIMARY_MODEL = 'claude-3-5-haiku-20241022'
const FALLBACK_MODEL = 'gpt-4o-mini'

export async function callAiModel(
  prompt: string,
  options: AiCallOptions
): Promise<AiCallResult> {
  // Try primary model (Anthropic Haiku)
  try {
    const response = await anthropic.messages.create({
      model: PRIMARY_MODEL,
      max_tokens: options.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return {
      rawResponse: text,
      model: PRIMARY_MODEL,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    }
  } catch (anthropicError) {
    console.warn('[AI] Anthropic failed, falling back to OpenAI:', anthropicError)

    // Fallback to OpenAI GPT-4o-mini
    const response = await openai.chat.completions.create({
      model: FALLBACK_MODEL,
      max_tokens: options.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.choices[0]?.message.content ?? ''
    return {
      rawResponse: text,
      model: FALLBACK_MODEL,
      tokensUsed: response.usage?.total_tokens ?? 0,
    }
  }
}
§10 — Search Architecture
10.1 FTS Query Builder
TypeScript

// features/search/queries.ts
import { db } from '@/lib/db'
import { articles, sources, categories } from '@/lib/db/schema'
import { sql, desc, and, gte, eq } from 'drizzle-orm'

interface SearchParams {
  query: string
  categoryId?: string
  subcategoryId?: string
  timeRange?: '1h' | '24h' | '7d' | '30d'
  summaryStatus?: 'any' | 'has_summary'
  sort?: 'relevance' | 'latest' | 'impact'
  limit?: number
  cursor?: string // published_at ISO string for cursor pagination
}

export async function searchArticles(params: SearchParams) {
  const {
    query,
    categoryId,
    subcategoryId,
    timeRange,
    summaryStatus,
    sort = 'relevance',
    limit = 20,
    cursor,
  } = params

  // Choose query function based on input:
  // websearch_to_tsquery: supports quoted phrases, AND/OR operators (user-friendly)
  // plainto_tsquery: converts plain text to AND query (simpler, safer)
  // Use websearch_to_tsquery — it gracefully handles operator syntax from users
  const tsQuery = sql`websearch_to_tsquery('english', ${query})`

  const timeFilter = timeRange
    ? (() => {
        const intervals = { '1h': '1 hour', '24h': '24 hours', '7d': '7 days', '30d': '30 days' }
        return gte(articles.publishedAt, sql`NOW() - INTERVAL ${intervals[timeRange]}`)
      })()
    : undefined

  const conditions = [
    // FTS match condition
    sql`${articles.searchVector} @@ ${tsQuery}`,
    categoryId ? eq(articles.categoryId, categoryId) : undefined,
    subcategoryId ? eq(articles.subcategoryId, subcategoryId) : undefined,
    timeFilter,
    summaryStatus === 'has_summary' ? eq(articles.hasSummary, true) : undefined,
    cursor ? sql`${articles.publishedAt} < ${new Date(cursor)}` : undefined,
  ].filter(Boolean)

  // Sort strategy
  const orderBy =
    sort === 'relevance'
      ? // ts_rank_cd: considers term frequency AND proximity (cd = cover density)
        sql`ts_rank_cd(${articles.searchVector}, ${tsQuery}) DESC`
      : sort === 'impact'
        ? desc(articles.importanceScore)
        : desc(articles.publishedAt)

  const results = await db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      canonicalUrl: articles.canonicalUrl,
      publishedAt: articles.publishedAt,
      importanceScore: articles.importanceScore,
      hasSummary: articles.hasSummary,
      categoryId: articles.categoryId,
      // Highlighted snippet: shows matching terms in context
      headline: sql<string>`ts_headline(
        'english',
        coalesce(${articles.excerpt}, ${articles.title}),
        ${tsQuery},
        'MaxWords=20, MinWords=10, ShortWord=3, HighlightAll=false'
      )`,
      sourceName: sources.name,
      categoryName: categories.name,
    })
    .from(articles)
    .leftJoin(sources, eq(articles.sourceId, sources.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit + 1) // Fetch one extra to determine if there's a next page

  const hasNextPage = results.length > limit
  return {
    articles: results.slice(0, limit),
    nextCursor: hasNextPage
      ? results[limit - 1].publishedAt.toISOString()
      : null,
  }
}

// Autocomplete: trigram similarity on title
// Returns top 5 title suggestions matching the partial query
export async function autocompleteArticles(partialQuery: string) {
  if (partialQuery.length < 2) return []

  return db
    .select({ title: articles.title, id: articles.id })
    .from(articles)
    .where(sql`${articles.title} % ${partialQuery}`) // pg_trgm similarity operator
    .orderBy(sql`similarity(${articles.title}, ${partialQuery}) DESC`)
    .limit(5)
}
10.2 Search Decision Map
Query Type	Function Used	Index Used	Response Time Target
Plain keyword search	websearch_to_tsquery	GIN search_vector	≤200ms
Phrase search ("in quotes")	websearch_to_tsquery	GIN search_vector	≤200ms
Relevance-ranked	ts_rank_cd()	GIN search_vector	≤300ms
Autocomplete	pg_trgm % operator	GiST title_trgm	≤100ms
Fuzzy (zero-result recovery)	pg_trgm similarity()	GiST title_trgm	≤150ms
[ROADMAP] Semantic	pgvector <=> cosine similarity	HNSW vector	≤500ms
10.3 Search Route Handler
TypeScript

// app/api/articles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchArticles } from '@/features/search/queries'
import { getFeedArticles } from '@/features/feed/queries'

const querySchema = z.object({
  q: z.string().optional(),
  category: z.string().uuid().optional(),
  sub: z.string().uuid().optional(),
  sort: z.enum(['latest', 'impact', 'relevance', 'summary_ready']).default('latest'),
  time: z.enum(['1h', '24h', '7d', '30d']).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams)
  const parsed = querySchema.safeParse(params)

  if (!parsed.success) {
    return NextResponse.json(
      { code: 'INVALID_PARAMS', message: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { q, category, sub, sort, time, limit, cursor } = parsed.data

  try {
    const data = q
      ? await searchArticles({ query: q, categoryId: category, subcategoryId: sub, sort: sort === 'summary_ready' ? 'latest' : sort, timeRange: time, limit, cursor })
      : await getFeedArticles({ categoryId: category, subcategoryId: sub, sort, limit, cursor })

    return NextResponse.json(data, {
      headers: {
        // Moderate cache: 30s CDN cache for feed data; bypass for searches
        'Cache-Control': q ? 'no-store' : 'public, max-age=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('[API] /api/articles error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}
§11 — Caching & Performance Architecture
11.1 Cache Topology Map
text

REQUEST LIFECYCLE — FEED PAGE (Topic: Tech News)
───────────────────────────────────────────────────────────────────
1. Browser requests /topics/tech-news
   │
   ▼
2. CDN Edge checks for static PPR shell
   ├── HIT → Return prerendered HTML shell (TTFB < 50ms, from edge node)
   │         Shell includes: layout, topic nav, Suspense boundary placeholder
   └── MISS → Forward to Next.js Web App instance
               │
               ▼
3. Next.js App Router — PPR processing
   ├── Static shell: served from full route cache (CDN-backed)
   └── Dynamic region (Suspense boundary) → streams from server
       │
       ▼
4. CachedTopicNav component
   └── "use cache" directive
       ├── Cache HIT → serve from Next.js Data Cache (in-process + Redis)
       └── Cache MISS → query PG, cache with cacheTag('categories')
           cacheLife profile: 'nav' (stale:5min, revalidate:1hr)
       │
       ▼
5. Feed component (dynamic — no "use cache")
   └── Check Redis feed slice: key = "feed:tech-news:latest"
       ├── HIT → fetch article details for IDs in slice (single PG query)
       │         WHERE id = ANY($1) — fast PK lookup
       └── MISS → Full PG query: category_id + published_at DESC
                  Write result to Redis feed slice (TTL: 5min)
───────────────────────────────────────────────────────────────────
11.2 Cache Invalidation Rules
30
 Next.js 16 resolves the stale-vs-fresh tension by separating concerns: `updateTag` refreshes cached content incrementally while `revalidateTag` performs full reconstruction when necessary. The key insight is that not every data change requires full recomputation. The `updateTag` function updates tagged cache entries in place without triggering a rebuild of the entire route or component. 
35
 `updateTag()` is designed for Server Actions where the user needs to see their change immediately after submitting a form (read-your-writes consistency). It invalidates the tag synchronously within the same request lifecycle. 
38
 If you need to invalidate cache tags in Route Handlers or other contexts, use `revalidateTag` instead.
TypeScript

// The invalidation decision matrix — follow this precisely:

// SCENARIO 1: Admin updates a source via Server Action
// → User must see change immediately (read-your-writes)
// → Use: updateTag()
import { updateTag } from 'next/cache'
// Inside Server Action:
updateTag('sources')
updateTag(`source-${sourceId}`)

// SCENARIO 2: Worker ingests new articles, triggers feed refresh
// → Eventual consistency acceptable (new articles appear within 2min)
// → Use: revalidateTag() with 'max' profile (SWR)
// → Called via internal Route Handler from Worker
import { revalidateTag } from 'next/cache'
revalidateTag(`feed-${categoryId}`, 'max')
revalidateTag('feed-top-stories', 'max')

// SCENARIO 3: Summary becomes available (user polling)
// → Must show summary on next request
// → Use: revalidateTag() with { expire: 0 } for immediate expiry
revalidateTag(`article-${articleId}`, { expire: 0 })

// SCENARIO 4: Admin flags a summary for review
// → Immediate effect required
// → Use: updateTag() from Server Action
updateTag(`summary-${summaryId}`)
updateTag(`article-${articleId}`)
31
 In Next.js 16, `revalidateTag()` requires a `cacheLife` profile as the second argument. The profile argument accepts built-in `cacheLife` profile names like `'max'`, `'hours'`, `'days'`, or custom profiles. Using `'max'` is recommended for most cases, as it enables background revalidation for long-lived content. When users request tagged content, they receive cached data immediately while Next.js revalidates in the background.
11.3 Redis Feed Slice Design
TypeScript

// lib/queue/feed-slice.ts — executed by feedSliceWorker
import { createClient } from 'redis'
import { db } from '../db'
import { articles } from '../db/schema'
import { eq, desc, and } from 'drizzle-orm'

const redis = createClient({ url: process.env.REDIS_URL })

// Key schema: feed:{categoryId}:{sort}:{subcategoryId|'all'}
// Example: "feed:uuid-tech:latest:all"
//          "feed:uuid-tech:impact:uuid-ai-ml"
function buildFeedKey(categoryId: string, sort: string, subcategoryId?: string): string {
  return `feed:${categoryId}:${sort}:${subcategoryId ?? 'all'}`
}

export async function refreshFeedSlice(
  categoryId: string,
  sort: 'latest' | 'impact',
  subcategoryId?: string
) {
  const conditions = [
    eq(articles.categoryId, categoryId),
    subcategoryId ? eq(articles.subcategoryId, subcategoryId) : undefined,
    eq(articles.status, 'active'),
  ].filter(Boolean)

  const orderBy = sort === 'impact'
    ? desc(articles.importanceScore)
    : desc(articles.publishedAt)

  // Fetch top 100 article IDs for this feed slice
  const feedArticles = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(100)

  const key = buildFeedKey(categoryId, sort, subcategoryId)
  const articleIds = feedArticles.map((a) => a.id)

  // Store as Redis list; TTL: 10 minutes
  // If no articles found (e.g., new category), store empty list
  await redis.setEx(key, 600, JSON.stringify(articleIds))

  return { key, count: articleIds.length }
}

export async function getFeedSlice(
  categoryId: string,
  sort: 'latest' | 'impact',
  subcategoryId?: string
): Promise<string[] | null> {
  const key = buildFeedKey(categoryId, sort, subcategoryId)
  const cached = await redis.get(key)

  return cached ? (JSON.parse(cached) as string[]) : null
}
11.4 Core Web Vitals Targets
Route	LCP Target	FCP Target	CLS Target	INP Target	Mechanism
/ (Top Stories)	≤1.2s	≤600ms	<0.1	<200ms	PPR shell + Suspense streaming
/topics/[category]	≤1.5s	≤700ms	<0.1	<200ms	PPR + Cache Components
/article/[id]	≤1.0s	≤500ms	<0.05	<200ms	Dynamic RSC, small payload
/admin/*	≤2.0s	≤1.0s	<0.1	<200ms	Auth check adds latency
LCP optimization: lead article image is served with priority prop on next/image, ensuring it is preloaded in the HTML <head>. Font files are self-hosted and preloaded via <link rel="preload"> in app/layout.tsx.

CLS prevention: all article cards have fixed aspect ratio containers. Skeleton components match exact dimensions of loaded content — no layout shifts on hydration.

PART IV — OPERATIONS & DELIVERY
§12 — Infrastructure, Observability & Runbooks
12.1 Docker Compose (Local Development)
YAML

# docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg17
    # Using pgvector image ensures pgvector extension is available for Phase 3
    environment:
      POSTGRES_DB: onesopnews
      POSTGRES_USER: onesopnews
      POSTGRES_PASSWORD: onesopnews_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-extensions.sql:/docker-entrypoint-initdb.d/01-init.sql

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb
    # [CRITICAL] No --maxmemory-policy set here.
    # BullMQ REQUIRES that Redis NEVER evicts keys.
    # In production (Upstash), ensure eviction policy is DISABLED or 'noeviction'.
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
SQL

-- scripts/init-extensions.sql
-- Run once on fresh database setup
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
-- pg_textsearch (BM25) must be installed separately — verify provider support
-- CREATE EXTENSION IF NOT EXISTS pg_textsearch;
12.2 Environment Variable Schema
Complete inventory. Every variable, typed, described, and classified.

Variable	Type	Secret	Service	Description
DATABASE_URL	postgresql://...	✅	Both	PostgreSQL connection string with pool params
DATABASE_URL_READONLY	postgresql://...	✅	Web App	Read replica URL (feed queries)
REDIS_URL	rediss://...	✅	Both	Redis connection string (Upstash: TLS rediss://)
BETTER_AUTH_SECRET	32+ char random string	✅	Web App	Session signing secret. Generate: openssl rand -hex 32
BETTER_AUTH_URL	https://yourdomain.com	❌	Web App	Application base URL
ANTHROPIC_API_KEY	sk-ant-...	✅	Worker	Anthropic API key
OPENAI_API_KEY	sk-...	✅	Worker	OpenAI API key (fallback)
NEXT_PUBLIC_APP_URL	https://yourdomain.com	❌	Web App	Public URL (for Better Auth client)
NODE_ENV	development|production|test	❌	Both	Environment flag
LOG_LEVEL	debug|info|warn|error	❌	Both	Structured log verbosity
WORKER_CONCURRENCY_INGEST	integer	❌	Worker	Override ingest concurrency (default: 50)
WORKER_CONCURRENCY_SUMMARIZE	integer	❌	Worker	Override summarize concurrency (default: 5)
SUMMARIZE_RATE_LIMIT_ANON	integer	❌	Web App	Max summarize requests/min for anon users (default: 5)
SUMMARIZE_RATE_LIMIT_AUTH	integer	❌	Web App	Max summarize requests/min for auth users (default: 20)
ADMIN_EMAIL	email	❌	Web App	Initial admin user email (seed script)
12.3 Structured Logging Schema
All log lines are structured JSON. Human-readable logging in development, JSON in production. Never log secrets — the fields below define the safe surface.

TypeScript

// Shared logging interface — both Web App and Worker use this shape
interface LogEntry {
  timestamp: string         // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error'
  service: 'web' | 'worker'
  correlationId: string     // Request ID (web) or Job ID (worker)
  message: string
  // Optional structured context
  jobId?: string
  jobName?: string
  sourceId?: string
  articleId?: string
  summaryId?: string
  userId?: string           // Never log email or PII
  durationMs?: number
  errorCode?: string
  errorMessage?: string     // Sanitized — never include stack traces in prod
}

// Example log entries:
// {"timestamp":"2026-06-08T12:00:00Z","level":"info","service":"worker",
//  "correlationId":"job-abc123","message":"Ingestion complete",
//  "sourceId":"uuid-bbc","durationMs":342,"articlesFetched":24,"articlesNew":3}

// {"timestamp":"2026-06-08T12:00:01Z","level":"error","service":"worker",
//  "correlationId":"job-xyz789","message":"Anthropic API call failed",
//  "articleId":"uuid-art","errorCode":"rate_limited","durationMs":1203}
12.4 Metrics Taxonomy
Category	Metric Name	Type	Labels
Ingestion	ingest.jobs.completed	Counter	source_id, category
Ingestion	ingest.jobs.failed	Counter	source_id, error_code
Ingestion	ingest.articles.new	Counter	category_id
Ingestion	ingest.duration_ms	Histogram	source_id
Summarization	summarize.jobs.completed	Counter	model, priority
Summarization	summarize.jobs.failed	Counter	model, error_code
Summarization	summarize.tokens_used	Histogram	model
Summarization	summarize.cost_proxy_usd	Gauge	model
API	api.requests	Counter	path, method, status
API	api.latency_ms	Histogram	path
Feed	feed.freshness.articles_24h	Gauge	category_id
Queue	bullmq.queue.depth	Gauge	queue_name
Queue	bullmq.dlq.count	Gauge	queue_name
12.5 Alerting Rules
Alert Name	Condition	Severity	Channel
IngestionSourceDown	source.consecutive_failures >= 3	High	Slack #ops
IngestionSourceAutoDisabled	source.consecutive_failures >= 5	Critical	PagerDuty
SummarizationErrorRate	summarize.jobs.failed / total > 5% over 1h	High	Slack #ops
FeedFreshnessLow	feed.freshness.articles_24h < 10 for Top Stories	Critical	PagerDuty
ApiLatencyHigh	api.latency_ms p95 > 1000ms for 5min	High	Slack #ops
BullMQDLQHigh	bullmq.dlq.count > 50	High	Slack #ops
RedisMemoryPressure	Redis memory > 80%	High	Slack #ops
DatabaseConnectionExhaustion	PG connection pool > 90% utilized	Critical	PagerDuty
12.6 Runbooks
Runbook: Ingestion Source Failure
text

SYMPTOM: Alert fires: IngestionSourceDown for source X
         OR admin reports missing articles from a specific source

DIAGNOSIS:
1. Check /admin/jobs → filter by sourceId X → look at last 3-5 failed jobs
2. Examine error_message in sourceHealthSnapshots for that source
3. Classify error type:
   - "HTTP 404" → Feed URL has changed. Update in /admin/sources.
   - "Connection timeout" → Source is temporarily down. Wait and monitor.
   - "Parse error: X" → Feed format changed. Debug parser.
   - "HTTP 401/403" → Auth credentials expired. Update source config.
   - "SSL certificate" → Source certificate expired. Alert source owner.

RESOLUTION:
A) Temporary outage (connection timeout):
   → Monitor consecutive_failures. If < 5, BullMQ will retry automatically.
   → If source auto-disabled: /admin/sources → re-enable after outage resolves.

B) Feed URL changed:
   → /admin/sources → Edit source → Update feedUrl → Save
   → /admin/jobs → Trigger manual ingest for that source
   → Monitor next scheduled poll

C) Parser failure:
   → Check raw feed XML/JSON via curl or browser
   → Update parser adapter in worker/src/parsers/
   → Deploy updated worker
   → Trigger manual ingest

POST-RESOLUTION:
   → Verify articles_fetched > 0 in next health snapshot
   → Reset alert in alerting system
   → Document in incident log if outage > 2 hours
Runbook: AI Summarization Incident
text

SYMPTOM: Alert fires: SummarizationErrorRate > 5%
         OR users report "Generate Summary" not working

DIAGNOSIS:
1. Check /admin/jobs → summarize queue → failed jobs
2. Check error_message:
   - "Anthropic API: 429" → Rate limited
   - "Anthropic API: 500/503" → Anthropic outage
   - "AI response parsing failed" → Prompt/model output changed
   - "Article not found" → Data consistency issue
   - "Full text extraction failed" → Extractor service issue (non-fatal)

RESOLUTION:
A) Anthropic rate limited (429):
   → Reduce WORKER_CONCURRENCY_SUMMARIZE to 2 (env var, restart worker)
   → Failed jobs will retry automatically with backoff
   → Check Anthropic dashboard for quota usage
   → Increase quota limit if approaching monthly cap

B) Anthropic outage (500/503):
   → Worker will automatically fall back to GPT-4o-mini (see lib/ai/client.ts)
   → If fallback also failing: temporarily set WORKER_CONCURRENCY_SUMMARIZE=0
   → Monitor Anthropic status page: status.anthropic.com
   → Re-enable when restored

C) Parsing failure (model output changed):
   → Check failed job's raw AI response in BullMQ Board
   → Update summaryResponseSchema in lib/ai/prompts.ts
   → Retry failed jobs from BullMQ Board after deploy

POST-RESOLUTION:
   → Check summarize.cost_proxy_usd metric for unexpected cost spikes
   → Retry all DLQ jobs for the summarize queue
   → Verify summary trust metrics return to baseline
Runbook: Database Connection Exhaustion
text

SYMPTOM: Alert fires: DatabaseConnectionExhaustion (pool > 90%)
         OR API returns 500 errors with "connection timeout" in logs

DIAGNOSIS:
1. Check `SELECT count(*) FROM pg_stat_activity` on primary PG instance
2. Identify long-running queries: SELECT * FROM pg_stat_activity 
   WHERE state = 'active' AND duration > interval '30 seconds'
3. Check connection pool config: Web App max=10, Worker max=5 (per env var)
4. Count running Web App + Worker instances

RESOLUTION:
A) Runaway query:
   → SELECT pg_terminate_backend(pid) WHERE duration > 2min
   → Identify query from pg_stat_activity query column
   → Add missing index or query optimization

B) Too many application instances:
   → Pool per instance × instances must not exceed PG max_connections (100 default)
   → Reduce auto-scaling max instances OR add PgBouncer connection pooler

C) Worker flooding with ingest jobs:
   → Temporarily reduce WORKER_CONCURRENCY_INGEST (env var, restart worker)
   → Each ingest job holds a DB connection for the duration of the batch insert

POST-RESOLUTION:
   → Monitor pg_stat_activity back to normal levels
   → Consider PgBouncer for transaction pooling if this recurs
Runbook: Zero-Downtime Schema Migration
text

PROCEDURE for migrating production database:

STEP 1: Generate migration
   $ npx drizzle-kit generate
   → Review generated SQL in ./drizzle/XXXX_migration_name.sql
   → Verify: additive only? No DROP? No NOT NULL without DEFAULT?

STEP 2: Test migration on staging
   DATABASE_URL=$STAGING_URL npx tsx scripts/migrate.ts
   → Run full test suite against staging
   → Verify application works with new schema

STEP 3: Deploy (zero-downtime pattern)
   For ADDITIVE migrations (new column with DEFAULT, new table, new index):
   → Apply migration FIRST (before code deploy)
   → Old code ignores new columns; new code uses them
   → Deploy new code
   → No downtime required

   For BREAKING changes (rename column, change type):
   → Deploy 1: Add new column. Dual-write to old + new in code.
   → Apply migration: add new column, copy data, index it.
   → Deploy 2: Switch reads to new column.
   → Deploy 3: Remove dual-write. Drop old column in migration.

STEP 4: Apply to production
   DATABASE_URL=$PRODUCTION_URL npx tsx scripts/migrate.ts
   → Monitor application logs for 5 minutes post-deploy
   → Verify API latency metrics stable

STEP 5: Rollback (if needed)
   → Drizzle does NOT auto-generate rollback migrations
   → Keep the previous schema snapshot
   → Manual rollback: write a new migration that reverts the change
   → Never restore from a pre-migration backup unless data loss is acceptable
12.7 Deployment Checklist
Pre-Deploy
 All tests pass (pnpm test)
 TypeScript strict check passes (pnpm typecheck)
 Lint passes (pnpm lint)
 Migration SQL reviewed by at least one other engineer
 Migration applied to staging and tested
 Environment variables for new config items set in production secrets
Deploy
 Apply database migration BEFORE deploying new code (additive migrations)
 Deploy Web App (stateless — rolling deploy safe)
 Deploy Worker Service (drain queue first on non-rolling deploys)
 Verify health endpoints return 200:
GET /api/categories → should return category list
GET /api/articles?limit=5 → should return articles
GET /api/source-health (admin token) → should show recent snapshots
Post-Deploy
 Monitor API p95 latency for 10 minutes (no spike above 1s)
 Monitor BullMQ queue depths (ingest queue should drain normally)
 Verify ingestion still running: check sourceHealthSnapshots last_success_at
 Spot-check 3 articles for correctness in UI
 If summary feature deployed: test one manual summary request end-to-end
12.8 Package Installation Reference
Install commands for all project dependencies. Run these during initial setup:

Bash

# Web
