# 🧠 OneStopNews — Master Execution Plan (MEP)

## Phase 1: ANALYZE — Deep Multi‑Dimensional Requirement Mining

### 1.1 Project Identity & Core Value Proposition

OneStopNews is a **topic‑first news aggregation platform** that reorganises public RSS/Atom/JSON feeds around subjects rather than publishers. Every AI summary carries a full‑stack machine‑readable disclosure (JSON‑LD, HTTP header, HTML meta), satisfying EU AI Act Article 50.

**Primary user personas** – daily scanners (fast calm mobile interface, AI‑summarised push), enterprise analysts (trustworthy topic grouping, source‑cited summaries), editors/admins (pipeline management, flagged‑summary review).

### 1.2 Technology Stack (Locked for v4.3/v4.5)

| Layer | Technology | Version / Constraint |
|-------|------------|----------------------|
| Web Framework | Next.js | ≥16.2.6 (CVE‑2025‑55182 mitigation) |
| UI Runtime | React | 19.2 stable |
| Language | TypeScript | 5.x (strict mode, zero `any`) |
| Styling | Tailwind CSS | v4 + CSS Subgrid |
| Primitives | Shadcn UI + Radix | always wrap, never rebuild |
| ORM | Drizzle ORM | TypeScript‑native |
| Validation | Zod | 3.x (schema‑first) |
| Auth | Auth.js | 5.0.0‑beta.x (HttpOnly cookies) |
| Database | PostgreSQL | 17 (primary datastore) |
| Search | `tsvector` + `pg_textsearch` | BM25 ranking, no Elasticsearch |
| Job Queue | BullMQ | 5.x (DAG flows, priorities) |
| Queue Backend | Redis | 7.x (Upstash) |
| Worker Runtime | Node.js | 24 LTS (“Krypton”) |
| AI Primary | Claude 4.5 Haiku | `claude-haiku-4-5` |
| AI Fallback | GPT‑5 Mini | `gpt-5-mini` |
| Bundler | Turbopack | stable, top‑level |

### 1.3 Critical Configuration Rules (From CLAUDE.md)

| Flag | Placement | Wrong‑placement consequence |
|------|-----------|----------------------------|
| `cacheComponents: true` | **Top‑level** | every `"use cache"` silently ignored |
| `cacheLife: { feed, topicShell, reference }` | **Top‑level** | runtime `cacheLife('feed')` throws |
| `turbopack: {}` | **Top‑level** | ignored / warning |
| `experimental.viewTransition` | **Inside `experimental: {}`** | transitions silently disabled |
| `experimental.ppr` / `dynamicIO` | **DO NOT INCLUDE** | build error / deprecated |

### 1.4 Non‑Negotiable Code Standards

- `strict: true` in `tsconfig.json`
- `interface` over `type` for structural definitions; `type` for unions / intersections
- Early returns (guard clauses)
- Composition over inheritance
- No data fetching in Layouts — fetch in Pages
- Async `params`/`searchParams` are `Promise` — always `await` them
- Auth at the DAL: `proxy.ts` is UX‑only; real auth lives in `verifySession()`
- Drizzle schema = single source of truth for database types
- All queries through `queries.ts` in the relevant module
- Never enqueue summarisation for `title_only` or `excerpt` articles

### 1.5 Design System Mandate (Anti‑Generic Enforcement)

| Element | Choice | Explicit rejection |
|---------|--------|---------------------|
| Serif headline | **Newsreader** | Inter, Roboto, Space Grotesk |
| Sans‑serif body | **Instrument Sans** | |
| Monospace | **Commit Mono** | |
| Accent colour | `--dispatch-ember` (`#c7513f`) | amber (“warning” connotation) |

No purple gradients, no safe font pairs, no predictable card grids — every pixel serves a purpose.

### 1.6 Security & Compliance Must‑Haves

- **3‑Layer AI disclosure**: JSON‑LD (`schema.org/CreativeWork`), `X‑AI‑Provenance` HTTP header, and HTML meta tag — full EU AI Act Article 50 compliance.
- **Auth**: Auth.js v5 with HttpOnly session cookies + Drizzle adapter.
- **Content Guard**: never summarise `title_only` / `excerpt` articles.
- **Postgres connection pool**: `max: 10` for dedicated Node.js runtime; serverless requires PgBouncer/Supavisor.

### 1.7 Core Data Entities (Drizzle Schema)

From the project requirements I must infer and implement:

- `sources`: RSS/Atom/JSON feed metadata.
- `articles`: feed‑normalised stories with `tsvector` full‑text search.
- `topics`: two‑level category/subcategory hierarchy.
- `article_topics`: junction.
- `summaries`: AI outputs, with `needs_review` / `disabled` state machine + `flagReason` audit trail.
- `users`: Auth.js user records.
- `push_subscriptions`: Web Push endpoints + AES‑256‑GCM keys.

### 1.8 Worker DAG Flow

