Here is **Part 1** of the consolidated **OneStopNews Master Project Architecture Document (PAD) v2.0**. 

This section establishes the foundational truth of the system: the definitive technology stack, the immutable Architecture Decision Records (ADRs), and the high-level topology.

---

# OneStopNews — Master Project Architecture Document (PAD) v2.0

**Classification:** Internal Engineering Reference  
**Status:** Authoritative — supersedes all prior architecture notes and PRD appendices  
**Companion Document:** OneStopNews PRD v2.0 (Research-Validated)  
**Last Updated:** June 2026  
**Audience:** Senior Engineers, Tech Leads, DevOps, and Onboarding Engineers  
**Rule:** Every architectural decision in this document traces to a specific rationale. Nothing is here "because it's popular."

---

## PART I: SYSTEM OVERVIEW & DECISIONS

### 1. Document Metadata & Purpose
This PAD is the single authoritative source of truth for *how* OneStopNews is built. It answers: "Exactly how is this system constructed, and precisely why was each decision made?"

*   **Relationship to PRD:** The PRD defines *what* the system does and *why* (product goals, user stories, success metrics). This PAD defines *how* (system design, code patterns, operational procedures). Where the PRD is ambiguous, this document makes the definitive technical decision.
*   **How to Use:** 
    *   *New Engineer:* Read Sections 1 → 2 → 3 → your feature area.
    *   *Debugging Ingestion:* Jump to Section 5 (Worker Architecture) + Section 12 (Runbooks).
    *   *Reviewing Tech Choices:* Go directly to the relevant ADR in Section 2.

### 2. Technology Stack Summary
*All choices are definitive. Speculative "e.g." language from early drafts has been removed.*

| Layer | Technology | Version | Key Rationale |
| :--- | :--- | :--- | :--- |
| **Web Framework** | Next.js | 16 | PPR + opt-in Cache Components (`"use cache"`) + `proxy.ts` |
| **UI Runtime** | React | 19.2 | View Transitions (topic switching) + `<Activity>` (background summary loading) |
| **Language** | TypeScript | 5.x (Strict) | Type safety across Web App and Worker |
| **Styling** | Tailwind CSS | v4 | Utility-first, zero generic defaults |
| **Components** | Shadcn UI + Radix | Latest | Accessible primitives, wrapped for bespoke "Editorial Dispatch" aesthetic |
| **ORM** | **Drizzle ORM** | Latest | TypeScript-native, SQL-fluent, zero runtime overhead, lazy-connection compatible |
| **Validation** | Zod | 3.x | Schema-first, composable, Drizzle-integrated |
| **Authentication** | **Better Auth** | Latest | *Supersedes Auth.js v5* (see ADR-004). DB-backed sessions, native Next.js 16 support. |
| **Database** | **PostgreSQL** | 17 | Primary and only production datastore. |
| **Search (V1/V2)** | `tsvector` GIN + `pg_textsearch` | Built-in / 1.0.0 | BM25 relevance ranking natively in Postgres. No external search engine. |
| **Job Queue** | **BullMQ** | 5.x | TypeScript-native, job graphs (Flows), priorities, built-in monitoring dashboard |
| **Queue Backend** | Redis (Upstash Managed) | 7.x | AOF persistence, `noeviction` policy, `maxRetriesPerRequest: null` |
| **Worker Runtime** | Node.js | 24 LTS | BullMQ-native, LTS-aligned |
| **AI Clients** | Anthropic + OpenAI SDK | Latest | Dual-model strategy (Haiku primary, GPT-4o-mini fallback) |
| **Bundler** | Turbopack | (Next.js 16 default) | 5–10× faster Fast Refresh; no Webpack fallback unless strictly required |

---

### 3. Architecture Decision Records (ADRs)

Each ADR follows the structure: **Context → Decision → Rationale → Consequences → Alternatives Rejected**.

#### **ADR-001: Next.js 16 App Router as the Web Framework**
*   **Context:** OneStopNews requires a framework that serves a high-read-volume news feed with fast initial loads, handles server-side data fetching without API waterfalls, and supports a mix of highly cacheable (topic feeds) and fully dynamic (article detail with live summary status) content.
*   **Decision:** Use Next.js 16 with the App Router, Partial Pre-Rendering (PPR), Cache Components (`"use cache"`), and `proxy.ts`.
*   **Rationale:** Next.js 16 makes caching entirely *opt-in* via Cache Components, eliminating the "everything is statically cached by default" footgun of v13/14. PPR enables serving a pre-rendered static shell from the CDN edge with dynamic content streamed into Suspense boundaries. `proxy.ts` replaces `middleware.ts`, allowing full Node.js runtime at the network boundary without Edge constraints.
*   **Consequences:** 
    *   *Positive:* Zero client-side waterfalls; fine-grained caching control; `proxy.ts` provides a clean network boundary for UX redirects.
    *   *Negative:* `"use cache"` requires discipline: you cannot call `cookies()`, `headers()`, or read `params` directly inside a cached function. Runtime values must be passed as arguments from an uncached parent.
*   **Alternatives Rejected:** 
    *   *Next.js 15 (Pages Router):* Lacks RSC, PPR, and Cache Components.
    *   *Remix v3:* Excellent routing, but smaller ecosystem and no PPR equivalent.

#### **ADR-002: BullMQ on Redis as the Job Queue**
*   **Context:** The system needs scheduled RSS polling (50–200 sources), prioritized summarization jobs (user-triggered > background), parent-child job dependencies (ingest → score → cache-refresh), and an admin monitoring dashboard.
*   **Decision:** Use BullMQ v5 backed by a managed Redis instance (Upstash).
*   **Rationale:** BullMQ is the established Node.js solution for this workload. `upsertJobScheduler` ensures idempotent management of recurring jobs (critical for dynamic polling intervals). `FlowProducer` enables atomic ingestion pipelines where the parent job (feed refresh) only runs after all child jobs (scoring) complete.
*   **Consequences:**
    *   *Positive:* Job persistence in Redis survives worker crashes; built-in Taskforce.sh/Bull Board dashboard; native TypeScript job payload typing.
    *   *Negative:* Redis is a required infrastructure dependency. Must be configured with `maxRetriesPerRequest: null` and `noeviction` policy.
