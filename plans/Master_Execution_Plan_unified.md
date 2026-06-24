Here is the meticulously consolidated, production-ready **OneStopNews Master Execution Plan (MEP) v2.0**. 

This document merges the exhaustive, file-level granularity of the original `Master_Execution_Plan.md` with the rigorous governance, quality gates, and structural discipline of `plan_MEP.md`, while enforcing absolute alignment with the research-validated PRD v2.0 and PAD v2.0.

---

# OneStopNews — MASTER EXECUTION PLAN (MEP) v2.0

**Document Status:** Authoritative build plan. Supersedes all prior execution notes.  
**Companion Documents:** PRD v2.0 (What/Why), PAD v2.0 (How)  
**Audience:** Engineering team executing the build  
**Rule:** Phases marked 🟢 **PARALLEL** can be worked on simultaneously. No phase may begin until its dependencies meet the Exit Criteria.

---

## PART I: CORE EXECUTION PRINCIPLES & GUARDRAILS

### 1. The Change Management Rule
If implementation reveals a major mismatch between the PAD and code reality: **STOP**. Document the mismatch. Decide whether the PAD or this execution plan must be formally amended via a new ADR. **Do not silently improvise a new architecture.**

### 2. File Ownership Intent
Before creating any file, it must answer these four questions. If it cannot, the file must be split or simplified:
1. **What do I own?** (e.g., "I own the lazy DB connection initialization")
2. **What do I depend on?** (e.g., `DATABASE_URL`, `postgres` driver)
3. **What do I export?** (e.g., `db` proxy instance)
4. **Why do I exist?** (e.g., "To prevent build-time crashes when Next.js imports modules without a DB available")

### 3. Anti-Generic Enforcement
At UI implementation time, actively reject generic patterns:
- **NO** rounded-xl cards, purple gradients, or default Inter font.
- **YES** to tight typographic hierarchy, ink-weight contrast, structured information density, and "Editorial Dispatch" category color tokens.
- **NO** generic "No results found" empty states. **YES** to editorial copy with recovery actions.

---

## PART II: GLOBAL DELIVERY RULES & DEFINITION OF DONE

### Definition of Done — Applied to EVERY File
Every file across every phase must satisfy these criteria before merge:
- [ ] **TypeScript Strict**: No `any`, no `@ts-ignore`, `noUncheckedIndexedAccess: true`.
- [ ] **Lint/Format**: Biome lint and format pass.
- [ ] **No Console**: No `console.log` (use structured logger).
- [ ] **State Handling**: All async UI actions handle loading, error, empty, and success states.
- [ ] **Accessibility**: Keyboard navigation works, ARIA labels present, WCAG AA contrast met.
- [ ] **Auth Boundary**: If a Server Action/Route Handler touches protected data, it starts with `requirePermission()` or a documented public exception.
- [ ] **DB Safety**: All DB access uses the lazy proxy pattern; all queries are parameterized.
- [ ] **Test Coverage**: At least one unit/integration test exists for new logic.

---

## PART III: PHASE DEPENDENCY GRAPH & RESOURCING

| # | Phase | Track | Parallelizable | Est. Effort |
|---|---|---|---|---|
| 0 | Repository Foundation & Tooling | Foundation | 🔴 Blocking | 1 day |
| 1 | Environment, Config & Validation | Foundation | 🔴 Blocking | 0.5 day |
| 2 | Database Schema & Migrations | Foundation | 🔴 Blocking | 2 days |
| 3 | Domain Layer (Pure Business Logic) | Backend | 🟢 PARALLEL | 1.5 days |
| 4 | Infrastructure Integrations | Backend | 🟢 PARALLEL with 3 | 1.5 days |
| 5 | Authentication & Authorization | Backend | 🟢 PARALLEL with 3, 4 | 1.5 days |
| 6 | Worker Service Core | Worker | Depends on 4 | 1 day |
| 7 | Ingestion Pipeline | Worker | Depends on 6 | 2 days |
| 8 | Scoring & Feed Slice Pipeline | Worker | Depends on 6 | 1 day |
| 9 | Summarization Pipeline | Worker | Depends on 6 | 2 days |
| 10 | Design System & UI Primitives | Frontend | 🟢 PARALLEL from Phase 0 | 2 days |
| 11 | Public Feed Experience | Frontend | Depends on 10 | 2 days |
| 12 | Article Detail & AI Summary UI | Frontend | Depends on 10, 14 | 2 days |
| 13 | Search Experience | Frontend | Depends on 10, 2 | 1 day |
| 14 | Public API Route Handlers | Frontend | Depends on 5, 2 | 1 day |
| 15 | Admin Workspace | Frontend | Depends on 5, 11 | 2 days |
| 16 | Observability & Runbooks | Operations | Depends on 7, 9 | 1.5 days |
| 17 | Testing Strategy & Implementation | Cross-cutting | Throughout | 3 days |
| 18 | Deployment & Production Readiness | Operations | Final phase | 1.5 days |