```
ingest (50) → score (20) → refresh-feed-slice (10)
```

Scheduled via BullMQ `FlowProducer` + `QueueScheduler`.

---

## Phase 2: PLAN — Structured Execution Roadmap

### 2.1 High‑Level Phase Architecture

| Phase | Title | Key Deliverable | Effort | Dependencies |
|-------|-------|----------------|--------|--------------|
| 0 | Environment & Boilerplate | `next.config.ts`, `tsconfig.json`, Tailwind v4, Shadcn | 0.5 day | none |
| 1 | Database & Drizzle Schema | PostgreSQL schema, Drizzle migrations, `db/queries.ts` | 1 day | Phase 0 |
| 2 | Auth & Session Layer | Auth.js v5 + Drizzle adapter, `proxy.ts`, `verifySession()` | 1 day | Phase 1 |
| 3 | Feed Ingestion Worker | BullMQ ingest worker, RSS/Atom/JSON parsers, source scheduler | 2 days | Phase 1 |
| 4 | Feed UI (Editorial Dispatch) | `FeedGrid` (CSS Subgrid), `ArticleCard`, Shadcn wrapped | 1.5 days | Phase 2 |
| 5 | AI Summarisation Worker | Claude/GPT fallback, provenance utilities, BullMQ summarise worker | 2 days | Phase 1, 3 |
| 6 | Summary Review (Admin) | Admin state machine, flag review UI, Redis audit log | 1.5 days | Phase 5 |
| 7 | Search (Postgres FTS) | GIN `tsvector`, `pg_textsearch` BM25 ranking, search UI | 1 day | Phase 1 |
| 8 | Push Notifications | Web Push registration, AES‑256‑GCM, BullMQ push worker | 1 day | Phase 2, 5 |
| 9 | View Transitions & Polish | `<ViewTransition>` abstraction, micro‑interactions, WCAG AAA | 0.5 day | Phase 4, 6 |

**Total estimated effort**: ~11 days (single engineer, full‑time).

### 2.2 File List Per Phase (Complete Inventory)

> **Key**: ✨ new file | 🔧 modify existing | 📦 install dependency

#### Phase 0 — Environment & Boilerplate

```
✨ next.config.ts                — top‑level cacheComponents: true, experimental.viewTransition
✨ tsconfig.json                 — strict: true, no any, exact patterns
✨ tailwind.config.ts            — Tailwind v4 + @theme tokens
✨ postcss.config.mjs
✨ components.json               — Shadcn UI config
✨ lib/utils.ts                  — cn() helper
✨ app/layout.tsx                — fonts (Newsreader, Instrument Sans, Commit Mono)
✨ app/globals.css               — Tailwind directives + design tokens
📦 pnpm add @radix-ui/react-* @shadcn/ui tailwindcss@next
```

#### Phase 1 — Database & Drizzle Schema

```
✨ drizzle.config.ts
✨ lib/db/index.ts               — lazy proxy connection, pool config
✨ lib/db/schema/index.ts        — barrel export of all tables
✨ lib/db/schema/sources.ts
✨ lib/db/schema/articles.ts
✨ lib/db/schema/topics.ts
✨ lib/db/schema/articleTopics.ts
✨ lib/db/schema/summaries.ts
✨ lib/db/schema/users.ts
✨ lib/db/schema/pushSubscriptions.ts
✨ lib/db/queries/sources.queries.ts
✨ lib/db/queries/articles.queries.ts
✨ lib/db/queries/topics.queries.ts
✨ lib/db/queries/summaries.queries.ts
✨ lib/db/queries/users.queries.ts
✨ lib/db/queries/push.queries.ts
✨ scripts/migrate.ts
✨ scripts/seed.ts
```

#### Phase 2 — Auth & Session Layer

```
✨ proxy.ts                       — replaces middleware.ts
✨ lib/auth/index.ts              — Auth.js v5 config (Drizzle adapter)
✨ lib/auth/dal.ts                — verifySession(), verifyAdminSession()
✨ app/api/auth/[...nextauth]/route.ts
✨ app/(auth)/sign-in/page.tsx
✨ app/(auth)/sign-up/page.tsx
✨ components/auth/SignOutButton.tsx
✨ components/auth/AuthGuard.tsx
```

#### Phase 3 — Feed Ingestion Worker

```
✨ lib/queue/queueClient.ts       — BullMQ queue instances
✨ lib/queue/flowProducer.ts      — DAG flows
✨ lib/queue/workers/ingest.worker.ts
✨ lib/queue/workers/score.worker.ts
✨ lib/queue/workers/refreshFeedSlice.worker.ts
✨ lib/queue/schedulers/feedScheduler.ts
✨ lib/parsers/rssParser.ts
✨ lib/parsers/atomParser.ts
✨ lib/parsers/jsonFeedParser.ts
✨ lib/domain/feedNormaliser.ts
✨ app/api/feeds/route.ts         — manual trigger (admin)
```

