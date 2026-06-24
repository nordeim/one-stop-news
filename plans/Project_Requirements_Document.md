# Phase 1: ANALYZE — Research Execution Plan

Before I write a single word of the refined PRD, I need to ground every decision in current reality. Here's what I'm researching across **6 parallel dimensions**:

1. **Competitive landscape** — What are the best news aggregators doing right now?
2. **AI summarization UX patterns** — How do leading products handle trust, disclosure, and UI?
3. **Next.js 16 / React 19 architecture patterns** — What's the current production consensus?
4. **News app UI/UX trends 2025** — What does the anti-generic frontier look like?
5. **Ingestion & queue architecture** — BullMQ vs SQS vs alternatives in 2025?
6. **PostgreSQL 17 + full-text search** — Current best practices for news workloads?

Firing all research threads simultaneously:# Research Complete — Synthesis & Refined Blueprint

The 6-dimension research sweep is done. Here is everything I learned and how it reshapes the original PRD — followed by the full refined document.

---

## 🔬 Key Research Findings (What Changed & Why)

### Finding 1: Next.js 16 Has a Fundamentally New Caching Model
Unlike implicit caching found in previous versions, caching with Next.js 16's new **Cache Components** is entirely opt-in — all dynamic code in any page, layout, or API route executes at request time by default. This is a **breaking assumption** in the draft PRD, which described segment-level `revalidate` as the primary strategy. The new model uses explicit `use cache` + PPR instead.

Additionally, Next.js 16 ships Cache Components using Partial Pre-Rendering, a Next.js Devtools MCP for debugging, and **`proxy.ts`** — which replaces Middleware to clarify the network boundary. The draft PRD referenced `middleware.ts`; this must be updated.

The App Router in Next.js 16 uses the latest React Canary release including React 19.2 features: **View Transitions**, `useEffectEvent`, and `Activity` (background UI rendering with `display: none` while maintaining state). These unlock meaningful UX improvements for the news feed.

### Finding 2: App Router Architecture Is Now Production-Mature (With Caveats)
App Router is production-ready in 2026 — Next.js 15 stabilized many workflows that felt experimental during Next.js 13, and React Server Components now behave predictably across most common production use cases. However, teams deploying large Next.js applications across multiple regions still need strong observability around caching and edge rendering behavior — stability improved, but operational complexity did not disappear.

The consensus production pattern: deliberately prioritize Server Components over Client Components — most application logic does not need to run in the browser, and pushing computation to the server results in better performance, smaller bundles, and fewer hydration issues. Client Components are used only when interactivity is truly required.

For project structure, for most Next.js apps, you don't need separate API routes for your own data — Server Actions in `features/*/actions.ts` replace the traditional API route pattern for form submissions, mutations, and authenticated data fetching. Keep API routes (`app/api/`) for: webhooks, public endpoints for other services, and file upload handlers.

### Finding 3: BullMQ Is the Clear Winner for the Worker Queue
BullMQ is right most of the time for Node.js job queues. Specifically for our use case: use SQS if you have a simple "fire and forget" message; use BullMQ if you need complex features like job priorities, parent-child dependencies (Flows), or a real-time dashboard to see exactly what is stuck.

The authors have moved efforts from Bull to BullMQ — a modern TypeScript rewrite that receives new features. Jobs are persisted in Redis so they won't be lost if a worker crashes, with job persistence, automatic retries, error handling, and priority queues.

The draft PRD listed "SQS, RabbitMQ, or Redis-backed" with no clear recommendation. **BullMQ on Redis is the correct choice** for a Node.js TypeScript system with scheduled RSS polling, prioritized summarization jobs, and a monitoring dashboard requirement.

### Finding 4: AI Disclosure Is a Trust Minefield — Framing Matters Enormously
Audiences perceive news labeled as AI-generated as less trustworthy, not more — even when articles themselves are not evaluated as any less accurate or unfair.

However, negative effects associated with perceived trustworthiness are largely counteracted when articles disclose the list of sources used to generate the content.

The research-backed UX pattern: to ensure users can trust the summary is an objective reflection of source material, combine summaries with governors that help users retain agency — citations help users understand which sources map to which parts of the summary; references guide users to the source material where they can review and verify.

And critically: transparency regarding AI involvement may be more critical than the presence of human verification in fostering user trust; disclosure mechanisms play a significant role, and while in low-risk scenarios human oversight could be optional, **disclosure of AI involvement should remain a default system feature** to ensure transparency.

This means the draft PRD's AI governance section needs to evolve from a simple "label summaries" approach to a **source-cited, transparency-first disclosure system**.

### Finding 5: PostgreSQL FTS + BM25 Eliminates the Elasticsearch Dependency
BM25 is the standard ranking algorithm behind Elasticsearch and Lucene — and it now runs natively in Postgres with `pg_textsearch`.

For the foundational FTS strategy: using `tsvector` columns with generated columns, a partial index for recent content, and GIN indexes — PostgreSQL full-text search eliminates the need for external search engines while keeping data consistent and queries simple.

For advanced search, vector search with `pgvector` finds documents that are semantically similar even if they don't share keywords; `pgvector` and FTS work side by side on the same database — no separate infrastructure needed for keyword search and semantic search.

The draft PRD's search strategy is updated: use **GIN-indexed `tsvector` for primary FTS + `pg_textsearch` BM25 for relevance ranking**, with `pgvector` as a roadmap item for semantic search.