**Total Estimated Effort:** ~28 person-days (Achievable in ~3 calendar weeks with 2 engineers working in parallel).

---

## PART IV: EXECUTION PHASES

*(Note: Tables use the strict 6-column schema: File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist)*

### Phase 0: Repository Foundation & Tooling
**Mission:** Establish monorepo skeleton, TypeScript strictness, Biome toolchain, and Docker Compose dev environment.
**Exit Criteria:** `pnpm install`, `pnpm typecheck`, `pnpm lint` pass; `docker compose up` starts PG17 + Redis7 successfully.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `package.json` | Create | Root workspace manifest, cross-workspace scripts | N/A | `dev`, `build`, `typecheck`, `lint`, `db:*` scripts | [ ] Pin Node `>=24.0.0` [ ] Declare `pnpm workspaces` |
| `pnpm-workspace.yaml` | Create | Workspace routing | N/A | Workspace package discovery | [ ] Define `packages: ['web', 'worker']` |
| `tsconfig.base.json` | Create | Shared strict TS config | N/A | Base compiler options | [ ] `strict: true`, `noUncheckedIndexedAccess: true` |
| `biome.json` | Create | Unified linting + formatting | N/A | Lint/format rules | [ ] Ban `any`, ban `console.log`, enforce import sorting |
| `docker-compose.yml` | Create | Local PG17 + Redis7 infra | N/A | Running local services | [ ] PG healthcheck, Redis `noeviction` + AOF, mount `init.sql` |
| `docker/init.sql` | Create | PG extension initialization | N/A | DB extensions | [ ] `CREATE EXTENSION pg_trgm;` [ ] Comment for `pg_textsearch` Phase 2 |

### Phase 1: Environment, Config & Validation
**Mission:** Create Zod-validated environment configuration. Startup fails immediately if vars are missing/malformed.
**Exit Criteria:** Importing `env` throws cleanly with a readable error if invalid.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `web/src/lib/env/index.ts` | Create | Zod-validated env config | `process.env` | Typed `env` object, `Env` type | [ ] Custom error msgs [ ] `process.exit(1)` on fail [ ] Group by category |
| `worker/src/lib/env/index.ts` | Create | Worker-specific env validation | Base schema, `process.env` | Typed `env` object | [ ] Validate `WORKER_CONCURRENCY_*` [ ] Exclude `NEXT_PUBLIC_*` |
| `web/next.config.ts` | Create | Next.js 16 config | N/A | Next.js runtime config | [ ] Enable `experimental.ppr` [ ] Enable `experimental.dynamicIO` (Cache Components) |

### Phase 2: Database Schema & Migrations
**Mission:** Build complete Drizzle schema, lazy proxy DB connection, and migration tooling. Single source of truth for data.
**Exit Criteria:** `pnpm db:generate` produces clean SQL; `pnpm db:migrate` applies successfully.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `web/src/lib/db/schema.ts` | Create | Complete Drizzle schema | PAD Section 6.1 | All table defs, enums, relations | [ ] Custom `tsvector` type [ ] `fastupdate: false` on GIN index [ ] Partial index for recent articles |
| `web/src/lib/db/index.ts` | Create | Lazy proxy DB connection | `DATABASE_URL`, `postgres` driver | `db` proxied instance | [ ] **NO eager connection** [ ] Proxy intercepts property access [ ] Logger dev-only |
| `drizzle.config.ts` | Create | Drizzle Kit config | `DATABASE_URL` | Migration generation rules | [ ] `dialect: 'postgresql'` [ ] `strict: true` [ ] Output to `./migrations` |
| `web/src/lib/db/seed.ts` | Create | Dev seed script | Drizzle client | Populated categories/sources | [ ] Idempotent (`onConflictDoNothing`) [ ] Wrapped in transaction |