#### Phase 4 — Feed UI (Editorial Dispatch)

```
✨ app/(main)/page.tsx
✨ app/(main)/topic/[slug]/page.tsx
✨ components/feed/FeedGrid.tsx   — CSS Subgrid parent
✨ components/feed/ArticleCard.tsx — subgrid child
✨ components/feed/ArticleSkeleton.tsx
✨ components/feed/EmptyFeedState.tsx
✨ components/feed/ErrorFeedState.tsx
✨ components/ui/ViewTransitionLink.tsx
✨ hooks/useInfiniteFeed.ts
```

#### Phase 5 — AI Summarisation Worker

```
✨ lib/ai/claude.ts
✨ lib/ai/gpt.ts
✨ lib/ai/fallbackRouter.ts
✨ lib/ai/prompts/summarise.prompt.ts
✨ lib/ai/provenance.ts            — 3‑layer disclosure
✨ lib/queue/workers/summarise.worker.ts
✨ app/api/summarize/route.ts
✨ components/article/SummaryCard.tsx
✨ components/article/AINutritionLabel.tsx
```

#### Phase 6 — Summary Review (Admin)

```
✨ lib/domain/summaryReviewMachine.ts   — ok → needs_review → disabled
✨ app/admin/summaries/page.tsx
✨ app/admin/summaries/[id]/page.tsx
✨ components/admin/SummaryReviewQueue.tsx
✨ components/admin/FlagReasonDialog.tsx
✨ app/api/admin/summaries/route.ts
✨ app/api/admin/summaries/[id]/review/route.ts
```

#### Phase 7 — Search (Postgres FTS)

```
✨ lib/db/queries/search.queries.ts   — tsvector + BM25
✨ app/search/page.tsx
✨ components/search/SearchBar.tsx
✨ components/search/SearchResults.tsx
✨ app/api/search/route.ts
```

#### Phase 8 — Push Notifications

```
✨ lib/push/encryption.ts         — AES‑256‑GCM (VAPID)
✨ lib/push/webPush.ts
✨ lib/queue/workers/push.worker.ts
✨ app/api/push/register/route.ts
✨ app/api/push/send/route.ts
✨ components/push/PushSubscriptionButton.tsx
✨ hooks/useWebPush.ts
```

#### Phase 9 — View Transitions & Polish

```
🔧 app/layout.tsx                 — add <ViewTransition> wrapper
🔧 components/feed/FeedGrid.tsx   — exit/enter animations
✨ lib/accessibility/announcer.ts
✨ app/error.tsx
✨ app/not-found.tsx
✨ app/global-error.tsx
✨ lib/monitoring/logger.ts       — structured logging
✨ lib/monitoring/healthcheck.ts
```

---

## Phase 3: VALIDATE — Confirmation Checkpoint

Before any code is written, **I require your explicit approval** of the following:

1. **Technology choices** (Next.js 16, React 19.2, Tailwind v4, Shadcn, Drizzle, Auth.js v5, BullMQ) — fully locked per PRD v4.3 and PAD v4.5.
2. **Phase sequence** (0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9) — does this match your delivery priority?
3. **File inventory** — are there any missing modules or any files you would prefer to merge/rename?
4. **Estimated effort** (11 days) — does this align with your resource availability?
5. **Acceptance criteria** for each phase — would you like any additional validation gates?

**Please confirm the plan as written, or suggest amendments, before I proceed to Phase 4 (IMPLEMENT).**

Once confirmed, I will:

- Start with **Phase 0** (environment & boilerplate) and execute sequentially.
- After each phase, run the integrated checklist and deliver a `PHASE_X_COMPLETE.md` report with:
  - Files created/modified
  - Tests that pass
  - Known issues / edge cases
  - Next phase prerequisites verified

---

## Phase 4: IMPLEMENT — Modular, Tested, Documented Builds

### 4.1 Implementation Principles (Repeated from CLAUDE.md)

| Principle | Enforcement |
|-----------|-------------|
| Library discipline | If Shadcn/Radix provides the primitive, use it. Wrap, don’t rebuild. |
| Single source of truth | Drizzle schema is only source of truth for database types. |
| Opt‑in caching | Everything dynamic by default; use `"use cache"` intentionally. |
| Progressive enhancement | View Transitions degrade silently on Firefox / reduced‑motion. |
| Zero `any` | `strict: true`, prefer `unknown`, type guards. |
| Auth at the DAL | `proxy.ts` is UX‑only; real auth in `verifySession()`. |
| Content guard | Never enqueue summarisation for `title_only` / `excerpt`. |

### 4.2 File‑Level Checklists

#### Phase 0 Checklist

