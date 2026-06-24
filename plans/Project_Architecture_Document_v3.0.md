Let me read both documents to understand their contents thoroughly.
The documents are quite long and were clipped. Let me read the remaining portions of both files.
Let me continue reading the remaining portions of both documents.
I've thoroughly analyzed both documents and identified critical misalignments. Let me now generate the PAD v3.0. Here are the key deltas I found:

| Concern | PRD v4.3 | PAD v2.0 | PAD v3.0 Resolution |
|---|---|---|---|
| **Auth** | Auth.js v5 (beta) | Better Auth | Align to PRD: Auth.js v5 + Risk Note |
| **AI Primary** | Claude 4.5 Haiku | Haiku (generic) | Align to PRD: `claude-haiku-4-5` |
| **AI Fallback** | GPT-5 Mini | GPT-4o-mini | Align to PRD: `gpt-5-mini` |
| **Next.js pin** | ≥16.2.6 (CVE fix) | "16" | Align to PRD: ≥16.2.6 |
| **cacheLife location** | Top-level | Inside experimental | Align to PRD: top-level |
| **cacheLife profiles** | feed, topicShell, reference | feed, nav, stable | Align to PRD |
| **cacheComponents** | `true` top-level | Not present | Add per PRD |
| **View Transitions** | `<PageTransition>` component | `useTopicTransition` hook | Align to PRD: `<PageTransition>` |
| **AI Disclosure** | 3-Layer (JSON-LD+HTTP+meta) | Not covered | Add per PRD |
| **summaryStatusEnum** | 5 values (no 'failed') | 6 values (incl. 'failed') | Align to PRD: 5 values |
| **sources.lastFetchedAt** | Present | Missing | Add per PRD |
| **sources.failureCount** | Present | Missing | Add per PRD |

Now generating the full PAD v3.0 document:
The PAD v3.0 has been generated and saved to `/home/z/my-project/download/OneStopNews_PAD_v3.0.md`.

Here's a summary of what was done and the critical changes from PAD v2.0:

### Critical Alignment Changes (PAD v2.0 → v3.0)

| # | Change | Why |
|---|---|---|
| 1 | **Auth: Better Auth → Auth.js v5** | PRD v4.3 specifies Auth.js v5; risk note added to ADR-004 about deprecation concerns |
| 2 | **Next.js pin: "16" → ≥16.2.6** | CVE-2025-55182 (React2Shell RCE) + 13-advisory security bundle |
| 3 | **AI models: "Haiku"/"GPT-4o-mini" → `claude-haiku-4-5`/`gpt-5-mini`** | PRD v4.3 specifies exact model identifiers |
| 4 | **`cacheLife`: experimental → top-level** | Runtime error if placed inside `experimental` in Next.js 16 |
| 5 | **Cache profiles: `nav`/`stable` → `topicShell`/`reference`** | PRD v4.3 naming convention |
| 6 | **`cacheComponents: true` added as top-level flag** | Replaces `experimental.ppr` + `experimental.dynamicIO` |
| 7 | **View Transitions: `useTopicTransition` → `<PageTransition>`** | PRD v4.3 requires abstraction to isolate experimental API |
| 8 | **`summaryStatusEnum`: removed `failed` value** | PRD v4.3 schema has 5 values; failures tracked in BullMQ DLQ |
| 9 | **`sources`: added `lastFetchedAt` + `failureCount`** | Backoff logic + health monitoring per PRD v4.3 |
| 10 | **3-Layer AI Disclosure added** | JSON-LD + HTTP header + HTML meta (EU AI Act Art. 50) |
| 11 | **Push Notification architecture added** | PRD v4.3 goal 5 (AI-summarised push + daily briefing) |
| 12 | **Summary Review Workflow added** | PRD v4.3 §3.3, §7.3 (approve/regenerate/disable) |

### Document Structure

The PAD v3.0 is organized into 3 parts:
- **Part I**: System Overview & Decisions (stack, ADRs, topology)
- **Part II**: System Architecture (web app, worker, data, AI pipeline, push, disclosure)
- **Part III**: Operational & Cross-Cutting (risk register, traceability matrix, change log)

---

# OneStopNews — Master Project Architecture Document (PAD) v3.0

**Classification:** Internal Engineering Reference
**Status:** Authoritative — supersedes PAD v2.0 (unified-2) and all prior architecture notes
**Companion Document:** OneStopNews PRD v4.3 (Definitive, Production-Locked)
**Date of Issue:** June 10, 2026
**Audience:** Senior Engineers, Tech Leads, DevOps, and Onboarding Engineers
**Rule:** Every architectural decision in this document traces to a specific rationale. Nothing is here "because it's popular."

---

## Revision Block — v3.0 Alignment with PRD v4.3

Every change from PAD v2.0 to v3.0 is tagged with its source: `[PRD]` = aligned to PRD v4.3, `[FIX]` = correction of PAD v2.0 error, `[NEW]` = new section not in PAD v2.0.

- `[PRD]` **Auth library reverted to Auth.js v5** (`5.0.0-beta.x`). PAD v2.0 chose Better Auth; PRD v4.3 is the definitive product blueprint and specifies Auth.js v5. A risk note is added to ADR-004. See §3 ADR-004 for full rationale.
- `[PRD]` **Next.js minimum version pinned to ≥16.2.6** to mitigate CVE-2025-55182 (React2Shell RCE) and the 13-advisory security bundle. PAD v2.0 stated "Next.js 16" without pin.
- `[PRD]` **AI model names updated**: Primary = Claude 4.5 Haiku (`claude-haiku-4-5`, released Oct 15, 2025, $1/$5 per M tokens). Fallback = GPT-5 Mini (`gpt-5-mini`, released Aug 7, 2025). PAD v2.0 referenced generic "Haiku" and "GPT-4o-mini".
- `[PRD]` **`cacheComponents: true` locked as top-level config flag**, replacing all legacy flags (`experimental.ppr`, `experimental.dynamicIO`). PAD v2.0 had `cacheLife` inside `experimental` — now top-level.
- `[PRD]` **Cache life profile names aligned**: `feed`, `topicShell`, `reference` (PRD v4.3 naming). PAD v2.0 used `feed`, `nav`, `stable`.
- `[PRD]` **View Transitions routed through `<PageTransition>` component abstraction**, not the raw `useTopicTransition` hook that called `document.startViewTransition` directly. The `<PageTransition>` abstraction isolates the experimental React API per PRD v4.3 §5.3.
- `[PRD]` **3-Layer Machine-Readable AI Disclosure** added: JSON-LD + HTTP header + HTML meta tag. C2PA claim fully removed (no text standard exists). PAD v2.0 did not cover machine-readable disclosure.
- `[PRD]` **`summaryStatusEnum` reduced to 5 values** (`none`, `pending`, `ok`, `needs_review`, `disabled`). PAD v2.0 included `failed` — removed per PRD v4.3 schema.
- `[PRD]` **`sources` table augmented** with `lastFetchedAt` and `failureCount` columns for backoff logic and health monitoring.
- `[PRD]` **`contentAvailabilityEnum` documentation** tightened with explicit summarisation guard: only `partial_text` and `full_text` are eligible for AI summarisation.
- `[NEW]` **Push Notification Architecture** section added (PRD §7 goal 5: AI-summarised push notifications + daily briefing email).
- `[NEW]` **Summary Review Workflow** section added (PRD §3.3 Editor/Admin persona, §7.3).
- `[NEW]` **PRD-to-PAD Traceability Matrix** added as Appendix A.
- `[FIX]` **`next.config.ts` code pattern** corrected: `cacheLife` and `cacheComponents` moved from `experimental` to top-level. `experimental.ppr` and `experimental.dynamicIO` explicitly marked as DO NOT INCLUDE (build error in Next.js 16).
- `[FIX]` **`sources.url` unique constraint** corrected: PRD v4.3 schema applies `.unique()` to `feedUrl`, not `url`. The `url` field is the source's public homepage, which need not be unique across sources (multiple feeds from the same publisher).

---

## PART I: SYSTEM OVERVIEW & DECISIONS

### 1. Document Metadata & Purpose

This PAD is the single authoritative source of truth for *how* OneStopNews is built. It answers: "Exactly how is this system constructed, and precisely why was each decision made?"

**Relationship to PRD v4.3:** The PRD defines *what* the system does and *why* (product goals, user stories, success metrics). This PAD defines *how* (system design, code patterns, operational procedures). Where the PRD is ambiguous, this document makes the definitive technical decision. Where the PRD is explicit (e.g., technology choices, schema definitions, config flag placement), this PAD aligns without deviation.

**How to Use:**
- *New Engineer:* Read Sections 1 → 2 → 3 → your feature area.
- *Debugging Ingestion:* Jump to Section 5 (Worker Architecture) + Section 12 (Runbooks).
- *Reviewing Tech Choices:* Go directly to the relevant ADR in Section 3.
- *Understanding PRD Alignment:* See Appendix A (Traceability Matrix).

### 2. Technology Stack Summary