### Finding 6: Anti-Generic UI — What the 2025–2026 Design Frontier Actually Looks Like
Google's Material 3 Expressive research found that users of all ages prefer design that makes them feel something rather than emotionless, purely pragmatic interfaces — using color, size, shape, and containment to help users navigate and find key elements.

Overused animations clutter UI design and slow the user down — when everything moves, nothing stands out. This is where many UI design trends go sideways with more "wow" than why.

Typography isn't just for decoration — using bold, eye-catching fonts has become a powerful design trend to improve both usability and brand recognition. Apps in 2025 are more deliberate than ever about their typefaces.

Personalization will define UX design trends 2025 — AI analyzes user data and adjusts layouts, content, and navigation to create seamless digital interactions.

---

# 📋 OneStopNews — Refined & Improved Product Requirements Document (v2.0)

> **Document Status:** Research-validated, production-aligned refinement  
> **Base:** Original draft PRD  
> **Research grounding:** 6 technical dimensions, sources from 2025–2026  
> **Architecture decision:** Definitive (not speculative)

---

## 1. Overview

OneStopNews is a **topic-first news aggregation and AI summarization platform** that organizes public news content by *what it is about* rather than *who published it*. It collects article metadata from many sources, normalizes and categorizes stories, and presents them in a calm, editorially-informed interface designed for both daily readers and enterprise analysts.

### 1.1 Architectural Commitment (Updated and Definitive)

This document makes the following **definitive architectural choices**, replacing the speculative "e.g." language of the draft:

| Concern | Choice | Rationale |
|---|---|---|
| Web framework | **Next.js 16** (App Router, PPR, Cache Components) | Production-stable; new opt-in caching model aligns with news feed's mixed static/dynamic nature |
| UI runtime | **React 19.2** (View Transitions, Activity) | View Transitions for feed navigation; Activity for background summary loading |
| Styling | **Tailwind CSS v4** + custom design tokens | Utility-first with zero generic defaults |
| Components | **Shadcn UI** (Radix primitives) | Library-first; wrapped for bespoke aesthetic |
| Job queue | **BullMQ on Redis** | Purpose-fit for complex job graphs, priorities, scheduled polling, and a built-in monitoring dashboard |
| Database | **PostgreSQL 17** (primary) | Only production-supported datastore |
| FTS | **GIN-indexed `tsvector` + `pg_textsearch` BM25** | Elasticsearch-free; production-validated at 138M documents |
| ORM | **Drizzle ORM** | TypeScript-native, strict-mode compatible, lightweight |
| Auth | **Auth.js v5** (session cookies, HttpOnly) | Modern, Next.js 16-native |
| Worker runtime | **Node.js 24+** | LTS-aligned; BullMQ-native |
| Validation | **Zod** | Schema-first, composable, Drizzle-compatible |
| Network boundary | **`proxy.ts`** (not `middleware.ts`) | Next.js 16 replaces middleware with proxy for clarity |

> **Removed from consideration:** SQS (fire-and-forget only; lacks job priorities and native dashboard), RabbitMQ (operational complexity exceeds team size), SQLite in production (out of scope).

### 1.2 Scope

This PRD covers:
- Product requirements (features, UX, roles) for OneStopNews
- A concrete, production-grade architecture
- Non-functional requirements for performance, reliability, observability, and AI governance

**Out of scope (this iteration):** Full microservice decomposition, dedicated data warehouse, advanced ML-based personalization algorithms, pgvector semantic search (roadmap Phase 3).

---

## 2. Goals and Success Metrics

### 2.1 Product Goals

1. Provide a **topic-first news reading experience** that reduces cognitive load and tab-hopping across publisher sites.
2. Offer **source-cited, disclosure-first AI summaries** that speed up comprehension while preserving the primacy of original articles. *(Refined from draft — grounded in trust research.)*
3. Achieve enterprise-grade reliability and observability across ingestion, search, and summarization pipelines.
4. Maintain a **distinct editorial-typographic visual identity** that is anti-generic but highly usable.

### 2.2 Scale Assumptions

| Dimension | Target |
|---|---|
| Sources | 50–200 RSS/Atom/API sources |
| Ingestion volume | 20k–100k candidate articles/day post-dedup |
| Peak burst | 3–5× normal volume during major news events |
| MAU (early enterprise) | Up to low-hundreds of thousands |
| Read/write ratio | ~95% reads — justifies aggressive feed caching |

### 2.3 Success Metrics (V1)

| Metric | Target | Measurement |
|---|---|---|
| Feed freshness | 95% of category feeds show ≥20 stories from last 24h | Worker job monitoring |
| API p95 latency | ≤500ms server time for `GET /api/articles` under normal load | APM tracing |
| Page render p95 | ≤1.5s for main feed (PPR + Cache Components) | Core Web Vitals / RUM |
| Summarization coverage | 30–50% of viewed high-interest articles have summaries within 24h | DB analytics |
| Summary trust rate | <1% of audited summaries flagged for material factual errors | Manual sampling |
| Availability | 99.5% monthly for read APIs + ingestion | Uptime monitoring |
| AI trust disclosure compliance | 100% of summaries shown with source citations visible | UI audit |

*(Last row added — grounded in Finding 4.)*

---

## 3. Target Users and Personas

