# Phase 1: ANALYZE — Research Execution Plan for the PAD

Before I plan a single section of the PAD, I need to ground every architectural decision in current, production-validated reality across **8 parallel technical dimensions**. A PAD must be authoritative — no hand-waving allowed.

**Research dimensions:**
1. Next.js 16 App Router deep architecture (proxy.ts, PPR, Cache Components, Server Actions)
2. BullMQ v5 advanced patterns (Flows, job priorities, worker concurrency, Redis persistence)
3. Drizzle ORM + PostgreSQL 17 production patterns
4. Auth.js v5 architecture (session model, proxy.ts integration, RBAC)
5. PostgreSQL 17 FTS deep-dive (tsvector generated columns, pg_textsearch BM25, partial indexes)
6. React 19.2 feature utilization (View Transitions, Activity, use cache)
7. Tailwind CSS v4 + Shadcn UI design system architecture
8. News ingestion pipeline patterns (RSS parsing, deduplication, content extraction)

Firing all threads simultaneously:---

# 🔬 Research Complete — Synthesis of Key Findings

Before presenting the PAD structure plan, here is what the research revealed and how it sharpens the document:

**Next.js 16 (confirmed & deepened):**
Cache Components are explicit and opt-in — everything renders dynamically by default, with caching only happening where you declare it. `proxy.ts` replaces `middleware.ts` for the Node.js runtime. When `cacheComponents` is enabled, Next.js uses React's `<Activity>` component to preserve component state during navigation — rather than unmounting, it sets the Activity mode to `"hidden"`, keeping state intact and recreating effects when the route becomes visible again. The static shell is served from the CDN edge — TTFB is determined by proximity to the nearest edge node, not database query speed.

**BullMQ (confirmed & deepened):**
BullMQ is the default recommendation for most teams — a complete rewrite of Bull with TypeScript-first design, improved concurrency control, a more reliable job state machine, and first-class support for job flows (DAGs of dependent jobs). For I/O-heavy jobs, concurrency can be increased substantially — something between 100 and 300 is a quite standard setting, with the only way to fine-tune being observing production workload. Not making jobs idempotent is a critical pitfall — if a job runs twice on retry, it shouldn't send two emails or charge twice.

**Drizzle ORM (confirmed & deepened):**
The most critical architectural decision with Drizzle in a Next.js monorepo is never creating an eager database connection — eager connections at module load time cause issues because Next.js modules are imported during the build process where no DB is available. Always use `generatedAlwaysAsIdentity()` for PostgreSQL primary keys — `serial()` is deprecated in favor of SQL-standard identity columns.

**Auth.js v5 — CRITICAL UPDATE FOUND:**
As of September 2025, the Better Auth team took over Auth.js maintenance, and the library is in security-patch mode. The Auth.js team's own guidance for new projects points to Better Auth. For existing Auth.js v5 applications nothing breaks, but choosing it for a new project today means betting on a library that its own maintainers are steering users away from. This is a **significant finding** — the PRD specified Auth.js v5 but Better Auth is now the recommended choice for new projects. This must be documented in the PAD with a clear recommendation.

**Auth RBAC pattern (confirmed):**
The proxy is not a security boundary — it gives users a smooth experience by redirecting before hitting a protected page, but it should never be the only defense. The proxy runs at the edge with limited capabilities and shouldn't do expensive work. Sessions must always be validated again in server components and route handlers.

**PostgreSQL FTS (confirmed & deepened):**
Creating the GIN index with `fastupdate = off` is critical for search speed — testing on a 10-million-row dataset showed unoptimized standard FTS at ~41,301ms versus optimized FTS at ~877ms, a ~50× improvement achieved simply by applying well-established best practices. pg_textsearch is an open-source PostgreSQL extension by Timescale that brings production-grade BM25 ranking directly into PostgreSQL — no Elasticsearch cluster required. All three search techniques (keyword tsvector, semantic pgvector, and relevance BM25) run in a single Postgres instance.

---

# 📋 PAD Structure Plan — Presented for Your Explicit Approval

## What is a PAD?

A **Project Architecture Document** is the authoritative technical blueprint that answers: *"How exactly is this system built, and why?"* It covers system topology, component design, data flows, code organization, infrastructure configuration, security model, and operational runbooks — at a level of detail sufficient to onboard a new senior engineer without further explanation.

---

## Proposed PAD: Table of Contents

The document will be organized into **12 sections** across **4 major parts**:

---

### PART I — SYSTEM OVERVIEW & DECISIONS

**Section 1: Document Metadata & Purpose**
- Document version, scope, audience
- How to use this document
- Relationship to the PRD