All choices are definitive and aligned with PRD v4.3 §1.1 Architectural Commitment. Speculative or ambiguous language from prior PAD versions has been removed.

| Layer | Technology | Version | Key Rationale |
| :--- | :--- | :--- | :--- |
| **Web Framework** | Next.js | **≥16.2.6** | CVE-2025-55182 mitigation. PPR via `cacheComponents` + `"use cache"` + `proxy.ts`. |
| **UI Runtime** | React | 19.2 (stable) | Production-stable. App Router bundles correct canary automatically. |
| **Language** | TypeScript | 5.x (Strict) | Type safety across Web App and Worker. No `any`. Prefer `interface` over `type`. |
| **Caching Model** | `cacheComponents: true` | Top-level config | Replaces `experimental.ppr` + `experimental.dynamicIO`. Opt-in caching. |
| **Cache Profiles** | Named `cacheLife` profiles | Top-level config | `feed`, `topicShell`, `reference` — defined top-level alongside `cacheComponents`. |
| **Bundler** | Turbopack | Top-level (stable) | Graduated out of experimental in Next.js 16. Default bundler. |
| **Styling** | Tailwind CSS | v4 + CSS Subgrid | Utility-first with structural subgrid for card alignment (`grid-rows-subgrid`). |
| **Component Primitives** | Shadcn UI (Radix) | Latest | Library-first mandate. Wrapped for bespoke "Editorial Dispatch" aesthetic. No custom rebuilds. |
| **Validation** | Zod | 3.x | Schema-first, composable, Drizzle-integrated. Enforces AI output constraints. |
| **Authentication** | **Auth.js** | **5.0.0-beta.x** | HttpOnly session cookies, Next.js-native. Pin exact beta version. See ADR-004 Risk Note. |
| **ORM** | Drizzle ORM | Latest | TypeScript-native, SQL-fluent, zero runtime overhead, lazy-connection compatible. |
| **Database** | PostgreSQL | 17 | Primary and only production datastore. |
| **FTS** | GIN `tsvector` + `pg_textsearch` BM25 | Built-in / GA in PG 17 | Elasticsearch-free. `customType` pattern confirmed in Drizzle docs. |
| **Job Queue** | BullMQ | 5.x | TypeScript-native, job graphs (Flows), priorities, built-in monitoring dashboard. |
| **Queue Backend** | Redis (Upstash Managed) | 7.x | AOF persistence, `noeviction` policy, `maxRetriesPerRequest: null`. |
| **Worker Runtime** | Node.js | 24 LTS ("Krypton") | LTS since Oct 28, 2025; supported through April 2028. |
| **AI Model (Primary)** | Claude 4.5 Haiku | `claude-haiku-4-5` | Released Oct 15, 2025. $1/$5 per M tokens. Best cost/quality for news summarisation. |
| **AI Model (Fallback)** | GPT-5 Mini | `gpt-5-mini` | Released Aug 7, 2025. Validated cost/quality fallback. |
| **AI Disclosure** | 3-Layer Machine-Readable | JSON-LD + HTTP header + HTML meta | C2PA claim fully removed (no text standard exists). EU AI Act Art. 50 compliance. |
| **Network Boundary** | `proxy.ts` | Next.js 16 standard | Runs on Node.js runtime. Replaces `middleware.ts`. |
| **Typography** | Newsreader + Instrument Sans + Commit Mono | Variable fonts | Anti-generic, deliberate pairing. Explicit rejection: Inter, Roboto, Space Grotesk. |
| **Accent Colour** | `--dispatch-ember` | `#c7513f` | Coral-red; avoids "warning" connotation of amber. |

### 3. Architecture Decision Records (ADRs)

Each ADR follows the structure: **Context → Decision → Rationale → Consequences → Alternatives Rejected**.

ADRs that changed from PAD v2.0 to v3.0 are marked with `[UPDATED]`.

---

#### **ADR-001: Next.js 16 App Router as the Web Framework** `[UPDATED]`

**Context:** OneStopNews requires a framework that serves a high-read-volume news feed with fast initial loads, handles server-side data fetching without API waterfalls, and supports a mix of highly cacheable (topic feeds) and fully dynamic (article detail with live summary status) content.

**Decision:** Use Next.js ≥16.2.6 with the App Router, Cache Components (`"use cache"`), `cacheComponents: true` (top-level), and `proxy.ts`.

**Rationale:** Next.js 16 makes caching entirely *opt-in* via Cache Components, eliminating the "everything is statically cached by default" footgun of v13/14. The `cacheComponents: true` flag at the top-level replaces all legacy flags (`experimental.ppr`, `experimental.dynamicIO`) and is the single enablement switch for the entire caching model. `proxy.ts` replaces `middleware.ts`, allowing full Node.js runtime at the network boundary without Edge constraints. The version pin to ≥16.2.6 is non-negotiable: earlier 16.x releases are unpatched against CVE-2025-55182 (React2Shell RCE) and a 13-advisory security bundle covering high-severity DoS and SSRF vulnerabilities.

**Consequences:**
- *Positive:* Zero client-side waterfalls; fine-grained caching control; `proxy.ts` provides a clean network boundary for UX redirects; security patches enforced by version pin.
- *Negative:* `"use cache"` requires discipline: you cannot call `cookies()`, `headers()`, or read `params` directly inside a cached function. Runtime values must be passed as arguments from an uncached parent.

**Alternatives Rejected:**
- *Next.js 15 (Pages Router):* Lacks RSC, PPR, and Cache Components.
- *Next.js 16.x < 16.2.6:* Unpatched critical security vulnerabilities.
- *Remix v3:* Excellent routing, but smaller ecosystem and no PPR equivalent.

---

#### **ADR-002: BullMQ on Redis as the Job Queue**

**Context:** The system needs scheduled RSS polling (50–200 sources), prioritized summarization jobs (user-triggered > background), parent-child job dependencies (ingest → score → cache-refresh), and an admin monitoring dashboard.

**Decision:** Use BullMQ v5 backed by a managed Redis instance (Upstash).

**Rationale:** BullMQ is the established Node.js solution for this workload. `upsertJobScheduler` ensures idempotent management of recurring jobs (critical for dynamic polling intervals). `FlowProducer` enables atomic ingestion pipelines where the parent job (feed refresh) only runs after all child jobs (scoring) complete.

**Consequences:**
- *Positive:* Job persistence in Redis survives worker crashes; built-in Taskforce.sh/Bull Board dashboard; native TypeScript job payload typing.
- *Negative:* Redis is a required infrastructure dependency. Must be configured with `maxRetriesPerRequest: null` and `noeviction` policy.

**Alternatives Rejected:**
- *AWS SQS:* No job priorities, no parent-child flows, no native dashboard.
- *RabbitMQ:* Operational overhead (AMQP, Erlang) disproportionate to team size.
- *pg-boss:* Adds significant write pressure to the primary PostgreSQL database, which is already the read-path hot spot.

---

#### **ADR-003: Drizzle ORM for Database Access**

**Context:** The system needs type-safe, PostgreSQL-native database access that works in Next.js (where modules are imported at build time) and the Node.js worker, without eager connection crashes.

**Decision:** Use Drizzle ORM with the `postgres` (postgres.js) driver and a **Lazy Proxy Connection Pattern**.

**Rationale:** Drizzle generates near-raw SQL with zero runtime query engine overhead. Types are inferred directly from the schema (`.$inferSelect`), eliminating redundant type declarations. Crucially, the Lazy Proxy pattern defers the database connection until the first query executes, preventing Next.js build-time crashes in environments where `DATABASE_URL` is unavailable.

**Consequences:**
- *Positive:* Schema is the single source of truth; `drizzle-kit generate + migrate` enforces explicit, version-controlled SQL migration files.
- *Negative:* No GUI comparable to Prisma Studio (mitigated by standard `psql`/pgAdmin tooling).

**Alternatives Rejected:**
- *Prisma:* Generates a heavy runtime client, has eager connection issues in Next.js module loading, and introduces N+1 query traps under relational loads.
- *TypeORM:* Decorator-based, incompatible with strict-mode TypeScript patterns.

---

#### **ADR-004: Auth.js v5 as the Authentication Library** `[UPDATED]`

**Context:** The system requires session-based auth for admin users, HttpOnly cookie sessions, RBAC, and a foundation that is actively maintained.

**Decision:** Use **Auth.js v5** (`5.0.0-beta.x`) as the primary authentication library, pinning the exact beta version.

**Rationale:** PRD v4.3 is the definitive product blueprint and explicitly specifies Auth.js v5 with HttpOnly session cookies and Next.js-native integration. This decision supersedes the PAD v2.0 choice of Better Auth. Auth.js v5 provides HttpOnly session cookies, native Next.js App Router support, and a well-understood configuration model for the team.