### 3.1 Daily Scanner
- Checks news multiple times daily; skims headlines and excerpts; occasionally opens originals.
- Thinks in topics ("What is happening with AI regulation?") rather than outlets.
- Needs fast, clean interface on mobile and desktop. Appreciates AI summaries as time-savers **when clearly sourced**.

### 3.2 Enterprise Analyst / Researcher
- Works in finance, policy, or corporate strategy.
- Monitors specific companies, sectors, and regions continuously.
- Needs trustworthy topic grouping, accurate timestamps, source attribution, and AI summaries with **citations to specific sources used** — not a black-box compression.

### 3.3 Editor / Admin
- Manages sources, categories, and ingestion policies.
- Monitors system health via BullMQ dashboard and application metrics.
- Reviews AI summaries for quality; flags, disables, or regenerates as needed.

---

## 4. Use Cases and User Stories

### 4.1 Topic-First Browsing
- As a user, I can select a topic (e.g., Tech News) and a subtopic (e.g., AI & ML) to see the latest stories across sources.
- As a user, I can quickly switch topics via a sticky topic navigation ribbon with live story counts.

### 4.2 Search and Sorting
- As a user, I can search across all stories by keyword with BM25-ranked relevance results.
- As a user, I can filter results by category, subcategory, and time range.
- As a user, I can sort results by: **Latest**, **Impact** (importance score), **Summary Ready**.

### 4.3 Article Exploration and Detail
- As a user, I can see a lead story for a topic and a dense grid of cards for remaining stories.
- As a user, I can click a card to see a detail view with metadata, an AI summary (if available) with **source citations**, and a link to the original article.

### 4.4 AI Summarization — Source-Cited Model *(Significantly refined)*
- As a user, I can request an AI summary for an article without one.
- As a user, every AI summary I see shows: **which sources it was derived from**, a **confidence indicator**, and a **"Read original" escape hatch** — never just a floating claim.
- As a user, I can toggle between "AI Summary" and "Original Excerpt" views.
- As an admin, I can review sampled summaries, mark problematic ones, and trigger regeneration.
- As an admin, I can see token usage, model used, and generation timestamp for every summary.

### 4.5 Source Transparency
- As a user, I can see the source outlet, category, subcategory, and time-ago for each article.
- As a user, I can click "Open original source" to read the full article on the publisher site.

### 4.6 Admin & Operations
- As an admin, I can configure sources (URLs, polling intervals, default categories).
- As an admin, I can view a **BullMQ dashboard** (or embedded job monitor) showing ingestion and summarization queue states — stuck jobs, failed jobs, and throughput.
- As an admin, I can view application metrics (ingestion lag, summary error rates, API latency).

---

## 5. Information Architecture and Navigation

### 5.1 Topic Model

Categories and subcategories are stored in the database — not hard-coded — to support evolution.

| Category | Example Subcategories |
|---|---|
| Top Stories | All, Breaking, Editor's Picks |
| Local News | Transport, Housing, Local Business, Governance |
| Tech News | AI & ML, Apple & Devices, Startups, Cybersecurity, Open Source |
| Global News | China, US, Asia-Pacific, Europe, Middle East |
| Finance News | Markets, Earnings, Personal Finance, Crypto, Commodities |
| Politics | SG Politics, US Politics, China Politics, Geopolitics |
| Culture & Society | K-Culture, Internet Culture, SG Gossip, Global Entertainment |

### 5.2 Navigation Model
- **Sticky topic navigation ribbon** near top of the app workspace.
- Each topic opens a panel with description + subtopic grid with per-subtopic story counts.
- **Controls panel** shows current view, selected category, result count, filters, and sort.
- **Dual-pane on large screens** (feed + sticky detail panel); stacked on smaller screens.
- **View Transitions API** (React 19.2) used for topic-switching animations — purposeful, not decorative.

### 5.3 URL & Routing Schema

```
/                           → Default feed (Top Stories / All)
/topics/[category]          → Default subtopic for category
/topics/[category]/[sub]    → Feed filtered by both
/article/[id]               → Standalone article detail (deep link, shareable)
/admin                      → Admin workspace (protected)
/admin/sources              → Source management
/admin/jobs                 → Ingestion + summarization job monitor
```

---

## 6. UX & UI Requirements

### 6.1 Design Philosophy — The Conceptual Direction

> **"Editorial Dispatch"** — The aesthetic of a wire service terminal meets a refined long-read publication. Not a news app. A *briefing room*. Every element has the weight of something worth reading.

**Aesthetic Directives:**
- **NOT:** Rounded cards, purple gradients, Inter font at 16px, hero sections with stock photography, predictable 3-column grids.
- **YES:** Tight typographic hierarchy, ink-weight contrast, structured information density, purposeful whitespace as a grid element, category-coded color accents that feel like editorial ink — not UI chrome.

**Typographic System:**
- **Headlines / Lead stories:** `Newsreader` or `Playfair Display` — editorial serif, tight tracking, high contrast stroke weight.
- **UI / Body / Labels:** `Space Grotesk` — non-generic grotesk with distinct letterforms.
- **Monospace accents** (timestamps, source tags, metadata): `JetBrains Mono` — adds a wire-terminal feel to metadata.
- **Explicit rejection:** Inter, Roboto, system-ui as primary typefaces.