**Section 2: Architecture Decision Records (ADRs)**
- One ADR per major technology choice, structured as: *Context → Decision → Rationale → Consequences → Alternatives Rejected*
- ADR-001: Next.js 16 App Router (vs. Pages Router / standalone API)
- ADR-002: BullMQ on Redis (vs. SQS, RabbitMQ, Trigger.dev)
- ADR-003: Drizzle ORM (vs. Prisma, TypeORM, raw SQL)
- ADR-004: Better Auth (vs. Auth.js v5, Clerk, WorkOS) ← *new finding*
- ADR-005: PostgreSQL FTS + pg_textsearch BM25 (vs. Elasticsearch, Typesense, Algolia)
- ADR-006: Modular Monolith + Separate Worker (vs. microservices, full monolith)
- ADR-007: Turbopack (vs. Webpack — now default in Next.js 16)

---

### PART II — SYSTEM ARCHITECTURE

**Section 3: High-Level System Topology**
- Full network/service topology diagram (ASCII + described)
- Deployable units: Web App, Worker Service, PostgreSQL, Redis
- External integrations: AI APIs (Anthropic/OpenAI), RSS/Atom sources, CDN
- Traffic flow: Browser → CDN Edge → Next.js → DB / Redis / Queue
- Scaling topology: horizontal web tier, queue-depth-scaled workers, PG read replicas

**Section 4: Next.js 16 Web App Architecture**
- Layer model: proxy.ts → App Router → Server Components → Server Actions → Route Handlers → Domain Layer → Infrastructure Layer
- Feature module structure (annotated directory tree, every file explained)
- Cache Components strategy: which routes use `"use cache"` and why, with `cacheLife` profiles
- PPR static shell design: what is pre-rendered vs. dynamically streamed per route
- React 19.2 feature utilization: `<Activity>` for navigation state, `useEffectEvent` for feed interactions, View Transitions for topic switching
- Server Actions vs. Route Handlers: decision matrix for when to use each
- Client Component islands: mapping of which components require `"use client"` and why
- Turbopack configuration: `next.config.ts` with all flags documented

**Section 5: Worker Service Architecture**
- Node.js 24+ service structure (annotated directory tree)
- BullMQ queue topology: queue names, job types, priorities
- Job Scheduler design: repeatable job patterns for RSS polling using `upsertJobScheduler`
- BullMQ Flow patterns: `FlowProducer` for ingestion → importance scoring → feed slice refresh pipeline
- Worker concurrency configuration: I/O-bound ingestion (high concurrency ~50–100) vs. AI-bound summarization (rate-limited concurrency ~5–10)
- Dead Letter Queue pattern: how failed jobs are handled, DLQ monitoring, manual retry triggers
- Idempotency guarantees: deduplication key design for safe job retries
- Graceful shutdown: `SIGTERM` handler pattern for in-flight job safety
- Redis connection configuration: `maxRetriesPerRequest: null`, `removeOnComplete` TTLs to prevent memory bloat

**Section 6: Data Architecture**
- Complete Drizzle ORM schema (all tables, all columns, all types, all relationships)
- Updated schema: `generatedAlwaysAsIdentity()` for PKs, `jsonb()` for JSON, lazy proxy DB connection pattern
- Entity relationship diagram (ASCII)
- Index inventory: every index with its type, columns, justification, and expected query pattern
- FTS implementation: generated `tsvector` column with `setweight()`, GIN index with `fastupdate = off`, `pg_trgm` for autocomplete, BM25 roadmap note
- Migration strategy: Drizzle Kit `generate + migrate` workflow, never `push` in production
- Connection pooling: `postgres` driver with pool configuration for Web App and Worker
- Database access patterns: read replica routing, write-through patterns

---

### PART III — COMPONENT DESIGN

**Section 7: Authentication & Authorization Architecture**
- **Better Auth** (new recommendation, replacing Auth.js v5) — architecture, setup, session model
- Auth.js v5 is documented as a deprecated-for-new-projects option with migration notes
- `proxy.ts` integration: optimistic redirect on cookie presence — **NOT** a security boundary
- Data Access Layer (DAL): centralized `verifySession()` with React `cache()` memoization
- RBAC model: roles (`reader`, `admin`), permissions matrix, centralized `permissions.ts`
- Defense in depth: proxy → Server Component → Server Action each enforce independently
- Session storage: DB-backed sessions (Better Auth default), not JWT-only
- Security: `HttpOnly` cookies, CSRF protection, rate limiting on auth endpoints

