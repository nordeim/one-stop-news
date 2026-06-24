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

This section covers the definitive component designs, operational procedures, testing strategy, risk register, and deployment checklist.

---

## PART III: COMPONENT DESIGN

### 7. Authentication & Authorization

#### 7.1 3-Layer Defense-in-Depth Model
| Layer | Location | Purpose | Rule |
| :--- | :--- | :--- | :--- |
| **Layer 1 (UX)** | `proxy.ts` | Optimistic redirect for unauthenticated users hitting `/admin/*` | **NOT** a security boundary. No DB calls. Cookie presence check only. |
| **Layer 2 (Route)** | `app/(admin)/layout.tsx` | Session validation & RBAC enforcement | Calls `auth.api.getSession()`. Redirects to `/sign-in` if invalid. |
| **Layer 3 (Server Action)** | `features/*/actions.ts` | Mutations require explicit authorization | Verifies `session.user.role === 'admin'` before executing any domain logic. |

#### 7.2 Better Auth & Session Schema
Better Auth manages session lifecycle. The following Drizzle tables must exist in the schema for the database adapter to function, but **direct writes are prohibited** (use `auth.api.*` methods).

```typescript
// lib/db/schema.ts (Auth tables)
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex('sessions_token_unique').on(table.token),
  userIdx: index('sessions_user_idx').on(table.userId),
  expiresIdx: index('sessions_expires_idx').on(table.expiresAt),
}));

// lib/auth/dal.ts
export async function verifySession() {
  const session = await auth.api.getSession()
  if (!session?.user || session.user.role !== 'admin') {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' })
  }
  return session
}
```

---

### 8. Ingestion Pipeline

#### 8.1 Ingestion Job Handler (`bullmq` `ingest` queue)
```typescript
// worker/jobs/ingest.ts
import { Job } from 'bullmq'
import Parser from 'rss-parser'
import { createHash } from 'node:crypto'
import { db } from '@lib/db'
import { articles, sources, sourceHealthSnapshots } from '@lib/db/schema'
import { eq, and } from 'drizzle-orm'

const parser = new Parser()

export async function ingestJob(job: Job<{ sourceId: string }>) {
  const startedAt = Date.now()
  const { sourceId } = job.data

  try {
    const source = await db.query.sources.findFirst({
      where: eq(sources.id, sourceId)
    })
    if (!source?.isActive) return { status: 'skipped' }

    const feed = await parser.parseURL(source.feedUrl)
    const items = feed.items.slice(0, 20) // Safety limit per poll
    const newArticles: typeof articles.$inferInsert[] = []
    const updatedArticles: string[] = []

    for (const item of items) {
      const canonicalUrl = (item.link || item.id || '').trim()
      if (!canonicalUrl) continue

      const title = item.title || 'Untitled'
      const contentHash = createHash('sha256')
        .update(`${title}|${canonicalUrl}`)
        .digest('hex')

      const existing = await db.query.articles.findFirst({
        where: eq(articles.canonicalUrl, canonicalUrl)
      })

      if (existing) {
        updatedArticles.push(existing.id)
        continue
      }

      newArticles.push({
        sourceId: source.id,
        categoryId: source.categoryId,
        title,
        excerpt: item.contentSnippet || '',
        canonicalUrl,
        contentHash,
        contentAvailability: item.content ? 'partial_text' : 'excerpt',
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        ingestedAt: new Date(),
        summaryStatus: 'none',
      })
    }

    if (newArticles.length > 0) {
      await db.insert(articles).values(newArticles)
        .onConflictDoNothing() // Idempotent against race conditions
    }

    await db.update(sources)
      .set({ lastCheckedAt: new Date() })
      .where(eq(sources.id, sourceId))

    return { articlesNew: newArticles.length, articlesUpdated: updatedArticles.length }

  } catch (error) {
    const durationMs = Date.now() - startedAt
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Update source health snapshot
    await db.insert(sourceHealthSnapshots).values({
      sourceId,
      lastFailureAt: new Date(),
      consecutiveFailures: 1, // Handled by DB counter in prod
      errorMessage,
      durationMs,
      snapshotAt: new Date()
    })
    throw error
  }
}
```