### Phase 3: Domain Layer (Pure Business Logic) 🟢 PARALLEL
**Mission:** Pure TypeScript business logic. Zero framework imports. Highly testable.
**Exit Criteria:** 100% unit test coverage on domain functions; zero Next.js/React/Drizzle imports.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `web/src/domain/articles/normalize.ts` | Create | Canonical URL normalization + hashing | Raw URL string | Normalized URL, SHA-256 hash | [ ] Strip tracking params [ ] Force HTTPS [ ] Sort query params |
| `web/src/domain/ranking/importance.ts` | Create | Importance score calculation | Recency, priority, cluster size | Float `[0.0, 1.0]` | [ ] Weights sum to 1.0 [ ] Exponential decay for recency |
| `web/src/domain/summaries/prompt.ts` | Create | AI prompt template construction | Article metadata | Prompt string, `PROMPT_VERSION` | [ ] Enforce fidelity-over-brevity [ ] Demand JSON output + citations |
| `web/src/domain/summaries/parse.ts` | Create | Parse + validate AI response | Raw AI text | `SummaryResponse` object | [ ] Strip markdown fences [ ] Zod schema validation [ ] Throw on mismatch |

### Phase 4: Infrastructure Integrations 🟢 PARALLEL
**Mission:** Adapter modules wrapping external services (Redis, BullMQ producers, AI clients).
**Exit Criteria:** Modules export clean interfaces; importing does not eagerly connect.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `web/src/lib/redis/index.ts` | Create | Lazy ioredis client | `REDIS_URL` | Proxied `redis` instance | [ ] `maxRetriesPerRequest: null` [ ] `lazyConnect: true` |
| `web/src/lib/queue/index.ts` | Create | BullMQ Queue producers (Web only) | Redis connection | `ingestQueue`, `summarizeQueue`, etc. | [ ] Web app enqueues ONLY [ ] Default job options (attempts, backoff) |
| `web/src/lib/ai/index.ts` | Create | Unified AI client wrapper | Anthropic/OpenAI SDKs | `generateCompletion()` | [ ] Detect provider by model prefix [ ] Return normalized `{text, tokens, model}` |

### Phase 5: Authentication & Authorization 🟢 PARALLEL
**Mission:** Better Auth config, DAL, static RBAC, and `proxy.ts`. Defense-in-depth model.
**Exit Criteria:** Sign-in works; protected routes redirect unauthenticated users; DAL is called from every protected Server Component.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `web/src/lib/auth/index.ts` | Create | Better Auth server config | Drizzle adapter, env | `auth` instance | [ ] `session.strategy: 'database'` [ ] HttpOnly, Secure cookies |
| `web/src/lib/dal/index.ts` | Create | Data Access Layer (Security boundary) | `auth.api.getSession`, `headers` | `verifySession()`, `requirePermission()` | [ ] Wrapped in React `cache()` [ ] Throws on missing/invalid session |
| `web/proxy.ts` | Create | Next.js 16 network boundary (UX only) | `NextRequest`, `getSessionCookie` | `NextResponse.redirect` or `.next()` | [ ] **File at project ROOT** [ ] Cookie presence check ONLY [ ] Comment: "NOT a security boundary" |

### Phase 6: Worker Service Core
**Mission:** Worker entry point, BullMQ Worker instances, scheduler bootstrap, graceful shutdown.
**Exit Criteria:** Worker starts, registers queues, schedules ingestion jobs, handles `SIGTERM` cleanly.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `worker/src/index.ts` | Create | Worker entry + graceful shutdown | Worker instances, scheduler | Running process | [ ] `SIGTERM`/`SIGINT` handlers [ ] `worker.close()` with timeout |
| `worker/src/queues/connection.ts` | Create | Shared Redis connection for BullMQ | `REDIS_URL` | `connection` object | [ ] `maxRetriesPerRequest: null` [ ] `enableReadyCheck: false` |
| `worker/src/schedulers/index.ts` | Create | Bootstrap `upsertJobScheduler` | Active sources from DB | Registered schedulers | [ ] Idempotent per source [ ] Interval from `pollIntervalMinutes` |