**Risk Note:** As of late 2025, the Better Auth team took over Auth.js maintenance, and Auth.js entered security-patch-only mode. The Auth.js maintainers' own guidance for new projects points to Better Auth. This creates a strategic risk: Auth.js v5 may receive fewer feature updates and community support over time. Mitigation strategies include: (a) pinning the exact beta version to avoid unexpected breakage, (b) monitoring the Auth.js release cadence and security advisory feed, (c) maintaining an internal migration plan to Better Auth if Auth.js v5 reaches end-of-life, and (d) designing the auth integration layer behind a `lib/auth/dal.ts` Data Access Layer that abstracts the specific auth library, minimising migration cost if a switch becomes necessary.

**Consequences:**
- *Positive:* HttpOnly session cookies; Next.js App Router native; well-documented configuration; PRD alignment.
- *Negative:* Beta status requires version pinning; long-term maintenance risk; potential future migration to Better Auth.

**Alternatives Rejected:**
- *Better Auth:* Not specified by PRD v4.3. While technically preferable for long-term maintenance, the PRD is the authoritative product decision.
- *Clerk:* SaaS vendor lock-in; per-MAU pricing incompatible with enterprise scale.

---

#### **ADR-005: PostgreSQL FTS + `pg_textsearch` BM25 for Search**

**Context:** News search requires keyword search across titles/excerpts, relevance ranking, autocomplete, and filter support, without adding operational complexity.

**Decision:** Use PostgreSQL 17 native FTS (GIN-indexed `tsvector` generated columns) as the primary search, with `pg_textsearch` BM25 extension for relevance ranking (Phase 2), and `pg_trgm` for autocomplete.

**Rationale:** Generated `tsvector` columns eliminate manual trigger maintenance. The `fastupdate = off` GIN index configuration is non-negotiable for search latency (testing shows approximately 50× improvement). `pg_textsearch` brings production-grade BM25 ranking directly into PostgreSQL, eliminating the need for an Elasticsearch cluster.

**Consequences:**
- *Positive:* Zero operational overhead for a separate search cluster; transactional consistency (no async replication lag).
- *Negative:* `pg_textsearch` requires `shared_preload_libraries` config and a server restart in self-hosted environments (managed cloud platforms handle this).

**Alternatives Rejected:**
- *Elasticsearch / Typesense:* Separate cluster, separate sync pipeline, separate operational burden. Complexity/benefit ratio is wrong for V1.

---

#### **ADR-006: Modular Monolith + Separate Worker Service**

**Context:** The system has two fundamentally different workload types: synchronous user-facing HTTP requests (Web App) and asynchronous, long-running background jobs (Ingestion, Scoring, Summarization).

**Decision:** Deploy two distinct services: Next.js ≥16.2.6 Web App and Node.js 24 Worker Service, connected via BullMQ queues and sharing a PostgreSQL database.

**Rationale:** AI summarization (2–10s per call) and ingestion (network I/O) must not block HTTP request handling. Decoupling into a separate process achieves this without the complexity of microservices. The shared database is the integration point, avoiding distributed transaction complexity.

**Consequences:**
- *Positive:* Web app deploys independently from worker; worker scales horizontally based on queue depth.
- *Negative:* Schema migrations must be coordinated (additive-only deployments required).

**Alternatives Rejected:**
- *Full Monolith:* Background jobs in the Next.js process would block HTTP request threads during heavy ingestion bursts.
- *Full Microservices:* Operational overhead (service mesh, per-service DBs) is excessive for current team size and scale.

---

#### **ADR-007: Turbopack as the Default Build Tool**

**Context:** Next.js 16 ships Turbopack as the default and stable bundler, replacing Webpack.

**Decision:** Use Turbopack as shipped by Next.js 16. Do not revert to Webpack.

**Rationale:** Turbopack provides significantly faster HMR (5–10× faster Fast Refresh) and incremental compilation. All core dependencies (Shadcn UI, Tailwind v4, Drizzle ORM) are fully compatible. The `turbopack: {}` key is placed at the top-level in `next.config.ts` (graduated from `experimental` in Next.js 16).

**Consequences:**
- *Positive:* Dramatically faster development iteration.
- *Negative:* Some legacy Webpack-specific plugins have no Turbopack equivalent (none are required in this baseline architecture).

**Alternatives Rejected:**
- *Webpack:* Now the legacy fallback; slower and requires explicit configuration to use.

---

#### **ADR-008: 3-Layer Machine-Readable AI Disclosure** `[NEW]`

**Context:** PRD v4.3 requires full EU AI Act Article 50 compliance. The system must disclose AI-generated content in both human-readable (Nutrition Label) and machine-readable formats. C2PA was evaluated and rejected because no text content standard exists.

**Decision:** Implement a 3-layer machine-readable disclosure system: (1) JSON-LD structured data embedded in the page `<head>`, (2) Custom HTTP response header (`X-AI-Provenance`), and (3) HTML `<meta>` tag (`ai-provenance`). All three layers carry the same core provenance data: model identifier, generation timestamp, source count, coverage percentage, and compliance statement.

**Rationale:** JSON-LD provides semantic web compatibility and is consumed by search engines and automated crawlers. The HTTP header enables programmatic detection by API consumers and proxy layers without parsing HTML. The HTML meta tag provides a fallback for simpler parsing scenarios. The three-layer approach ensures maximum discoverability while remaining maintainable — all three are generated from the same server-side data object.

**Consequences:**
- *Positive:* 100% compliance with EU AI Act Article 50; multiple consumption paths for different audiences; single data source eliminates drift between layers.
- *Negative:* Three output channels must be kept in sync; testing must verify all three layers on every article-with-summary page.

**Alternatives Rejected:**
- *C2PA Claims:* No text content standard exists; designed for image/video media; would require fabrication of claims for text-only summarisation.
- *Single-layer (JSON-LD only):* Insufficient for non-HTML consumers (API, proxy layers).

---

### 4. High-Level System Topology

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              PUBLIC INTERNET                                     │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                      │
│   │   Browser    │    │  Mobile App  │    │  Admin User  │                       │
│   │  (React 19)  │    │  (Future)    │    │  (Browser)   │                       │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                      │
└──────────┼───────────────────┼───────────────────┼───────────────────────────────┘
           │ HTTPS             │ HTTPS             │ HTTPS
           ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           CDN EDGE LAYER (Vercel / Cloudflare)                   │
│   • Serves prerendered PPR static shells from edge cache (TTFB < 50ms)           │
│   • Static assets (CSS, fonts, JS chunks)                                        │
│   • Cache-Control headers enforced by Next.js Cache Components                   │
└───────────────────────────────┬──────────────────────────────────────────────────┘
                                │ Cache Miss / Dynamic Request
                                ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS ≥16.2.6 WEB APP (Stateless)                          │