*   **Alternatives Rejected:**
    *   *AWS SQS:* No job priorities, no parent-child flows, no native dashboard.
    *   *RabbitMQ:* Operational overhead (AMQP, Erlang) disproportionate to team size.
    *   *pg-boss:* Adds significant write pressure to the primary PostgreSQL database, which is already the read-path hot spot.

#### **ADR-003: Drizzle ORM for Database Access**
*   **Context:** The system needs type-safe, PostgreSQL-native database access that works in Next.js (where modules are imported at build time) and the Node.js worker, without eager connection crashes.
*   **Decision:** Use Drizzle ORM with the `postgres` (postgres.js) driver and a **Lazy Proxy Connection Pattern**.
*   **Rationale:** Drizzle generates near-raw SQL with zero runtime query engine overhead. Types are inferred directly from the schema (`.$inferSelect`), eliminating redundant type declarations. Crucially, the Lazy Proxy pattern defers the database connection until the first query executes, preventing Next.js build-time crashes in environments where `DATABASE_URL` is unavailable.
*   **Consequences:**
    *   *Positive:* Schema is the single source of truth; `drizzle-kit generate + migrate` enforces explicit, version-controlled SQL migration files.
    *   *Negative:* No GUI comparable to Prisma Studio (mitigated by standard `psql`/pgAdmin tooling).
*   **Alternatives Rejected:**
    *   *Prisma:* Generates a heavy runtime client, has eager connection issues in Next.js module loading, and introduces N+1 query traps under relational loads.
    *   *TypeORM:* Decorator-based, incompatible with strict-mode TypeScript patterns.

#### **ADR-004: Better Auth as the Authentication Library**
*   **Context:** The system requires session-based auth for admin users, HttpOnly cookie sessions, RBAC, and a foundation that is actively maintained. 
*   **Decision:** Use **Better Auth** as the primary authentication library.
*   **Rationale:** *Critical Finding:* As of late 2025, the Better Auth team took over Auth.js maintenance, and **Auth.js is in security-patch-only mode**. The Auth.js team's own guidance for new projects points to Better Auth. Choosing Auth.js v5 for a new project means betting on a library whose own maintainers are steering users away from it. Better Auth provides DB-backed sessions (allowing immediate revocation) and native Next.js 16 `proxy.ts` integration.
*   **Consequences:**
    *   *Positive:* Actively maintained; native Next.js 16 support; Drizzle adapter keeps sessions in the same PostgreSQL instance.
    *   *Negative:* Smaller ecosystem than legacy Auth.js; requires explicit configuration of a storage adapter for multi-instance production session sharing.
*   **Alternatives Rejected:**
    *   *Auth.js v5:* Deprecated for new projects by its own maintainers.
    *   *Clerk:* SaaS vendor lock-in; per-MAU pricing incompatible with enterprise scale.

#### **ADR-005: PostgreSQL FTS + `pg_textsearch` BM25 for Search**
*   **Context:** News search requires keyword search across titles/excerpts, relevance ranking, autocomplete, and filter support, without adding operational complexity.
*   **Decision:** Use PostgreSQL 17 native FTS (GIN-indexed `tsvector` generated columns) as the primary search, with `pg_textsearch` BM25 extension for relevance ranking (Phase 2), and `pg_trgm` for autocomplete.
*   **Rationale:** Generated `tsvector` columns eliminate manual trigger maintenance. The `fastupdate = off` GIN index configuration is non-negotiable for search latency (testing shows ~50× improvement). `pg_textsearch` brings production-grade BM25 ranking directly into PostgreSQL, eliminating the need for an Elasticsearch cluster.
*   **Consequences:**
    *   *Positive:* Zero operational overhead for a separate search cluster; transactional consistency (no async replication lag).
    *   *Negative:* `pg_textsearch` requires `shared_preload_libraries` config and a server restart in self-hosted environments (managed cloud platforms handle this).
*   **Alternatives Rejected:**
    *   *Elasticsearch / Typesense:* Separate cluster, separate sync pipeline, separate operational burden. Complexity/benefit ratio is wrong for V1.

#### **ADR-006: Modular Monolith + Separate Worker Service**
*   **Context:** The system has two fundamentally different workload types: synchronous user-facing HTTP requests (Web App) and asynchronous, long-running background jobs (Ingestion, Scoring, Summarization).
*   **Decision:** Deploy two distinct services: Next.js 16 Web App and Node.js 24 Worker Service, connected via BullMQ queues and sharing a PostgreSQL database.
*   **Rationale:** AI summarization (2–10s per call) and ingestion (network I/O) must not block HTTP request handling. Decoupling into a separate process achieves this without the complexity of microservices. The shared database is the integration point, avoiding distributed transaction complexity.
*   **Consequences:**
    *   *Positive:* Web app deploys independently from worker; worker scales horizontally based on queue depth.
    *   *Negative:* Schema migrations must be coordinated (additive-only deployments required).
*   **Alternatives Rejected:**
    *   *Full Monolith:* Background jobs in the Next.js process would block HTTP request threads during heavy ingestion bursts.
    *   *Full Microservices:* Operational overhead (service mesh, per-service DBs) is excessive for current team size and scale.