**Color System (Design Token Names):**
```
--ink-900        → Near-black text (headlines)
--ink-600        → Body text
--ink-300        → Muted / metadata
--paper-50       → Background
--paper-100      → Card surface
--dispatch-amber → Breaking / high-impact accent
--dispatch-sage  → Finance / stable category
--dispatch-slate → Tech / neutral category
--dispatch-clay  → Politics / warm category
--dispatch-violet → Culture / expressive category
```

Research from Google's Material 3 Expressive study found that users of all ages prefer design that makes them feel something — using color, size, shape, and containment to help users navigate and find key elements. The Dispatch color system applies this: each category has a distinctive but restrained accent that communicates without overwhelming.

### 6.2 Layout System

**Desktop (≥1280px):**
- 12-column grid, `max-width: 1440px`.
- Left: Topic nav ribbon (fixed, 240px) + feed (8 cols).
- Right: Sticky detail panel (4 cols) — article detail, summary, source info.
- Lead story: full-width editorial block with large serif headline and image.
- Sub-stories: 3-column dense grid of compact cards.

**Tablet (768px–1279px):**
- Collapsible topic nav (full-width drawer on demand).
- Single-column feed; detail view as overlay or separate route.

**Mobile (<768px):**
- Stacked: sticky mini-header → topic carousel → controls strip → feed → detail.
- Progressive disclosure and thumb-friendly bottom navigation reduce cognitive load and improve one-handed use.
- Bottom-sheet for article detail.

### 6.3 AI Summary UX — Source-Cited Disclosure Model *(Significantly updated)*

Every AI summary component must include:

1. **"AI-generated summary"** label — prominent, not buried.
2. **Source citations inline** — links to the specific articles used to generate the summary.
3. **Model + generation date** — surfaced in a collapsible "About this summary" panel.
4. **"Read original source"** — always a primary action, not hidden.
5. **Confidence/coverage indicator** — shows how much of the original content was available to the model.

Rationale: negative effects on trustworthiness associated with AI disclosure are largely counteracted when articles disclose the list of sources used to generate the content. And: citations help users understand which sources map to which parts of the summary; references guide users to the source material where they can review and verify the cited information.

### 6.4 Accessibility

- **WCAG AA minimum** for all contrast ratios; target AAA for body text.
- All interactive elements keyboard-accessible.
- ARIA roles for topic nav (navigation), article cards (article), summary panels (region with `aria-label="AI-generated summary"`).
- `prefers-reduced-motion` respected — View Transitions disabled when set.
- Illustrations and visuals should be optimized and inclusive — avoiding overly abstract art that might confuse international audiences.

---

## 7. Functional Requirements

### 7.1 Ingestion Pipeline

- Ingest from configured sources via RSS, Atom, JSON APIs, or custom adapters.
- **BullMQ scheduler** launches ingestion jobs per-source schedule (5–30 minute intervals by priority tier).
- Ingestion job steps:
  1. Load source config from DB.
  2. Fetch feed/API with timeout (10s) and exponential backoff retry (3 attempts).
  3. Parse and normalize to unified `ArticleCandidate` schema (Zod-validated).
  4. Deduplicate via canonical URL normalization + content hash.
  5. Apply category/subcategory mapping via source config + rule engine.
  6. Persist via Drizzle ORM to PostgreSQL.
  7. Update `SourceHealthSnapshot` (last success, failure count, lag).
  8. Enqueue `compute-importance` job for new articles.

- All job failures surface as dead-letter queue entries with full error context.

### 7.2 Article Lifecycle

- Status flow: `pending` → `active` → `archived`.
- Deduplication group: near-duplicates from different sources clustered by `canonical_url` hash and title similarity.
- `content_availability` flag: `title_only | excerpt | partial_text | full_text`.
- Updates: title, excerpt, and metadata can be patched if source feed changes.

### 7.3 Ranking and Importance Score

- `importance_score` is a composite float (0.0–1.0):
  - **Recency weight** (40%): exponential decay from `published_at`.
  - **Source priority** (20%): configurable per-source tier (Tier 1–3).
  - **Cluster size** (25%): how many sources cover this story.
  - **Category relevance** (15%): manual boost/penalty by category.
- Scoring runs as a BullMQ `compute-importance` job, triggered on ingestion and periodically recomputed for hot feeds (top 200 articles per category).
- Scores written to `articles.importance_score` — no separate feed table in V1.

### 7.4 Summarization — Source-Cited Model *(Significantly updated)*

- Users request summaries via article detail view.
- `POST /api/summarize/[id]` → validates auth (if required) → enqueues `summarize-article` job (BullMQ, `high` priority queue) → returns `{ status: 'pending', jobId }`.
- **Summarization job steps:**
  1. Fetch article + source record.
  2. If `content_availability` insufficient: attempt full-text retrieval via safe extractor with robots.txt compliance check.
  3. Run structured prompt through AI model (Claude 3.5 Haiku or GPT-4o-mini for cost efficiency) with:
     - Fidelity-over-brevity instruction.
     - Source citation extraction instruction.
     - Factual-only (no interpretation) constraint.
  4. Parse model response into `{ summary_text, key_points[], sources_cited[], model, tokens_used, generated_at }`.
  5. Store in `summaries` table; update `articles.has_summary = true`, `articles.summary_status = 'ok'`.
- UI refresh: article detail view uses **React 19.2 Activity** component — renders summary panel in background, surfaces it when ready without layout shift.
- Admin can set `summary_status` to `needs_review | disabled`.

### 7.5 Search and Filtering *(Updated — BM25 strategy)*