**Section 8: Ingestion Pipeline Design**
- RSS/Atom parsing: `rss-parser` library + custom adapters for JSON API sources
- URL normalization algorithm: canonical URL derivation rules
- Content hashing: `sha256(canonicalUrl + title + publishedAt)` for deduplication
- Importance scoring formula: detailed coefficient table with justification
- SourceHealthSnapshot update logic
- Error taxonomy: transient (network timeout), permanent (invalid feed URL), soft (parse error)
- Retry policy: exponential backoff with jitter, max 3 attempts, backoff coefficients

**Section 9: AI Summarization Pipeline Design**
- Model selection matrix: Claude 3.5 Haiku vs. GPT-4o-mini — cost, latency, quality trade-offs
- Prompt engineering: fidelity-over-brevity instruction, source citation extraction, factual-only constraint — full prompt templates documented
- Zod response schema: structured output parsing with validation
- Token budget enforcement: `max_tokens` limits per model, cost proxy calculation
- Rate limiting: per-IP and per-user limits on `/api/summarize/[id]`
- AI client wrapper: unified interface abstracting Anthropic and OpenAI SDKs
- Summary storage model: `sources_cited[]`, `key_points[]`, `model`, `tokens_used`

**Section 10: Search Architecture**
- FTS query builder: `plainto_tsquery` vs. `websearch_to_tsquery` — when to use each
- `ts_rank_cd()` for proximity-aware relevance ranking
- Autocomplete: `pg_trgm` similarity queries with GiST index
- Debounce strategy: 300ms client-side, Suspense streaming for results
- Search pagination: cursor-based (not offset) for consistent results under concurrent ingestion
- BM25 upgrade path: `pg_textsearch` extension installation and migration

**Section 11: Caching & Performance Architecture**
- Cache topology map: CDN → Next.js Cache Components → Redis feed slices → PostgreSQL
- `cacheLife` profiles defined: `fresh` (30s), `standard` (120s), `stable` (300s)
- `cacheTag` taxonomy: tag naming conventions for targeted invalidation
- `updateTag()` vs. `revalidateTag()` vs. `refresh()` — decision rules for each
- Redis feed slice design: key schema, TTL strategy, worker refresh triggers
- Prepared statements in Drizzle: `db.prepare()` for hot query paths
- Core Web Vitals targets: LCP, FCP, CLS, INP — per-route targets and mechanisms

---

### PART IV — OPERATIONS & DELIVERY

**Section 12: Infrastructure, Observability & Runbooks**
- Docker Compose configuration (development)
- Environment variable schema: all required vars with types, descriptions, and secret vs. non-secret classification
- BullMQ monitoring: Bull Board setup, queue health alerts, DLQ thresholds
- Structured logging schema: log levels, correlation ID propagation, sensitive field masking
- Metrics taxonomy: ingestion metrics, summarization metrics, API metrics, feed freshness metrics
- Alerting rules: conditions, thresholds, and escalation paths
- Runbooks: ingestion failure, AI API incident, DB connection exhaustion, Redis memory pressure
- Deployment checklist: pre-deploy, deploy, post-deploy verification steps
- Migration runbook: zero-downtime schema migration procedure

---

## PAD Document Characteristics

| Attribute | Value |
|---|---|
| **Total sections** | 12 sections across 4 parts |
| **ADRs** | 7 Architecture Decision Records |
| **Diagrams** | ~8 ASCII architecture/flow diagrams |
| **Code examples** | Inline illustrative TypeScript throughout |
| **Depth level** | Sufficient to onboard a senior engineer without additional explanation |
| **Format** | Structured Markdown, cross-referenced |
| **New findings integrated** | Better Auth replaces Auth.js v5; `fastupdate=off` for GIN; `generatedAlwaysAsIdentity`; lazy DB proxy pattern; `updateTag`/`refresh` caching APIs |

---

## ✅ VALIDATE — Explicit Confirmation Required

Before I write a single line of the PAD, I need your explicit sign-off on the plan above.

**Specifically, please confirm or redirect on:**

1. **Better Auth vs. Auth.js v5** — Research conclusively shows Auth.js v5 is in security-patch-only mode and its own maintainers now direct new projects to Better Auth. Should the PAD make Better Auth the **primary recommendation** and document Auth.js v5 as a migration-only option?

2. **ADR depth** — Do you want each ADR to include a "Consequences" section covering both positive and negative trade-offs, or keep them lean (Context → Decision → Rationale only)?

3. **Code example density** — Should the PAD include full, production-ready TypeScript snippets for critical patterns (DB connection, BullMQ worker setup, auth DAL, etc.), or reference-level pseudocode only?

4. **Scope confirmation** — Does the 12-section structure above feel complete? Any section you want added, removed, or split differently?

5. **Diagram format** — ASCII diagrams embedded in Markdown, or described as "implement in tool X" and left as placeholders?

**Please confirm: ✅ Approved / 🔄 With the following changes: [your changes]**