#### **ADR-007: Turbopack as the Default Build Tool**
*   **Context:** Next.js 16 ships Turbopack as the default and stable bundler, replacing Webpack.
*   **Decision:** Use Turbopack as shipped by Next.js 16. Do not revert to Webpack.
*   **Rationale:** Turbopack provides significantly faster HMR (5–10× faster Fast Refresh) and incremental compilation. All core dependencies (Shadcn UI, Tailwind v4, Drizzle ORM) are fully compatible.
*   **Consequences:**
    *   *Positive:* Dramatically faster development iteration.
    *   *Negative:* Some legacy Webpack-specific plugins have no Turbopack equivalent (none are required in this baseline architecture).
*   **Alternatives Rejected:**
    *   *Webpack:* Now the legacy fallback; slower and requires explicit configuration to use.

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
│                        NEXT.JS 16 WEB APP (Stateless)                            │
│                    [1..N instances behind load balancer]                         │
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
│  └───────────────────────────────────────┬─────────────────────────────────┘    │
│                                          │                                       │
│  ┌───────────────────────────────────────▼─────────────────────────────────┐    │
│  │                    INFRASTRUCTURE LAYER                                 │    │
│  │     Drizzle ORM (Lazy Proxy)  ·  Better Auth  ·  BullMQ Producer       │    │
│  └──────────────┬────────────────────────────────────────┬─────────────────┘    │
└─────────────────┼────────────────────────────────────────┼──────────────────────┘
                  │ SQL (postgres.js)                        │ BullMQ enqueue
                  ▼                                          ▼
┌──────────────────────────────┐         ┌───────────────────────────────────────┐
│     POSTGRESQL 17 CLUSTER    │         │   REDIS (Upstash Managed)             │
│  (Primary + Read Replica)    │         │                                       │
│                              │         │  • BullMQ job queues                  │
│  • articles                  │◄────────│  • Feed slice cache (hot feeds)       │
│  • summaries                 │  Direct │  • Session store (Better Auth)        │
│  • sources                   │  writes │  • Rate limit counters                │
│  • GIN FTS + BM25 indexes    │  from   │                                       │
│                              │  worker │  Config: maxRetriesPerRequest: null   │
│                              │         │         eviction policy: noeviction    │
└──────────────────────────────┘         └──────────────────┬────────────────────┘
                                                            │ BullMQ consume
                                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       WORKER SERVICE (Node.js 24+)                               │
│                       [1..N instances, scaled on queue depth]                    │
│                                                                                  │
│  ┌────────────────────────────┐  ┌────────────────────────────────────────────┐  │
│  │    Job Scheduler           │  │    Worker Processes                        │  │
│  │  upsertJobScheduler()      │  │  • ingest (concurrency: 50, I/O-bound)     │  │
│  │  (RSS poll schedule)       │  │  • summarize (concurrency: 5, AI-bound)    │  │
│  │                            │  │  • score (concurrency: 20, CPU/DB-bound)   │  │
│  └────────────┬───────────────┘  │  • feed-slice (concurrency: 10, Redis)     │  │
│               │                  └────────────────────────────────────────────┘  │
│               ▼                                                                  │
│  ┌────────────────────────────┐                                                  │
│  │    Flow Producer           │  Atomic DAG: ingest → score → refresh-feed-slice│
│  └────────────────────────────┘                                                  │
└───────────────────────────────┬──────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────────────────┐
│                             EXTERNAL SERVICES                                    │
│   • RSS/Atom sources (50–200)  • Anthropic API  • OpenAI API  • Content Extractor│
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

**End of Part 1.** 

This establishes the immutable foundation. **Part 2** will cover the **Next.js 16 Web App Architecture** (including the critical `proxy.ts`, Lazy DB Proxy, and Cache Component code patterns), the **Worker Service Architecture** (BullMQ topology and graceful shutdown), and the **Complete Drizzle Data Schema**.

Here is **Part 2** of the consolidated **OneStopNews Master Project Architecture Document (PAD) v2.0**. 

This section dives deep into the implementation mechanics: the Next.js 16 web app architecture, the Node.js worker service topology, and the definitive PostgreSQL/Drizzle data schema.

---

## PART II: SYSTEM ARCHITECTURE

### 4. Next.js 16 Web App Architecture

#### 4.1 The Layer Model
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
│ LAYER 3: Domain Services (packages/domain/)                     │
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

#### 4.2 Annotated Directory Structure
```text
onesopnews-web/
│
├── proxy.ts                     ← Next.js 16 network boundary (Layer 0)
│                                  Optimistic cookie check + redirect only.
│
├── next.config.ts               ← Next.js + Turbopack configuration
│                                  PPR enabled, cacheLife profiles defined.
│
├── drizzle.config.ts            ← Drizzle Kit configuration
│                                  Points to lib/db/schema.ts. Output: ./drizzle/
│
├── app/                         ← Next.js App Router (Layer 1)
│   ├── layout.tsx               ← Root layout: HTML shell, fonts, providers. No data fetching.
│   ├── (public)/                ← Route group: unauthenticated routes
│   │   ├── page.tsx             ← / — Top Stories feed (PPR)
│   │   ├── topics/[category]/page.tsx ← /topics/[category] (PPR + Cache Component)
│   │   └── article/[id]/page.tsx      ← /article/[id] (fully dynamic — summary status)
│   ├── (admin)/                 ← Route group: protected admin routes
│   │   ├── layout.tsx           ← Admin layout: verifies session via auth.api.getSession()
│   │   └── sources/page.tsx     ← /admin/sources — Source management
│   └── api/                     ← Route Handlers: public HTTP API only
│       ├── articles/route.ts    ← GET /api/articles (feed + search)
│       └── summarize/[id]/route.ts ← POST /api/summarize/[id] (enqueue only)
│
├── features/                    ← Feature modules (Layer 2)
│   ├── feed/
│   │   ├── components/          ← Feed.tsx (RSC), ArticleCard.tsx (RSC), TopicNav.tsx (Client)
│   │   ├── queries.ts           ← Drizzle queries for feed data
│   │   └── actions.ts           ← Server Actions: savePreference, setFavoriteCategory
│   ├── summaries/
│   │   ├── components/          ← SummaryPanel.tsx (RSC), DisclosureBadge.tsx (RSC)
│   │   └── actions.ts           ← Server Action: requestSummary
│   └── search/
│       ├── components/          ← SearchBar.tsx (Client), SearchResults.tsx (RSC)
│       └── queries.ts           ← FTS query builder
│
├── domain/                      ← Pure domain logic (Layer 3)
│   ├── articles/normalize.ts    ← URL normalization, content hashing
│   └── ranking/score.ts         ← Importance scoring formula
│
├── lib/                         ← Infrastructure integrations (Layer 4)
│   ├── db/
│   │   ├── index.ts             ← Lazy DB client (Proxy pattern — see §6.4)
│   │   └── schema.ts            ← Complete Drizzle schema (all tables)
│   ├── queue/
│   │   └── index.ts             ← BullMQ Queue instances (producer side)
│   ├── ai/
│   │   └── prompts.ts           ← Prompt templates with Zod response schemas
│   └── auth/
│       ├── index.ts             ← Better Auth server instance
│       └── dal.ts               ← Data Access Layer: verifySession(), getUser()
│
└── shared/
    ├── components/              ← Design system: Shadcn wrapped for bespoke styling
    └── hooks/
        ├── useDebounce.ts       ← 300ms debounce for search
        └── useArticleActivity.ts← React 19.2 Activity hook for summary panel
```