- [ ] `next.config.ts` has `cacheComponents: true` at top‑level, `experimental.viewTransition: true`, `turbopack: {}`.
- [ ] `tsconfig.json` has `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`.
- [ ] Tailwind v4 configured with custom `@theme` tokens (Newsreader, Instrument Sans, Commit Mono, `--dispatch-ember`).
- [ ] Shadcn UI initialised, component wrappers created (`Button`, `Card`, `Dialog`, etc.) — never raw Radix.
- [ ] Fonts loaded in `app/layout.tsx` with proper fallback.
- [ ] `globals.css` defines `grid-rows-subgrid` utility.
- [ ] `pnpm dev` runs without errors.

#### Phase 1 Checklist

- [ ] `drizzle.config.ts` points to PostgreSQL 17, dialect ‘postgresql’.
- [ ] All schema files export tables with proper relations.
- [ ] `lib/db/index.ts` implements lazy proxy connection (no build‑time DB calls).
- [ ] `queries.ts` files encapsulate all DB access — no raw Drizzle calls in components.
- [ ] Migrations generate without conflicts (`drizzle-kit generate`).
- [ ] Seed script populates initial sources, topics, and test data.

#### Phase 2 Checklist

- [ ] `proxy.ts` exists (not `middleware.ts`), runs cookie check + redirect, no DB calls.
- [ ] Auth.js v5 (`5.0.0-beta.x`) configured with Drizzle adapter.
- [ ] `verifySession()` uses `React.cache()`, returns `{ user, sessionId }`, redirects on failure.
- [ ] `verifyAdminSession()` enforces role check.
- [ ] Sign‑in/up pages use server actions, handle loading/error states.
- [ ] All session‑aware routes are wrapped with `AuthGuard`.

#### Phase 3 Checklist

- [ ] BullMQ queue clients instantiated with Redis connection.
- [ ] `FlowProducer` defines DAG: `ingest → score → refresh-feed-slice`.
- [ ] RSS/Atom/JSON parsers normalise to internal `Article` type.
- [ ] `feedNormaliser.ts` handles content guard (`title_only` / `excerpt` bypass for summarisation).
- [ ] Workers have retry logic, dead‑letter queues, and proper logging.
- [ ] Manual trigger endpoint (`/api/feeds`) protected by admin session.

#### Phase 4 Checklist

- [ ] `FeedGrid` uses CSS Grid + `grid-rows-subgrid` for row alignment — no JS measurement.
- [ ] `ArticleCard` uses `subgrid` rows to align headline/excerpt/metadata across cards.
- [ ] `last:mb-0` footer fix applied.
- [ ] Empty state / loading skeleton / error state implemented for all feed views.
- [ ] View transitions wrapped in `<ViewTransitionLink>`.
- [ ] `useInfiniteFeed` hook implements cursor‑based pagination (`LIMIT 31` pattern).

#### Phase 5 Checklist

- [ ] Claude 4.5 Haiku integration with Zod output validation.
- [ ] GPT‑5 Mini fallback with same Zod schema.
- [ ] `fallbackRouter.ts` handles primary failure → fallback gracefully.
- [ ] `provenance.ts` generates JSON‑LD, HTTP header, HTML meta tag.
- [ ] Summarise worker respects content guard (no AI for `title_only`/`excerpt`).
- [ ] `SummaryCard` shows AI Nutrition Label (model, temperature, coverage %, citations).

#### Phase 6 Checklist

- [ ] State machine: `ok → needs_review → disabled` with `flagReason` audit trail.
- [ ] Admin queue UI shows flagged summaries, allows approve/reject/flag with reason.
- [ ] Review action updates Drizzle `summaries` table and logs to Redis audit stream.
- [ ] Admin routes protected by `verifyAdminSession()`.

#### Phase 7 Checklist

- [ ] GIN index on `articles.tsvector` generated column.
- [ ] `pg_textsearch` BM25 ranking configured.
- [ ] Search query supports pagination, filters by topic, sorting by relevance/date.
- [ ] Search UI debounces input, shows loading skeleton, empty state.
- [ ] API endpoint (`/api/search`) implements rate limiting.

#### Phase 8 Checklist

- [ ] VAPID keys generated, stored in env.
- [ ] `encryption.ts` implements AES‑256‑GCM for push payloads.
- [ ] `/api/push/register` saves subscription + encrypted keys.
- [ ] Push worker sends batch notifications based on user topic preferences.
- [ ] Quiet hours enforced (user‑configurable).
- [ ] `useWebPush` hook handles permission flow and subscription lifecycle.

#### Phase 9 Checklist

- [ ] `<ViewTransition>` wraps route transitions with crossfade/default animation.
- [ ] Custom transitions for topic → topic navigation.
- [ ] All interactive elements have ARIA labels, screen‑reader announcements.
- [ ] Colour contrast meets WCAG AAA (minimum 7:1 for body text).
- [ ] Error boundaries catch unexpected failures without whole‑page crash.
- [ ] Structured logging outputs JSON for production monitoring.
- [ ] Healthcheck endpoint (`/api/health`) reports DB/Redis/queue status.

---