### Phase 7: Ingestion Pipeline
**Mission:** Fetch RSS/JSON, parse, normalize, deduplicate, upsert to PG, update health, trigger downstream Flow.
**Exit Criteria:** Worker ingests articles from a real RSS feed end-to-end; dedup works; health snapshot updates.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `worker/src/jobs/ingest/index.ts` | Create | Top-level ingestion orchestrator | Source config, fetch/parse utils | Job result `{articlesNew, articlesUpdated}` | [ ] Record job start/end [ ] Update health snapshot [ ] Re-throw for BullMQ retry |
| `worker/src/jobs/ingest/persist.ts` | Create | Upsert articles + trigger Flow | Candidate articles | Inserted/updated IDs, Flow trigger | [ ] `ON CONFLICT DO UPDATE` on `canonical_url` [ ] `FlowProducer.add()` for score/refresh |

### Phase 8: Scoring & Feed Slice Pipeline
**Mission:** Importance scoring job + feed slice refresh job (BullMQ Flow parent/children).
**Exit Criteria:** New articles scored within 30s; Redis feed slices updated atomically after batch completes.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `worker/src/jobs/score/index.ts` | Create | Importance scoring per article | Article + source data, domain formula | Updated `importanceScore` | [ ] Idempotent [ ] Single UPDATE query |
| `worker/src/jobs/feed-slice/index.ts` | Create | Refresh Redis feed slice (Flow parent) | Category ID, DB query | Redis key updated, Revalidation triggered | [ ] Query top 40 articles [ ] `setFeedSlice()` [ ] Call internal revalidation API |

###Phase 9: Summarization Pipeline
**Mission:** User-triggered AI summarization: fetch content, build prompt, call AI, parse/validate, persist with citations.
**Exit Criteria:** Triggering via API produces a stored summary with source citations within 30s.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `worker/src/jobs/summarize/index.ts` | Create | Summarization job orchestrator | Article data, AI client, domain parse | Stored summary, updated article status | [ ] Skip if `status: 'ok'` [ ] Set `pending` at start [ ] Parse with Zod [ ] Update cache tag |
| `worker/src/jobs/summarize/extract.ts` | Create | Safe full-text extraction | Article URL, robots.txt rules | Cleaned text or fallback to excerpt | [ ] 10s timeout [ ] Readability parser [ ] Fallback gracefully |

### Phase 10: Design System & UI Primitives 🟢 PARALLEL
**Mission:** Tailwind v4 setup, "Editorial Dispatch" tokens, custom fonts, Shadcn UI wrapping.
**Exit Criteria:** All primitives render with correct tokens; fonts load without FOUT/FOIT; keyboard nav works.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `web/src/app/globals.css` | Create | Tailwind v4 entry + design tokens | N/A | CSS variables for colors, fonts, spacing | [ ] `@theme` block [ ] Dispatch color tokens [ ] `prefers-reduced-motion` |
| `web/src/shared/components/ui/button.tsx` | Create | Shadcn Button wrapped | Shadcn base, design tokens | `Button` component | [ ] Custom `dispatch` variant [ ] No generic rounded-full [ ] Loading state |
| `web/src/shared/components/DispatchBadge.tsx`| Create | Category-tinted badge | Category slug | Badge UI | [ ] Maps slug to Dispatch color [ ] Accessible contrast |
| `web/src/shared/hooks/useViewTransition.ts`| Create | View Transitions API wrapper | `next/navigation` router | `useTopicTransition()` hook | [ ] Feature-detect `startViewTransition` [ ] Respect reduced motion |

### Phase 11: Public Feed Experience
**Mission:** Default topic feed and category pages. PPR with Cache Components for shell, dynamic streaming for lists.
**Exit Criteria:** Feeds render at Core Web Vitals targets; topic switching uses View Transitions; cache hits visible.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `web/src/app/(public)/topics/[category]/page.tsx`| Create | Category feed page (PPR + Cache) | Route params, `getCategoryFeed` | Rendered page | [ ] `CategoryShell` RSC with `"use cache"` [ ] `LiveFeed` in `<Suspense>` |
| `web/src/features/feed/queries.ts` | Create | Drizzle queries for feed data | Category ID, sort param | Article array | [ ] Check Redis feed slice first [ ] Fallback to PG [ ] Join source/category |
| `web/src/features/topics/components/TopicRibbon.tsx`| Create | Sticky horizontal topic nav | Categories array | Nav UI | [ ] `"use client"` [ ] Uses `useTopicTransition` [ ] ARIA labels |