#### 4.3 Critical Code Patterns

**`proxy.ts` — The Network Boundary (Not a Security Boundary)**
```typescript
// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export function proxy(request: NextRequest) {
  // CRITICAL: This is an OPTIMISTIC check only.
  // It provides UX (smooth redirect) — NOT security.
  // Real auth validation happens in (admin)/layout.tsx via auth.api.getSession()
  const sessionCookie = getSessionCookie(request)
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

**`next.config.ts` — Turbopack + Cache Life Profiles**
```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack is default in Next.js 16
  experimental: {
    cacheLife: {
      'feed': { stale: 30, revalidate: 120, expire: 600 },      // News feed
      'nav': { stale: 300, revalidate: 3600, expire: 86400 },   // Category navigation
      'stable': { stale: 3600, revalidate: 86400, expire: 604800 }, // Source lists
    },
  },
  // Security headers omitted for brevity (see Part 3)
}
export default nextConfig
```

**React 19.2 Patterns: View Transitions & `<Activity>`**
```typescript
// shared/hooks/useTopicTransition.ts (View Transitions)
'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function useTopicTransition() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigateToTopic = (href: string) => {
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      router.push(href)
      return
    }
    document.startViewTransition(() => {
      startTransition(() => router.push(href))
    })
  }
  return { navigateToTopic, isPending }
}

// features/summaries/components/SummaryStatusPoller.tsx (<Activity>)
'use client'
import { Activity } from 'react' // React 19.2
import { SummaryPanel } from './SummaryPanel'

export function SummaryStatusPoller({ articleId, initialStatus }: Props) {
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

### 5. Worker Service Architecture

#### 5.1 Directory Structure
```text
onesopnews-worker/
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
│       └── score.ts             ← Importance scoring job handler
└── package.json
```

#### 5.2 Queue Topology & Concurrency
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
export const flowProducer = new FlowProducer({ connection })
```
*Concurrency Rationale*:
*   `ingest`: **50** (I/O-bound: network fetches to RSS sources. High concurrency is safe).
*   `summarize`: **5** (AI-API-bound: rate-limited by Anthropic/OpenAI. Max 5 concurrent calls).
*   `score`: **20** (CPU/DB-bound: scoring formula is fast; DB writes are the bottleneck).
*   `feed-slice`: **10** (Redis writes: fast but Redis connection pool limits concurrency).

#### 5.3 Job Scheduler: Idempotent Polling
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

#### 5.4 Flow Producer: Atomic Ingestion DAG
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

#### 5.5 Graceful Shutdown
```typescript
// src/index.ts
import { ingestWorker, summarizeWorker, scoreWorker, feedSliceWorker } from './queues'

async function gracefulShutdown(signal: string) {
  console.log(`[Worker] Received ${signal}. Closing workers...`)
  // Close each worker — waits for in-flight jobs to complete before exiting
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
```

---

### 6. Data Architecture

#### 6.1 Complete Drizzle Schema
```typescript
// lib/db/schema.ts
import { pgTable, pgEnum, uuid, text, integer, boolean, real, timestamp, jsonb, index, uniqueIndex, customType } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── Enums ───────────────────────────────────────────────────────────────────
export const feedTypeEnum = pgEnum('feed_type', ['rss', 'atom', 'json_api'])
export const contentAvailabilityEnum = pgEnum('content_availability', ['title_only', 'excerpt', 'partial_text', 'full_text'])
export const summaryStatusEnum = pgEnum('summary_status', ['none', 'pending', 'ok', 'needs_review', 'disabled', 'failed'])
export const articleStatusEnum = pgEnum('article_status', ['pending', 'active', 'archived'])
export const userRoleEnum = pgEnum('user_role', ['reader', 'admin'])

// Custom tsvector type (Drizzle doesn't ship this natively)
const tsvector = customType<{ data: string }>({ dataType() { return 'tsvector' } })

// ─── Tables ──────────────────────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  displayOrder: integer('display_order').default(0),
  colorToken: text('color_token'),
  isActive: boolean('is_active').default(true).notNull(),
})

export const subcategories = pgTable('subcategories', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  displayOrder: integer('display_order').default(0),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  slugUnique: uniqueIndex('subcategories_category_slug_idx').on(table.categoryId, table.slug),
}))

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
})