│                    [1..N instances behind load balancer]                         │
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │   proxy.ts      │  │  App Router     │  │  Route Handlers (/api/*)        │  │
│  │  (lightweight   │  │  (RSC + Cache   │  │  (public HTTP endpoints)        │  │
│  │   cookie check) │  │   Components)   │  │                                 │  │
│  └─────────────────┘  └────────┬────────┘  └────────────────┬────────────────┘  │
│                                │                             │                   │
│  ┌─────────────────────────────▼─────────────────────────────▼─────────────┐    │
│  │                    APPLICATION LAYER                                      │    │
│  │  Server Actions  ·  Feature Queries  ·  Domain Services  ·  <PageTrans> │    │
│  └───────────────────────────────────────┬─────────────────────────────────┘    │
│                                          │                                       │
│  ┌───────────────────────────────────────▼─────────────────────────────────┐    │
│  │                    INFRASTRUCTURE LAYER                                  │    │
│  │     Drizzle ORM (Lazy Proxy)  ·  Auth.js v5  ·  BullMQ Producer        │    │
│  └──────────────┬────────────────────────────────────────┬─────────────────┘    │
└─────────────────┼────────────────────────────────────────┼──────────────────────┘
                  │ SQL (postgres.js)                        │ BullMQ enqueue
                  ▼                                          ▼
┌──────────────────────────────┐         ┌───────────────────────────────────────┐
│     POSTGRESQL 17 CLUSTER    │         │   REDIS (Upstash Managed)             │
│  (Primary + Read Replica)    │         │                                       │
│                              │         │  • BullMQ job queues                  │
│  • articles                  │◄────────│  • Feed slice cache (hot feeds)       │
│  • summaries                 │  Direct │  • Session store (Auth.js)            │
│  • sources                   │  writes │  • Rate limit counters                │
│  • GIN FTS + BM25 indexes    │  from   │                                       │
│                              │  worker │  Config: maxRetriesPerRequest: null   │
│                              │         │         eviction policy: noeviction    │
└──────────────────────────────┘         └──────────────────┬────────────────────┘
                                                            │ BullMQ consume
                                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       WORKER SERVICE (Node.js 24 LTS)                            │
│                       [1..N instances, scaled on queue depth]                    │
│                                                                                  │
│  ┌────────────────────────────┐  ┌────────────────────────────────────────────┐  │
│  │    Job Scheduler           │  │    Worker Processes                        │  │
│  │  upsertJobScheduler()      │  │  • ingest (concurrency: 50, I/O-bound)     │  │
│  │  (RSS poll schedule)       │  │  • summarize (concurrency: 5, AI-bound)    │  │
│  │                            │  │  • score (concurrency: 20, CPU/DB-bound)   │  │
│  └────────────┬───────────────┘  │  • feed-slice (concurrency: 10, Redis)     │  │
│               │                  │  • push-dispatch (concurrency: 10)          │  │
│               ▼                  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────┐                                                  │
│  │    Flow Producer           │  Atomic DAG: ingest → score → refresh-feed-slice│
│  └────────────────────────────┘                                                  │
└───────────────────────────────┬──────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────────────────┐
│                             EXTERNAL SERVICES                                    │
│  • RSS/Atom sources (50–200)  • Anthropic API (claude-haiku-4-5)                │
│  • OpenAI API (gpt-5-mini)    • Web Push (VAPID)   • Content Extractor          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## PART II: SYSTEM ARCHITECTURE

### 5. Next.js ≥16.2.6 Web App Architecture

#### 5.1 The Layer Model

Every request through the Web App passes through exactly these layers in order. Deviating from this order creates security and consistency bugs.

```text
REQUEST
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 0: proxy.ts (Network Boundary)                            │
│ Role: Optimistic routing only. Cookie presence check.           │
│ Rule: NO database calls. NO business logic. Redirects only.     │
└───────────────────────────────┬─────────────────────────────────┘
                                │ passes through
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: App Router (Layouts + Pages)                           │
│ Role: Route structure, metadata, PPR boundaries, Suspense.      │
│ Rule: Layouts must not fetch data (causes layout re-renders).   │
│       Pages are the data-fetching boundary.                     │
│       params and searchParams are Promises — MUST await.        │
└───────────────────────────────┬─────────────────────────────────┘
                                │ calls
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: Feature Modules (Server Components + Server Actions)   │
│ Role: UI composition, data binding, mutation entry points.      │
│ Rule: All data access through `queries.ts`. No direct DB calls. │
└───────────────────────────────┬─────────────────────────────────┘
                                │ calls
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: Domain Services (domain/)                              │
│ Role: Pure business logic. No framework dependencies.           │
│ Rule: No Next.js imports. No DB client imports. Pure TS.        │
└───────────────────────────────┬─────────────────────────────────┘
                                │ calls
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: Infrastructure (lib/*)                                 │
│ Role: Side-effecting operations. DB reads/writes. Queue ops.    │
│ Rule: All DB access via Drizzle. All queries parameterized.     │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.2 Annotated Directory Structure

```text
onestopnews-web/
│
├── proxy.ts                     ← Next.js 16 network boundary (Layer 0)
│                                  Optimistic cookie check + redirect only.
│
├── next.config.ts               ← Next.js + Turbopack + Cache Components config
│                                  cacheComponents: true (TOP-LEVEL)
│                                  cacheLife profiles (TOP-LEVEL)
│
├── drizzle.config.ts            ← Drizzle Kit configuration
│                                  Points to lib/db/schema.ts. Output: ./drizzle/
│
├── src/
│   ├── app/                     ← Next.js App Router (Layer 1)
│   │   ├── layout.tsx           ← Root layout: HTML shell, fonts, providers. No data fetching.
│   │   ├── (public)/            ← Route group: unauthenticated routes
│   │   │   ├── page.tsx         ← / — Top Stories feed (PPR + Cache Component)
│   │   │   ├── topics/[category]/page.tsx ← /topics/[category] (Cache Component + topicShell)
│   │   │   └── article/[id]/page.tsx      ← /article/[id] (fully dynamic — summary status)
│   │   ├── (admin)/             ← Route group: protected admin routes
│   │   │   ├── layout.tsx       ← Admin layout: verifies session via auth.api.getSession()
│   │   │   ├── sources/page.tsx ← /admin/sources — Source management
│   │   │   └── summaries/page.tsx ← /admin/summaries — Summary review workflow
│   │   └── api/                 ← Route Handlers: public HTTP API only
│   │       ├── articles/route.ts    ← GET /api/articles (feed + search)
│   │       └── summarize/[id]/route.ts ← POST /api/summarize/[id] (enqueue only)
│   │
│   ├── components/              ← Shared component primitives
│   │   └── primitives/
│   │       └── PageTransition.tsx ← <PageTransition> abstraction (isolates experimental API)
│   │
│   ├── features/                ← Feature modules (Layer 2)
│   │   ├── feed/
│   │   │   ├── components/      ← FeedGrid.tsx (RSC), ArticleCard.tsx (RSC), Feed.tsx (RSC)
│   │   │   ├── queries.ts       ← Drizzle queries for feed data (cursor pagination)
│   │   │   └── actions.ts       ← Server Actions: savePreference, setFavoriteCategory
│   │   ├── summaries/
│   │   │   ├── components/      ← NutritionLabel.tsx (RSC), SummaryPanel.tsx (RSC)
│   │   │   └── actions.ts       ← Server Action: requestSummary
│   │   ├── search/
│   │   │   ├── components/      ← SearchBar.tsx (Client), SearchResults.tsx (RSC)
│   │   │   └── queries.ts       ← FTS query builder
│   │   └── push/
│   │       ├── components/      ← PushOptIn.tsx (Client), NotificationSettings.tsx (Client)
│   │       └── actions.ts       ← Server Actions: registerPushSubscription, updateQuietHours
│   │
│   ├── domain/                  ← Pure domain logic (Layer 3)
│   │   ├── articles/
│   │   │   ├── types.ts         ← ArticleWithSource, ArticleWithSummary, Summary interfaces
│   │   │   └── normalize.ts     ← URL normalization, content hashing
│   │   ├── summaries/
│   │   │   └── types.ts         ← Summary, NutritionLabelData interfaces
│   │   └── ranking/
│   │       └── score.ts         ← Importance scoring formula
│   │
│   ├── lib/                     ← Infrastructure integrations (Layer 4)
│   │   ├── db/
│   │   │   ├── index.ts         ← Lazy DB client (Proxy pattern)
│   │   │   └── schema.ts        ← Complete Drizzle schema (all tables + enums + indexes)
│   │   ├── queue/
│   │   │   └── index.ts         ← BullMQ Queue instances (producer side)
│   │   ├── ai/
│   │   │   ├── client.ts        ← Anthropic + OpenAI SDK clients
│   │   │   └── prompts.ts       ← Prompt templates with Zod response schemas
│   │   ├── auth/
│   │   │   ├── index.ts         ← Auth.js v5 server instance
│   │   │   └── dal.ts           ← Data Access Layer: verifySession(), getUser()
│   │   ├── push/
│   │   │   ├── vapid.ts         ← VAPID key management
│   │   │   └── encrypt.ts       ← AES-256-GCM push key encryption
│   │   └── disclosure/
│   │       └── ai-provenance.ts ← 3-layer AI disclosure generator (JSON-LD + HTTP + meta)
│   │
│   └── shared/
│       ├── components/          ← Design system: Shadcn wrapped for bespoke styling
│       └── hooks/
│           ├── useDebounce.ts   ← 300ms debounce for search
│           └── useArticleActivity.ts ← React 19.2 Activity hook for summary panel
```

#### 5.3 Critical Code Patterns

**`proxy.ts` — The Network Boundary (Not a Security Boundary)**

```typescript
// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // CRITICAL: This is an OPTIMISTIC check only.
  // It provides UX (smooth redirect) — NOT security.
  // Real auth validation happens in (admin)/layout.tsx via auth()
  const sessionCookie = request.cookies.get('authjs.session-token')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  if (isAdminRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**`lib/db/index.ts` — Lazy Proxy DB Connection**

```typescript
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
```

**`next.config.ts` — Production Configuration (PRD v4.3 Aligned)**

This configuration is the definitive, validated topology from PRD v4.3 §5.2. Every flag placement is sourced from primary Next.js documentation.

```typescript
/**
 * next.config.ts — OneStopNews Production Configuration
 * Next.js ≥16.2.6 (initial release: October 21, 2025)
 *
 * SECURITY NOTE: Pin this project to Next.js ≥16.2.6. Earlier 16.x releases
 * are unpatched against CVE-2025-55182 (React2Shell RCE) and the 13-advisory
 * bundle shipped in 16.2.6 covering high-severity DoS and SSRF vulnerabilities.
 */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ── CACHE COMPONENTS ────────────────────────────────────────────────────────
  // TOP-LEVEL flag. Enables Cache Components (use cache directive), PPR, and
  // opt-in caching model. Everything is dynamic by default; opt in per-file,
  // per-component, or per-function with 'use cache'.
  // Replaces ALL of: experimental.ppr + experimental.dynamicIO + experimental.useCache
  cacheComponents: true,

  // ── NAMED CACHE LIFE PROFILES ───────────────────────────────────────────────
  // TOP-LEVEL alongside cacheComponents. MUST be defined here before any
  // cacheLife('profileName') call works — runtime error if profile is missing.
  cacheLife: {
    // Primary news feed. 30s stale, 120s revalidate, 10-min hard eviction.
    feed: { stale: 30, revalidate: 120, expire: 600 },
    // Topic navigation shell. 5-min stale, 15-min revalidate, 1-day hard eviction.
    topicShell: { stale: 300, revalidate: 900, expire: 86400 },
    // Static reference data. 1-hour stale, daily revalidate, weekly hard eviction.
    reference: { stale: 3600, revalidate: 86400, expire: 604800 },
  },

  // ── TURBOPACK ───────────────────────────────────────────────────────────────
  // TOP-LEVEL in Next.js 16 (graduated out of experimental). Default bundler.
  // Filesystem caching for `next dev` is STABLE and ON BY DEFAULT since 16.1.
  turbopack: {},

  // ── REACT COMPILER ──────────────────────────────────────────────────────────
  // TOP-LEVEL in Next.js 16 (promoted from experimental to stable).
  // Disabled by default due to build-time cost. Enable when components follow Rules of React.
  // reactCompiler: true,

  // ── IMAGE OPTIMISATION ──────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // 24h minimum CDN TTL for news thumbnails
  },

  // ── EXPERIMENTAL ────────────────────────────────────────────────────────────
  experimental: {
    // VIEW TRANSITIONS: Official docs state "currently experimental and subject to change".
    // All usage MUST go through <PageTransition> abstraction.
    viewTransition: true,
    // CLIENT SEGMENT CACHE: Smart prefetching for shared layouts.
    clientSegmentCache: true,
    // TURBOPACK PERSISTENT CACHING: Reduces work across builds. Still experimental.
    turbopackPersistentCaching: true,
    // TURBOPACK FILESYSTEM CACHE FOR BUILD: Extends stable dev FS caching to prod builds.
    turbopackFileSystemCacheForBuild: true,
  },

  // ── FLAGS THAT MUST NOT BE INCLUDED ─────────────────────────────────────────
  // experimental.ppr       → Build error in Next.js 16 (removed entirely)
  // experimental.dynamicIO → Deprecated (replaced by cacheComponents)
};