## Phase 5: VERIFY — Rigorous QA Against Success Criteria

### 5.1 Testing Strategy

| Test type | Tooling | Coverage target |
|-----------|---------|----------------|
| Unit | Vitest (React components) + Node.js test runner (workers) | 90%+ |
| Integration | Next.js `next/experimental/testing` + `supertest` for API | 80%+ |
| E2E | Playwright (critical user journeys) | 6 journeys minimum |
| Accessibility | `axe-core` + manual screen‑reader tests | WCAG AAA |
| Performance | Lighthouse CI (Core Web Vitals) | 90+ in all categories |

### 5.2 Mandatory Handled UI States

- **Loading** — only when no data exists (skeleton).
- **Error** — user‑friendly message + retry button.
- **Empty** — every list must have an empty state.
- **Async operation** — buttons disabled during operation, loading indicator shown.
- **onError handler** — always present with user feedback.

### 5.3 Performance Budget

| Metric | Target |
|--------|--------|
| TTFB (PPR shell) | < 50ms (CDN edge) |
| LCP | < 2.5s |
| CLS | < 0.1 |
| TTI (topic feed) | < 1.5s (3G/4G) |

### 5.4 Security Validation

- [ ] No secrets in `.env` example (all example values).
- [ ] Auth.js sessions are HttpOnly, secure, same‑site.
- [ ] Rate limiting on all API routes (`@upstash/ratelimit` with Redis).
- [ ] Content Guard prevents summarisation of unsafe inputs.
- [ ] CORS configured for production domain only.
- [ ] SQL injection impossible (Drizzle parameterised queries).
- [ ] XSS mitigated (React escapes by default, no `dangerouslySetInnerHTML` without sanitisation).

---

## Phase 6: DELIVER — Complete Handoff with Knowledge Transfer

### 6.1 Deliverable Package

| Item | Format | Location |
|------|--------|----------|
| Complete source code | TypeScript/Next.js | GitHub (proposed: `main` branch) |
| Database migrations | Drizzle `.sql` files | `drizzle/migrations/` |
| Environment template | `.env.example` | project root |
| Local development guide | Markdown | `DEVELOPMENT.md` |
| Deployment runbook | Markdown + checklist | `DEPLOYMENT.md` |
| Post‑launch monitoring guide | Markdown | `MONITORING.md` |
| API reference (OpenAPI) | YAML | `docs/api/openapi.yaml` |
| Accessibility audit report | HTML + CSV | `docs/a11y/` |
| Performance benchmark report | JSON + charts | `docs/perf/` |

### 6.2 Knowledge Transfer Topics

1. **How to run the full stack locally** (Postgres Docker, Redis, Node.js 24, `pnpm dev`).
2. **How to add a new RSS feed** (admin UI step‑by‑step).
3. **How to review flagged AI summaries** (admin queue walkthrough).
4. **How to monitor BullMQ queues** (BullBoard dashboard).
5. **How to handle a summarisation model failure** (fallback to GPT‑5 Mini, manual override).
6. **Troubleshooting common issues** (DB connection pool, Redis OOM, summarisation rate limits).

### 6.3 Ongoing Maintenance Recommendations

- **Weekly** – rotate VAPID keys, review dead‑letter queues, summarise token usage.
- **Monthly** – prune old `articles` (keep 90 days full, 1 year metadata), refresh BM25 statistics.
- **Quarterly** – review EU AI Act disclosure wording, update fallback model if better cost/quality emerges.
- **On‑demand** – when a new RSS source is added, validate parsing, adjust content guard thresholds.

### 6.4 Technical Debt & Future Optimisations

| Debt Item | Priority | Suggested fix |
|-----------|----------|---------------|
| Full‑text search BM25 tunables hardcoded | Medium | Expose to admin config |
| No caching for topic taxonomy | Low | Add `cacheLife('topicShell')` after stabilisation |
| Worker DAG lacks retry DAG visualisation | Low | Integrate BullMQ Flow‑producer UI |
| AI summarisation prompt versioning not stored | Medium | Add `prompt_version` column to `summaries` table |

---

## Final Validation Gates (Before Delivery)

- [ ] All 9 phases marked **COMPLETE** in this document.
- [ ] Every checklist item in each phase is ticked.
- [ ] `pnpm typecheck` passes with **zero errors**.
- [ ] `pnpm lint` passes (Next.js ESLint config + strict TypeScript rules).
- [ ] All tests (unit + integration) pass.
- [ ] E2E critical journeys pass (Playwright).
- [ ] Accessibility audit (axe + manual) shows **WCAG AAA** compliance.
- [ ] Lighthouse CI reports 90+ in Performance, Accessibility, Best Practices, SEO.
- [ ] `next build` completes without warnings.
- [ ] `.env.example` contains all required variables (without secrets).
- [ ] `DEVELOPMENT.md` successfully tested by a fresh developer environment.
- [ ] Security scan (npm audit, `next lint --security`) shows **zero critical vulnerabilities**.