export const articles = pgTable('articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'restrict' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  subcategoryId: uuid('subcategory_id').references(() => subcategories.id),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  canonicalUrl: text('canonical_url').notNull(),
  contentHash: text('content_hash').notNull(),
  contentAvailability: contentAvailabilityEnum('content_availability').default('excerpt').notNull(),
  importanceScore: real('importance_score').default(0.5).notNull(),
  hasSummary: boolean('has_summary').default(false).notNull(),
  summaryStatus: summaryStatusEnum('summary_status').default('none').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
  ingestedAt: timestamp('ingested_at', { withTimezone: true }).defaultNow().notNull(),
  
  // [CRITICAL] Generated column: GIN-indexed for FTS. Title gets weight A, excerpt gets weight B.
  searchVector: tsvector('search_vector').generatedAlwaysAs(
    sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')`
  ),
}, (table) => ({
  canonicalUrlIdx: uniqueIndex('articles_canonical_url_idx').on(table.canonicalUrl),
  categoryPublishedIdx: index('articles_category_published_idx').on(table.categoryId, table.publishedAt),
  subcategoryPublishedIdx: index('articles_subcategory_published_idx').on(table.subcategoryId, table.publishedAt),
  categoryScoreIdx: index('articles_category_score_idx').on(table.categoryId, table.importanceScore),
  
  // [CRITICAL] GIN index with fastupdate=off for consistent FTS during ingestion.
  // fastupdate=on (default) batches index updates and can serve stale results.
  searchVectorGinIdx: index('articles_search_vector_gin_idx')
    .using('gin')
    .on(table.searchVector)
    .with({ fastupdate: false }), // Note: drizzle-kit may require raw SQL migration for this flag
}))

export const summaries = pgTable('summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  articleId: uuid('article_id').references(() => articles.id, { onDelete: 'cascade' }).notNull().unique(), // 1:1
  summaryText: text('summary_text').notNull(),
  keyPoints: jsonb('key_points').$type<string[]>().default([]).notNull(),
  
  // [CRITICAL] sourcesCited is the trust mechanism — must always be populated
  sourcesCited: jsonb('sources_cited')
    .$type<Array<{ url: string; title: string; sourceId: string }>>()
    .default([])
    .notNull(),
    
  model: text('model').notNull(), // e.g., 'claude-3-5-haiku-20241022'
  tokensUsed: integer('tokens_used'),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  status: summaryStatusEnum('status').default('ok').notNull(),
  flagReason: text('flag_reason'),
  reviewedBy: uuid('reviewed_by'),
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  betterAuthId: text('better_auth_id').unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: userRoleEnum('role').default('reader').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const userPreferences = pgTable('user_preferences', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  defaultCategoryId: uuid('default_category_id').references(() => categories.id),
  favoriteCategories: jsonb('favorite_categories').$type<string[]>().default([]).notNull(),
  defaultSort: text('default_sort', { enum: ['latest', 'impact', 'summary_ready'] }).default('latest').notNull(),
})

export const sourceHealthSnapshots = pgTable('source_health_snapshots', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'cascade' }).notNull(),
  checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  consecutiveFailures: integer('consecutive_failures').default(0).notNull(),
  articlesFetched: integer('articles_fetched').default(0).notNull(),
  errorMessage: text('error_message'),
}, (table) => ({
  sourceCheckedIdx: index('source_health_source_checked_idx').on(table.sourceId, table.checkedAt),
}))

// ─── Drizzle inference types ─────────────────────────────────────────────────
export type Article = typeof articles.$inferSelect
export type InsertArticle = typeof articles.$inferInsert
export type Summary = typeof summaries.$inferSelect
// ... (other types inferred similarly)
```

#### 6.2 Index Inventory & Raw SQL Additions
Drizzle cannot express all PostgreSQL-specific index options. The following raw SQL **must** be included in the migration file generated after schema definition:

```sql
-- 1. GIN index with fastupdate=off for consistent FTS during active ingestion
-- [CRITICAL] Do not use the default fastupdate=on for this workload
CREATE INDEX CONCURRENTLY articles_search_vector_gin_idx
ON articles USING gin (search_vector) WITH (fastupdate = off);

-- 2. Partial index for recent-article search (most common search pattern)
-- Only indexes articles from the past 30 days — dramatically reduces index size
CREATE INDEX CONCURRENTLY articles_search_recent_partial_idx
ON articles USING gin (search_vector)
WHERE published_at > NOW() - INTERVAL '30 days';

-- 3. Trigram index on title for autocomplete / fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY articles_title_trgm_idx
ON articles USING gist (title gist_trgm_ops);
```

#### 6.3 Migration Strategy
**[CRITICAL] Production Migration Rules:**
1. **NEVER use `drizzle-kit push` in production.** It overwrites the database schema directly with no migration history.
2. **Use `generate + migrate` exclusively.** Changes must be versioned as SQL files committed to Git.
3. **Additive-only deployments in hot environments.** When removing a column:
   * *Deploy 1*: Remove code that reads the column. Keep the column in the DB.
   * *Deploy 2* (next release): Drop the column via migration.
   * *Never* drop a column in the same deploy that removes the code reading it.
4. Run migrations as a **pre-deployment step**, not in application startup.

```typescript
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
```

---

**End of Part 2.** 

This establishes the exact code patterns, worker topology, and database schema required for production. 

**Part 3** will cover **Component Design** (Auth, Ingestion, AI, Search, Caching), **Operations & Delivery** (Docker, Env Vars, Observability, Runbooks), **Testing Strategy**, **Risk Register**, and the **Deployment Checklist**.

Here is **Part 3** of the consolidated **OneStopNews Master Project Architecture Document (PAD) v2.0**. 

This final section covers the critical component designs, operational runbooks, testing strategy, risk register, and deployment checklist, ensuring the document is fully production-ready.

---

## PART III: COMPONENT DESIGN

### 7. Authentication & Authorization Architecture
**[CRITICAL]** `proxy.ts` is a UX optimization, *not* a security boundary. Authorization is enforced at the Data Access Layer (DAL).

**7.1 Better Auth Configuration**
```typescript
// lib/auth/index.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    cookieCache: { enabled: true, maxAge: 60 * 5 }, // 5-min client cache to reduce DB reads
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' },
  },
  user: {
    additionalFields: { role: { type: 'string', defaultValue: 'reader', input: false } },
  },
})
```

**7.2 Data Access Layer (DAL) — The Real Security Boundary**
```typescript
// lib/auth/dal.ts
import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './index'