- Primary FTS: PostgreSQL `tsvector` generated columns with GIN indexes, with `setweight()` for title (A) and body (B) field weighting.
- Relevance ranking: `pg_textsearch` BM25 extension for ranked keyword search — no Elasticsearch dependency.
- Fallback / fuzzy: `pg_trgm` trigram similarity for zero-result queries and autocomplete.
- Filters: category, subcategory, time range, summary status, source tier.
- Sort: latest, impact, summary ready.
- Search is debounced (300ms) client-side; results streamed via React Suspense.

### 7.6 User Features

**V1:**
- Session-persisted default topic, subtopic, and sort preference.
- Basic preference model (favorite categories stored in `user_preferences`).

**Roadmap:**
- Read-later list, muted sources, saved searches.
- Topic alerts (as a separate notification service).
- Semantic search via `pgvector` (Phase 3).

### 7.7 Admin Features
- **Source management:** CRUD for sources with Zod-validated fields; enable/disable toggle.
- **Job monitor:** Embedded BullMQ dashboard view showing queue depths, job states, failure rates, and DLQ entries for ingestion and summarization queues.
- **Summarization audit:** Volume, error rates, cost proxies (token usage × model rate), per-category breakdown.
- **Summary review queue:** Surface `summary_status = 'needs_review'` items with regenerate / disable actions.

---

## 8. System Architecture