export default nextConfig;
```

**Config Flag Placement Invariant Table**

| Flag | Placement | What breaks if wrong |
| :--- | :--- | :--- |
| `cacheComponents: true` | Top-level | Every `'use cache'` directive is silently ignored. Zero caching occurs. |
| `cacheLife: { ... }` | Top-level | `cacheLife('feed')` throws a runtime error — profile not found. |
| `turbopack: { }` | Top-level | Ignored or causes a config warning (graduated from experimental). |
| `reactCompiler: true` | Top-level | Ignored if placed in `experimental`. |
| `experimental.viewTransition: true` | Inside `experimental: {}` | Transitions silently disabled. |
| `experimental.clientSegmentCache: true` | Inside `experimental: {}` | Smart prefetching disabled. |
| `experimental.ppr` | **DO NOT INCLUDE** | Build error in Next.js 16 — removed entirely. |
| `experimental.dynamicIO` | **DO NOT INCLUDE** | Deprecated — replaced by `cacheComponents`. |

**`<PageTransition>` Component Abstraction**

All View Transition usage is routed through this abstraction per PRD v4.3 §5.3. This isolates the experimental `document.startViewTransition` API and provides a graceful fallback when the API is unavailable or the user prefers reduced motion.

```tsx
// src/components/primitives/PageTransition.tsx
'use client'
import { startTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface PageTransitionProps {
  name: string
  children: React.ReactNode
}

/**
 * PageTransition — Abstraction over the View Transitions API.
 *
 * CONTRACT:
 *   - Wraps page content with a named view-transition for cross-page animations.
 *   - Does NOT directly call document.startViewTransition for navigation.
 *   - Navigation transitions are handled by the Next.js App Router integration
 *     when experimental.viewTransition is enabled.
 *   - This component provides the view-transition-name CSS custom property
 *     and respects prefers-reduced-motion.
 */
export function PageTransition({ name, children }: PageTransitionProps) {
  return (
    <div
      style={{ viewTransitionName: name }}
      className="contents"
    >
      {children}
    </div>
  )
}
```

**React 19.2 `<Activity>` Pattern for Summary Loading**

```tsx
// src/features/summaries/components/SummaryStatusPoller.tsx
'use client'
import { Activity } from 'react' // React 19.2
import { SummaryPanel } from './SummaryPanel'

interface SummaryStatusPollerProps {
  articleId: string
  initialStatus: string
}

export function SummaryStatusPoller({ articleId, initialStatus }: SummaryStatusPollerProps) {
  const { status, summary } = useSummaryPoller(articleId, initialStatus)

  return (
    // Activity keeps the DOM alive in 'hidden' mode while status is pending.
    // When status becomes 'ok', mode switches to 'visible' — zero layout shift.
    <Activity mode={status === 'ok' ? 'visible' : 'hidden'}>
      {summary && <SummaryPanel summary={summary} />}
    </Activity>
  )
}
```

---

### 6. Worker Service Architecture

#### 6.1 Directory Structure

```text
onestopnews-worker/
├── src/
│   ├── index.ts                 ← Entry point: initialize queues, workers, scheduler + graceful shutdown
│   ├── queues/
│   │   └── index.ts             ← BullMQ Queue + Worker definitions
│   ├── scheduler/
│   │   └── index.ts             ← RSS poll scheduler (upsertJobScheduler)
│   ├── flows/
│   │   └── ingest-flow.ts       ← FlowProducer: ingest → score → cache-refresh DAG
│   └── jobs/
│       ├── ingest.ts            ← Ingestion job handler
│       ├── summarize.ts         ← Summarization job handler
│       ├── score.ts             ← Importance scoring job handler
│       └── push-dispatch.ts     ← Push notification dispatch handler
└── package.json
```

#### 6.2 Queue Topology & Concurrency

```typescript
// src/queues/index.ts
import { Queue, Worker, FlowProducer } from 'bullmq'
import { Redis } from 'ioredis'

// [CRITICAL] maxRetriesPerRequest: null is REQUIRED for BullMQ Workers.
// Without it, ioredis throws on blocking commands used by BullMQ internals.
const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false, // Prevents job buildup during Redis disconnects
})

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 }, // 2s, 4s, 8s
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 }, // Keep for admin inspection
}

export const ingestQueue = new Queue('ingest', { connection, defaultJobOptions })
export const summarizeQueue = new Queue('summarize', { connection, defaultJobOptions })
export const scoreQueue = new Queue('score', { connection, defaultJobOptions })
export const feedSliceQueue = new Queue('feed-slice', { connection, defaultJobOptions })
export const pushDispatchQueue = new Queue('push-dispatch', { connection, defaultJobOptions })
export const flowProducer = new FlowProducer({ connection })
```

**Concurrency Rationale:**
- `ingest`: **50** (I/O-bound: network fetches to RSS sources. High concurrency is safe).
- `summarize`: **5** (AI-API-bound: rate-limited by Anthropic/OpenAI. Max 5 concurrent calls).
- `score`: **20** (CPU/DB-bound: scoring formula is fast; DB writes are the bottleneck).
- `feed-slice`: **10** (Redis writes: fast but Redis connection pool limits concurrency).
- `push-dispatch`: **10** (Network I/O to Web Push service endpoints. Moderate concurrency).

#### 6.3 Job Scheduler: Idempotent Polling

```typescript
// src/scheduler/index.ts
import { ingestQueue } from '../queues'
import { db } from '../lib/db'
import { sources } from '../lib/db/schema'
import { eq } from 'drizzle-orm'

export async function syncSchedulers() {
  const activeSources = await db
    .select({ id: sources.id, pollIntervalMinutes: sources.pollIntervalMinutes, priority: sources.priority })
    .from(sources)
    .where(eq(sources.isActive, true))

  for (const source of activeSources) {
    const schedulerId = `ingest-source-${source.id}`
    // [CRITICAL] upsertJobScheduler ensures exactly one scheduler per source.
    // On restart, existing schedulers are updated (not duplicated).
    await ingestQueue.upsertJobScheduler(
      schedulerId,
      { every: source.pollIntervalMinutes * 60 * 1000 },
      {
        name: 'ingest-source',
        data: { sourceId: source.id, schedulerId },
        opts: { priority: source.priority }, // 1=highest
      }
    )
  }
}
```

#### 6.4 Flow Producer: Atomic Ingestion DAG

```typescript
// src/flows/ingest-flow.ts
import { flowProducer } from '../queues'

export async function enqueuePostIngestFlow(newArticleIds: string[], categoryId: string) {
  if (newArticleIds.length === 0) return

  const scoreChildren = newArticleIds.map((articleId) => ({
    name: 'score-article',
    queueName: 'score' as const,
    data: { articleId, categoryId },
  }))

  // Atomic add: all children + parent enqueued in a single Redis transaction.
  // The parent (feed-slice) ONLY runs after ALL child (score) jobs complete.
  await flowProducer.add({
    name: 'refresh-feed-slice',
    queueName: 'feed-slice',
    data: { categoryId, sort: 'latest' },
    opts: { priority: 1 }, // High priority: users see fresh feeds quickly
    children: scoreChildren,
  })
}
```

#### 6.5 Graceful Shutdown

```typescript
// src/index.ts
import { ingestWorker, summarizeWorker, scoreWorker, feedSliceWorker, pushDispatchWorker } from './queues'