// React cache() memoizes this per-request. Multiple Server Components calling 
// verifySession() in one render tree execute only ONE database query.
export const verifySession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')
  return session
})

export const verifyAdminSession = cache(async () => {
  const session = await verifySession()
  if (session.user.role !== 'admin') redirect('/')
  return session
})
```

### 8. Ingestion Pipeline Design
**8.1 Idempotent Ingestion Job Handler**
```typescript
// worker/src/jobs/ingest.ts
import { Worker, type Job } from 'bullmq'
import { db } from '../../lib/db'
import { articles, sources, sourceHealthSnapshots } from '../../lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { normalizeCanonicalUrl, hashContent } from '../../domain/articles/normalize'

export const ingestWorker = new Worker('ingest', async (job: Job<IngestJobData>) => {
  const { sourceId } = job.data
  const source = await db.query.sources.findFirst({ where: eq(sources.id, sourceId) })
  if (!source?.isActive) return { skipped: true, reason: 'source_inactive' }

  // 1. Fetch & Parse (omitted for brevity, uses rss-parser with 10s timeout)
  const candidates = await fetchAndParseFeed(source.feedUrl)

  // 2. Idempotent Upsert
  for (const candidate of candidates) {
    const canonicalUrl = normalizeCanonicalUrl(candidate.url)
    const contentHash = hashContent(candidate.title, candidate.publishedAt)

    await db.insert(articles).values({
      sourceId: source.id, categoryId: source.categoryId, title: candidate.title,
      excerpt: candidate.excerpt, canonicalUrl, contentHash, publishedAt: candidate.publishedAt,
    }).onConflictDoUpdate({
      target: articles.canonicalUrl, // Unique constraint = idempotency key
      set: { title: sql`excluded.title`, excerpt: sql`excluded.excerpt` },
      // [CRITICAL] Only update if contentHash changed to avoid unnecessary writes
      where: sql`${articles.contentHash} != excluded.content_hash`,
    }).returning({ id: articles.id, isNew: sql<boolean>`(xmax = 0)` })
  }
  // 3. Update health snapshot & trigger post-ingest flow (score → refresh feed slice)
}, { connection, concurrency: 50 }) // I/O bound: high concurrency is safe
```

### 9. AI Summarization Pipeline Design
**9.1 Zod Response Schema (Trust Enforcement)**
```typescript
// lib/ai/prompts.ts
import { z } from 'zod'

// [CRITICAL] If the model response doesn't match this schema, the job fails cleanly.
// This prevents malformed summaries from reaching the database.
export const summaryResponseSchema = z.object({
  summary: z.string().min(50).max(800),
  keyPoints: z.array(z.string().min(10).max(200)).min(2).max(5),
  sourcesCited: z.array(z.object({
    url: z.string().url(),
    title: z.string(),
    relevantQuote: z.string().optional(),
  })).min(1), // [CRITICAL] Source citation is the trust mechanism
  confidence: z.enum(['high', 'medium', 'low']),
  caveat: z.string().optional(),
})
```

**9.2 Summarization Job Handler with Fallback**
```typescript
// worker/src/jobs/summarize.ts
import { Worker, type Job } from 'bullmq'
import { db } from '../../lib/db'
import { articles, summaries } from '../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { callAiModel } from '../../lib/ai/client' // Handles Haiku -> GPT-4o-mini fallback
import { buildSummaryPrompt, summaryResponseSchema } from '../../lib/ai/prompts'

export const summarizeWorker = new Worker('summarize', async (job: Job<SummarizeJobData>) => {
  const article = await db.query.articles.findFirst({ where: eq(articles.id, job.data.articleId), with: { source: true } })
  if (!article) throw new Error('Article not found')
  if (article.hasSummary && article.summaryStatus === 'ok') return { skipped: true }

  await db.update(articles).set({ summaryStatus: 'pending' }).where(eq(articles.id, article.id))

  const prompt = buildSummaryPrompt(article)
  const { rawResponse, model, tokensUsed } = await callAiModel(prompt, { maxTokens: 1000, priority: job.data.priority })

  // Parse and validate with Zod
  const parsedResponse = summaryResponseSchema.parse(JSON.parse(rawResponse))

  await db.insert(summaries).values({
    articleId: article.id, summaryText: parsedResponse.summary, keyPoints: parsedResponse.keyPoints,
    sourcesCited: parsedResponse.sourcesCited, model, tokensUsed, status: 'ok',
  }).onConflictDoUpdate({ /* ... upsert logic ... */ })

  await db.update(articles).set({ hasSummary: true, summaryStatus: 'ok' }).where(eq(articles.id, article.id))
  
  // Invalidate cache so UI refreshes immediately
  await fetch(`${process.env.WEB_APP_URL}/api/revalidate`, { method: 'POST', body: JSON.stringify({ tag: `article:${article.id}` }) })
}, { connection, concurrency: 5 }) // AI-API bound: low concurrency to respect rate limits
```

### 10. Search Architecture
**10.1 FTS Query Builder (V1/V2)**
```typescript
// features/search/queries.ts
import { db } from '@/lib/db'
import { articles, sources, categories } from '@/lib/db/schema'
import { sql, and, eq, desc } from 'drizzle-orm'

