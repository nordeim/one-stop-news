## Executive Summary

Yes — the right next artifact is a **`MASTER_EXECUTION_PLAN.md`** that turns the PRD + PAD into a **build sequence**, not just an architecture description.

My recommendation is to make that document:

- **phase-driven**
- **dependency-aware**
- **independently executable**
- **file-explicit**
- **verification-heavy**
- **written for real implementation, not presentation**

I will structure it so each phase can be completed, validated, and handed off without ambiguity. For every phase, the document will include:

- objective
- why the phase exists
- prerequisites
- deliverables
- files to create/modify
- per-file responsibilities
- exposed interfaces
- integrated checklist
- validation commands
- exit criteria
- risks / rollback notes

---

# Phase 1: ANALYZE

## What the `MASTER_EXECUTION_PLAN.md` must solve

The PRD tells us **what** OneStopNews should become.  
The PAD tells us **how** it should be architected.  
What is still missing is the **execution choreography**:

1. **What gets built first**
2. **What can be built independently**
3. **What files exist in each phase**
4. **What each file is responsible for**
5. **What interfaces each file exposes or consumes**
6. **How to verify phase completion before moving on**

That means this document is not just a roadmap. It is a **construction blueprint**.

---

## Core assumptions I will encode unless you redirect me

I am planning the `MASTER_EXECUTION_PLAN.md` under these assumptions:

### 1. Repository shape

We are building against the PAD’s structure:

- root Next.js 16 web app
- `worker/` as a separate Node.js service
- shared domain/infrastructure code under `src/`
- PostgreSQL 17
- Redis + BullMQ
- Better Auth
- Drizzle ORM
- Tailwind v4 + Shadcn UI
- TypeScript strict mode

### 2. Project state

I am assuming this is **greenfield-to-partially-started**, meaning:

- we should plan as if most of the production architecture still needs to be built
- the execution plan must be robust even if only a light MVP or draft code currently exists

### 3. Planning standard

Every phase must be:

- logically independent
- minimal but meaningful
- testable in isolation
- additive, not chaotic
- safe to stop after completion

### 4. File-list philosophy

The file list should not be vague like “create feed components.”  
It should say things like:

- `src/features/feed/components/FeedGrid.tsx`
- `src/features/feed/queries.ts`
- `worker/src/jobs/ingest/index.ts`

And for each file:

- action: create / modify
- purpose
- main features
- consumed interfaces
- exposed interfaces
- checklist

That level of specificity is the point.

---

## Risks I’m accounting for in the plan

### Risk 1: Building in the wrong order

If we build UI before data contracts, or worker orchestration before schema stability, rework explodes.

**Mitigation:** the master plan will sequence:
foundation → schema → infra → auth → ingestion → read paths → summarization → admin → hardening.

### Risk 2: Non-independent phases

If a phase requires half-finished work from three later phases, it is not a phase — it is a dependency trap.

**Mitigation:** every phase will have a strict “phase entry” and “phase exit” definition.

### Risk 3: File sprawl without ownership

Large codebases rot when files exist without clear scope.

**Mitigation:** each file entry will explicitly define:

- responsibility
- inputs
- outputs
- constraints

### Risk 4: Architectural drift from PAD

Execution plans often silently diverge from architecture docs.

**Mitigation:** each phase will reference the PAD decisions it implements.

---

# Phase 2: PLAN

## Recommended shape of `MASTER_EXECUTION_PLAN.md`

I recommend the final document use this structure:

---

## Proposed Table of Contents

### 1. Document Purpose

- why this document exists
- relationship to PRD and PAD
- intended audience
- execution principles

### 2. Global Delivery Rules

- strict TypeScript
- library-first UI discipline
- server-components-first
- no eager DB connections
- no `any`
- phase exit criteria
- testing expectations
- definition of done

### 3. Repository Target Shape

- top-level directory map
- deployables
- shared code boundaries
- cross-package import rules

### 4. Phase Dependency Graph

- ordered phase list
- what blocks what
- what can be parallelized later if team size grows

### 5. Execution Phases

For each phase:

- mission
- scope
- out of scope
- dependencies
- success criteria
- files to create/modify
- per-file interface notes
- integrated checklist
- validation steps
- risks / notes

### 6. Cross-Phase Command Matrix

- install commands
- db migrate commands
- lint / typecheck / test commands
- worker verification commands
- no `dev` / `build` unless explicitly approved

### 7. Final Integration Milestones

- MVP complete
- enterprise-readiness complete
- launch-readiness complete

### 8. Appendix: Master File Index

- all files grouped by area
- ownership by feature
- status tracking column

---

## Recommended execution phases

I recommend **12 implementation phases**.

This is the strongest sequencing for minimal rework and clean verification.

---

# Proposed Phase Breakdown

## Phase 0 — Repository Foundation & Engineering Guardrails

### Objective

Create the repo skeleton, tooling baseline, package boundaries, and quality gates.

### Why first

Nothing else should be built before the repo conventions, linting, TS strictness, and dependency boundaries are stable.

### Deliverables

- root package setup
- worker package setup
- tsconfig baseline
- eslint / formatting baseline
- env schema foundation
- initial README/dev setup

### Key file families

- root config files
- package manifests
- TypeScript configs
- lint configs
- env/bootstrap files

### Example files this phase will cover

- `package.json`
- `worker/package.json`
- `tsconfig.json`
- `worker/tsconfig.json`
- `next.config.ts`
- `eslint.config.js` or equivalent
- `.gitignore`
- `.env.example`
- `README.md`

---

## Phase 1 — Data Layer & Infrastructure Foundation

### Objective

Establish DB schema, Drizzle setup, migration pipeline, Redis client, queue types, and environment validation.

### Why here

All business features depend on trustworthy data structures and infra adapters.

### Deliverables

- Drizzle schema
- lazy DB connection
- Redis connection
- BullMQ producer definitions
- migration workflow
- env validation

### Key file families

- `src/lib/db/*`
- `src/lib/redis/*`
- `src/lib/queue/*`
- `src/lib/env/*`
- `drizzle.config.ts`
- docker infra files

---

## Phase 2 — Design System & Public App Shell

### Objective

Create the visual and structural foundation for the editorial-dispatch UI.

### Why here

We need the app shell and design tokens before feature UI starts branching.

### Deliverables

- root layout
- global styles and tokens
- font setup
- wrapped Shadcn primitives
- shell components
- loading / error states baseline