async function gracefulShutdown(signal: string) {
  console.log(`[Worker] Received ${signal}. Closing workers...`)
  // Close each worker — waits for in-flight jobs to complete before exiting
  await Promise.all([
    ingestWorker.close(),
    summarizeWorker.close(),
    scoreWorker.close(),
    feedSliceWorker.close(),
    pushDispatchWorker.close(),
  ])
  console.log('[Worker] All workers closed. Exiting.')
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
```

---

### 7. Data Architecture

#### 7.1 Complete Drizzle Schema (PRD v4.3 Aligned)

```typescript
// src/lib/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
  time,
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Custom Types ─────────────────────────────────────────────────────────────
/**
 * Native PostgreSQL tsvector type — required for generated column FTS.
 * Pattern confirmed in official Drizzle ORM FTS documentation.
 */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

// ─── Enums ────────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', ['reader', 'admin']);
export const feedTypeEnum = pgEnum('feed_type', ['rss', 'atom', 'json_api']);

/**
 * contentAvailabilityEnum — Controls whether an article is eligible for AI summarisation.
 * SUMMARISATION GUARD: Only enqueue summarise job when value is 'partial_text' or 'full_text'.
 * Summarising 'title_only' or 'excerpt' would require the AI to fabricate content.
 */
export const contentAvailabilityEnum = pgEnum('content_availability', [
  'title_only',   // Title extracted only. DO NOT summarise.
  'excerpt',      // Title + short excerpt (≤300 chars). DO NOT summarise.
  'partial_text', // Title + excerpt + partial body (300–1500 chars). Summarise permitted.
  'full_text',    // Title + excerpt + full body (>1500 chars). Summarise preferred.
]);

/**
 * summaryStatusEnum — Controls what UI is shown on the article page.
 * UI behaviour:
 *   'none' / 'pending' → No summary UI. No "AI Brief" badge.
 *   'ok'               → Full NutritionLabel rendered. "AI Brief" badge shown.
 *   'needs_review'     → "Summary under editorial review" notice. No NutritionLabel.
 *   'disabled'         → No summary UI. Admin has permanently disabled this summary.
 *
 * NOTE: The 'failed' value from PAD v2.0 has been removed per PRD v4.3 schema.
 * Failed summaries are tracked via the job queue's dead-letter mechanism,
 * not as a persistent article state.
 */
export const summaryStatusEnum = pgEnum('summary_status', [
  'none',
  'pending',
  'ok',
  'needs_review',
  'disabled',
]);

// ─── Tables ───────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: userRoleEnum('role').default('reader').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
});

/**
 * subcategories — Two-level topic hierarchy.
 * Composite unique index on (categoryId, slug) prevents duplicate slugs within a category.
 */
export const subcategories = pgTable(
  'subcategories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id')
      .references(() => categories.id, { onDelete: 'cascade' })
      .notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
  },
  (table) => ({
    categorySlugIdx: uniqueIndex('subcategories_category_slug_idx').on(
      table.categoryId,
      table.slug
    ),
  })
);

/**
 * sources — RSS/Atom/JSON feed sources.
 * lastFetchedAt + failureCount: for backoff logic + health monitoring.
 *
 * NOTE: url (source homepage) is NOT unique — multiple feeds can share the same
 * publisher homepage. feedUrl (the RSS/Atom endpoint) IS unique.
 */
export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  feedUrl: text('feed_url').notNull().unique(),
  feedType: feedTypeEnum('feed_type').notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  priority: integer('priority').default(2).notNull(),
  pollIntervalMinutes: integer('poll_interval_minutes').default(15).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastFetchedAt: timestamp('last_fetched_at'),
  failureCount: integer('failure_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * articles — Normalised article metadata.
 * politicalLeaning (nullable) reserved for Phase 2 blind-spot detection.
 */
export const articles = pgTable(
  'articles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .references(() => sources.id, { onDelete: 'cascade' })
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
    importanceScore: real('importance_score').default(0.5).notNull(),
    hasSummary: boolean('has_summary').default(false).notNull(),
    summaryStatus: summaryStatusEnum('summary_status').default('none').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    // Generated column: GIN-indexed for FTS.
    // Title gets weight A, excerpt gets weight B.
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')`
    ),
  },
  (table) => ({
    canonicalUrlIdx: uniqueIndex('articles_canonical_url_idx').on(table.canonicalUrl),
    categoryPublishedIdx: index('articles_category_published_idx').on(
      table.categoryId,
      table.publishedAt
    ),
    subcategoryPublishedIdx: index('articles_subcategory_published_idx').on(
      table.subcategoryId,
      table.publishedAt
    ),
    categoryScoreIdx: index('articles_category_score_idx').on(
      table.categoryId,
      table.importanceScore
    ),
    // GIN index with fastupdate=off for consistent FTS during ingestion.
    // fastupdate=on (default) batches index updates and can serve stale results.
    searchVectorGinIdx: index('articles_search_vector_gin_idx')
      .using('gin')
      .on(table.searchVector)
      .with({ fastupdate: false }),
  })
);

/**
 * summaries — AI-generated article summaries with EU AI Act Article 50 compliance fields.
 * originalArticleUrl is denormalised from articles.canonicalUrl for the NutritionLabel component.
 */
export const summaries = pgTable('summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  articleId: uuid('article_id')
    .references(() => articles.id, { onDelete: 'cascade' })
    .notNull(),
  summaryText: text('summary_text').notNull(),
  keyPoints: jsonb('key_points').$type<string[]>().notNull(),
  sourcesCited: jsonb('sources_cited')
    .$type<Array<{ url: string; title: string }>>()
    .notNull(),
  model: text('model').notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  status: summaryStatusEnum('status').default('pending').notNull(),
  aiStatement: text('ai_statement').notNull(),
  complianceStatement: text('compliance_statement').notNull(),
  coveragePercentage: integer('coverage_percentage').notNull(),
  originalArticleUrl: text('original_article_url').notNull(),
});

/**
 * push_subscriptions — Web Push subscription data.
 * Keys are encrypted at rest using AES-256-GCM.
 */
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  endpoint: text('endpoint').notNull().unique(),
  p256dhKey: text('p256dh_key').notNull(),    // Encrypted at rest
  authKey: text('auth_key').notNull(),          // Encrypted at rest
  quietHoursStart: time('quiet_hours_start'),   // e.g., '22:00'
  quietHoursEnd: time('quiet_hours_end'),       // e.g., '07:00'
  timezone: text('timezone').default('UTC').notNull(), // DST-safe IANA timezone
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

#### 7.2 Domain Type Definitions

```typescript
// src/domain/articles/types.ts
export interface ArticleSource {
  id: string;
  name: string;
  url: string;
}

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ArticleSummary {
  id: string;
  summaryText: string;
  keyPoints: string[];
  sourcesCited: { url: string; title: string }[];
  model: string;
  generatedAt: Date;
  status: string;
  aiStatement: string;
  complianceStatement: string;
  coveragePercentage: number;
  originalArticleUrl: string; // Denormalised from articles.canonicalUrl
}

export interface ArticleWithSource {
  id: string;
  title: string;
  excerpt: string | null;
  canonicalUrl: string;
  publishedAt: Date;
  hasSummary: boolean;
  summaryStatus: string;
  source: ArticleSource;
}

export interface ArticleWithSummary extends ArticleWithSource {
  category: ArticleCategory | null;
  summary: ArticleSummary | null;
}

export type Summary = ArticleSummary;
```

#### 7.3 Query Layer & Cursor Pagination (Explicit JOIN Contract)

**CRITICAL INVARIANT:** Feed queries must explicitly join with the `sources` table to populate `article.source.name`. Querying the `articles` table in isolation will result in `undefined` source names at runtime, breaking the `ArticleCard` UI.