export async function searchArticles(params: SearchParams) {
  // websearch_to_tsquery gracefully handles natural language (e.g., "apple" OR "google")
  const tsQuery = sql`websearch_to_tsquery('english', ${params.query})`
  
  const results = await db
    .select({
      id: articles.id, title: articles.title, excerpt: articles.excerpt,
      // ts_rank_cd: cover density ranking — considers term proximity, not just frequency
      relevance: sql<number>`ts_rank_cd('{0.1, 0.2, 0.4, 1.0}', ${articles.searchVector}, ${tsQuery})`,
      sourceName: sources.name,
    })
    .from(articles)
    .leftJoin(sources, eq(articles.sourceId, sources.id))
    .where(and(
      sql`${articles.searchVector} @@ ${tsQuery}`,
      params.categoryId ? eq(articles.categoryId, params.categoryId) : undefined,
      params.cursor ? sql`${articles.publishedAt} < ${new Date(params.cursor)}` : undefined,
    ).filter(Boolean))
    .orderBy(desc(sql`relevance`), desc(articles.publishedAt))
    .limit(params.limit + 1) // Fetch one extra for cursor pagination

  return { articles: results.slice(0, params.limit), hasNextPage: results.length > params.limit }
}

// Autocomplete: pg_trgm trigram similarity (Requires CREATE EXTENSION pg_trgm)
export async function autocompleteArticles(partialQuery: string) {
  if (partialQuery.length < 2) return []
  return db.select({ title: articles.title })
    .from(articles)
    .where(sql`${articles.title} % ${partialQuery}`) // % is the pg_trgm similarity operator
    .orderBy(sql`similarity(${articles.title}, ${partialQuery}) DESC`)
    .limit(5)
}
```

### 11. Caching & Performance Architecture
**11.1 Cache Invalidation Taxonomy**
Next.js 16 resolves the stale-vs-fresh tension by separating concerns. 
*   **`updateTag()`**: Use in **Server Actions** for "read-your-writes" consistency. Invalidates synchronously within the same request lifecycle.
*   **`revalidateTag(tag, 'max')`**: Use in **Route Handlers** or **Worker webhooks** for background revalidation. Users get cached data immediately while Next.js revalidates in the background.

```typescript
// SCENARIO 1: Admin updates a source via Server Action
import { updateTag } from 'next/cache'
updateTag('sources-list') // Immediate expiry

// SCENARIO 2: Worker ingests new articles, triggers feed refresh
import { revalidateTag } from 'next/cache'
revalidateTag(`feed-${categoryId}`, 'max') // Background SWR revalidation
```

**11.2 Redis Feed Slice Design**
```typescript
// lib/queue/feed-slice.ts
export async function refreshFeedSlice(categoryId: string, sort: 'latest' | 'impact') {
  const feedArticles = await db.select({ id: articles.id }).from(articles)
    .where(eq(articles.categoryId, categoryId)).orderBy(desc(articles.publishedAt)).limit(100)
  
  const key = `feed:${categoryId}:${sort}`
  const articleIds = feedArticles.map(a => a.id)
  
  // Store as Redis list; TTL: 5 minutes
  await redis.setEx(key, 300, JSON.stringify(articleIds))
}
// Web App reads this key first. If HIT, it runs a single PG query: WHERE id = ANY($1)
```

---

## PART IV: OPERATIONS & DELIVERY

### 12. Infrastructure & Local Development
**12.1 Docker Compose**
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: onesopnews
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: onesopnews_dev
    ports: ['5432:5432']
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-extensions.sql:/docker-entrypoint-initdb.d/01-init.sql

  redis:
    image: redis:7-alpine
    # [CRITICAL] BullMQ REQUIRES that Redis NEVER evicts keys.
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy noeviction
    ports: ['6379:6379']
    volumes: [redis_data:/data]

volumes: { postgres_data: {}, redis_data: {} }
```
```sql
-- scripts/init-extensions.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE EXTENSION IF NOT EXISTS pg_textsearch; -- Phase 2
```

**12.2 Environment Variable Schema (Zod-Validated)**
```typescript
// lib/env/index.ts
import { z } from 'zod'
export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})
// Fails fast on startup if any required variable is missing.
```

### 13. Observability & Alerting
**13.1 Structured Logging Schema**
All logs are JSON. Human-readable in dev, structured in prod. **Never log secrets or PII.**
```typescript
interface LogEntry {
  timestamp: string; level: 'info' | 'warn' | 'error';
  service: 'web' | 'worker'; correlationId: string; // Request ID or Job ID
  message: string; durationMs?: number; errorCode?: string;
}
```

**13.2 Alerting Rules**
| Alert Name | Condition | Severity | Channel |
| :--- | :--- | :--- | :--- |
| `IngestionSourceDown` | `consecutive_failures >= 3` for any source | High | Slack `#ops` |
| `SummarizationErrorSpike` | `summarize.jobs.failed / total > 5%` over 1h | High | Slack `#ops` |
| `FeedFreshnessLow` | Top Stories feed has `< 10` articles in last 24h | Critical | PagerDuty |
| `DatabaseConnectionExhaustion` | PG connection pool `> 90%` utilized | Critical | PagerDuty |
| `BullMQDLQHigh` | `bullmq.dlq.count > 50` | High | Slack `#ops` |

### 14. Operational Runbooks
**Runbook: Ingestion Source Failure**
1. **Diagnose**: Check `/admin/jobs` → filter by `sourceId` → examine `error_message` in `sourceHealthSnapshots`.
2. **Classify**: 
   - `HTTP 404`: Feed URL changed. Update in `/admin/sources`.
   - `Connection timeout`: Source temporarily down. Monitor; auto-disables at 5 failures.
   - `Parse error`: Feed format changed. Debug `rss-parser` adapter.