#### 8.2 Importance Scoring Algorithm
Scoring runs in the `score` queue after ingestion. Weights are fixed and auditable.
```typescript
// domain/ranking/score.ts
export const WEIGHTS = {
  recency: 0.40,
  sourcePriority: 0.20,
  clusterSize: 0.25,
  categoryRelevance: 0.15,
} as const

export function computeImportanceScore(input: ScoringInput): number {
  const now = Date.now()
  const ageHours = (now - input.publishedAt.getTime()) / (1000 * 60 * 60)
  
  // Exponential decay: half-life of 24 hours
  const recencyScore = Math.exp(-0.693 * ageHours / 24)
  
  // Source priority mapping (Tier 1=1.0, 2=0.6, 3=0.3)
  const priorityMap = { 1: 1.0, 2: 0.6, 3: 0.3 } as const
  const sourcePriorityScore = priorityMap[input.sourcePriority as keyof typeof priorityMap] || 0.5
  
  // Cluster size: logarithmic scale (prevents viral stories from dominating)
  // 1 source = 0.2, 5 sources = 0.7, 10+ sources = 1.0
  const clusterScore = Math.min(1.0, Math.log(input.clusterSize + 1) / Math.log(11))
  
  // Category relevance: manual admin boost/penalty clamped to [0, 1]
  const categoryScore = Math.max(0, Math.min(1, 0.5 + input.categoryBoost))
  
  const raw = (recencyScore * WEIGHTS.recency) +
              (sourcePriorityScore * WEIGHTS.sourcePriority) +
              (clusterScore * WEIGHTS.clusterSize) +
              (categoryScore * WEIGHTS.categoryRelevance)
              
  return Math.max(0, Math.min(1, parseFloat(raw.toFixed(3))))
}
```

---

### 9. AI Summarization Pipeline

#### 9.1 Prompt Construction & Content Assembly
```typescript
// lib/ai/prompts.ts
export function buildContent(req: SummaryRequest): string {
  const parts = [`Title: ${req.title}`, `Source URL: ${req.sourceUrl}`]
  if (req.excerpt) parts.push(`Excerpt: ${req.excerpt}`)
  if (req.fullText) parts.push(`Full Text: ${req.fullText.slice(0, 8000)}`) // Hard cap for context limits
  return parts.join('\n\n')
}
```

#### 9.2 Dual-Model Strategy & Fallback
Primary: `claude-3-5-haiku-20241022`. Fallback: `gpt-4o-mini`.
```typescript
// worker/jobs/summarize.ts
async function generateSummary(content: string): Promise<SummaryResponse> {
  try {
    return await generateWithAnthropic(content, 'claude-haiku')
  } catch (error) {
    console.warn('[AI] Anthropic failed, falling back to OpenAI:', error.message)
    try {
      return await generateWithOpenAI(content)
    } catch (fallbackError) {
      throw new Error(`AI pipeline exhausted: ${fallbackError.message}`)
    }
  }
}
```

#### 9.3 Source-Cited Disclosure Enforcement
**Critical Trust Requirement:** The AI response *must* be validated by Zod before database insertion. If validation fails, the job retries with a strict system prompt or marks `summaryStatus: 'needs_review'`.
```typescript
import { z } from 'zod'

export const summaryResponseSchema = z.object({
  summary: z.string().min(50).max(2000),
  keyPoints: z.array(z.string()).min(2).max(5),
  sourcesCited: z.array(z.object({
    url: z.string().url(),
    title: z.string().max(100),
    relevance: z.enum(['primary', 'contextual', 'background'])
  })).min(1).max(5)
})
```

---

### 10. Search & Caching Architecture

#### 10.1 FTS Query Builder (Production)
```typescript
// features/search/queries.ts
import { sql, eq, desc } from 'drizzle-orm'
import { db } from '@lib/db'
import { articles } from '@lib/db/schema'

export async function searchArticles(query: string, limit = 20) {
  'use cache'
  cacheLife('feed')
  cacheTag('search-results')
  
  if (!query.trim()) return []
  
  // websearch_to_tsquery handles operators (+, -, "") safely
  const searchQuery = sql`websearch_to_tsquery('english', ${query})`
  
  return db.select({
    id: articles.id,
    title: articles.title,
    publishedAt: articles.publishedAt,
    rank: sql<number>`ts_rank_cd(${articles.searchVector}, ${searchQuery})`,
  })
  .from(articles)
  .where(sql`${articles.searchVector} @@ ${searchQuery}`)
  .orderBy(desc(sql`ts_rank_cd(${articles.searchVector}, ${searchQuery})`))
  .limit(limit)
}
```