### Phase 12: Article Detail & AI Summary UI
**Mission:** Article detail page with source-cited AI summary disclosure UI. Uses React 19.2 `<Activity>`.
**Exit Criteria:** Detail renders; summarize button enqueues job; status poller updates without layout shift; full disclosure visible.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `web/src/features/article/components/SummaryPanel.tsx`| Create | AI summary disclosure UI (Trust-critical) | Summary object | Summary UI | [ ] `<DisclosureBadge>` at top [ ] Model name visible [ ] `<CitationList>` [ ] "Read original" CTA |
| `web/src/features/article/components/SummaryStatusPoller.tsx`| Create | Polls status, renders via `<Activity>` | Article ID, initial status | Polling UI state | [ ] `"use client"` [ ] Polls every 2s [ ] `<Activity mode={status==='ok'?'visible':'hidden'}>` |
| `web/src/app/api/summarize/[id]/route.ts` | Create | Enqueue summarization endpoint | Article ID, auth, rate limit | `{jobId, status: 'pending'}` | [ ] Rate limit check [ ] Enqueue high priority [ ] Return immediately |

### Phase 13: Search Experience
**Mission:** Search input, results, filters, FTS query implementation (`websearch_to_tsquery` + `ts_rank_cd`).
**Exit Criteria:** Search returns ranked results in <300ms p95; autocomplete appears on 2+ chars.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `web/src/features/search/queries.ts` | Create | FTS query implementation | Search params (query, filters) | Ranked articles, next cursor | [ ] `websearch_to_tsquery` [ ] `ts_rank_cd` [ ] `pg_trgm` for autocomplete |
| `web/src/features/search/components/SearchInput.tsx`| Create | Debounced search input | Query state, router | Search UI | [ ] `"use client"` [ ] 300ms debounce [ ] Updates URL on submit |

### Phase 14: Public API Route Handlers
**Mission:** Route Handlers for external/public API endpoints. Internal mutations use Server Actions.
**Exit Criteria:** Endpoints return correct status codes, uniform error format, and respect rate limits.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---| is---|---|---|---|---|
| `web/src/app/api/articles/route.ts` | Create | `GET /api/articles` feed endpoint | Query params (Zod validated) | Paginated article JSON | [ ] Uniform error format [ ] No HTTP caching (Redis handles it) |
| `web/src/lib/api/rate-limit.ts` | Create | Rate limiting middleware | Request IP/User ID, limits | `{allowed, remaining, resetAt}` | [ ] Redis-backed sliding window |

### Phase 15: Admin Workspace
**Mission:** Admin UI for source management, BullMQ job monitoring, summary audit. Protected by Better Auth + DAL.
**Exit Criteria:** Admin can sign in, manage sources, view queue health, flag summaries—with authorization at every layer.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `web/src/app/(admin)/layout.tsx` | Create | Admin layout with auth guard | `verifyAdminSession()` | Protected layout | [ ] Redirect if not admin [ ] Distinct utilitarian visual treatment |
| `web/src/features/admin/actions.ts` | Create | Server Actions for admin mutations | Form data, `requirePermission()` | `{success, error?}` | [ ] Every action calls `requirePermission()` first [ ] `revalidateTag()` on success |

### Phase 16: Observability & Runbooks
**Mission:** Structured logging, health endpoints, and operational runbooks.
**Exit Criteria:** Logs are structured JSON; health endpoints return 200; runbooks exist as Markdown docs.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---| an---|---|---|---|
| `web/src/lib/logger/index.ts` | Create | Structured logger | Log params | JSON stdout | [ ] Correlation ID [ ] Redact sensitive fields (emails, tokens) |
| `web/src/app/api/ready/route.ts` | Create | Readiness probe | DB/Redis clients | 200 OK or 503 | [ ] Check DB `SELECT 1` [ ] Check Redis `PING` |
| `docs/runbooks/ingestion-source-failure.md`| Create | Runbook for source failures | N/A | Markdown guide | [ ] Symptoms, diagnosis, fix, escalation steps |