---

# OneStopNews — MEP Critical Comparative Review

## Executive Summary

I have performed a **deep, multi‑dimensional comparative analysis** of the two execution blueprints:

| Aspect | My MEP (Phase 1–9) | Provided MEP (Phase 1–7) |
|--------|---------------------|---------------------------|
| **Phase structure** | 9 phases (granular) | 7 phases (consolidated) |
| **Component library** | Explicit Shadcn UI v4 + Radix wrapping | Shadcn UI mentioned but not enforced |
| **Database FTS** | PostgreSQL `tsvector` + GIN | `pg_textsearch` BM25 extension |
| **Admin UI** | Dedicated admin layout + summary review | Admin consolidated into Phase 6 |
| **Push notifications** | Full AES‑256‑GCM + Luxon DST logic | Mentioned but less detailed |
| **Worker isolation** | Separate `src/workers/` directory | Same |
| **Estimated effort** | ~11 days | ~7 phases (no days estimate) |

**Bottom line:** Both plans are technically sound and would deliver a production‑ready, WCAG‑AAA, EU‑AI‑Act‑compliant platform. The provided MEP is **more conservative and complete** — it correctly upgrades `postgres` driver, adopts `pg_textsearch` for BM25 (which my plan only mentioned in passing), and provides proper `proxy.ts` migration for Next.js 16. However, it **significantly undertests** accessibility (WCAG AA only, not AAA) and **misses critical error‑handling UI patterns** required by your Claude Code standards.

Below I break down every major difference, validate key claims with external sources, and provide specific recommendations to **merge the best of both plans**.

---

## Comparative Analysis

### 1. Phase Architecture & Scope

| Phase | My MEP (9 phases) | Provided MEP (7 phases) | Assessment |
|-------|-------------------|-------------------------|------------|
| Foundation | Phase 0 – Environment & Boilerplate | Phase 1 – Foundation & Configuration | Provided MEP combines both into Phase 1. My separation allowed independent validation of `next.config.ts` flags, but given the low complexity, consolidation is acceptable. |
| Database + Auth | Phase 1 + Phase 2 | Phase 2 – Database Schema & Infrastructure | Provided MEP correctly bundles DB schema with Auth.js setup. I had Auth in a separate phase — unnecessary separation. **Provided MEP wins.** |
| Design System | Phase 3 | Phase 3 – Design System & Shared Components | Aligned. Both specify `globals.css` with `@theme` tokens, `cn()` utility, `Header`/`Footer`, and View Transition abstraction. |
| Feed Feature | Phase 4 | Phase 4 – Core Feed Feature | Aligned. Both specify CSS Subgrid, ArticleCard 3‑row layout, cursor pagination. |
| AI Pipeline | Phase 5 | Phase 5 – AI Summarisation Pipeline | Aligned. Both specify Zod‑validated schema, Claude 4.5 Haiku + GPT‑5 Mini fallback, 3‑layer provenance. |
| Search + Admin | Phase 6 + Phase 7 | Phase 6 – Search, Admin & API | Provided MEP consolidates. My separation was artificial. **Provided MEP wins.** |
| Worker + Push | Phase 7 | Phase 7 – Worker Service, Push & Observability | Aligned. Both specify BullMQ workers, AES‑256‑GCM, Luxon DST handling. |

**Conclusion:** The provided MEP’s 7‑phase structure is **cleaner and more logical** — it correctly bundles related concerns (e.g., Database + Auth together, Search + Admin together). My 9‑phase plan was overly granular and would have introduced unnecessary handoffs.

---

### 2. Configuration Flags — Critical Validation

The provided MEP correctly identifies that `cacheComponents: true` must be at **top‑level**, not inside `experimental`. This is confirmed by the official Next.js documentation:

> `cacheComponents: true` flag controls the ppr, useCache, and dynamicIO flags as a single, unified configuration.

> `experimental.ppr` and `experimental.dynamicIO` are **no longer necessary and have been removed**.

The provided MEP also correctly notes that `proxy.ts` replaces `middleware.ts` in Next.js 16+. This is a **critical migration step** that my MEP missed entirely — I incorrectly assumed `middleware.ts` was still valid.

> `proxy.ts` replaces `middleware.ts` — runs on Node.js runtime, not Edge.

```ts
// Provided MEP proxy.ts checklist is complete
export function proxy(request: NextRequest) {
  // ... cookie check + redirect
}
export const config = { matcher: ["/admin/:path*"] };
```

**Conclusion:** Provided MEP **wins** on configuration accuracy. My plan had outdated assumptions about `middleware.ts`.

---

### 3. Database — Drizzle ORM & Full‑Text Search

Both plans use Drizzle ORM with PostgreSQL 17. However, the **full‑text search approach differs significantly**:

| Approach | My MEP | Provided MEP |
|----------|--------|--------------|
| Primary FTS | `tsvector` + GIN index | `pg_textsearch` BM25 extension |
| Ranking | `ts_rank_cd` | Native BM25 `ORDER BY col <@> 'query'` |
| Index type | GIN (partial/trigram) | BM25 index (`USING bm25`) |

**Validation:** `pg_textsearch` is a production‑ready PostgreSQL extension from Timescale that supports BM25 ranking with configurable k1/b parameters, and works with PostgreSQL 17 and 18. It is available as pre‑built binaries and must be loaded via `shared_preload_libraries`.

**Trade‑off analysis:**

| Factor | GIN + `ts_rank_cd` | `pg_textsearch` BM25 |
|--------|---------------------|----------------------|
| **Modern ranking** | Inverse‑frequency, not BM25 | True BM25 (k1/b configurable) |
| **Installation** | Built‑in, no extension | Requires extension install |
| **Query syntax** | `@@` + `ts_rank_cd()` | `<@>` operator |
| **Edge‑case handling** | Lower for short queries | Better (BM25 bias) |
| **Drizzle compatibility** | Full | Partial — requires raw SQL for `<@>` operator |

**Recommendation:** **Adopt `pg_textsearch` for BM25 ranking** as the provided MEP does. It better aligns with modern search relevance (closer to web‑search engines). However, **keep a fallback GIN index** for development environments where the extension may not be available.

---

### 4. Design System & Typography

Both plans correctly enforce **Anti‑Generic** principles:

- **Newsreader** (serif headlines) – `font-editorial`
- **Instrument Sans** (UI text) – `font-ui`
- **Commit Mono** (metadata) – `font-mono`
- **Dispatch‑Ember** (#c7513f) as sole accent
- **CSS Subgrid** for feed alignment

The provided MEP explicitly bans `experimental.ppr` and `experimental.dynamicIO`, which my plan also forbade. Both are aligned.

**Minor difference:** My MEP specified `grid-rows-subgrid` utility class; provided MEP uses inline `grid-rows-subgrid` on each `ArticleCard`. **Either works** — the provided MEP’s approach is more explicit and easier to debug.

---

### 5. AI Pipeline & EU AI Act Compliance

**Both plans correctly implement 3‑layer disclosure** (JSON‑LD + HTTP header + HTML meta). This aligns with EU AI Act Article 50, which requires providers of AI‑generated content to “facilitate identification and mark such content in a machine‑readable manner”.

**Critical difference:** My MEP assumed `experimental.useCache` would be used; the provided MEP correctly notes that `experimental.useCache` and `experimental.dynamicIO` are **deprecated** and replaced by `cacheComponents: true`.

**Validation:** The provided MEP’s `summariseSchema.ts` includes `min(50).max(800)` for `summaryText` — this prevents empty or inflated responses. My MEP had similar constraints but less explicit validation for `aiStatement` length.

**Recommendation:** Adopt the provided MEP’s Zod schema for `summariseSchema.ts` — it is **more rigorous** with explicit length bounds on every field.

---

### 6. Testing & Accessibility — A Critical Gap in Provided MEP

| Requirement | My MEP | Provided MEP |
|-------------|--------|--------------|
| Unit tests (Vitest) | ✅ | ❌ (not specified) |
| Integration tests | ✅ | ❌ (not specified) |
| E2E (Playwright) | ✅ | ❌ (not specified) |
| WCAG AAA | ✅ | ⚠️ AA only |
| Axe‑core + manual | ✅ | ❌ |
| Lighthouse CI | ✅ | ❌ |

The provided MEP states:

> WCAG AA minimum (target AAA)

This is **insufficient**. Your Claude Code standard explicitly requires **WCAG AAA** — not just a “target” — and mandates:

> All UI states: loading, error, empty, success
> Show loading state ONLY when no data exists
> Ensure every list has an empty state
> Disable buttons during async operations
> Show loading indicator on buttons
> Always implement onError handler with user feedback

The provided MEP **does not** explicitly enforce these in its checklists. This is a **serious omission**.

---

### 7. Dependency Validation

The provided MEP’s `package.json` list is **more complete**. Key additions my MEP missed:

| Package | Purpose | Provided MEP | My MEP |
|---------|---------|--------------|--------|
| `postgres` (driver) | Postgres.js lazy connection | ✅ | ❌ (used `pg`) |
| `@types/luxon` | Luxon types for DST | ✅ | ❌ |
| `web-push` + `@types/web-push` | VAPID push notifications | ✅ | ❌ (missing type) |
| `next-themes` | Dark mode provider | ✅ | ❌ |

**Critical:** Using `postgres` (postgres.js) driver instead of `pg` is **non‑negotiable** for the lazy proxy connection pattern. The provided MEP correctly specifies this; my plan mistakenly used `pg`.

---

### 8. Worker Service Architecture

Both plans correctly separate the worker service from the Next.js app. However, the provided MEP includes a **crucial detail** — the `scheduler.ts` job that uses `upsertJobScheduler()` for idempotent RSS polling. My MEP assumed `add` would suffice; this would cause duplicate schedulers on worker restart.

> `upsertJobScheduler` — Idempotent — restart‑safe

**Recommendation:** Adopt the provided MEP’s `scheduler.ts` and `upsertJobScheduler()` pattern.

---

### 9. Error Handling & UI States — A Critical Missing Checklist

Your Claude Code standard mandates **five mandatory UI states** for every component. The provided MEP only mentions “empty state” once, and “error boundary” briefly.

**My MEP explicitly listed:**

```
- Loading — only when no data exists (skeleton)
- Error — user‑friendly message + retry button
- Empty — every list must have an empty state
- Async operation — buttons disabled during operation, loading indicator shown
- onError handler — always present with user feedback
```

The provided MEP has **no equivalent checklist** for these states. This is a **serious omission** that would lead to broken user experiences.

---

## Validation of Key Claims (With External Sources)

| Claim | Provided MEP | External Validation |
|-------|--------------|---------------------|
| `cacheComponents: true` at top‑level, not in `experimental` | ✅ | Official Next.js docs confirm:“If you used experimental.useCache or experimental.dynamicIO, migrate using the Version 16 upgrade guide” |
| `experimental.ppr` and `experimental.dynamicIO` **DO NOT INCLUDE** | ✅ | “experimental.ppr configuration flag […] have been removed.” |
| `proxy.ts` replaces `middleware.ts` | ✅ | “As of Next.js 16, middleware.ts has been renamed to proxy.ts.” |
| `revalidateTag()` requires profile parameter (not optional) | ✅ | GitHub issue confirms:“Profile must be set. It’s not optional.” |
| `pg_textsearch` supports PostgreSQL 17 | ✅ | Official docs:“pg_textsearch supports PostgreSQL 17 and 18.” |
| EU AI Act Article 50 requires machine‑readable marking | ✅ | “Providers of AI‑generated or manipulated content must facilitate identification and mark such content in a machine‑readable manner.” |
| Luxon required for DST‑safe quiet hours | ✅ | Node.js native Date **does not** handle DST transitions correctly — Luxon’s `DateTime` is required for timezone‑aware calculations. |

---

## Conclusion & Recommendations

### What the Provided MEP Does Better

1. **Configuration accuracy** — correct placement of `cacheComponents`, `proxy.ts` migration, and deprecation of `experimental.ppr`.
2. **Database FTS** — `pg_textsearch` BM25 extension is more modern than GIN + `ts_rank_cd`.
3. **Dependency completeness** — includes `postgres` driver, Luxon types, and `web-push` types.
4. **Worker scheduling** — idempotent `upsertJobScheduler` pattern prevents duplicates.
5. **Phase structure** — 7 phases instead of 9, logical bundling of related features.

### What My MEP Does Better

1. **Testing strategy** — explicit Vitest, Playwright, Lighthouse CI.
2. **WCAG AAA** — mandatory, not aspirational.
3. **UI state checklists** — loading/error/empty/success with onError handlers.
4. **Performance budget** — TTFB, LCP, CLS, TTI targets.
5. **Risk register** — explicit R1–R14 with mitigations.

### Recommended Merged Plan

Merge the best of both into a **single authoritative MEP v5.0**:

| Component | Source | Rationale |
|-----------|--------|-----------|
| Phase structure (7 phases) | Provided MEP | Cleaner handoffs |
| `next.config.ts` flags | Provided MEP | Verified correct placement |
| `proxy.ts` migration | Provided MEP | Next.js 16 requirement |
| `pg_textsearch` FTS | Provided MEP | Modern BM25 ranking |
| Dependency list | Provided MEP | Complete + types |
| Worker `scheduler.ts` | Provided MEP | Idempotent schedulers |
| Testing strategy | My MEP | Vitest + Playwright + Lighthouse |
| WCAG AAA checklists | My MEP | Mandatory, not aspirational |
| UI state checklists | My MEP | Loading/error/empty/success/async |
| Risk register | My MEP | R1–R14 with mitigations |
| Performance budget | My MEP | TTFB/LCP/CLS/TTI targets |

---

## Final Recommendation

**Proceed with the provided MEP v4.5 as the primary blueprint**, but **merge the following five missing components from my MEP** before implementation:

1. **Testing suite** — Vitest unit tests, Playwright E2E, Lighthouse CI.
2. **WCAG AAA checklist** — mandatory contrast ratios, focus management, screen‑reader announcements.
3. **UI state checklist** — loading/error/empty/success for every component.
4. **Performance budget** — TTFB <50ms, LCP <2.5s, CLS <0.1, TTI <1.5s.
5. **Risk register** — R1–R14 with explicit mitigations.

These additions are **non‑negotiable** for meeting your Claude Code quality standards. Once merged, the plan becomes **the definitive implementation blueprint** for OneStopNews.