### 8.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSERS                         │
│              (React 19.2 + View Transitions + Activity)         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────────┐
│                  NEXT.JS 16 WEB APP                              │
│  • App Router (PPR + Cache Components + proxy.ts)               │
│  • Server Components (data-fetching, layouts)                   │
│  • Client Components (interactivity islands only)               │
│  • Server Actions (mutations, auth)                             │
│  • Route Handlers (public API: /api/*)                          │
│  • Auth.js v5 (HttpOnly session cookies)                        │
└──────────┬──────────────────────────────┬───────────────────────┘
           │ Drizzle ORM                  │ BullMQ (enqueue)
           │                              │
┌──────────▼──────────┐      ┌────────────▼───────────────────────┐
│   POSTGRESQL 17     │      │        REDIS (Upstash / Managed)   │
│  • Articles         │      │  • BullMQ queues                   │
│  • Summaries        │      │  • Feed slice cache (hot feeds)    │
│  • Sources          │◄─────│  • Session store (optional)        │
│  • GIN FTS indexes  │      └────────────┬───────────────────────┘
│  • BM25 extension   │                   │ BullMQ (consume)
└─────────────────────┘      ┌────────────▼───────────────────────┐
                             │        WORKER SERVICE               │
                             │   (Node.js 24+ / TypeScript)        │
                             │  • Ingestion jobs (per-source poll) │
                             │  • Importance scoring jobs          │
                             │  • Summarization jobs               │
                             │  • SourceHealth snapshot jobs       │
                             └────────────────────────────────────┘
```

### 8.2 Internal Layering (Both Web App and Worker)

Following the layered architecture pattern within the App Router: requirements such as scalability, maintainability, performance, security, and team autonomy demand patterns that go beyond ad-hoc component composition.

```
src/
├── app/                          ← Next.js App Router (routes, layouts)
│   ├── (public)/
│   │   ├── page.tsx              ← / — Default feed (PPR + Cache Components)
│   │   ├── topics/[category]/
│   │   └── article/[id]/
│   ├── (admin)/
│   │   ├── layout.tsx            ← Auth guard via proxy.ts
│   │   └── ...
│   └── api/                      ← Public Route Handlers only
│       ├── articles/route.ts
│       ├── summarize/[id]/route.ts
│       └── categories/route.ts
│
├── features/                     ← Feature modules (THE key pattern)
│   ├── feed/
│   │   ├── components/           ← Feed, ArticleCard, LeadStory
│   │   ├── actions.ts            ← Server Actions for feed mutations
│   │   └── queries.ts            ← DB queries via Drizzle
│   ├── summaries/
│   │   ├── components/           ← SummaryPanel, CitationList, DisclosureBadge
│   │   ├── actions.ts
│   │   └── queries.ts
│   ├── search/
│   └── admin/
│
├── domain/                       ← Pure business logic (no framework deps)
│   ├── articles/
│   ├── ranking/
│   ├── summaries/
│   └── sources/
│
├── lib/                          ← Infrastructure integrations
│   ├── db/                       ← Drizzle client + schema
│   ├── queue/                    ← BullMQ client + job type definitions
│   ├── ai/                       ← AI client wrapper (Anthropic/OpenAI)
│   └── auth/                     ← Auth.js v5 config
│
├── shared/
│   ├── components/               ← Design system (Shadcn wrapped)
│   ├── hooks/
│   └── types/
│
└── proxy.ts                      ← Next.js 16 network boundary (replaces middleware.ts)

worker/
├── jobs/
│   ├── ingest.ts
│   ├── importance.ts
│   └── summarize.ts
├── queues/
│   └── index.ts                  ← BullMQ Queue + Worker definitions
└── scheduler/
    └── index.ts                  ← Cron-like job scheduling via BullMQ repeatable jobs
```

### 8.3 Next.js 16 Caching Strategy *(Fully updated)*

The draft PRD's caching strategy was based on the old implicit caching model. The updated approach:

Unlike implicit caching in previous versions, caching with Cache Components is entirely opt-in. All dynamic code in any page, layout, or API route is executed at request time by default.

**Strategy per route type:**

| Route | Strategy | Rationale |
|---|---|---|
| `/` (Top Stories) | PPR + `<CacheComponent>` for feed shell, dynamic for counts | Shell prerendered; story counts dynamic |
| `/topics/[category]` | PPR + Cache Component (revalidate: 120s) | Relatively stable; tolerate 2-min lag |
| `/article/[id]` | Dynamic (always fresh) | Summary status changes; must be current |
| `GET /api/articles` | No cache at Route Handler level; Redis feed slices for hot categories | Feed freshness SLA |
| `GET /api/categories` | Cache Component (revalidate: 300s) | Rarely changes |

**Redis feed slices:** Hot categories (Top Stories, Tech, Finance) maintain a pre-computed ordered list of article IDs in Redis, refreshed by the worker after each ingestion batch. Feed queries hit Redis first, Postgres as fallback.

### 8.4 Data Flow

**Ingestion:**
```
BullMQ Scheduler (repeatable job)
  → Worker: fetch source → parse → normalize → deduplicate → write PG
  → Worker: update SourceHealthSnapshot
  → Enqueue: compute-importance jobs for new articles
  → Enqueue: refresh-feed-slice for affected category
```

**Feed query:**
```
User request → Next.js RSC
  → Check Redis feed slice (hot category)
  → Miss: Drizzle ORM → PG (articles + importance_score + has_summary)
  → Return: streamed with Suspense boundaries
```

**Summarization:**
```
User action → POST /api/summarize/[id] → validate → BullMQ enqueue (high priority)
  → Worker: fetch article → extract content → AI model (Zod-validated response)
  → Store: summaries table with sources_cited[]
  → Update: articles.has_summary = true
  → Redis: invalidate article cache key
  → Client: React 19.2 Activity renders summary when polled/revalidated
```

---

## 9. Data Model & Storage

### 9.1 Core Schema (Drizzle ORM)

```typescript
// lib/db/schema.ts

export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull().unique(),
  feedUrl: text('feed_url').notNull(),
  feedType: sourceTypeEnum('feed_type').notNull(), // 'rss' | 'atom' | 'json_api'
  categoryId: uuid('category_id').references(() => categories.id),
  priority: integer('priority').default(2), // 1=high, 2=normal, 3=low
  pollIntervalMinutes: integer('poll_interval_minutes').default(15),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const articles = pgTable('articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').references(() => sources.id).notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  subcategoryId: uuid('subcategory_id').references(() => subcategories.id),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  canonicalUrl: text('canonical_url').notNull(),
  contentHash: text('content_hash').notNull(),
  contentAvailability: contentAvailabilityEnum('content_availability').default('excerpt'),
  importanceScore: real('importance_score').default(0.5),
  hasSummary: boolean('has_summary').default(false),
  summaryStatus: summaryStatusEnum('summary_status').default('none'),
  publishedAt: timestamp('published_at').notNull(),
  ingestedAt: timestamp('ingested_at').defaultNow(),
  // Generated column for FTS
  searchVector: tsvector('search_vector').generatedAlwaysAs(
    sql`setweight(to_tsvector('english', coalesce(title,'')), 'A') || 
        setweight(to_tsvector('english', coalesce(excerpt,'')), 'B')`
  ),
}, (table) => ({
  canonicalUrlIdx: uniqueIndex('articles_canonical_url_idx').on(table.canonicalUrl),
  categoryPublishedIdx: index('articles_category_published_idx').on(table.categoryId, table.publishedAt.desc()),
  subcategoryPublishedIdx: index('articles_subcategory_published_idx').on(table.subcategoryId, table.publishedAt.desc()),
  searchVectorIdx: index('articles_search_vector_gin_idx').using('gin').on(table.searchVector),
}));

export const summaries = pgTable('summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  articleId: uuid('article_id').references(() => articles.id).notNull().unique(),
  summaryText: text('summary_text').notNull(),
  keyPoints: jsonb('key_points').$type<string[]>().default([]),
  sourcesCited: jsonb('sources_cited').$type<{ url: string; title: string }[]>().default([]),
  model: text('model').notNull(),
  tokensUsed: integer('tokens_used'),
  generatedAt: timestamp('generated_at').defaultNow(),
  status: summaryStatusEnum('status').default('ok'),
  flagReason: text('flag_reason'),
});
```

### 9.2 Indexing Strategy

- **Feed queries:** Composite indexes on `(category_id, published_at DESC)` and `(subcategory_id, published_at DESC)` — the primary read pattern.
- **FTS:** GIN index on generated `search_vector` column — no manual trigger maintenance needed with `GENERATED ALWAYS AS`.
- **BM25 (Phase 2):** `pg_textsearch` BM25 index on `title || excerpt` for relevance-ranked search.
- **Deduplication:** Unique index on `canonical_url`.
- **Partial indexes:** `WHERE published_at > NOW() - INTERVAL '7 days'` on search vector for recent-content search optimization.

### 9.3 No SQLite in Production

PostgreSQL 17 is the **only production datastore**. Local development uses a PostgreSQL container via Docker Compose. SQLite is explicitly not supported to avoid schema drift and migration inconsistencies.

---

## 10. API Design

### 10.1 HTTP Endpoints (Route Handlers — Public/External only)

```
GET  /api/categories                    → Categories + subcategories with article counts
GET  /api/articles                      → Feed with ?category, ?sub, ?sort, ?search, ?limit, ?cursor
GET  /api/articles/[id]                 → Single article with summary if available
POST /api/summarize/[id]               → Enqueue summarization; returns { jobId, status }
GET  /api/summarize/[id]/status        → Poll summarization job status
GET  /api/source-health                → Source health snapshots (admin-gated)
```

**Internal mutations (Server Actions, not Route Handlers):**
```
features/admin/actions.ts → createSource, updateSource, toggleSource
features/admin/actions.ts → flagSummary, regenerateSummary
features/feed/actions.ts  → savePreference, setFavoriteCategory
```

### 10.2 Authentication & Authorization

- **Session auth:** Auth.js v5 with HttpOnly session cookies. Store auth tokens in HttpOnly cookies — never `localStorage` or `sessionStorage`. Use `proxy.ts` to check cookie presence for protected routes.
- **Roles:** `reader` (default), `admin`.
- Admin routes protected at `proxy.ts` level + Server Action layer.

### 10.3 Error Handling

- JSON error format: `{ code: string, message: string, details?: unknown }`.
- UI: non-blocking toast notifications for transient errors; inline empty states with recovery actions for feed errors.
- All states handled: **loading** (Suspense skeletons), **error** (error boundaries + `error.tsx`), **empty** (editorial empty states, not generic "no results"), **success**.

---

## 11. Caching, Performance & Scalability

### 11.1 Caching Strategy (Updated)

**Next.js 16 Cache Components (opt-in):**
```tsx
import { unstable_cache as cache } from 'next/cache';

// Feed shell — prerendered, fast initial load
export default async function TopicPage({ params }) {
  return (
    <main>
      <CacheComponent revalidate={120}>
        <FeedShell />
      </CacheComponent>
      <Suspense fallback={<FeedSkeleton />}>
        <LiveFeed category={params.category} />
      </Suspense>
    </main>
  );
}
```

**Redis feed slices:** Pre-computed ordered article ID arrays per `(category, subcategory, sort)`. Worker refreshes on ingestion. TTL: 5 minutes. Web App reads → hydrates with PG data in a single `WHERE id = ANY($1)` query.

**Cache invalidation:** Worker calls `revalidatePath('/topics/[category]')` via Next.js server revalidation API after ingestion completes per category.

### 11.2 Performance Targets

| Metric | Target | Mechanism |
|---|---|---|
| Feed API p95 | ≤500ms | Redis feed slices + optimized PG queries |
| Page FCP (feed) | ≤800ms | PPR prerendered shell |
| Page LCP (feed) | ≤1.5s | Streamed RSC with Suspense |
| Summarization trigger | Return ≤200ms | Enqueue only; async job |
| Search p95 | ≤300ms | GIN-indexed tsvector |

### 11.3 Scalability

- **Web App:** Stateless Next.js instances behind load balancer; scales horizontally.
- **Worker Service:** BullMQ supports multiple workers consuming the same queue with configurable concurrency; this horizontal scaling ability means BullMQ can handle a lot of load and is perfect for autoscaling.
- **Database:** PostgreSQL with read replicas for feed queries; writer for ingestion/summarization.
- **Bottleneck identification:** Ingestion workers are I/O-bound (network fetches) and can run high concurrency; summarization workers are AI-API-bound and should rate-limit to avoid quota exhaustion.

---

## 12. Observability & Operations

### 12.1 BullMQ Dashboard

The Worker Service exposes a **BullMQ Board** instance (or equivalent) for job monitoring. BullMQ provides a real-time dashboard to see exactly what is stuck — critical for a 200-source ingestion system with summarization pipelines.

Monitored queues: `ingest`, `summarize`, `compute-importance`, `refresh-feed-slice`.

### 12.2 Metrics (Structured + Application)

- **Ingestion:** jobs/min, success rate, avg duration, new articles/run per source.
- **Summarization:** enqueue rate, completion rate, p95 latency, token usage/day, cost proxy.
- **API:** QPS per endpoint, p50/p95/p99 latency, error rates.
- **Feed freshness:** articles-per-category in last 24h (tracked via hourly snapshot job).

### 12.3 Logging & Tracing

- Structured JSON logs from both Web App and Worker (correlation IDs on every log line).
- Request ID propagated through BullMQ job metadata for end-to-end tracing.
- Error boundaries capture client-side errors with source context.

### 12.4 Alerting

| Condition | Alert |
|---|---|
| Source ingestion failed 3× consecutive | PagerDuty / Slack |
| Summarization error rate > 5% over 1h | Slack warning |
| Feed freshness < 10 articles in top category | PagerDuty |
| API p95 > 1s for 5 minutes | PagerDuty |
| BullMQ DLQ > 50 items | Slack |

---

## 13. AI Governance *(Substantially revised)*

### 13.1 Disclosure Policy (Research-Grounded)

Every AI summary must include, by default and without exception:

1. **Provenance disclosure:** "AI-generated summary using [Model Name]".
2. **Source citations:** List of specific articles and sources the summary was derived from.
3. **Generation timestamp:** When this summary was generated.
4. **Human verification status:** Whether it has been reviewed by an editor.
5. **"Verify with original":** Persistent link to the source article.

Rationale: transparency regarding AI involvement may be more critical than the presence of human verification in fostering user trust. And: it seems clear the audience wants to know about it and wants more details than a vague "AI was used" statement.

### 13.2 Summary Quality Standards

- **Fidelity over brevity:** the goal of a summary is not compression at all costs, but clarity without distortion — shorter must still mean true.
- AI prompt design enforces factual-only output, no interpretation or opinion injection.
- Summaries do **not** speculate about causes or effects beyond what the source article states.

### 13.3 Quality Control Process

- **Automated:** Flag summaries where model confidence is low OR content retrieval was partial.
- **Manual:** Admin samples 5% of summaries per category per week.
- **User reporting:** "Report inaccuracy" action on every summary panel — routes to `summary_status = 'needs_review'`.
- **Regeneration:** Admin can trigger regeneration with updated prompt version.

### 13.4 Security

- AI API keys stored in environment secrets, never in DB or logs.
- Input sanitization on article content before prompting (strip injection attempts).
- Output filtered through Zod schema — unstructured model output rejected.
- Rate limiting on `/api/summarize/[id]` — max 5 requests/min per IP (anonymous) or 20/min (authenticated).

---

## 14. Rollout Plan

### Phase 1 — Production Foundation *(MVP on new architecture)*
**Deliverables:**
- Next.js 16 web app with App Router, PPR, Cache Components.
- Worker service with BullMQ queues (ingest, summarize, compute-importance).
- PostgreSQL 17 schema with GIN FTS indexes.
- Core feed, topic navigation, article detail, and source-cited AI summaries.
- Admin source management and BullMQ job monitor.
- Auth.js v5 for admin protection.

### Phase 2 — Performance & Personalization
**Deliverables:**
- Redis feed slices for hot categories.
- BM25 `pg_textsearch` for relevance-ranked search.
- User preference persistence and favorite categories.
- Enhanced admin summarization audit dashboard.
- Feed freshness alerting runbooks.

### Phase 3 — Semantic Intelligence & Enterprise
**Deliverables:**
- `pgvector` semantic search (same database, no separate infrastructure).
- ML-based topic classification for auto-categorization.
- Enterprise SSO (Auth.js v5 SAML/OIDC provider).
- Multi-tenant source collections for enterprise clients.
- Advanced personalization (behavior-based topic weighting).

---

## 15. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI disclosure erodes user trust | High (research-validated) | High | Source-cited disclosure model; user testing |
| Next.js 16 Cache Components caching bugs in edge cases | Medium | High | Strong observability; cache-busting escape hatches |
| RSS source instability / format drift | High | Medium | Graceful parsing degradation; SourceHealthSnapshot alerts |
| AI summarization API cost overrun | Medium | Medium | Token budgets per job; summarization rate limiting; model tiering |
| PG FTS insufficient for scale (>10M articles) | Low (V1) | High | pg_textsearch BM25 as bridge; pgvector + external search on roadmap |
| BullMQ Redis single point of failure | Low | High | Managed Redis (Upstash / ElastiCache) with AOF persistence; no eviction policy |

---

## Appendix A — Technology Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Web Framework | Next.js | 16 |
| UI Runtime | React | 19.2 |
| Language | TypeScript | 5.x (strict mode) |
| Styling | Tailwind CSS | v4 |
| Component Library | Shadcn UI + Radix | Latest |
| ORM | Drizzle ORM | Latest |
| Validation | Zod | 3.x |
| Auth | Auth.js | v5 |
| Database | PostgreSQL | 17 |
| FTS | pg_textsearch (BM25) + tsvector GIN | 1.x |
| Queue | BullMQ | 5.x |
| Queue Backend | Redis (Upstash managed) | 7.x |
| Worker Runtime | Node.js | 24 LTS |
| AI Client | Anthropic SDK + OpenAI SDK | Latest |
| Containerization | Docker + Docker Compose | Latest |

---

*End of Refined PRD v2.0 — OneStopNews*

---

## Summary of What Changed and Why

| Area | Draft | Refined | Evidence |
|---|---|---|---|
| **Queue** | "SQS, RabbitMQ, or Redis-backed (TBD)" | **BullMQ on Redis (definitive)** | Job priorities, dashboard, Node.js-native, TypeScript rewrite |
| **Caching** | `revalidate` segment caching (old model) | **PPR + Cache Components (Next.js 16 opt-in model)** | Next.js 16 official blog |
| **Network boundary** | `middleware.ts` | **`proxy.ts`** | Next.js 16 release notes |
| **AI disclosure** | Simple label ("AI-generated summary") | **Source-cited, provenance-first disclosure system** | Toff & Simon 2025; ShapeofAI patterns; Trusting News research |
| **FTS** | "PostgreSQL FTS (implied basic tsvector)" | **GIN tsvector + pg_textsearch BM25; pgvector roadmap** | 2025–2026 PG ecosystem |
| **SQLite** | "Used for local dev and testing" | **Removed — PostgreSQL container for all envs** | Operational clarity |
| **ORM** | Not specified | **Drizzle ORM (TypeScript-strict, lightweight)** | Production consensus 2025–2026 |
| **Typography** | "Newsreader or equivalent" | **Newsreader (editorial serif) + Space Grotesk + JetBrains Mono** | Deliberate system |
| **UI design direction** | "Editorial-industrial (general)" | **"Editorial Dispatch" — specific conceptual direction with full token system** | Anti-generic mandate |
| **React features** | "React 19" (generic) | **React 19.2 — View Transitions + Activity (specific feature use cases)** | Next.js 16 + React 19.2 changelog |