### Key file families

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/shared/components/ui/*`
- `src/shared/components/*`
- `src/app/(public)/layout.tsx`

---

## Phase 3 — Authentication, Authorization & Protected Admin Shell

### Objective

Implement Better Auth, session verification, RBAC, proxy behavior, and admin route scaffolding.

### Why here

Admin workflows, moderation, source management, and protected operations need a secure foundation before operational features are built.

### Deliverables

- Better Auth wiring
- session tables integrated
- DAL
- permissions matrix
- admin layout with enforcement
- auth routes

### Key file families

- `src/lib/auth/*`
- `src/lib/dal/*`
- `src/app/api/auth/[...all]/route.ts`
- `src/app/(admin)/*`
- `proxy.ts`

---

## Phase 4 — Taxonomy, Topic Navigation & Category Read Paths

### Objective

Implement categories, subcategories, topic ribbon, topic panel, and category-count read paths.

### Why here

Topic-first navigation is the core product interaction model. It must exist before feed rendering feels coherent.

### Deliverables

- category queries
- category API
- topic ribbon UI
- subcategory panels
- count rendering
- URL-driven navigation

### Key file families

- `src/features/topics/*`
- `src/features/feed/queries.ts` (initial count-related reads)
- `src/app/api/categories/route.ts`
- topic route pages

---

## Phase 5 — Ingestion Worker MVP

### Objective

Build the worker runtime, schedulers, ingestion jobs, normalization, deduplication, and persistence pipeline.

### Why here

No news product exists without a reliable ingestion backbone.

### Deliverables

- BullMQ connections
- schedulers
- ingest worker
- RSS/API parsing
- normalization
- deduplication
- source health updates
- ingestion job history

### Key file families

- `worker/src/index.ts`
- `worker/src/queues/*`
- `worker/src/schedulers/*`
- `worker/src/workers/ingest.worker.ts`
- `worker/src/jobs/ingest/*`
- `src/domain/articles/*`

---

## Phase 6 — Feed Query APIs & Topic Feed UI

### Objective

Build the main read experience: latest feed, impact feed, summary-ready feed, article cards, lead story, and feed controls.

### Why here

Once ingestion exists, the next value milestone is a usable reading experience.

### Deliverables

- feed queries
- feed API
- lead story rendering
- article grid
- loading/error/empty states
- sort/filter controls

### Key file families

- `src/features/feed/*`
- `src/app/(public)/page.tsx`
- `src/app/(public)/topics/[category]/page.tsx`
- `src/app/(public)/topics/[category]/[subcategory]/page.tsx`
- `src/app/api/articles/route.ts`

---

## Phase 7 — Article Detail & AI Summarization Loop

### Objective

Implement article detail pages, summary request flow, queue handoff, worker summarization, summary storage, and trust-first disclosure UI.

### Why here

This is the core differentiator after the feed itself.

### Deliverables

- article detail route
- article detail query layer
- summarize action endpoint
- status polling
- AI client wrapper
- prompt + parser
- summary panel
- citation list
- disclosure badge

### Key file families

- `src/features/article/*`
- `src/features/summaries/*` or integrated article summary files
- `src/app/api/articles/[id]/route.ts`
- `src/app/api/summarize/[id]/route.ts`
- `src/app/api/summarize/[id]/status/route.ts`
- `worker/src/workers/summarize.worker.ts`
- `worker/src/jobs/summarize/*`
- `src/domain/summaries/*`
- `src/lib/ai/*`

---

## Phase 8 — Search & Filtering System

### Objective

Implement PostgreSQL full-text search, autocomplete, filter composition, URL-synced search state, and search results UI.

### Why here

Search is a secondary but high-value discovery surface once feed and detail experiences exist.

### Deliverables

- FTS queries
- search result route or integrated feed search mode
- search input
- autocomplete
- filter controls
- empty/no-match UX

### Key file families

- `src/features/search/*`
- search-aware feed/API query updates
- DB search index refinements
- `src/app/api/articles/route.ts` updates

---

## Phase 9 — Admin Operations, Source Management & Summary Moderation

### Objective

Build the internal tools: source CRUD, source health dashboard, job monitor, summary review queue.

### Why here

Once content flow and summaries work, the system needs operational governance.

### Deliverables

- admin source list/create/edit
- source toggle controls
- source health API/view
- job monitor embed
- summary audit queue
- moderation actions

### Key file families

- `src/features/admin/*`
- `src/app/(admin)/sources/*`
- `src/app/(admin)/jobs/page.tsx`
- `src/app/(admin)/summaries/page.tsx`
- admin actions/query files
- source-health API

---

## Phase 10 — Caching, Performance & Feed Slice Optimization

### Objective

Add Redis feed slices, Next.js cache tagging, invalidation rules, and hot-path performance tuning.

### Why here

Optimization should follow a working baseline, not precede it.

### Deliverables

- feed slice storage
- worker refresh jobs
- cache tags
- route cache profiles
- invalidation mechanisms
- query optimization pass

### Key file families

- `src/lib/cache/*`
- `src/lib/redis/feed-slices.ts`
- `worker/src/workers/feed-slice.worker.ts`
- `worker/src/jobs/feed-slice/*`
- feed/query files updated for cache-first reads

---

## Phase 11 — Observability, Security Hardening & Release Readiness

### Objective

Add logs, metrics, alerting hooks, error surfacing, rate limiting, QA matrices, and deployment checklists.

### Why here

This is the production-hardening pass once core workflows are real.

### Deliverables

- structured logger
- monitoring hooks
- rate limiting
- final error handling
- security review pass
- deployment docs
- release checklist

### Key file families

- `src/lib/logger/*`
- worker logging files
- rate-limit utilities
- final docs
- CI scripts/configs
- `MASTER_EXECUTION_PLAN.md` completion updates if needed

---

## Phase 12 — Final Integration, Content Seeding & Launch QA

### Objective

Complete end-to-end integration, seed categories/sources, validate all journeys, and prepare for launch.

### Why here

This is the capstone phase that verifies the architecture behaves as one system.

### Deliverables

- seed scripts
- smoke tests
- final verification matrix
- launch blockers list
- release candidate sign-off

### Key file families

- `scripts/*`
- seed utilities
- test fixtures
- release docs

---

# How the file lists will be structured inside `MASTER_EXECUTION_PLAN.md`

For each phase, I recommend a file table with this exact shape:

| File | Action | Responsibility / Features | Interfaces In | Interfaces Out | Checklist |
| ---- | ------ | ------------------------- | ------------- | -------------- | --------- |

### Meaning of each column

- **File**: exact repo-relative path
- **Action**: create / modify / verify / defer
- **Responsibility / Features**: what this file owns
- **Interfaces In**: what it consumes
- **Interfaces Out**: exports, endpoints, components, types, actions, jobs
- **Checklist**: embedded implementation checklist for that file

---

## Example of the per-file granularity I will use

### Example: one file entry

| File                  | Action | Responsibility / Features                                                                    | Interfaces In                                  | Interfaces Out      | Checklist                                                                                                             |
| --------------------- | ------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/lib/db/index.ts` | Create | Lazy Drizzle DB bootstrap; prevent eager connection at module load; expose shared `db` proxy | `DATABASE_URL`, `schema.ts`, `postgres` driver | `db` instance proxy | [ ] lazy init only [ ] strict typing [ ] no eager connection [ ] env validation respected [ ] dev logging conditional |

### Example: component file entry

| File                                        | Action | Responsibility / Features                                                         | Interfaces In                     | Interfaces Out       | Checklist                                                                                                                          |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------------- | --------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/feed/components/FeedGrid.tsx` | Create | Render feed results in editorial dense grid; handle success + empty layout states | `ArticleCard`, feed article array | `FeedGrid` component | [ ] semantic list structure [ ] empty state support [ ] responsive columns [ ] no client JS unless needed [ ] accessibility labels |

### Example: API file entry

| File                                  | Action | Responsibility / Features                                           | Interfaces In                      | Interfaces Out                           | Checklist                                                                                                            |
| ------------------------------------- | ------ | ------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/summarize/[id]/route.ts` | Create | Validate auth/rate limit; enqueue summary job; return pending state | route params, DAL, BullMQ producer | `POST /api/summarize/[id]` JSON response | [ ] permission check [ ] existing summary short-circuit [ ] queue enqueue [ ] typed error response [ ] rate limiting |

---

# What the final `MASTER_EXECUTION_PLAN.md` will contain per phase

Each phase section should follow this template:

## Phase N — [Name]

### Mission

What this phase accomplishes.

### Why this phase exists

Architectural reason and why it belongs here.

### Dependencies

What must already exist.

### Out of scope

What must not be attempted in this phase.

### Deliverables

Concrete outputs.

### Files to create/modify

Detailed table with per-file features/interfaces/checklists.

### Validation

- typecheck
- lint
- unit tests
- integration checks
- manual verification steps

### Exit criteria

What must be true before phase is marked complete.

### Risks / implementation notes

Anything sharp-edged or sequence-sensitive.

---

# Additional recommendations I will encode in the document

## 1. Separate “create” from “modify”

This matters for execution safety. I will mark each file as:

- **Create**
- **Modify**
- **Verify only**
- **Deferred**
- **Optional / roadmap**

## 2. Include file ownership intent

For maintainability, I will describe whether a file is:

- feature-owned
- shared infra
- domain logic
- config
- operational

## 3. Include interface shape, not just purpose

For example:

- component props
- server action input/output
- route request/response
- job payload schema
- DB table ownership

## 4. Include validation checkpoints inside each phase

Not one giant QA section at the end.  
Each phase gets its own:

- checks
- commands
- success criteria

## 5. Make phases independently stoppable

At the end of each phase, the project should still be in a coherent state.

---

# Recommended level of detail

My recommendation is that the final `MASTER_EXECUTION_PLAN.md` be **high-detail, implementation-grade** and include:

- **all major config files**
- **all core app routes**
- **all feature modules**
- **all worker files**
- **all domain/infrastructure files**
- **all operational/config/docs files relevant to implementation**

That means the final document will be long. That is correct.  
A master execution plan for a project of this scope should be exhaustive enough that a senior engineer can execute phase by phase without inventing structure.

---

# What I will produce next if you approve

If you want me to proceed, I will draft the actual **full `MASTER_EXECUTION_PLAN.md` content**, including:

1. the full document header and execution rules
2. all 12 phases in detailed markdown
3. a **real file-by-file list**
4. per-file:
   - purpose
   - features
   - interfaces
   - checklist
5. per-phase:
   - validation steps
   - exit criteria
   - dependency notes

That next deliverable will be the actual markdown body you can save as:

```md
MASTER_EXECUTION_PLAN.md
```

---

# VALIDATE

My best recommendation is:

- use the **12-phase structure above**
- assume **greenfield repo aligned to the PAD**
- produce a **high-detail implementation document**, not a lightweight roadmap
- include **file-level ownership and interface definitions**, not just task bullets

## Single confirmation question

Should I now proceed to draft the **full detailed `MASTER_EXECUTION_PLAN.md`** in that format?

Below is the full draft content for **`MASTER_EXECUTION_PLAN.md`**.

---

# MASTER_EXECUTION_PLAN.md

## 1. Executive Summary

This document is the **authoritative execution blueprint** for building the OneStopNews codebase from the improved PRD and PAD.

It exists to answer, with precision:

- **What gets built**
- **In what order**
- **Why that order is correct**
- **Which files are created or modified in each phase**
- **What each file is responsible for**
- **What interfaces each file consumes and exposes**
- **How each phase is validated before the next phase begins**

This is not a vague roadmap.  
It is a **phase-by-phase construction plan**.

### Primary outcomes of this plan

By following this document, the team should be able to build OneStopNews in **logical, independently verifiable phases** while preserving:

- architecture fidelity to the PAD
- product fidelity to the PRD
- strict TypeScript discipline
- security and accessibility standards
- anti-generic UI quality
- operational readiness

---

## 2. Scope and Assumptions

### 2.1 Scope

This execution plan covers the implementation of:

- Next.js 16 web app
- React 19 app shell and feature modules
- Better Auth-based authentication and RBAC
- PostgreSQL 17 schema and Drizzle ORM
- Redis + BullMQ queueing
- Node.js worker service
- ingestion pipeline
- feed APIs and UI
- article detail and AI summarization
- search
- admin operations
- caching/performance layer
- observability, QA, release readiness

### 2.2 Assumptions

This plan assumes:

1. The repo is **greenfield or near-greenfield**
2. The target architecture follows the PAD
3. PostgreSQL and Redis are available for local development
4. The team will use **pnpm workspaces** unless an existing repo already standardizes on npm
5. The project will be implemented in **TypeScript strict mode**
6. The worker will live under `worker/`
7. Shared domain and infrastructure modules remain in the main repo under `src/`

### 2.3 Non-goals for V1 execution

The following are intentionally deferred unless explicitly re-approved:

- microservice decomposition
- Elasticsearch / Typesense integration
- advanced personalization ML
- semantic search with `pgvector`
- enterprise SSO
- multi-tenant architecture
- mobile native clients

---

## 3. Global Delivery Rules

These rules apply to **every phase**.

### 3.1 Engineering rules

- TypeScript strict mode must remain enabled
- `any` is prohibited
- Prefer `interface` over `type` unless unions/intersections are clearer
- Use early returns
- Prefer composition over inheritance
- Keep Server Components as the default
- Add Client Components only when interactivity actually requires them
- No eager DB connections
- All async UI actions must handle:
  - loading
  - error
  - empty
  - success
- Disable buttons during async actions
- Use Shadcn/Radix primitives instead of rebuilding commodity UI

### 3.2 Execution rules

- Do not skip phases
- Do not start a phase until prior phase exit criteria are met
- Do not refactor unrelated files during a phase
- Every changed line must map to a phase objective
- Every new file must have an explicit responsibility
- Every phase must end with validation

### 3.3 Quality gates per phase

Each phase is only complete when all of the following pass:

- `pnpm lint`
- `pnpm typecheck`
- phase-relevant tests
- manual verification checklist
- doc updates for any new setup or operational behavior

### 3.4 Command discipline

When implementation starts:

- add packages using install commands
- do not manually edit dependency manifests unless unavoidable
- avoid `dev` / `build` commands unless explicitly needed
- prefer:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm test:e2e` when phase calls for it

---

## 4. Repository Target Shape

```text
.
├── src/
│   ├── app/
│   ├── features/
│   ├── domain/
│   ├── lib/
│   └── shared/
├── worker/
│   └── src/
├── scripts/
├── tests/
├── docker/
├── .github/
└── docs/ (optional later)
```

### Deployables

- **Web App**: Next.js 16
- **Worker Service**: Node.js 24+ with BullMQ
- **Database**: PostgreSQL 17
- **Queue / Cache**: Redis 7

---

## 5. Phase Dependency Graph

### 5.1 Primary sequence

```text
Phase 0  → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
Repo       Data       Design     Auth       Taxonomy   Ingestion
Foundation Infra      System     + Admin    + Topic    + Ranking

Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11
         Feed       Detail    Search     Admin      Cache       Ops/QA/
         UI/API     + AI                              Perf       Launch
```

### 5.2 Optional parallelization later

Only after the core sequence is stable:

- after **Phase 3**, one engineer may advance **Phase 4** while another begins **Phase 5**
- after **Phase 7**, **Phase 8** and **Phase 9** may run in parallel
- **Phase 10** must wait until feed and admin read paths exist
- **Phase 11** is final hardening and integration

---

## 6. Phase-by-Phase Execution Plan

---

# Phase 0 — Repository Foundation & Engineering Guardrails

## Mission

Create the repo baseline, package boundaries, TypeScript rules, linting, shared scripts, and project conventions so every later phase lands on stable ground.

## Why this phase exists

Without this phase, all later work risks:

- inconsistent scripts
- weak type safety
- accidental config drift
- poor workspace boundaries

## Dependencies

None.

## Out of scope

- DB schema
- auth
- UI features
- worker logic

## Deliverables

- workspace structure
- root and worker package manifests
- TypeScript configs
- Next.js baseline config
- linting + formatting conventions
- environment example file
- repo README bootstrap

## Files to Create / Modify

| File                   | Action        | Responsibility / Features                                           | Interfaces In → Out                                                                 | File Checklist                                                                                        |
| ---------------------- | ------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `package.json`         | Create/Modify | Root package scripts, shared dependencies, workspace-level commands | In: repo conventions → Out: `lint`, `typecheck`, `test`, `db:*`, `worker:*` scripts | [ ] strict scripts added [ ] no duplicate tooling [ ] no unused deps [ ] commands map to later phases |
| `worker/package.json`  | Create        | Worker-specific runtime/test scripts and dependencies               | In: worker requirements → Out: worker scripts (`start`, `typecheck`, `test`)        | [ ] separate worker scripts [ ] no frontend-only deps [ ] Node runtime aligned                        |
| `pnpm-workspace.yaml`  | Create        | Workspace definition for root + worker                              | In: repo layout → Out: workspace package discovery                                  | [ ] includes root and `worker` [ ] no ambiguous package globs                                         |
| `tsconfig.base.json`   | Create        | Shared TypeScript strict baseline for root and worker               | In: TS rules → Out: common compiler options                                         | [ ] `strict: true` [ ] path aliases defined [ ] no emit for app packages where appropriate            |
| `tsconfig.json`        | Create/Modify | Web app TS config extending base config                             | In: base config → Out: Next.js app TS behavior                                      | [ ] extends base [ ] includes `src` [ ] excludes generated output                                     |
| `worker/tsconfig.json` | Create        | Worker TS config extending base config                              | In: base config → Out: worker compilation boundaries                                | [ ] extends base [ ] worker paths valid [ ] root imports resolved intentionally                       |
| `next.config.ts`       | Create        | Next.js 16 config, cache component flags, Turbopack-safe config     | In: PAD decisions → Out: app runtime config                                         | [ ] minimal config [ ] no legacy webpack hacks [ ] app router aligned                                 |
| `eslint.config.mjs`    | Create/Modify | Lint rules for TS/React/Next discipline                             | In: project quality rules → Out: lint behavior                                      | [ ] TS rules enforced [ ] React/Next rules enabled [ ] no permissive overrides                        |
| `.gitignore`           | Create/Modify | Ignore generated/build/cache/env artifacts                          | In: tool outputs → Out: clean repo hygiene                                          | [ ] node_modules ignored [ ] env files ignored [ ] migration artifacts intentionally handled          |
| `.env.example`         | Create        | Baseline env template for app + worker                              | In: planned config variables → Out: onboarding reference                            | [ ] no real secrets [ ] grouped by subsystem [ ] comments included                                    |
| `README.md`            | Create/Modify | Repo setup, architecture summary, local bootstrap instructions      | In: phase 0 conventions → Out: onboarding doc                                       | [ ] setup steps clear [ ] tool versions listed [ ] workspace commands documented                      |

## Validation

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`

Manual:

- [ ] root scripts resolve
- [ ] worker scripts resolve
- [ ] TypeScript paths work in both app and worker
- [ ] no config circularity

## Exit Criteria

- repo bootstraps cleanly
- lint/typecheck pass
- workspace boundaries are stable
- README supports first-time setup

---

# Phase 1 — Data Layer & Infrastructure Foundation

## Mission

Establish the durable system substrate: environment validation, PostgreSQL schema, Drizzle, Redis, queue contracts, migrations, and local infra.

## Why this phase exists

Every product feature depends on trustworthy data contracts.  
This phase creates the non-negotiable backbone.

## Dependencies

- Phase 0 complete

## Out of scope

- feed UI
- auth flows
- worker processing logic

## Deliverables

- env schema
- DB schema
- lazy DB client
- Redis client
- BullMQ producer contracts
- migration system
- Docker local infra

## Files to Create / Modify

| File                                     | Action          | Responsibility / Features                                                                             | Interfaces In → Out                                                      | File Checklist                                                                                    |
| ---------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `drizzle.config.ts`                      | Create          | Drizzle migration config                                                                              | In: `DATABASE_URL`, schema path → Out: migration generation/apply config | [ ] schema path correct [ ] output dir correct [ ] strict mode enabled                            |
| `docker-compose.yml`                     | Create          | Local PostgreSQL + Redis + app/worker service wiring                                                  | In: local infra plan → Out: reproducible dev stack                       | [ ] PG service healthy [ ] Redis persistent [ ] worker/app env wiring correct                     |
| `docker/init.sql`                        | Create          | Required DB extensions and local DB bootstrapping                                                     | In: search/cache plan → Out: DB extensions available                     | [ ] `pg_trgm` included [ ] no destructive init behavior                                           |
| `src/lib/env/index.ts`                   | Create          | Zod-validated environment parsing for app/worker                                                      | In: process env → Out: typed env object                                  | [ ] startup fails on bad env [ ] secrets/non-secrets grouped [ ] defaults limited and intentional |
| `src/lib/db/schema.ts`                   | Create          | Full Drizzle schema for categories, sources, articles, summaries, users, sessions, operational tables | In: PAD entity model → Out: typed table definitions                      | [ ] enums complete [ ] indexes included [ ] FKs correct [ ] generated search column defined       |
| `src/lib/db/index.ts`                    | Create          | Lazy Drizzle DB proxy, no eager connection                                                            | In: env, schema, postgres driver → Out: shared `db` client               | [ ] lazy init only [ ] no eager connect [ ] dev logging conditional [ ] worker-compatible         |
| `src/lib/db/migrations/0001_initial.sql` | Create/Generate | Initial schema migration snapshot                                                                     | In: `schema.ts` → Out: DB migration artifact                             | [ ] matches schema [ ] reviewed before apply [ ] reversible thinking documented                   |
| `src/lib/redis/index.ts`                 | Create          | Lazy Redis client shared by app and worker                                                            | In: `REDIS_URL` → Out: typed redis instance                              | [ ] no eager connect [ ] retry behavior sane [ ] worker-safe                                      |
| `src/lib/queue/types.ts`                 | Create          | Shared BullMQ job payload contracts                                                                   | In: worker/web queue requirements → Out: TS interfaces for jobs          | [ ] every queue has payload interface [ ] no implicit `unknown` payloads                          |
| `src/lib/queue/index.ts`                 | Create          | Web-side queue producers only                                                                         | In: queue types, Redis config → Out: enqueue helpers                     | [ ] web only produces, does not consume [ ] priorities supported                                  |
| `worker/src/queues/connection.ts`        | Create          | BullMQ-compatible Redis connection                                                                    | In: env → Out: shared worker Redis connection                            | [ ] `maxRetriesPerRequest: null` [ ] no duplicate connection setup                                |
| `src/lib/db/schema.test.ts`              | Create          | Integration-level assertions for tables/enums/index-critical assumptions                              | In: schema exports → Out: schema regression coverage                     | [ ] key tables asserted [ ] enum drift caught                                                     |
| `src/lib/env/index.test.ts`              | Create          | Environment parsing tests                                                                             | In: env schema → Out: validation safety coverage                         | [ ] missing vars fail [ ] malformed vars fail [ ] defaults tested                                 |

## Validation

- `pnpm drizzle-kit generate`
- `pnpm drizzle-kit migrate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/lib/env/index.test.ts src/lib/db/schema.test.ts`

Manual:

- [ ] local PostgreSQL starts
- [ ] local Redis starts
- [ ] migrations apply cleanly
- [ ] app and worker can import shared infra modules without runtime connection errors

## Exit Criteria

- DB schema is authoritative
- env validation is enforced
- queue payload contracts exist
- local infra is reproducible

---

# Phase 2 — Design System & Public App Shell

## Mission

Create the editorial-dispatch visual system, public shell, typography, global tokens, and shared UI primitives.

## Why this phase exists

Before feature UI is built, the system needs:

- visual language
- spacing rules
- shell structure
- reusable primitives

This prevents generic UI drift.

## Dependencies

- Phase 0
- Phase 1

## Out of scope

- auth
- data-driven feed rendering
- topic logic

## Deliverables

- root app layout
- public layout
- global CSS tokens
- font strategy
- shared UI primitives
- global loading/error surfaces

## Files to Create / Modify

| File                                          | Action | Responsibility / Features                                                | Interfaces In → Out                                                | File Checklist                                                                   |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `components.json`                             | Create | Shadcn config for component generation paths and aliases                 | In: repo structure → Out: consistent UI generation                 | [ ] aliases correct [ ] Tailwind path correct [ ] TS path alignment verified     |
| `src/app/layout.tsx`                          | Create | Root layout, font loading, metadata, global providers                    | In: fonts, globals, provider plan → Out: root HTML shell           | [ ] semantic HTML [ ] fonts loaded once [ ] providers minimal                    |
| `src/app/globals.css`                         | Create | Tailwind v4 entry, design tokens, typography, editorial-dispatch palette | In: design system spec → Out: global token layer                   | [ ] tokens named clearly [ ] no generic defaults [ ] reduced-motion respected    |
| `src/app/(public)/layout.tsx`                 | Create | Public-facing shell with header frame and content scaffolding            | In: shared components → Out: public route layout                   | [ ] shell supports feed/detail evolution [ ] sticky regions planned              |
| `src/app/(public)/loading.tsx`                | Create | Global loading shell for public routes                                   | In: `PageSkeleton` → Out: suspense fallback UI                     | [ ] graceful skeleton [ ] no layout jump                                         |
| `src/app/(public)/error.tsx`                  | Create | Error boundary UI for public routes                                      | In: React error boundary API → Out: recoverable public error state | [ ] retry action present [ ] accessible message                                  |
| `src/shared/components/ui/button.tsx`         | Create | Wrapped Shadcn button with project variants                              | In: Radix/Shadcn primitives → Out: `Button` component              | [ ] loading state ready [ ] disabled state refined [ ] variant names intentional |
| `src/shared/components/ui/card.tsx`           | Create | Wrapped surface primitive for editorial panels/cards                     | In: Shadcn base → Out: `Card` family                               | [ ] spacing consistent [ ] no generic card chrome                                |
| `src/shared/components/ui/badge.tsx`          | Create | Wrapped badge primitive                                                  | In: Shadcn base → Out: `Badge` component                           | [ ] semantic variants [ ] category use supported                                 |
| `src/shared/components/ui/toast.tsx`          | Create | Toast primitive for non-blocking feedback                                | In: Shadcn toast infra → Out: toast UI                             | [ ] error/success variants [ ] accessible announcements                          |
| `src/shared/components/DispatchBadge.tsx`     | Create | Category-tinted bespoke badge                                            | In: category tint token, badge primitive → Out: branded badge      | [ ] token-driven color [ ] small and large sizes                                 |
| `src/shared/components/TimeAgo.tsx`           | Create | Relative timestamp display with stable formatting fallback               | In: `Date` or ISO string → Out: formatted timestamp UI             | [ ] SSR-safe [ ] locale-aware enough [ ] accessible `title`                      |
| `src/shared/components/SourceAttribution.tsx` | Create | Source label + favicon/text hierarchy                                    | In: source name/url → Out: attribution UI                          | [ ] graceful missing favicon behavior [ ] accessible label                       |
| `src/shared/components/PageSkeleton.tsx`      | Create | Full-page skeleton scaffold for top-level loading states                 | In: layout shell constraints → Out: reusable skeleton              | [ ] desktop/mobile variants reasonable                                           |

## Validation

- `pnpm lint`
- `pnpm typecheck`

Manual:

- [ ] root shell renders without feature data
- [ ] fonts load correctly
- [ ] layout is visually coherent on mobile/tablet/desktop
- [ ] error/loading shells are not generic or broken
- [ ] all new primitives are reusable and token-driven

## Exit Criteria

- design system baseline exists
- shell is stable
- feature work can build on shared UI primitives without ad hoc styling

---

# Phase 3 — Authentication, Authorization & Protected Admin Shell

## Mission

Implement Better Auth, session handling, RBAC, DAL-based authorization, `proxy.ts`, and the protected admin shell.

## Why this phase exists

Admin operations must not be built on ad hoc auth.  
This phase establishes secure boundaries before source management or moderation exists.

## Dependencies

- Phase 0
- Phase 1
- Phase 2

## Out of scope

- source CRUD logic
- summary moderation logic
- job dashboards

## Deliverables

- Better Auth integration
- auth route handlers
- sign-in flow
- permissions matrix
- DAL
- admin shell and route protection

## Files to Create / Modify

| File                                          | Action | Responsibility / Features                                   | Interfaces In → Out                                                       | File Checklist                                                                        |
| --------------------------------------------- | ------ | ----------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/lib/auth/index.ts`                       | Create | Better Auth configuration and DB-backed session integration | In: DB adapter, env → Out: `auth` instance, inferred session/user types   | [ ] DB-backed sessions [ ] secure cookie options [ ] no JWT-only shortcut             |
| `src/lib/auth/permissions.ts`                 | Create | Central RBAC permissions matrix                             | In: role model → Out: roles, permissions, checker helpers                 | [ ] reader/admin coverage [ ] no permission duplication ambiguity                     |
| `src/lib/dal/index.ts`                        | Create | Cached session verification and permission enforcement      | In: auth session, permissions → Out: `verifySession`, `requirePermission` | [ ] no silent null auth [ ] memoized per request [ ] server-safe                      |
| `src/app/api/auth/[...all]/route.ts`          | Create | Better Auth route binding                                   | In: auth instance → Out: auth API endpoints                               | [ ] route exports correct methods [ ] no custom auth fork                             |
| `src/app/(public)/auth/signin/page.tsx`       | Create | Sign-in page shell                                          | In: auth feature UI → Out: public auth route                              | [ ] branded but minimal [ ] accessible form framing                                   |
| `src/features/auth/components/SignInForm.tsx` | Create | Controlled sign-in form with loading/error feedback         | In: auth API, button/toast → Out: sign-in interaction component           | [ ] disabled during submit [ ] inline error feedback [ ] no client leakage of secrets |
| `proxy.ts`                                    | Create | Network-boundary redirect behavior for protected areas      | In: request path/cookies → Out: redirect/next decision                    | [ ] UX-only assumption documented [ ] matcher excludes assets                         |
| `src/app/(admin)/layout.tsx`                  | Create | Protected admin layout with real auth enforcement           | In: DAL, admin shell components → Out: guarded admin route layout         | [ ] redirects unauthenticated users [ ] role guard enforced server-side               |
| `src/app/(admin)/page.tsx`                    | Create | Admin landing page shell                                    | In: admin layout → Out: dashboard placeholder/overview page               | [ ] meaningful placeholder [ ] not dead-end                                           |
| `src/app/(admin)/loading.tsx`                 | Create | Admin loading boundary                                      | In: skeletons → Out: admin suspense fallback                              | [ ] no auth-state confusion                                                           |
| `src/app/(admin)/error.tsx`                   | Create | Admin error boundary                                        | In: error handling contract → Out: recoverable admin error UI             | [ ] retry action [ ] no sensitive info leak                                           |
| `src/lib/auth/permissions.test.ts`            | Create | RBAC unit tests                                             | In: permission matrix → Out: regression coverage                          | [ ] expected grants asserted [ ] forbidden cases asserted                             |
| `src/lib/dal/index.test.ts`                   | Create | DAL auth enforcement tests                                  | In: session/permission helpers → Out: security regression coverage        | [ ] unauthenticated path fails [ ] wrong-role path fails                              |

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/lib/auth/permissions.test.ts src/lib/dal/index.test.ts`

Manual:

- [ ] unauthenticated access to `/admin` redirects
- [ ] authenticated non-admin user is blocked
- [ ] admin user can enter shell
- [ ] sign-in flow shows loading and error states correctly

## Exit Criteria

- auth is real, not stubbed
- admin shell is protected
- permission model is centralized
- future admin features have a safe foundation

---

# Phase 4 — Taxonomy, Topic Navigation & Category Read Paths

## Mission

Implement topic-first navigation, category/subcategory queries, counts, routes, and URL-driven taxonomy browsing.

## Why this phase exists

Topic-first browsing is the product’s central interaction model.  
This phase gives the app a real navigable information architecture.

## Dependencies

- Phase 1
- Phase 2
- Phase 3

## Out of scope

- ingestion
- live feed rendering from worker data
- summarization

## Deliverables

- categories API
- topic query layer
- top stories page shell
- category/subcategory routes
- topic ribbon and panel system

## Files to Create / Modify

| File                                                        | Action        | Responsibility / Features                                      | Interfaces In → Out                                              | File Checklist                                                                      |
| ----------------------------------------------------------- | ------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/features/topics/queries.ts`                            | Create        | Category and subcategory reads, counts, route-friendly lookups | In: DB schema → Out: topic query helpers                         | [ ] slug lookups supported [ ] counts included [ ] stable return shape              |
| `src/features/topics/components/TopicRibbon.tsx`            | Create        | Sticky topic navigation ribbon                                 | In: category list, router helpers → Out: interactive topic nav   | [ ] keyboard navigable [ ] active state clear [ ] mobile scroll behavior sound      |
| `src/features/topics/components/TopicPanel.tsx`             | Create        | Expandable topic panel showing subcategories and counts        | In: category detail → Out: subcategory panel UI                  | [ ] count rendering [ ] empty subcategory handling [ ] responsive layout            |
| `src/features/topics/components/SubcategoryCard.tsx`        | Create        | Subcategory tile with count and description                    | In: subcategory data → Out: reusable tile component              | [ ] count emphasis good [ ] hit area accessible                                     |
| `src/features/topics/components/TopicTransition.tsx`        | Create        | Route transition wrapper for topic changes                     | In: transition hook/router → Out: transition-enabled nav wrapper | [ ] reduced-motion respected [ ] no navigation race conditions                      |
| `src/app/api/categories/route.ts`                           | Create        | Public categories endpoint with counts                         | In: topic queries → Out: `GET /api/categories` JSON              | [ ] typed response [ ] stable field names [ ] no over-fetching                      |
| `src/app/(public)/page.tsx`                                 | Create/Modify | Top Stories landing route using taxonomy shell                 | In: topic queries/layout → Out: root public page                 | [ ] root route is useful before full feed lands                                     |
| `src/app/(public)/topics/[category]/page.tsx`               | Create        | Category route shell                                           | In: params, topic queries → Out: category page                   | [ ] invalid slug handling [ ] server-driven page                                    |
| `src/app/(public)/topics/[category]/[subcategory]/page.tsx` | Create        | Subcategory route shell                                        | In: params, topic queries → Out: subcategory page                | [ ] invalid nested slugs handled [ ] breadcrumb-ready structure                     |
| `src/features/topics/queries.test.ts`                       | Create        | Topic query tests                                              | In: topic queries → Out: taxonomy regression coverage            | [ ] slug resolution tested [ ] count shape tested [ ] missing category case covered |

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/features/topics/queries.test.ts`

Manual:

- [ ] `/` renders topic shell
- [ ] `/topics/[category]` works
- [ ] `/topics/[category]/[subcategory]` works
- [ ] ribbon highlights current topic
- [ ] counts render correctly
- [ ] empty/missing taxonomy states are handled

## Exit Criteria

- topic navigation is real
- taxonomy queries are stable
- category URLs are authoritative and usable

---

# Phase 5 — Ingestion Worker MVP & Ranking Foundation

## Mission

Build the worker runtime, source scheduling, ingestion jobs, normalization, deduplication, persistence, source health tracking, and importance scoring.

## Why this phase exists

OneStopNews is not a static content app.  
This phase creates the content supply chain.

## Dependencies

- Phase 1
- Phase 3
- Phase 4

## Out of scope

- UI rendering of live feeds
- article detail UI
- AI summarization

## Deliverables

- worker bootstrap
- BullMQ queues
- scheduler registration
- ingestion worker
- score worker
- domain normalization/deduplication logic
- source health snapshots
- ingestion job records

## Files to Create / Modify

| File                                      | Action | Responsibility / Features                               | Interfaces In → Out                                                              | File Checklist                                                         |
| ----------------------------------------- | ------ | ------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `worker/src/index.ts`                     | Create | Worker service entrypoint and graceful shutdown         | In: schedulers/workers → Out: worker process lifecycle                           | [ ] workers boot once [ ] clean shutdown on SIGTERM/SIGINT             |
| `worker/src/queues/index.ts`              | Create | BullMQ queue definitions and queue-level defaults       | In: queue connection, job types → Out: ingest/score queue objects                | [ ] retries set [ ] cleanup policy intentional [ ] priorities exposed  |
| `worker/src/schedulers/index.ts`          | Create | Source-driven job scheduler bootstrap                   | In: sources table, ingest queue → Out: repeatable scheduler registration         | [ ] idempotent upsert logic [ ] inactive sources skipped               |
| `worker/src/workers/ingest.worker.ts`     | Create | BullMQ ingestion worker with concurrency settings       | In: ingest queue, ingest job handler → Out: job processing runtime               | [ ] concurrency justified [ ] errors bubble correctly                  |
| `worker/src/workers/score.worker.ts`      | Create | Importance scoring worker                               | In: score queue, ranking logic → Out: score updates                              | [ ] isolated from ingest concerns [ ] retry-safe                       |
| `worker/src/jobs/ingest/index.ts`         | Create | Main ingestion orchestration per source                 | In: fetch/parse/normalize/persist helpers → Out: persisted article batch results | [ ] records job status [ ] updates health [ ] rethrows failures        |
| `worker/src/jobs/ingest/fetch.ts`         | Create | Safe feed fetching with timeout/retry semantics         | In: source feed URL → Out: raw feed payload                                      | [ ] timeout enforced [ ] user agent set [ ] transient failure surfaced |
| `worker/src/jobs/ingest/parse.ts`         | Create | RSS/Atom/API parsing into normalized candidate input    | In: raw feed → Out: source-agnostic item list                                    | [ ] malformed feed handling [ ] per-feed-type branching explicit       |
| `worker/src/jobs/ingest/persist.ts`       | Create | Idempotent article upsert persistence                   | In: normalized candidates → Out: created/updated article records                 | [ ] `onConflictDoUpdate` used [ ] no duplicate writes                  |
| `worker/src/jobs/ingest/health.ts`        | Create | Source health and ingestion snapshot updates            | In: job outcomes → Out: health snapshots/job metrics                             | [ ] success/failure counters accurate [ ] timestamps correct           |
| `worker/src/jobs/score/compute.ts`        | Create | Score job wrapper around ranking domain logic           | In: article data → Out: persisted importance score                               | [ ] read/write minimal [ ] score formula isolated                      |
| `src/domain/articles/types.ts`            | Create | Shared article candidate/domain interfaces              | In: schema + ingestion needs → Out: shared TS contracts                          | [ ] no duplicated shapes across worker/web                             |
| `src/domain/articles/normalize.ts`        | Create | Canonical URL normalization and candidate normalization | In: source item data → Out: normalized article candidates                        | [ ] tracking params stripped [ ] canonicalization deterministic        |
| `src/domain/articles/deduplicate.ts`      | Create | Deduplication grouping and content hash helpers         | In: normalized candidates, DB state → Out: new vs existing article separation    | [ ] hashing deterministic [ ] retries safe                             |
| `src/domain/ranking/importance.ts`        | Create | Importance score formula                                | In: recency/source/cluster/category inputs → Out: numeric score                  | [ ] coefficients explicit [ ] unit-testable pure function              |
| `src/domain/articles/normalize.test.ts`   | Create | Normalization tests                                     | In: normalization logic → Out: regression coverage                               | [ ] canonical URL cases covered [ ] tracking params stripped           |
| `src/domain/articles/deduplicate.test.ts` | Create | Dedup tests                                             | In: hash/dedup logic → Out: duplicate regression coverage                        | [ ] duplicate/near-duplicate cases covered                             |
| `src/domain/ranking/importance.test.ts`   | Create | Ranking formula tests                                   | In: importance logic → Out: score regression coverage                            | [ ] recency decay tested [ ] source weighting tested                   |

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/domain/articles/normalize.test.ts src/domain/articles/deduplicate.test.ts src/domain/ranking/importance.test.ts`
- worker-specific tests if split: `pnpm --filter worker test`

Manual:

- [ ] worker boots with Redis/Postgres available
- [ ] schedulers register once
- [ ] sample source ingests successfully
- [ ] duplicate article does not create duplicate rows
- [ ] source health updates correctly
- [ ] score worker updates `importanceScore`

## Exit Criteria

- ingestion pipeline is functional
- content enters the database safely
- ranking baseline exists
- source health is measurable

---

# Phase 6 — Feed Query APIs & Topic Feed UI

## Mission

Build the main reading experience: feed queries, feed API, lead story, article grid, controls, and route integration.

## Why this phase exists

Now that content exists, the product must become readable.

## Dependencies

- Phase 4
- Phase 5

## Out of scope

- article detail view
- AI summaries
- advanced search

## Deliverables

- article feed query layer
- feed API endpoint
- route-level feed rendering
- lead story + grid UI
- latest/impact/summary-ready sort controls
- proper loading/error/empty states

## Files to Create / Modify

| File                                                        | Action | Responsibility / Features                 | Interfaces In → Out                                                       | File Checklist                                                                   |
| ----------------------------------------------------------- | ------ | ----------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/features/feed/queries.ts`                              | Create | Feed reads by category/subcategory/sort   | In: DB, ranking fields, taxonomy → Out: typed feed query helpers          | [ ] latest sort [ ] impact sort [ ] summary-ready sort [ ] pagination-ready      |
| `src/features/feed/actions.ts`                              | Create | Preference mutations for feed state       | In: DAL, user prefs → Out: server actions for favorite/default topic/sort | [ ] auth-aware [ ] safe defaults [ ] no client trust                             |
| `src/features/feed/components/FeedContainer.tsx`            | Create | Orchestrates lead + grid layout           | In: feed query results → Out: composed feed UI                            | [ ] handles empty/success/loading composition                                    |
| `src/features/feed/components/LeadArticle.tsx`              | Create | Large lead story presentation             | In: top-ranked article → Out: lead card component                         | [ ] metadata hierarchy strong [ ] source/timestamp visible                       |
| `src/features/feed/components/ArticleCard.tsx`              | Create | Standard article card                     | In: article record → Out: reusable feed card                              | [ ] semantic article markup [ ] click target clear [ ] no redundant client state |
| `src/features/feed/components/ArticleCardSkeleton.tsx`      | Create | Feed card loading placeholder             | In: layout constraints → Out: suspense-ready skeleton                     | [ ] shape mirrors real card                                                      |
| `src/features/feed/components/FeedGrid.tsx`                 | Create | Responsive dense grid of non-lead stories | In: article list → Out: grid layout                                       | [ ] empty state fallback [ ] responsive columns                                  |
| `src/features/feed/components/FeedControls.tsx`             | Create | Sort/filter controls UI                   | In: current route/search params → Out: updated control state/navigation   | [ ] async transitions safe [ ] accessible labels [ ] mobile friendly             |
| `src/features/feed/components/EmptyFeed.tsx`                | Create | Editorial empty state                     | In: selected topic/filter context → Out: empty feed UI                    | [ ] actionable next step [ ] not generic                                         |
| `src/features/feed/components/FeedErrorBoundary.tsx`        | Create | Feed-local error UI                       | In: boundary error state → Out: recoverable feed error                    | [ ] retry option [ ] no leaked internals                                         |
| `src/app/api/articles/route.ts`                             | Create | Feed endpoint with filters/sorts          | In: search params, feed queries → Out: `GET /api/articles` JSON           | [ ] typed response [ ] input validation [ ] stable query contract                |
| `src/app/(public)/page.tsx`                                 | Modify | Wire Top Stories route to live feed data  | In: feed queries/components → Out: root page with feed                    | [ ] live data replaces placeholder                                               |
| `src/app/(public)/topics/[category]/page.tsx`               | Modify | Category page uses feed query layer       | In: route params → Out: live category feed page                           | [ ] invalid category remains safe                                                |
| `src/app/(public)/topics/[category]/[subcategory]/page.tsx` | Modify | Subcategory page uses feed query layer    | In: route params → Out: live subcategory feed page                        | [ ] subcategory filtering accurate                                               |
| `src/features/feed/queries.test.ts`                         | Create | Feed query tests                          | In: feed queries → Out: regression coverage                               | [ ] sort behavior tested [ ] filter behavior tested [ ] empty path covered       |

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/features/feed/queries.test.ts`

Manual:

- [ ] `/` shows live feed
- [ ] category and subcategory pages show scoped feeds
- [ ] latest/impact/summary-ready sorting works
- [ ] lead story is distinct from card grid
- [ ] empty/error/loading states render correctly

## Exit Criteria

- public feed experience is usable
- API and UI use the same data model
- feed routes are production-shaped

---

# Phase 7 — Article Detail & AI Summarization Loop

## Mission

Implement article detail pages, summary request flow, summary job queueing, worker summarization, parsing/storage, and disclosure-first summary UI.

## Why this phase exists

This is the core differentiator after the topic feed:  
**news reading with trustworthy AI assistance**.

## Dependencies

- Phase 5
- Phase 6

## Out of scope

- search
- admin moderation dashboards
- feed slice caching

## Deliverables

- article detail route
- article detail API
- summarize endpoint and status endpoint
- AI client wrapper
- prompt/parser contracts
- summary worker
- source-cited summary UI

## Files to Create / Modify

| File                                                      | Action | Responsibility / Features                                   | Interfaces In → Out                                                         | File Checklist                                                                         |
| --------------------------------------------------------- | ------ | ----------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/features/article/queries.ts`                         | Create | Article detail and summary reads                            | In: DB schema → Out: article detail query helpers                           | [ ] article + source + summary joins [ ] not-found handling                            |
| `src/features/article/actions.ts`                         | Create | Summary flagging/report actions                             | In: DAL, article/summaries → Out: server actions for user/admin reporting   | [ ] permission checks [ ] structured errors                                            |
| `src/features/article/components/ArticleDetail.tsx`       | Create | Main article detail panel                                   | In: article detail data → Out: detail UI composition                        | [ ] metadata + actions + content zones clear                                           |
| `src/features/article/components/ArticleMetadata.tsx`     | Create | Source/category/time metadata block                         | In: article detail fields → Out: metadata subcomponent                      | [ ] source transparency explicit                                                       |
| `src/features/article/components/SummaryPanel.tsx`        | Create | AI summary presentation with citations and disclosure       | In: summary record → Out: summary UI                                        | [ ] disclosure always visible [ ] citations shown [ ] original-source action prominent |
| `src/features/article/components/CitationList.tsx`        | Create | Render cited sources                                        | In: `sourcesCited[]` → Out: citation UI                                     | [ ] empty citations handled [ ] accessible list semantics                              |
| `src/features/article/components/DisclosureBadge.tsx`     | Create | AI provenance indicator                                     | In: model/date/status → Out: disclosure badge                               | [ ] clear wording [ ] not visually buried                                              |
| `src/features/article/components/SummarizeButton.tsx`     | Create | Trigger summary job                                         | In: article ID/status → Out: summary enqueue interaction                    | [ ] disabled during request [ ] duplicate-click safe                                   |
| `src/features/article/components/SummaryStatusPoller.tsx` | Create | Poll summary status and reveal summary without layout shift | In: article ID/current status → Out: polling-driven UI state                | [ ] polling stop condition [ ] failure state handled                                   |
| `src/app/(public)/article/[id]/page.tsx`                  | Create | Standalone article detail route                             | In: article queries/components → Out: article page                          | [ ] invalid ID safe [ ] detail view deep-linkable                                      |
| `src/app/api/articles/[id]/route.ts`                      | Create | Public single-article endpoint                              | In: article queries → Out: `GET /api/articles/[id]` JSON                    | [ ] typed response [ ] not-found contract                                              |
| `src/app/api/summarize/[id]/route.ts`                     | Create | Summary request enqueue endpoint                            | In: DAL, queue, article checks → Out: `POST /api/summarize/[id]` response   | [ ] permission/rate-limit hooks ready [ ] existing summary short-circuit               |
| `src/app/api/summarize/[id]/status/route.ts`              | Create | Summary status polling endpoint                             | In: summary/job status → Out: `GET` status JSON                             | [ ] pending/ok/failed states explicit                                                  |
| `src/lib/ai/index.ts`                                     | Create | Provider-agnostic AI client wrapper                         | In: model config, API keys → Out: completion interface                      | [ ] Anthropic primary [ ] OpenAI fallback [ ] token usage returned                     |
| `src/lib/ai/models.ts`                                    | Create | Model selection and token budget config                     | In: pricing/limits strategy → Out: model constants/helpers                  | [ ] max token budgets defined [ ] cost estimate helper present                         |
| `src/domain/summaries/prompt.ts`                          | Create | Summary prompt builder                                      | In: article content/source info → Out: prompt string                        | [ ] fidelity-over-brevity [ ] citation extraction requested [ ] no opinion language    |
| `src/domain/summaries/parse.ts`                           | Create | Zod response parsing for model output                       | In: raw model output → Out: structured summary payload                      | [ ] invalid JSON rejected [ ] schema validation strict                                 |
| `src/domain/summaries/types.ts`                           | Create | Shared summary domain interfaces                            | In: summary model needs → Out: reusable contracts                           | [ ] web/worker share same shape                                                        |
| `worker/src/workers/summarize.worker.ts`                  | Create | BullMQ summarization worker                                 | In: summarize queue, summarize job handler → Out: AI summary job processing | [ ] concurrency conservative [ ] retries sane                                          |
| `worker/src/jobs/summarize/index.ts`                      | Create | Summary orchestration job                                   | In: extract/AI/parse/store → Out: persisted summary flow                    | [ ] updates article status transitions correctly                                       |
| `worker/src/jobs/summarize/extract.ts`                    | Create | Content retrieval and extraction logic                      | In: article URL/source policy → Out: text for summarization                 | [ ] partial-content fallback handled [ ] paywall failure non-fatal                     |
| `worker/src/jobs/summarize/store.ts`                      | Create | Summary persistence helper                                  | In: parsed summary payload → Out: summary row + article state update        | [ ] transactional enough [ ] idempotent update behavior                                |
| `src/domain/summaries/parse.test.ts`                      | Create | Summary parse tests                                         | In: parser/schema → Out: malformed-output regression coverage               | [ ] invalid JSON fails [ ] missing fields fail [ ] valid response passes               |
| `worker/src/jobs/summarize/index.test.ts`                 | Create | Summarization job tests                                     | In: summarize pipeline → Out: worker regression coverage                    | [ ] existing summary short-circuit [ ] failure path tested                             |

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/domain/summaries/parse.test.ts`
- worker summarize tests

Manual:

- [ ] article detail route renders
- [ ] summarize button enqueues once
- [ ] polling transitions from pending to success
- [ ] summary disclosure is always visible
- [ ] citations render
- [ ] failed summaries surface user-safe errors

## Exit Criteria

- article detail experience is complete
- AI summarization loop works end-to-end
- trust/disclosure requirements are visible in UI
- summary storage is structured and auditable

---

# Phase 8 — Search & Filtering System

## Mission

Implement keyword search, autocomplete, filtering, search route, and feed/search interoperability.

## Why this phase exists

Once the feed and detail experiences are real, search becomes the second major discovery surface.

## Dependencies

- Phase 1
- Phase 6
- Phase 7

## Out of scope

- BM25 extension rollout if hosting support is unresolved
- semantic search

## Deliverables

- search query layer
- search page
- debounced search input
- autocomplete
- filter controls
- feed API search support

## Files to Create / Modify

| File                                                    | Action | Responsibility / Features                        | Interfaces In → Out                                          | File Checklist                                                                               |
| ------------------------------------------------------- | ------ | ------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `src/shared/hooks/useDebounce.ts`                       | Create | Debounce utility for search input                | In: value/delay → Out: debounced value                       | [ ] generic but not over-abstracted [ ] cleanup works                                        |
| `src/features/search/queries.ts`                        | Create | PostgreSQL FTS and autocomplete queries          | In: DB, search params → Out: search helpers                  | [ ] FTS query safe [ ] cursor pagination supported [ ] autocomplete query bounded            |
| `src/features/search/components/SearchInput.tsx`        | Create | Search entry field with debounced updates        | In: current query/router state → Out: search interaction UI  | [ ] keyboard accessible [ ] loading state subtle [ ] clear action supported                  |
| `src/features/search/components/SearchResults.tsx`      | Create | Search result rendering                          | In: search results → Out: result list UI                     | [ ] empty state wiring [ ] article detail links consistent                                   |
| `src/features/search/components/SearchFilters.tsx`      | Create | Category/time/summary filters                    | In: filter state → Out: filter interaction UI                | [ ] URL-synced [ ] mobile-safe                                                               |
| `src/features/search/components/SearchEmpty.tsx`        | Create | No-results state                                 | In: query/filter context → Out: search empty UI              | [ ] suggestions offered [ ] tone non-generic                                                 |
| `src/features/search/components/SearchAutocomplete.tsx` | Create | Lightweight autocomplete suggestions list        | In: partial query, autocomplete results → Out: suggestion UI | [ ] keyboard navigation [ ] no oversized client complexity                                   |
| `src/app/(public)/search/page.tsx`                      | Create | Search route and page composition                | In: search queries/components → Out: `/search` page          | [ ] URL-driven search state [ ] deep-linkable                                                |
| `src/app/api/articles/route.ts`                         | Modify | Extend feed endpoint with search/filter handling | In: feed + search params → Out: unified articles API         | [ ] no ambiguous precedence between search and feed params                                   |
| `src/features/feed/components/FeedControls.tsx`         | Modify | Integrate search/filter navigation entry points  | In: control state → Out: feed/search navigation affordances  | [ ] search handoff coherent                                                                  |
| `src/features/search/queries.test.ts`                   | Create | Search query tests                               | In: search query helpers → Out: search regression coverage   | [ ] FTS result ordering tested [ ] filter combinations tested [ ] no-results behavior tested |

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/features/search/queries.test.ts`

Manual:

- [ ] `/search` works with URL params
- [ ] search results render from keyword queries
- [ ] category/time filters update results
- [ ] autocomplete suggestions appear and behave correctly
- [ ] zero-result search shows intentional empty state

## Exit Criteria

- keyword search is usable
- filters are URL-addressable
- search integrates cleanly with existing feed architecture

---

# Phase 9 — Admin Operations, Source Management & Summary Moderation

## Mission

Build the internal tooling needed to operate the platform safely: source CRUD, source health visibility, queue visibility, and summary review workflows.

## Why this phase exists

A news platform without internal operations tooling becomes fragile immediately.

## Dependencies

- Phase 3
- Phase 5
- Phase 7

## Out of scope

- enterprise multi-tenant admin
- deep analytics warehouse

## Deliverables

- source management screens
- admin queries/actions
- source health endpoint
- BullMQ monitor embed
- summary moderation queue
- metrics dashboard baseline

## Files to Create / Modify

| File                                                  | Action | Responsibility / Features                               | Interfaces In → Out                                            | File Checklist                                                                     |
| ----------------------------------------------------- | ------ | ------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/features/admin/queries.ts`                       | Create | Admin read models for sources, jobs, summaries, metrics | In: DB schema → Out: admin query helpers                       | [ ] read models optimized for admin screens [ ] no UI-specific DB leakage          |
| `src/features/admin/actions.ts`                       | Create | Source CRUD, source toggle, summary moderation actions  | In: DAL, DB, queue → Out: secure server actions                | [ ] permission-gated [ ] validated inputs [ ] mutation errors surfaced cleanly     |
| `src/features/admin/components/SourceForm.tsx`        | Create | Create/edit source form                                 | In: source schema, actions → Out: source form UI               | [ ] validation feedback [ ] loading/disabled states [ ] edit/create mode supported |
| `src/features/admin/components/SourceTable.tsx`       | Create | Sources table with status and controls                  | In: source list → Out: table UI                                | [ ] enabled/disabled clear [ ] poll interval visible                               |
| `src/features/admin/components/JobMonitor.tsx`        | Create | Admin UI wrapper for queue/job visibility               | In: Bull Board or queue health data → Out: monitoring panel UI | [ ] auth-safe embed/wrapper [ ] failure states handled                             |
| `src/features/admin/components/SummaryAuditTable.tsx` | Create | Summary review queue UI                                 | In: flagged/pending summaries → Out: moderation UI             | [ ] review state visible [ ] regenerate/disable actions available                  |
| `src/features/admin/components/MetricsDashboard.tsx`  | Create | Overview metrics surface                                | In: admin metrics query results → Out: summary dashboard UI    | [ ] ingestion/API/summary metrics separated clearly                                |
| `src/app/(admin)/sources/page.tsx`                    | Create | Source list page                                        | In: admin queries/components → Out: sources admin route        | [ ] source table loaded server-side                                                |
| `src/app/(admin)/sources/new/page.tsx`                | Create | New source page                                         | In: source form → Out: source creation route                   | [ ] happy/error path clear                                                         |
| `src/app/(admin)/sources/[id]/page.tsx`               | Create | Edit source page                                        | In: source queries/form → Out: source edit route               | [ ] missing source handled                                                         |
| `src/app/(admin)/jobs/page.tsx`                       | Create | Jobs monitoring page                                    | In: job monitor component → Out: queue monitoring route        | [ ] restricted to admins                                                           |
| `src/app/(admin)/summaries/page.tsx`                  | Create | Summary moderation page                                 | In: audit queries/table → Out: moderation route                | [ ] filtering by status/category supported                                         |
| `src/app/api/source-health/route.ts`                  | Create | Source health endpoint                                  | In: admin queries → Out: health JSON API                       | [ ] admin permission enforced [ ] snapshot response typed                          |
| `worker/src/monitoring/bull-board.ts`                 | Create | Bull Board setup for worker queues                      | In: queue instances → Out: monitoring server/module            | [ ] auth protection strategy defined [ ] no public exposure                        |
| `src/features/admin/actions.test.ts`                  | Create | Admin action tests                                      | In: admin actions → Out: mutation/security regression coverage | [ ] unauthorized cases fail [ ] valid CRUD passes                                  |

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/features/admin/actions.test.ts`

Manual:

- [ ] source list loads
- [ ] source create/edit works
- [ ] source enable/disable works
- [ ] health endpoint responds for admins only
- [ ] BullMQ monitor is reachable only through protected admin path
- [ ] summary moderation actions work

## Exit Criteria

- operations team can manage sources
- queue state is visible
- summary governance is operational

---

# Phase 10 — Caching, Performance & Feed Slice Optimization

## Mission

Implement Redis feed slices, cache profiles, invalidation logic, and route-level performance tuning.

## Why this phase exists

Optimization belongs after correctness.  
This phase hardens the system for real read-heavy usage.

## Dependencies

- Phase 5
- Phase 6
- Phase 8
- Phase 9

## Out of scope

- semantic search acceleration
- CDN edge personalization

## Deliverables

- cache profiles
- cache invalidation helpers
- Redis feed slice read/write logic
- feed slice worker
- feed query cache-first behavior
- topic transition refinement

## Files to Create / Modify

| File                                                        | Action | Responsibility / Features                                   | Interfaces In → Out                                               | File Checklist                                                              |
| ----------------------------------------------------------- | ------ | ----------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/lib/cache/profiles.ts`                                 | Create | Shared cache life profiles                                  | In: PAD cache strategy → Out: named cache configs                 | [ ] profile names descriptive [ ] not scattered in route files              |
| `src/lib/cache/invalidation.ts`                             | Create | Tag naming and invalidation helpers                         | In: Next cache APIs → Out: tag helpers                            | [ ] category/article/feed tag conventions consistent                        |
| `src/lib/redis/feed-slices.ts`                              | Create | Redis feed slice storage and retrieval                      | In: redis client, feed identifiers → Out: feed slice helpers      | [ ] key schema stable [ ] TTL intentional [ ] parse failures handled        |
| `worker/src/workers/feed-slice.worker.ts`                   | Create | Worker for feed slice refresh jobs                          | In: feed slice queue → Out: cached feed slices                    | [ ] hot categories supported [ ] retries small and safe                     |
| `worker/src/jobs/feed-slice/index.ts`                       | Create | Compute and write ordered feed slices                       | In: article rankings → Out: Redis feed slice state                | [ ] latest/impact variants supported                                        |
| `worker/src/jobs/ingest/persist.ts`                         | Modify | Trigger downstream cache refresh jobs after article changes | In: persisted articles → Out: queue fan-out updates               | [ ] no duplicate refresh storm [ ] category/subcategory scope accurate      |
| `worker/src/queues/index.ts`                                | Modify | Add feed-slice refresh queue                                | In: queue connection → Out: new queue export                      | [ ] default cleanup sensible                                                |
| `src/features/feed/queries.ts`                              | Modify | Prefer Redis feed slices for hot reads, fallback to DB      | In: feed slice helper, DB → Out: optimized feed query behavior    | [ ] cache miss fallback safe [ ] hydration query bounded                    |
| `src/app/(public)/page.tsx`                                 | Modify | Apply route-level cache composition for top feed            | In: cache profiles, feed components → Out: optimized top route    | [ ] shell vs live data split clear                                          |
| `src/app/(public)/topics/[category]/page.tsx`               | Modify | Apply category route caching                                | In: cache profiles → Out: optimized category route                | [ ] correct freshness trade-off                                             |
| `src/app/(public)/topics/[category]/[subcategory]/page.tsx` | Modify | Apply subcategory route caching                             | In: cache profiles → Out: optimized subcategory route             | [ ] no stale route assumptions                                              |
| `src/shared/hooks/useViewTransition.ts`                     | Create | Topic navigation transition helper                          | In: browser transition API/router → Out: reusable transition hook | [ ] reduced-motion respected [ ] safe fallback path                         |
| `src/features/topics/components/TopicTransition.tsx`        | Modify | Use transition helper for topic navigation                  | In: transition hook → Out: improved UX                            | [ ] no blocking UI state                                                    |
| `src/lib/redis/feed-slices.test.ts`                         | Create | Feed slice cache tests                                      | In: feed slice helpers → Out: cache regression coverage           | [ ] key schema tested [ ] serialization tested [ ] miss/hit behavior tested |

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/lib/redis/feed-slices.test.ts`

Manual:

- [ ] hot feed reads hit Redis
- [ ] cold reads fall back to DB cleanly
- [ ] category updates invalidate affected caches
- [ ] route transitions feel faster without confusing motion
- [ ] no stale article detail summary state from route caching

## Exit Criteria

- read path is measurably optimized
- cache invalidation is explicit
- feed slices are functioning and refreshable

---

# Phase 11 — Observability, Security Hardening, QA, Seeding & Launch Readiness

## Mission

Complete production hardening: structured logs, rate limiting, smoke tests, e2e coverage, seed scripts, CI, and launch verification.

## Why this phase exists

This phase turns a working system into a releasable system.

## Dependencies

- All previous phases complete

## Out of scope

- post-launch feature iteration
- analytics warehouse
- phase 2 enterprise add-ons

## Deliverables

- structured logging
- rate limiting
- monitoring metrics scaffolding
- seed scripts
- smoke test script
- e2e harness
- CI workflow
- docs refresh

## Files to Create / Modify

| File                                  | Action | Responsibility / Features                        | Interfaces In → Out                                                       | File Checklist                                                                    |
| ------------------------------------- | ------ | ------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/lib/logger/index.ts`             | Create | Structured logger for app and shared use         | In: runtime metadata → Out: typed log writer helpers                      | [ ] JSON logs [ ] correlation ID support [ ] no sensitive data                    |
| `src/lib/rate-limit/index.ts`         | Create | Reusable route-level rate limit helpers          | In: Redis or in-memory strategy → Out: route guard helpers                | [ ] summarize endpoint limit supported [ ] auth/admin routes optional hooks ready |
| `src/app/api/summarize/[id]/route.ts` | Modify | Add rate limiting and structured logging         | In: logger, rate limit → Out: hardened summarize endpoint                 | [ ] limit exceeded response typed [ ] logs emitted                                |
| `src/app/api/auth/[...all]/route.ts`  | Modify | Add auth event logging hooks if appropriate      | In: logger/auth events → Out: harder-to-debug auth events become visible  | [ ] no secret leakage                                                             |
| `src/features/admin/actions.ts`       | Modify | Add audit logging for privileged actions         | In: logger, admin actions → Out: auditable admin mutations                | [ ] source changes logged [ ] summary moderation logged                           |
| `worker/src/monitoring/metrics.ts`    | Create | Worker metrics aggregation helpers               | In: queue/job outcomes → Out: metrics hooks/emitters                      | [ ] ingest/summarize/queue depth metrics represented                              |
| `scripts/seed-categories.ts`          | Create | Seed core categories and subcategories           | In: schema, canonical taxonomy data → Out: deterministic seed script      | [ ] idempotent seed behavior [ ] slug stability                                   |
| `scripts/seed-sources.ts`             | Create | Seed baseline news sources                       | In: taxonomy IDs, source defaults → Out: deterministic source seed script | [ ] idempotent [ ] feed URLs validated where possible                             |
| `scripts/smoke-test.ts`               | Create | Programmatic smoke checks for key flows          | In: app URLs/APIs → Out: pass/fail smoke result                           | [ ] categories endpoint check [ ] feed endpoint check [ ] summary path check      |
| `playwright.config.ts`                | Create | E2E runner config                                | In: app base URL/test strategy → Out: browser test config                 | [ ] stable retries [ ] base URL env-driven                                        |
| `tests/e2e/feed.spec.ts`              | Create | End-to-end feed journey                          | In: app UI → Out: feed E2E coverage                                       | [ ] top stories loads [ ] topic navigation works [ ] article link works           |
| `tests/e2e/admin.spec.ts`             | Create | End-to-end admin journey                         | In: auth/admin UI → Out: admin E2E coverage                               | [ ] sign-in works [ ] source page loads [ ] moderation route reachable            |
| `.github/workflows/ci.yml`            | Create | CI pipeline for lint/typecheck/test/e2e gates    | In: repo scripts → Out: automated quality enforcement                     | [ ] root + worker included [ ] migrations/test DB steps defined                   |
| `README.md`                           | Modify | Finalized setup, ops, and execution instructions | In: all completed phases → Out: reliable project handbook                 | [ ] setup fresh [ ] scripts up to date [ ] seeding documented                     |
| `src/lib/logger/index.test.ts`        | Create | Logging helper tests                             | In: logger module → Out: log structure regression coverage                | [ ] shape stable [ ] sensitive fields excluded                                    |
| `src/lib/rate-limit/index.test.ts`    | Create | Rate limit tests                                 | In: rate limit helpers → Out: abuse-protection regression coverage        | [ ] threshold behavior tested [ ] reset behavior tested                           |

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`

Manual:

- [ ] seed scripts run cleanly on empty DB
- [ ] smoke test passes
- [ ] CI config matches local commands
- [ ] logs are structured and readable
- [ ] summarize endpoint rate limit works
- [ ] release checklist can be executed without ambiguity

## Exit Criteria

- codebase is launch-ready
- operational docs are current
- critical user and admin paths have automated coverage
- seed/bootstrap flow is deterministic

---

## 7. Cross-Phase Command Matrix

Use the project’s existing package manager if already standardized.  
For planning, assume `pnpm`.

### 7.1 Setup commands

```bash
pnpm install
pnpm --filter worker install
```

### 7.2 Database commands

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 7.3 Quality commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm --filter worker test
pnpm --filter worker typecheck
```

### 7.4 Seed / smoke commands

```bash
pnpm tsx scripts/seed-categories.ts
pnpm tsx scripts/seed-sources.ts
pnpm tsx scripts/smoke-test.ts
```

---

## 8. Phase Exit Gate Template

Every phase must be checked against the same closure model.

### 8.1 Required checks

- [ ] scope completed
- [ ] all listed files created/modified as planned
- [ ] file-level checklists satisfied
- [ ] lint passes
- [ ] typecheck passes
- [ ] tests pass
- [ ] manual verification performed
- [ ] docs updated if setup/ops changed

### 8.2 Failure rule

If any exit criterion fails:

- do not mark phase complete
- do not start the next phase
- resolve the failure in-phase
- avoid “we’ll clean it up later” debt

---

## 9. Final Integration Milestones

### Milestone A — Architecture Skeleton Complete

Reached after Phase 3.

Criteria:

- workspace stable
- infra stable
- design system exists
- auth exists

### Milestone B — Core Product Loop Complete

Reached after Phase 7.

Criteria:

- ingestion works
- feed works
- article detail works
- summary loop works

### Milestone C — Operational Product Complete

Reached after Phase 9.

Criteria:

- admin tools usable
- moderation possible
- source operations possible

### Milestone D — Launch Candidate

Reached after Phase 11.

Criteria:

- caching/perf in place
- observability in place
- seed scripts work
- smoke/e2e pass
- docs current

---

## 10. Master File Index by Phase

This index is the quick-glance map of ownership.

| Phase    | Primary Areas                                      |
| -------- | -------------------------------------------------- |
| Phase 0  | repo config, scripts, TS, lint, workspace          |
| Phase 1  | env, DB, migrations, Redis, queues, infra          |
| Phase 2  | layouts, globals, design system, shared UI         |
| Phase 3  | auth, DAL, permissions, admin shell, proxy         |
| Phase 4  | taxonomy queries, topic routes, topic UI           |
| Phase 5  | worker core, schedulers, ingestion, ranking        |
| Phase 6  | feed queries, feed API, feed UI                    |
| Phase 7  | article detail, summary API, AI worker, summary UI |
| Phase 8  | search queries, search UI, autocomplete            |
| Phase 9  | source CRUD, moderation, health, Bull Board        |
| Phase 10 | cache profiles, feed slices, route optimization    |
| Phase 11 | logging, rate limit, seed scripts, CI, e2e         |

---

## 11. Implementation Notes and Guardrails

### 11.1 Do not over-abstract early

Bad:

- building a generic “content engine”
- making every query infinitely configurable
- creating a plugin system before real need

Good:

- one clear query helper per product need
- one clear component per UI responsibility
- one queue per job class

### 11.2 Keep file ownership sharp

Every file should answer:

- what do I own?
- what do I depend on?
- what do I export?
- why do I exist?

If a file cannot answer that clearly, split or simplify it.

### 11.3 Preserve the PAD boundaries

- domain logic stays framework-free
- worker does background processing only
- web app produces jobs, not consumes them
- DAL enforces auth, not the UI
- UI components do not embed business logic that belongs in queries or domain modules

### 11.4 Anti-generic enforcement

At UI implementation time:

- avoid generic dashboard chrome
- avoid random card clutter
- keep typography intentional
- use whitespace structurally
- expose source provenance clearly
- emphasize reading over ornament

---

## 12. Definition of Done for the Entire Project

The project is complete when:

- content ingestion runs reliably
- topic-first feed browsing works on desktop and mobile
- article detail works
- AI summaries can be requested and displayed with disclosure and citations
- search works
- admin source management works
- moderation works
- caching improves real read paths
- logs and rate limits exist
- seeding works
- CI passes
- smoke/e2e tests pass
- docs are current enough for a new senior engineer to run the system

---

## 13. Recommended First Build Sequence for the Actual Implementation Session

When execution begins, the recommended immediate order is:

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Stop and verify architecture shell
6. Phase 4
7. Phase 5
8. Stop and verify content flow
9. Phase 6
10. Phase 7
11. Stop and verify user core loop
12. Phase 8
13. Phase 9
14. Phase 10
15. Phase 11
16. Final release review

---

## 14. Change Management Rule

If implementation reveals a major mismatch between the PAD and code reality:

1. stop
2. document the mismatch
3. decide whether the PAD or execution plan must change
4. do not silently improvise a new architecture

---

## 15. Final Note

This execution plan is intentionally strict.

That is a feature, not a limitation.

OneStopNews is not a toy build. It is a structured product with:

- real ingestion
- real operations
- real AI governance
- real performance constraints
- real architectural consequences

This document exists to ensure the build process remains as disciplined as the architecture itself.

---

If you want, I can now do the next step and produce either:

1. a **more expanded v2 of `MASTER_EXECUTION_PLAN.md`** with even deeper per-file interface contracts, including sample TypeScript signatures, or
2. a **Phase 0 implementation plan only**, ready to execute file-by-file.