```typescript
// src/features/feed/queries.ts
import { db } from '@/lib/db';
import { articles, sources, categories, subcategories, summaries } from '@/lib/db/schema';
import { eq, desc, lt, and } from 'drizzle-orm';
import type { ArticleWithSource, ArticleWithSummary } from '@/domain/articles/types';

const FEED_PAGE_SIZE = 30;

interface FeedQueryOptions {
  category: string;
  subcategory?: string;
  /** Cursor for pagination: publishedAt timestamp of the last article on the previous page. */
  cursor?: Date;
}

/**
 * getFeedArticles — Primary feed query.
 *
 * REQUIRED JOIN CONTRACT:
 * This query MUST innerJoin with `sources` to populate `article.source.name`.
 * ArticleCard renders `article.source.name` directly.
 * Never use a bare `db.select().from(articles)` for display purposes.
 */
export async function getFeedArticles({
  category,
  subcategory,
  cursor,
}: FeedQueryOptions): Promise<ArticleWithSource[]> {
  const categoryRow = await db.query.categories.findFirst({
    where: eq(categories.slug, category),
  });
  if (!categoryRow) return [];

  const subcategoryRow = subcategory
    ? await db.query.subcategories.findFirst({
        where: and(
          eq(subcategories.categoryId, categoryRow.id),
          eq(subcategories.slug, subcategory)
        ),
      })
    : null;

  const whereClause = and(
    subcategoryRow
      ? eq(articles.subcategoryId, subcategoryRow.id)
      : eq(articles.categoryId, categoryRow.id),
    cursor ? lt(articles.publishedAt, cursor) : undefined
  );

  // Fetch PAGE_SIZE + 1 to determine if there is a next page (hasMore)
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      canonicalUrl: articles.canonicalUrl,
      publishedAt: articles.publishedAt,
      hasSummary: articles.hasSummary,
      summaryStatus: articles.summaryStatus,
      source: {
        id: sources.id,
        name: sources.name,
        url: sources.url,
      },
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id)) // REQUIRED JOIN
    .where(whereClause)
    .orderBy(desc(articles.publishedAt))
    .limit(FEED_PAGE_SIZE + 1);

  const hasMore = rows.length > FEED_PAGE_SIZE;
  const resultRows = rows.slice(0, FEED_PAGE_SIZE);

  return resultRows;
}

/**
 * getArticleWithSummary — Full article fetch for detail page.
 * Joins: sources, categories, summaries (left join).
 */
export async function getArticleWithSummary(id: string): Promise<ArticleWithSummary | null> {
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      canonicalUrl: articles.canonicalUrl,
      publishedAt: articles.publishedAt,
      hasSummary: articles.hasSummary,
      summaryStatus: articles.summaryStatus,
      source: { id: sources.id, name: sources.name, url: sources.url },
      category: { id: categories.id, name: categories.name, slug: categories.slug },
      summary: {
        id: summaries.id,
        summaryText: summaries.summaryText,
        keyPoints: summaries.keyPoints,
        sourcesCited: summaries.sourcesCited,
        model: summaries.model,
        generatedAt: summaries.generatedAt,
        status: summaries.status,
        aiStatement: summaries.aiStatement,
        complianceStatement: summaries.complianceStatement,
        coveragePercentage: summaries.coveragePercentage,
        originalArticleUrl: summaries.originalArticleUrl, // Denormalised field
      },
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(summaries, and(eq(summaries.articleId, articles.id), eq(summaries.status, 'ok')))
    .where(eq(articles.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const summary = row.summary?.id
    ? {
        ...row.summary,
        generatedAt: row.summary.generatedAt!,
        aiStatement: row.summary.aiStatement!,
        complianceStatement: row.summary.complianceStatement!,
        coveragePercentage: row.summary.coveragePercentage!,
        originalArticleUrl: row.summary.originalArticleUrl!,
      }
    : null;

  return {
    ...row,
    category: row.category?.id ? row.category : null,
    summary,
  };
}
```

---

### 8. AI Summarisation Pipeline

#### 8.1 Dual-Model Strategy

| Role | Model | SDK | Cost (per M tokens) | When Used |
| :--- | :--- | :--- | :--- | :--- |
| **Primary** | `claude-haiku-4-5` | Anthropic SDK | $1 input / $5 output | All standard summarisation jobs |
| **Fallback** | `gpt-5-mini` | OpenAI SDK | Competitive pricing | When Anthropic API returns 5xx or rate-limit 429 |