### Phase 17: Testing Strategy & Implementation
**Mission:** Formalize testing infrastructure. TDD for domain layer; integration tests for critical paths.
**Exit Criteria:** All tests pass in CI; coverage targets met; smoke E2E test runs against staging.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `vitest.config.ts` | Create | Vitest configuration | N/A | Test runner config | [ ] Coverage thresholds: domain 95%, lib 80% |
| `web/src/domain/articles/normalize.test.ts`| Create | Unit tests for URL normalization | `normalizeCanonicalUrl` | Test assertions | [ ] Strips utm params [ ] Forces HTTPS [ ] Idempotent |
| `e2e/smoke.spec.ts` | Create | Playwright smoke E2E test | Staging environment | Pass/Fail | [ ] Home loads [ ] Topic nav works [ ] Sign-in works |

 is### Phase 18: Deployment & Production Readiness
**Mission:** Production Dockerfiles, CI/CD pipeline, IaC, secrets management, production observability wiring.
**Exit Criteria:** Production deployment succeeds; rolling deploy works without downtime; alerts wired to Slack/PagerDuty.

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
|---|---|---|---|---|---|
| `Dockerfile.web` | Create | Production web app image | Next.js standalone output | Optimized Docker image | [ ] Multi-stage [ ] Non-root user [ ] `HEALTHCHECK /api/health` |
| `.github/workflows/deploy.yml` | Create | CI/CD deployment pipeline | Git push to `main` | Deployed infrastructure | [ ] Run tests first [ ] DB migrate BEFORE app deploy [ ] Post-deploy smoke E2E |

---

## PART V: CROSS-PHASE COMMAND MATRIX

| Category | Command | Purpose |
|---|---|---|
| **Setup** | `pnpm install` | Install all workspace dependencies |
| **Database** | `pnpm db:generate` | Generate SQL migration files from Drizzle schema |
| **Database** | `pnpm db:migrate` | Apply pending migrations to local/dev DB |
| **Quality** | `pnpm typecheck` | Run TypeScript strict mode check across workspace |
| **Quality** | `pnpm lint` | Run Biome linting |
| **Quality** | `pnpm format` | Run Biome formatting |
| **Testing** | `pnpm test` | Run Vitest unit/integration tests |
| **Testing** | `pnpm test:e2e` | Run Playwright E2E tests |

---

## PART VI: PHASE EXIT GATE TEMPLATE

Every phase is considered **"DONE"** ONLY when all of the following are checked:
- [ ] All files listed in the phase are created/modified and merged to `main`.
- [ ] All file-level checklists in the phase table are satisfied.
- [ ] Phase-specific exit criteria (stated in phase description) are met.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass without errors.
- [ ] Documentation updated (README, PAD, or new runbooks if applicable).
- [ ] No critical issues in observability dashboards (post-Phase 16).
- [ ] **Failure Rule:** If any exit criterion fails, **do not mark phase complete**. Do not start the next phase. Resolve the failure in-phase. Avoid "we'll clean it up later" technical debt.

---

## PART VII: APPENDICES

### Appendix A: Reference Map (Quick Lookup)
| Reference Need | Document & Section |
|---|---|
| Why Better Auth, not Auth.js v5? | PAD v2.0, ADR-004 |
| Why BullMQ, not SQS? | PAD v2.0, ADR-002 |
| Lazy DB Connection Pattern | PAD v2.0, Section 6.3 |
| GIN `fastupdate=off` Rationale | PAD v2.0, Section 6.1 + ADR-005 |
| Cache Components Opt-in Model | PAD v2.0, Section 4.3 |
| Source-Cited AI Disclosure UI | PRD v2.0, Section 6.3 |
| `proxy.ts` vs DAL Security Boundary | PAD v2.0, Section 7.4 |
| Idempotent Job Design | PAD v2.0, Section 5.6 |
| BullMQ Flow Pattern | PAD v2.0, Section 5.4 |

---

### 🚀 Next Step
The **Master Execution Plan v2.0** is now locked, consolidated, and production-ready. It contains the exact file-by-file blueprint, strict quality gates, and parallelization map required to build OneStopNews without architectural drift.

**Would you like me to generate the actual starter code for Phase 0 (e.g., the exact `package.json`, `tsconfig.base.json`, `biome.json`, and `docker-compose.yml` files) so you can begin execution immediately?**

# https://chat.qwen.ai/s/c1edebaa-be05-4ad0-a890-efbbbc24f194?fev=0.2.63 