3. **Resolve**: Update config → Click "Test Connection" → Manually trigger ingest via admin UI.

**Runbook: AI Summarization Incident**
1. **Diagnose**: Check BullMQ DLQ for `summarize` queue.
2. **Classify**:
   - `429 Rate Limited`: Reduce `WORKER_CONCURRENCY_SUMMARIZE` env var to `2` and restart worker.
   - `Parsing Failed`: Model output changed. Check raw response in Bull Board, update `summaryResponseSchema` Zod definition, deploy, and retry DLQ.
3. **Resolve**: Verify error rate drops below 5% within 15 minutes. Mass-retry failed jobs from Bull Board.

**Runbook: Database Connection Exhaustion**
1. **Diagnose**: `SELECT count(*), state FROM pg_stat_activity WHERE datname = 'onesopnews' GROUP BY state;`
2. **Resolve**: 
   - If runaway query: `SELECT pg_terminate_backend(pid)` for queries > 30s.
   - If too many instances: Scale down Web App or Worker instances. Ensure `DB_POOL_MAX` × `instances` `<` `max_connections`.

### 15. Testing Strategy *(Consolidated & Pruned from PAD 2)*
| Category | Tool | Coverage Target | Examples |
| :--- | :--- | :--- | :--- |
| **Unit** | Vitest | 80%+ | Domain logic (ranking formula, URL normalization, Zod parsing) |
| **Integration** | Vitest + Test DB | 70%+ | Drizzle queries, BullMQ job processing, Better Auth DAL checks |
| **E2E** | Playwright | Critical Paths | Feed navigation, search, summary toggle, admin source CRUD |
| **Performance** | k6 | Key Endpoints | Feed load `< 1.5s`, search `< 300ms`, summarize enqueue `< 200ms` |
| **Accessibility** | axe-core + Playwright | WCAG 2.1 AA | Keyboard navigation, screen reader labels on AI disclosure badges |

*Note: All database tests use a dedicated PostgreSQL 17 test container. No Prisma or Meilisearch dependencies exist in the test suite.*

### 16. Risk Register *(Consolidated & Pruned from PAD 2)*
| # | Risk | Impact | Probability | Mitigation | Contingency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R1** | AI hallucination erodes user trust | High | Medium | Strict Zod schema enforcement; mandatory `sourcesCited` array; "Read Original" CTA. | Disable AI summaries globally; show "Summary Unavailable". |
| **R2** | Source blocking / rate limiting | High | High | Respect `robots.txt`; randomized User-Agents; exponential backoff; circuit breaker at 5 failures. | Fallback to secondary sources; manual curation. |
| **R3** | LLM API cost overruns | High | Medium | Token budgets per job; strict `max_tokens`; model tiering (Haiku primary, GPT-4o-mini fallback). | Throttle summarization; switch entirely to fallback model. |
| **R4** | DB connection exhaustion at scale | High | Medium | Lazy proxy DB pattern; strict `max` pool limits; PgBouncer in production. | Scale vertically; add read replicas for feed queries. |
| **R5** | Next.js 16 Cache Component bugs | Medium | Low | Strict adherence to `updateTag` vs `revalidateTag` matrix; cache-busting escape hatches. | Disable specific route caching; fall back to dynamic rendering. |

 “*Note: Microservice decomposition, Kafka, and Meilisearch risks are explicitly excluded as they are not in the V1 scope.*”

### 17. Deployment Checklist
**Pre-Deploy**
- [ ] All tests pass (`pnpm test`), TypeScript strict check passes (`pnpm typecheck`), Lint passes (`pnim lint`).
- [ ] Migration SQL reviewed by at least one other engineer (additive-only, no destructive `DROP` without dual-write strategy).
- [ ] Migration applied to staging and verified.
- [ ] New environment variables set in production secrets manager.

**Deploy**
- [ ] **Apply database migration FIRST** (before code deploy) via `pnpm drizzle-kit migrate`.
- [ ] Deploy Web App (rolling deploy, stateless).
- [ ] Deploy Worker Service (graceful shutdown confirmed via `SIGTERM` handler).
- [ ] Verify health endpoints return 200: `GET /api/categories`, `GET /api/articles?limit=5`.

**Post-Deploy**
- [ ] Monitor API p95 latency for 10 minutes (no spike above 1s).
- [ ] Monitor BullMQ queue depths (ingest queue should drain normally).
- [ ] Verify ingestion is still running: check `sourceHealthSnapshots` `last_success_at`.
- [ ] Spot-check 3 articles for correctness in the production UI.
- [ ] Test one manual summary request end-to-end to verify AI pipeline and cache invalidation.

---

### 🎉 Master PAD v2.0 Generation Complete

You now have a fully consolidated, contradiction-free, production-ready **Master Project Architecture Document**. 

**Key victories achieved in this consolidation:**
1. **Absolute PRD Alignment**: Drizzle ORM, Better Auth, PostgreSQL FTS/BM25, and BullMQ are the undisputed, documented standards.
2. **Zero Fluff**: Prisma, Meilisearch, Kafka, and generic "e.g." language have been aggressively purged.
3. **Production-Grade Patterns**: Lazy DB proxy, `proxy.ts` UX boundaries, React 19.2 `<Activity>`, and strict Zod AI validation are explicitly codified.
4. **Operational Readiness**: Complete runbooks, testing strategies, and risk registers are ready for Day 1 operations.

**Next Steps:** 
Would you like me to generate the actual starter codebase (e.g., the `lib/db/schema.ts`, `proxy.ts`, or the BullMQ worker entry point) based exactly on these specifications, or would you like to refine any specific section of this PAD further?