The fallback logic is implemented in the worker's `summarize` job handler. On primary model failure, the job retries once with the fallback model before marking the article's `summaryStatus` back to `none` (the failure is tracked in BullMQ's dead-letter queue, not as a persistent article state).

#### 8.2 AI Output Validation with Zod

All AI outputs are validated using Zod schemas before database persistence. The `generateObject()` pattern enforces structured output:

```typescript
// src/lib/ai/prompts.ts
import { z } from 'zod'

export const summaryResponseSchema = z.object({
  summaryText: z.string().min(50).max(500),
  keyPoints: z.array(z.string().min(10).max(200)).min(2).max(5),
  sourcesCited: z.array(z.object({
    url: z.string().url(),
    title: z.string().min(5).max(200),
  })).min(1),
  aiStatement: z.string().min(20).max(300),
  complianceStatement: z.string().min(20).max(300),
  coveragePercentage: z.number().min(0).max(100),
})
```

#### 8.3 Content Availability Guard

The summarisation pipeline enforces a hard guard: only articles with `contentAvailability` of `partial_text` or `full_text` are eligible for AI summarisation. Attempting to summarise `title_only` or `excerpt` articles would require the AI to fabricate content, violating the factual-only mode requirement.

```typescript
// In summarize job handler
const article = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1)
if (!article[0] || !['partial_text', 'full_text'].includes(article[0].contentAvailability)) {
  console.warn(`[Summarize] Skipping article ${articleId}: contentAvailability=${article[0]?.contentAvailability}`)
  return // Do not summarise — insufficient content
}
```

#### 8.4 Summary Review Workflow

Per PRD v4.3 §3.3 and §7.3, the Editor/Admin persona reviews AI summaries flagged by the quality pipeline. The workflow supports three actions:

1. **Approve** — Sets `summaryStatus` to `ok`, making the NutritionLabel visible to readers.
2. **Regenerate** — Sets `summaryStatus` back to `pending` and enqueues a new summarisation job with the same article data.
3. **Permanently Disable** — Sets `summaryStatus` to `disabled`, suppressing all summary UI for this article.

The admin summary review page is at `/admin/summaries` and lists all summaries with `status = 'needs_review'`, ordered by `generatedAt` descending.

---

### 9. Push Notification Architecture

#### 9.1 Overview

PRD v4.3 goal 5 requires AI-summarised push notifications and a daily briefing email. The push notification system uses the Web Push API with VAPID authentication.

#### 9.2 Subscription Lifecycle

1. User opts in via the `PushOptIn` client component, which requests notification permission and registers a `PushSubscription` via the browser's `serviceWorker.pushManager.subscribe()`.
2. The subscription is sent to a Server Action (`registerPushSubscription`) which encrypts the `p256dh` and `auth` keys using AES-256-GCM before storing them in the `push_subscriptions` table.
3. The user configures quiet hours (start time, end time, IANA timezone) to suppress notifications during sleep. The timezone is stored as an IANA identifier (e.g., `Asia/Singapore`) for DST-safe comparison.

#### 9.3 Push Dispatch Job

The `push-dispatch` worker job:
1. Queries the `push_subscriptions` table for active subscriptions.
2. Filters out subscriptions whose current local time falls within their configured quiet hours (using DST-safe IANA timezone comparison).
3. Constructs the push payload containing a 1-sentence AI summary of the triggering article.
4. Sends the push via the Web Push protocol using VAPID-signed requests.
5. Removes subscriptions that return 410 Gone (user revoked permission).

---

### 10. 3-Layer AI Disclosure Implementation

#### 10.1 Provenance Data Object

All three disclosure layers are generated from a single provenance data object:

```typescript
// src/lib/disclosure/ai-provenance.ts
interface AIProvenance {
  model: string
  generatedAt: Date
  sourcesCited: number
  coveragePercentage: number
  compliance: string // 'eu-ai-act-art50'
}

function buildProvenanceString(p: AIProvenance): string {
  return [
    `model:${p.model}`,
    `generated-at:${p.generatedAt.toISOString()}`,
    `sources:${p.sourcesCited}`,
    `coverage:${p.coveragePercentage}`,
    `compliance:${p.compliance}`,
  ].join(';')
}
```

#### 10.2 Layer 1: JSON-LD (Structured Data)

```typescript
function buildJsonLd(p: AIProvenance, articleUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AIGeneratedContent',
    url: articleUrl,
    aiModel: p.model,
    dateGenerated: p.generatedAt.toISOString(),
    sourcesCited: p.sourcesCited,
    coveragePercentage: p.coveragePercentage,
    complianceStandard: p.compliance,
  }
}
```

#### 10.3 Layer 2: HTTP Header

```typescript
// Applied in the article detail page's response headers
function buildHttpHeader(p: AIProvenance): Record<string, string> {
  return { 'X-AI-Provenance': buildProvenanceString(p) }
}
```

#### 10.4 Layer 3: HTML Meta Tag

```typescript
// Applied in generateMetadata() for the article detail page
function buildMetaTag(p: AIProvenance): Record<string, string> {
  return { 'ai-provenance': buildProvenanceString(p) }
}
```

---

### 11. Error Boundary Patterns

Every route segment that fetches external data requires an `error.tsx` file for graceful degradation.

```tsx
// src/app/topics/[category]/error.tsx
'use client';

import { useEffect } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function FeedError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log to observability platform (e.g., Sentry, Axiom)
    console.error('[FeedError]', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="py-24 flex flex-col items-center gap-4" role="alert">
      <span className="block w-1.5 h-1.5 rounded-full bg-dispatch-ember" aria-hidden="true" />
      <p className="font-mono text-[11px] uppercase tracking-widest text-dispatch-ember">
        Feed temporarily unavailable
      </p>
      <p className="font-ui text-sm text-ink-600 text-center max-w-xs">
        We are having trouble loading stories right now. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink-600 hover:text-dispatch-ember transition-colors underline underline-offset-4"
      >
        Try again
      </button>
    </div>
  );
}
```

---

### 12. Routing Patterns & Async Params Contract

**CRITICAL INVARIANT:** In Next.js 15 and 16, `params` and `searchParams` are asynchronous Promises. Synchronous access causes a runtime 500 error. This applies to every route segment, including `generateMetadata`.

#### 12.1 Category Page (Cached Shell + Streaming Feed)

```tsx
// src/app/topics/[category]/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { cacheLife } from 'next/cache';
import { PageTransition } from '@/components/primitives/PageTransition';
import { Feed } from '@/features/feed/components/Feed';
import { FeedSkeleton } from '@/features/feed/components/FeedSkeleton';
import { getCategoryBySlug } from '@/features/categories/queries';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ cursor?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const categoryRow = await getCategoryBySlug(category);
  if (!categoryRow) return { title: 'Not Found' };

  return {
    title: `${categoryRow.name} — OneStopNews`,
    description: categoryRow.description ?? `Latest ${categoryRow.name} news, summarised.`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  'use cache';
  cacheLife('topicShell');

  const { category } = await params;
  const { cursor: cursorString } = await searchParams;
  const cursor = cursorString ? new Date(cursorString) : undefined;

  const categoryRow = await getCategoryBySlug(category);
  if (!categoryRow) notFound();

  return (
    <PageTransition name={`feed-${category}`}>
      <header className="max-w-7xl mx-auto px-6 pt-12 pb-8 border-b border-ink-100">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-300 mb-2">Topic</p>
        <h1 className="font-editorial text-4xl font-[800] tracking-[-0.03em] text-ink-900">
          {categoryRow.name}
        </h1>
        {categoryRow.description && (
          <p className="font-ui text-sm text-ink-600 mt-2 max-w-xl">{categoryRow.description}</p>
        )}
      </header>
      <main className="max-w-7xl mx-auto px-6 py-12">
        <Suspense fallback={<FeedSkeleton />}>
          <Feed category={category} cursor={cursor} />
        </Suspense>
      </main>
    </PageTransition>
  );
}
```

#### 12.2 Article Detail Page (Fully Dynamic — AI Provenance in Metadata)

```tsx
// src/app/article/[id]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageTransition } from '@/components/primitives/PageTransition';
import { ArticleDetail } from '@/features/feed/components/ArticleDetail';
import { getArticleWithSummary } from '@/features/feed/queries';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticleWithSummary(id);
  if (!article) return { title: 'Article Not Found' };

  const metadata: Metadata = {
    title: `${article.title} — OneStopNews`,
    description: article.excerpt ?? undefined,
  };

  // Machine-Readable AI Provenance (Layer 3 of 3: HTML Meta Tag)
  if (article.hasSummary && article.summary && article.summaryStatus === 'ok') {
    metadata.other = {
      'ai-provenance': [
        `model:${article.summary.model}`,
        `generated-at:${article.summary.generatedAt.toISOString()}`,
        `sources:${article.summary.sourcesCited.length}`,
        `coverage:${article.summary.coveragePercentage}`,
        `compliance:eu-ai-act-art50`,
      ].join(';'),
    };
  }
  return metadata;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const article = await getArticleWithSummary(id);
  if (!article) notFound();

  return (
    <PageTransition name={`article-${id}`}>
      <ArticleDetail article={article} />
    </PageTransition>
  );
}
```

---

## PART III: OPERATIONAL & CROSS-CUTTING CONCERNS

### 13. Risk Register

| ID | Risk | Severity | Likelihood | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| R-001 | Auth.js v5 beta instability or deprecation | High | Medium | Pin exact beta version; abstract behind `lib/auth/dal.ts`; maintain migration plan to Better Auth |
| R-002 | CVE in Next.js < 16.2.6 | Critical | High (if unpinned) | Enforce `>=16.2.6` in `package.json` via `overrides` or `resolutions` |
| R-003 | AI model API outage (primary + fallback) | Medium | Low | BullMQ retry with exponential backoff; summary status remains `none` (graceful degradation) |
| R-004 | `cacheLife` profile name mismatch | High | Medium | Define all profiles top-level in `next.config.ts`; lint rule to catch undefined profile names |
| R-005 | Feed query missing `sources` JOIN | High | Medium | Code review checklist item; TypeScript strict mode catches `undefined` source at build time |
| R-006 | Summarising articles with insufficient content | High | Low | `contentAvailabilityEnum` guard in summarisation job handler |

---

## Appendix A: PRD v4.3-to-PAD v3.0 Traceability Matrix

| PRD § | Requirement | PAD § | Implementation |
| :--- | :--- | :--- | :--- |
| §1.1 | Next.js ≥16.2.6 | §2, §5 | Version pin in stack table and `next.config.ts` header |
| §1.1 | `cacheComponents: true` top-level | §5.3 | Top-level flag in `next.config.ts`; invariant table |
| §1.1 | `cacheLife` top-level with `feed`, `topicShell`, `reference` | §5.3 | Top-level profiles in `next.config.ts` |
| §1.1 | `experimental.viewTransition: true` | §5.3 | Inside `experimental: {}` in `next.config.ts` |
| §1.1 | Auth.js v5 | §2, §3 ADR-004 | Stack table + ADR-004 with risk note |
| §1.1 | Claude 4.5 Haiku primary / GPT-5 Mini fallback | §2, §8.1 | Stack table + dual-model strategy |
| §1.1 | 3-Layer AI Disclosure (JSON-LD + HTTP + meta) | §3 ADR-008, §10 | ADR-008 + full implementation |
| §2.2 | Feed freshness ≥95% categories ≥20 stories | §6 (Worker) | BullMQ scheduler + monitoring |
| §2.2 | API p95 ≤500ms | §7.3 | Cursor pagination + `sources` JOIN |
| §2.2 | FCP ≤800ms / LCP ≤1.5s | §5.3 | `cacheComponents: true` + PPR shell |
| §3.1 | Daily Scanner: push notifications + quiet hours | §9 | Push notification architecture |
| §3.3 | Editor/Admin: summary review workflow | §8.4 | Summary review workflow |
| §4.1 | Typography: Newsreader + Instrument Sans + Commit Mono | §2 | Stack table |
| §4.2 | Colour tokens: ink/paper/dispatch scales | §5.2 | `globals.css` @theme block in directory structure |
| §4.3 | CSS Subgrid feed architecture | §5.2 | `FeedGrid.tsx` + `ArticleCard.tsx` in directory structure |
| §4.4 | AI Nutrition Label | §7.2 | `NutritionLabel.tsx` in directory structure |
| §5.2 | Config flag placement invariant table | §5.3 | Invariant table with break conditions |
| §5.3 | Async params + `<PageTransition>` | §12 | Full page implementations |
| §5.4 | Cursor pagination + sources JOIN contract | §7.3 | `getFeedArticles()` + `getArticleWithSummary()` |
| §5.5 | Error boundary patterns | §11 | `error.tsx` implementation |
| §6 | Complete Drizzle schema | §7.1 | Full schema with all enums, tables, indexes |

---

## Appendix B: Key Changes from PAD v2.0 to v3.0

| Change | Rationale | Impact |
| :--- | :--- | :--- |
| Auth: Better Auth → Auth.js v5 | PRD v4.3 alignment | `lib/auth/` rewrite; session cookie name change; `proxy.ts` cookie check update |
| Next.js: "16" → "≥16.2.6" | CVE-2025-55182 mitigation | `package.json` version constraint |
| AI: "Haiku" → `claude-haiku-4-5`; "GPT-4o-mini" → `gpt-5-mini` | PRD v4.3 model names | Worker `summarize` job handler model identifiers |
| `cacheLife`: experimental → top-level | Next.js 16 config invariant | `next.config.ts` restructuring |
| `cacheLife` profiles: `nav`/`stable` → `topicShell`/`reference` | PRD v4.3 naming | All `cacheLife()` call sites |
| `cacheComponents: true` added | Next.js 16 opt-in caching | `next.config.ts` new top-level flag |
| View Transitions: `useTopicTransition` → `<PageTransition>` | PRD v4.3 abstraction requirement | New `PageTransition.tsx` component; removal of `useTopicTransition` hook |
| `summaryStatusEnum`: 6 → 5 values (removed `failed`) | PRD v4.3 schema alignment | Schema migration; job failure tracked in BullMQ DLQ instead |
| `sources`: added `lastFetchedAt` + `failureCount` | PRD v4.3 backoff/monitoring | Schema migration; scheduler backoff logic |
| `sources.url`: removed `.unique()` | PRD v4.3: only `feedUrl` is unique | Schema migration; index adjustment |
| 3-Layer AI Disclosure: added | PRD v4.3 EU AI Act Art. 50 | New `lib/disclosure/ai-provenance.ts` module |
| Push Notification architecture: added | PRD v4.3 goal 5 | New `push_subscriptions` table; new `push-dispatch` queue |
| Summary Review Workflow: added | PRD v4.3 §3.3, §7.3 | New `/admin/summaries` route; approve/regenerate/disable actions |