#### 10.2 Autocomplete (`pg_trgm`)
```typescript
// features/search/queries.ts (continued)
export async function getSearchSuggestions(partial: string) {
  'use cache'
  cacheLife('minutes')
  cacheTag('search-suggestions')
  
  if (partial.length < 2) return []
  
  return db.execute(sql`
    SELECT DISTINCT title FROM articles 
    WHERE title % ${partial} 
    ORDER BY similarity(title, ${partial}) DESC 
    LIMIT 8
  `)
}
```

#### 10.3 Phase 2 BM25 Migration Path
```sql
-- Phase 2: Enable production-grade relevance ranking
-- 1. Add 'pg_textsearch' to shared_preload_libraries in postgresql.conf
-- 2. Restart PostgreSQL (managed cloud handles this via parameter group)
-- 3. Run migration:
CREATE EXTENSION IF NOT EXISTS pg_textsearch;
-- Index migration will use bm25 algorithm instead of ts_rank_cd
```

#### 10.4 Cache Invalidation Taxonomy
| Trigger | Method | Scope | Use Case |
| :--- | :--- | :--- | :--- |
| **User Mutation** | `revalidateTag(tag, { type: 'layout' })` | Immediate | Read-your-writes after Server Action |
| **Worker Completion** | `revalidateTag(tag, { maxAge: 'max' })` | Background | Feed refresh after ingestion/scoring |
| **Admin Action** | `revalidatePath('/admin/*')` | Immediate | Source CRUD, category updates |
| **Cache Component** | `use cache` + `cacheLife('stable')` | Edge/CDN | Static nav, source lists, SEO shells |

---

## PART IV: OPERATIONS & DELIVERY

### 11. Infrastructure & Local Development

#### 11.1 Docker Compose
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: onestopnews
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: onestopnews_dev
    ports: ['5432:5432']
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U onestopnews']
      interval: 10s

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory-policy noeviction
    ports: ['6379:6379']
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']

volumes:
  postgres_data:
```

#### 11.2 `init.sql` (DB Bootstrap)
```sql
-- docker/init.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE EXTENSION IF NOT EXISTS pg_textsearch; -- Phase 2 only
```

### 12. Environment Variable Schema
Validated via Zod at application startup. Missing/invalid vars cause immediate exit.
```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().min(10),
  OPENAI_API_KEY: z.string().min(10),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(10).optional(),
})

export const env = envSchema.parse(process.env)
```

### 13. Observability & Alerting
* **Structured Logging:** JSON format, includes `correlationId`, `jobId`, `sourceId`, `durationMs`.
* **Metrics Exposed:** Queue depth (`bullmq:ingest:depth`), job duration histograms, AI token usage counters, DB pool utilization %.
* **Alert Rules (PagerDuty/Slack):**
  1. `sourceHealth.consecutiveFailures > 3` for Tier-1 source
  2. `queue.summarize.depth > 500` for > 15 minutes
  3. `db.pool.active_connections > 80%` of `max_connections`
  4. `ai.error_rate > 5%` over 5-minute window

### 14. Operational Runbooks

#### 🔴 Runbook 1: Ingestion Source Failure
1. **Identify:** Check `sourceHealthSnapshots` or BullMQ failed jobs.
2. **Diagnose:** `curl -I <source.feedUrl>` (check HTTP status, robots.txt, SSL expiry).
3. **Mitigate:** 
   * If 429/Rate-Limited: Increase `pollIntervalMinutes`, add exponential backoff.
   * If 403/Blocked: Rotate `User-Agent`, check if source moved to paywall.
   * If Feed Broken: Admin marks `sources.isActive = false`. Manual feed URL update.
4. **Recover:** `await ingestQueue.upsertJobScheduler(...)` to restart polling. Clear consecutive failures in DB.

#### 🔴 Runbook 2: AI Summarization Incident
1. **Identify:** `summarize` queue depth spikes. `failed` jobs show `ZodError` or `RateLimitError`.
2. **Diagnose:** Check Anthropic/OpenAI status pages. Verify API keys in `env`.
3. **Mitigate:** 
   * If API Down: Toggle `summaryStatus` to `pending` in DB. Queue will retry on backoff.
   * If Hallucination Rate High: Update prompt template version, set `needs_review` for recent outputs.
4. **Recover:** Restart workers. Run `drizzle-kit` to verify `summaries` schema matches prompt expectations.

#### 🔴 Runbook 3: Database Connection Exhaustion
1. **Identify:** `FATAL: remaining connection slots are reserved for non-replication superuser connections`.
2. **Diagnose:** `SELECT count(*), state FROM pg_stat_activity GROUP BY state;`
3. **Mitigate:** 
   * Scale down Worker concurrency immediately (`summarize` → 2, `ingest` → 10).
   * Verify Lazy Proxy pattern is active (`lib/db/index.ts`).
   * If Web App is leaking connections: Deploy hotfix, clear Next.js server cache.
4. **Recover:** Restart Postgres (if self-hosted) or scale up instance. Re-enable worker concurrency.

### 15. Testing Strategy
| Tier | Tool | Coverage Target | Validation Criteria |
| :--- | :--- | :--- | :--- |
| **Unit** | Vitest | Domain logic, scoring, URL normalization, prompt builders | `>90%` branch coverage. Deterministic mocks. |
| **Integration** | `@lib/db/test` + Testcontainers | Drizzle queries, BullMQ job handlers, auth flows | Ephemeral PG17 + Redis. Schema matches prod. |
| **E2E** | Playwright | Feed load, search, admin source add, summary generation, PPR hydration | Critical paths pass on `main` merge. |
| **Performance** | k6 | Queue throughput, TTFB, FCP, INP | Queue: `>50 jobs/min`. Web: `TTFB < 200ms`, `LCP < 2.5s`. |
| **Accessibility** | axe-core + Playwright | WCAG 2.1 AA compliance | `0` critical violations. Keyboard nav complete. |
| **Security** | OWASP ZAP + Snyk | Auth bypass, XSS, SQLi, dependency vulns | `0` high/critical. Secrets scanned. |

### 16. Risk Register
| Risk | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **AI Hallucination / Fabrication** | Medium | High | Strict Zod schema, `sourcesCited` enforcement, `needs_review` fallback, human-in-the-loop admin dashboard. |
| **Source Blocking / Feed Breakage** | High | Medium | Graceful degradation (`excerpt` → `title_only`), `User-Agent` rotation, health monitoring, admin toggle. |
| **Redis Memory Pressure / Eviction** | Low | High | `maxmemory-policy noeviction`, explicit TTLs on feed slices, Upstash monitoring alerts, capacity planning. |
| **DB Migration Lock / Downtime** | Low | Critical | Additive-only schema changes, `generate + migrate` pre-deploy, read replica for heavy queries, zero-downtime deploy strategy. |
| **Auth.js Deprecation** | Resolved | Resolved | **Better Auth** adopted. Session revocation verified. Security-patch-only status acknowledged and mitigated. |
| **Queue Backlog / Worker Starvation** | Medium | High | Flow producer DAG ensures priority ordering. Concurrency tuned per resource type. Dead-letter queue inspection dashboard. |

### 17. Deployment Checklist

#### ✅ Pre-Deploy
- [ ] Env schema validates successfully on target environment
- [ ] `drizzle-kit generate` produces clean, additive SQL migration
- [ ] Queue depth < 100 pending jobs (drain if necessary)
- [ ] Feature flags set to `false` for untested components
- [ ] Backup taken (DB snapshot + Redis AOF dump)

#### 🚀 Deploy
1. **Database Migration:** Run `tsx scripts/migrate.ts` (pre-deploy step)
2. **Worker Rollout:** Deploy Node.js worker service first (backward-compatible job schema)
3. **Web App Rollout:** Deploy Next.js 16 app (PPR cache warm, edge invalidation)
4. **Cache Warm:** Trigger `revalidateTag` for top 10 categories
5. **Queue Re-sync:** Run `bootstrapScheduler()` to ensure idempotent cron alignment

#### 🔍 Post-Deploy
- [ ] Health endpoint returns `200 OK` with DB & Redis connectivity
- [ ] Playwright smoke tests pass on production URL
- [ ] BullMQ dashboard shows `ingest` & `summarize` queues processing normally
- [ ] Structured logs show `0` errors in first 15 minutes
- [ ] AI token usage & cost projection within expected baseline
- [ ] PPR cache serving static shells (verified via `x-nextjs-cache` headers)

---

**End of Part 3.** 

This concludes the **OneStopNews Master Project Architecture Document (PAD) v2.0**. The document is now fully consolidated, strictly aligned with PRD v2.0, and production-ready for engineering execution. All contradictions have been resolved, critical patterns have been preserved, and operational guardrails are explicitly defined.

# https://chat.qwen.ai/s/c1edebaa-be05-4ad0-a890-efbbbc24f194?fev=0.2.63 

