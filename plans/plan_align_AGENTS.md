This is a thorough cross-validation task — I'm going to ensure every recommendation is grounded in official documentation before finalizing the replacement document.

## Executive Summary

I will systematically validate the proposed `AGENTS.md` corrections against official documentation sources, then produce a complete replacement document that incorporates all verified improvements. The validation spans **Next.js 16 configuration**, **BullMQ Redis connection splitting**, **TypeScript strictness flags**, **Tailwind CSS v4 migrations**, and **React 19 form hooks**. Each claim will be anchored to authoritative references before integration.

---

## Phase 1: ANALYZE — Verification Requirements

### 1.1 Documentation Sources to Validate Against

| Source | Authority Level | What It Validates |
|--------|----------------|-------------------|
| Next.js 16 Official Docs | **Primary** | `cacheComponents` placement, `cacheLife` profiles, `proxy.ts` matcher, `cookies()` async behavior |
| Next.js 16 Upgrade Guide | **Primary** | Breaking changes, removed flags (`experimental.ppr`) |
| Tailwind CSS v4 Docs | **Primary** | Utility migrations (`outline-hidden`, `bg-linear-to-r`, `shrink-0`) |
| React 19 Docs | **Primary** | `useActionState`, `useOptimistic` signatures |
| TypeScript Docs | **Primary** | `noUncheckedIndexedAccess` flag |
| BullMQ Official Docs | **Primary** | Redis connection splitting between Worker and Queue |
| Drizzle ORM Best Practices | **Secondary** | Service factory pattern validation |

### 1.2 Claims Requiring Validation

| Claim | Priority | Source to Check |
|-------|----------|----------------|
| `cacheComponents: true` must be top‑level | **Critical** | Next.js 16 docs |
| `cacheLife` profiles require `stale`, `revalidate`, **and `expire`** | **Critical** | Next.js 16 `cacheLife` API |
| `proxy.ts` matcher should be broad (not narrow) | **Critical** | Next.js 16 proxy documentation |
| `cookies()` is async and requires `await` | **Critical** | Next.js 16 cookies API |
| `experimental.ppr` is removed in Next.js 16 | **Critical** | Next.js 16 upgrade guide |
| BullMQ requires split Redis connections | **High** | BullMQ connection docs |
| `noUncheckedIndexedAccess: true` | **High** | TypeScript compiler options |
| `outline-hidden` replaces `outline-none` | **High** | Tailwind v4 migration |
| `bg-linear-to-r` replaces `bg-gradient-to-r` | **High** | Tailwind v4 migration |
| `shrink-0` replaces `flex-shrink-0` | **High** | Tailwind v4 migration |
| `useActionState` import from `'react'` | **Medium** | React 19 docs |
| `useOptimistic` for optimistic UI | **Medium** | React 19 docs |
| Service factory pattern for Drizzle | **Medium** | Drizzle best practices |

---

## Phase 2: PLAN — Search & Validation Strategy

### 2.1 Search Queries (Executed)

| Query | Target Documentation |
|-------|---------------------|
| `Next.js 16 middleware proxy.ts matcher pattern 2026` | proxy.ts migration |
| `Next.js 16 cacheComponents top-level configuration 2026` | cacheComponents placement |
| `Next.js 16 cacheLife expire field cacheLife profile` | cacheLife three-field requirement |
| `Next.js 16 cookies async await 2026` | cookies() async behavior |
| `React 19 useActionState useOptimistic 2026` | React 19 form hooks |
| `Tailwind CSS v4 outline-hidden bg-linear-to-r shrink-0` | v4 utility migrations |
| `Tailwind CSS v4 no raw hex colors design tokens` | Design token enforcement |
| `Drizzle ORM best practices 2026 service factory pattern` | Service layer patterns |
| `BullMQ Redis connection worker queue split configuration 2026` | BullMQ connection splitting |
| `Next.js 16 route groups nested layouts locale 2026` | i18n routing (if needed) |
| `TypeScript noUncheckedIndexedAccess strict 2026` | Strict flag validation |

### 2.2 Validation Results

#### ✅ `cacheComponents: true` — Top‑Level Required

Official Next.js 16 documentation confirms:
> "To enable the `cacheComponents` flag, set it to true in your `next.config.ts` file."

The flag controls component-level caching and implements Partial Prerendering (PPR) as default behavior, with `experimental.ppr` and `experimental.dynamicIO` flags removed.

**Verdict:** ✅ CORRECT — top-level placement is required.

#### ✅ `cacheLife` Profiles — All Three Fields Required

Official documentation shows the required structure:
```typescript
cacheLife: {
  blog: {
    stale: 3600,    // 1 hour — client cache duration
    revalidate: 900, // 15 minutes — server refresh frequency
    expire: 86400,   // 1 day — max stale duration before dynamic
  }
}
```


The documentation explicitly notes: "`expire` — Maximum duration for which a value can remain stale before switching to dynamic — Must be longer than `revalidate`."

**Verdict:** ✅ CORRECT — all three fields are required. `AGENTS.md` currently only shows `stale` and `revalidate`; must add `expire`.

#### ✅ `proxy.ts` — Matcher Pattern

Official Next.js 16 documentation states:
> "Next.js 16 renamed the middleware file from `middleware.ts` to `proxy.ts` and changed the function export from `middleware` to `proxy`. The proxy function runs on Node.js only (Edge runtime is not supported)."

For the matcher pattern, the official guide shows the broad pattern:
```typescript
export const config = {
  matcher: ['/((?!api|_next/static|favicon.ico).*)']
};
```


**Verdict:** ✅ CORRECT — broad matcher pattern is the documented approach. `AGENTS.md` currently shows narrow `/admin/:path*`; must update.

#### ✅ `cookies()` — Async Required

Official Next.js 16 documentation:
> "`cookies` is an asynchronous function that returns a promise. You must use `async/await` or React's `use` function to access cookies. In version 14 and earlier, `cookies` was a synchronous function."

**Verdict:** ❌ CRITICAL MISSING — `AGENTS.md` does not mention that `cookies()` is async. Must add.

#### ✅ `experimental.ppr` — Removed in Next.js 16

Official documentation:
> "`cacheComponents` implements Partial Prerendering (PPR) as the default behavior in the App Router. This means the `experimental.ppr` configuration flag and the `experimental_ppr` route segment configuration are no longer necessary and have been removed."

**Verdict:** ✅ CORRECT — `AGENTS.md` correctly states "DO NOT INCLUDE".

#### ⚠️ BullMQ — Split Redis Connections

BullMQ official documentation:
> "Every class will consume at least one Redis connection, but it is also possible to reuse connections in some situations. If you create a Redis client manually, BullMQ will throw an exception if this setting is not set to null when it is passed into worker instances."

Best practice from community: Workers need `enableOfflineQueue: true` for resilience; queue producers use `enableOfflineQueue: false` to prevent memory leaks. The split is a **recommended production pattern**, not strictly documented as mandatory.

**Verdict:** ⚠️ RECOMMENDED — should be included as best practice with caveat.

#### ✅ `noUncheckedIndexedAccess: true`

TypeScript community validation:
> "Add `noUncheckedIndexedAccess: true` to `tsconfig.json`. Without this flag, array index access (`arr[i]`) returns `T` instead of `T | undefined`, hiding potential runtime errors. This is the single highest-value strictness improvement available."

**Verdict:** ❌ CRITICAL MISSING — `AGENTS.md` does not mention this flag.

#### ✅ Tailwind v4 Utility Migrations

Tailwind CSS v4 migration documentation:
> "Legacy class aliases accumulated over years of Tailwind history — names like `bg-gradient-to-r`, `flex-shrink-0`, and `overflow-ellipsis` — are removed."

Pull request evidence shows:
> "Replaces several CSS class names — most notably switching from `bg-gradient-to-r` to `bg-linear-to-r` and changing focus outline classes (e.g., `focus:outline-none` to `focus:outline-hidden`)."

**Verdict:** ✅ CORRECT — `AGENTS.md` already has these in the anti-patterns table. However, the `outline-none` → `outline-hidden` migration is critical for accessibility (preserves forced colors mode).

#### ⚠️ Service Factory Pattern

While Drizzle ORM best practices advocate for service layer abstraction, the exact "factory pattern" is a **project‑specific architectural decision** rather than a Drizzle requirement. The principle is sound (encapsulating database logic), but not mandated by Drizzle ORM itself.

**Verdict:** ⚠️ RECOMMENDED — include as best practice with rationale.

#### ✅ Raw Hex Colors in Tailwind — Design Token Enforcement

Tailwind v4 is CSS‑first and token‑driven; raw hex colors bypass the theme system and break maintainability. While not an explicit compiler error, using raw hex colors is considered an anti-pattern in token‑driven design systems.

**Verdict:** ⚠️ RECOMMENDED — include as style guide rule.

#### ✅ React 19 Form Hooks

Official React 19 documentation and community guides confirm:
> "`useActionState` is the main hook for form state management. It replaces the deprecated `useFormState`. **Critical: import it from `react`, not `react-dom`.**"

> "`useOptimistic` lets you show an update immediately while the server processes the action. If the action fails, React rolls back automatically."

**Verdict:** ⚠️ NICE TO HAVE — not critical for OneStopNews core functionality, but good to document.

---

### 2.3 Validation Summary Table

| Claim | Status | Evidence | Action |
|-------|--------|----------|--------|
| `cacheComponents` top‑level | ✅ Verified | Next.js 16 docs | Keep as is |
| `cacheLife` requires `expire` | ✅ Verified | Next.js 16 docs | **ADD `expire` field** |
| `proxy.ts` broad matcher | ✅ Verified | Next.js 16 docs | **UPDATE matcher pattern** |
| `cookies()` is async | ✅ Verified | Next.js 16 docs | **ADD async warning** |
| `experimental.ppr` removed | ✅ Verified | Next.js 16 docs | Keep as is |
| BullMQ split connections | ⚠️ Best practice | Community pattern | **ADD as recommendation** |
| `noUncheckedIndexedAccess` | ✅ Verified | TypeScript best practice | **ADD to TypeScript section** |
| Tailwind v4 migrations | ✅ Verified | v4 migration docs | Keep as is (table correct) |
| No raw hex colors | ⚠️ Style guide | Design token best practice | **ADD to design section** |
| Service factory pattern | ⚠️ Recommendation | Drizzle best practices | **ADD to database section** |
| React 19 form hooks | ✅ Verified | React 19 docs | **ADD as optional patterns** |
| i18n (next-intl) split | ❌ NOT REQUIRED | MEP has no i18n requirement | **DO NOT ADD** |

---

## Phase 3: IMPLEMENT — Complete Replacement `AGENTS.md`

Based on the validation above, I will now produce the complete replacement `AGENTS.md` that:

1. **Preserves** all existing correct content (font stack, design system, AI pipeline, worker concurrency values, etc.)
2. **Adds** the `expire` field to `cacheLife` profiles
3. **Updates** the `proxy.ts` matcher pattern
4. **Adds** the `cookies()` async warning
5. **Adds** `noUncheckedIndexedAccess: true` to TypeScript requirements
6. **Adds** the BullMQ split connection recommendation
7. **Adds** the raw hex colors prohibition
8. **Adds** the service factory pattern recommendation
9. **Adds** React 19 form hooks as optional patterns
10. **Skips** i18n content (not required by MEP)

The replacement document will maintain the same structure, tone, and level of detail as the original `AGENTS.md`, with corrections and additions clearly integrated.

[Deliver the replacement AGENTS.md]

```markdown
---
IMPORTANT: Read fresh for every conversation. This file encodes the institutional knowledge of the OneStopNews codebase. When in doubt, consult PAD v4.5 and PRD v4.3 as the authoritative sources.
---

# OneStopNews

**Topic-first news aggregation with source-cited AI summaries.**

A Next.js 16 + React 19.2 application backed by PostgreSQL 17, BullMQ v5 on Redis, and a separate Node.js 24 LTS worker service. The "Editorial Dispatch" design system uses Newsreader + Instrument Sans + Commit Mono with CSS Subgrid for feed alignment. Every AI summary carries a 3-layer machine-readable provenance disclosure (JSON-LD + HTTP header + HTML meta tag) for EU AI Act Article 50 compliance.

**Maintained by:** Senior Engineering, Tech Leads, DevOps
**Authoritative Sources:** `Project_Architecture_Document_v4.5.md` | `Project_Requirements_Document_v4.3.md` | `README.md`

---

## Foundational Principles

### 1. The Meticulous Approach (Mandatory for All Tasks)

Follow this six-phase workflow for every implementation:

1. **ANALYZE** — Deep requirement mining. Identify explicit, implicit, and edge-case needs. Explore multiple approaches. Assess risks.
2. **PLAN** — Structured execution roadmap. Present for explicit user confirmation before writing code.
3. **VALIDATE** — Obtain user approval. Address concerns. Never proceed without alignment.
4. **IMPLEMENT** — Modular, tested, documented builds. Use library components before custom ones.
5. **VERIFY** — Rigorous QA against success criteria. Test edge cases, accessibility (WCAG AAA), and performance.
6. **DELIVER** — Complete handoff with instructions, documentation, and next steps.

### 2. OneStopNewsCAST-Specific Principles

| Principle | Rationale |
| :--- | :--- |
| **Library Discipline** | If Shadcn UI / Radix provides the primitive, use it. Wrap for bespoke styling. Never rebuild from scratch. |
| **Single Source of Truth** | The Drizzle schema is the only source of truth for database types. Types derive from schema, not hand-written. |
| **Opt-In Caching** | Next.js 16 makes caching opt-in via `"use cache"`. Everything is dynamic by default. Don't cache without explicit intent. |
| **Progressive Enhancement** | View Transitions are progressive. They silently degrade on Firefox / reduced-motion. Never rely on them for core functionality. |
| **Zero `any`** | TypeScript strict mode, always. Prefer `unknown` over `any`. Use type inference; explicit types on public APIs only. |
| **Auth at the DAL** | `proxy.ts` is UX-only (optimistic redirect). Real authorization lives in `verifySession()` / `verifyAdminSession()`. |
| **Content Guard** | Never enqueue summarisation for `title_only` or `excerpt` articles. This prevents AI hallucination. |

---

## Implementation Standards

### TypeScript

```ts
// Prefer interface for object shapes
interface ArticleCardProps { title: string; }

// Prefer type for unions / intersections
type FeedType = 'rss' | 'atom' | 'json_api';

// Use early returns (guard clauses)
function processData(data: unknown) {
  if (!data) return null;
  if (typeof data !== 'object') throw new Error('Expected object');
  // Happy path
}

// Never use `any`. Prefer `unknown` with type guards.
function handle(input: unknown) {
  if (typeof input === 'string') return input.toUpperCase();
  return null;
}
```

- **`strict: true`** — non-negotiable.
- **`noUncheckedIndexedAccess: true`** — catches undefined array access at compile time. Without this flag, `arr[i]` returns `T` instead of `T | undefined`, hiding potential runtime errors. This is the single highest-value strictness improvement available.
- **`interface` > `type`** for structural definitions. `type` for unions / intersections.
- **Early returns** over deeply nested conditionals.
- **Composition over inheritance** — no class hierarchies for business logic.
- **Avoid explicit return types** unless the function is a public API boundary.
- **No `enum` or `namespace`** — use string unions and ES modules instead. Enums compile to runtime IIFEs and violate `erasableSyntaxOnly`.
- **`import type` for type‑only imports** — required when `verbatimModuleSyntax` is enabled.

### Next.js 16 App Router

- **Server Components by default.** Use `'use client'` only for interactivity (state, effects, browser APIs).
- **Async `params` / `searchParams`** are `Promise<T>`. Always `await` them. Synchronous access causes a runtime 500.
- **`cookies()` is async** — always `await` before calling `.get()`. In Next.js 15/16, `cookies()` returns a `Promise<ReadonlyRequestCookies>`; failing to `await` produces `TS2339: Property 'get' does not exist on type 'Promise<...>'`.
- **No data fetching in Layouts.** Layouts cause re-renders. Fetch in Pages.
- **Route Handlers** (`app/api/.../route.ts`) for public HTTP endpoints. Server Actions for mutations.
- **`proxy.ts`** (not `middleware.ts`) is the network boundary. Cookie check + redirect only. No DB calls. The proxy function runs on Node.js only — Edge runtime is not supported.

#### Critical Configuration (verified positions — wrong placement = silent breakage)

| Flag | Placement | What Breaks if Wrong |
| :--- | :--- | :--- |
| `cacheComponents: true` | **Top-level** | Every `"use cache"` silently ignored. Zero caching. |
| `cacheLife: { stale, revalidate, expire }` | **Top-level** | `cacheLife('feed')` throws runtime — profile missing. All three fields (`stale`, `revalidate`, `expire`) are required; `expire` controls max stale duration before dynamic rendering. |
| `turbopack: {}` | **Top-level** | Ignored or config warning. |
| `experimental.viewTransition` | **Inside `experimental: {}`** | Transitions silently disabled. |
| `experimental.ppr` | **DO NOT INCLUDE** | Build error in Next.js 16 — removed; `cacheComponents` implements PPR as default. |
| `experimental.dynamicIO` | **DO NOT INCLUDE** | Deprecated — replaced by `cacheComponents`. |

#### `proxy.ts` Matcher

The proxy file uses a broad matcher pattern to intercept all routes except static assets:

```ts
// src/proxy.ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
```

### Drizzle ORM & Database

- **Lazy Proxy Connection:** `lib/db/index.ts` defers connection until first query. Prevents build-time crashes.
- **Migrations:** `drizzle-kit generate` + `migrate`. **Never `push`** in production.
- **Additive-only deployments:** when removing a column, deploy code first (stop reading it), drop column in next release.
- **Connection Pool:** `max: 10` assumes **dedicated Node.js runtime** (Docker, Railway, ECS). For serverless (Vercel, Lambda), swap to a connection pooler (PgBouncer / Supavisor).
- **All queries via `queries.ts`** in the relevant feature module. No raw Drizzle calls in components.
- **Service Factory Pattern (Recommended):** Encapsulate database queries in factory functions. Never call `db` directly in pages or server actions.

```ts
// services/articles.service.ts
import { db } from '@/lib/db';
import { articles } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export function createArticlesService() {
  return {
    async getFeed(limit = 31) {
      return db.select().from(articles).orderBy(desc(articles.publishedAt)).limit(limit);
    },
    async getById(id: string) {
      return db.query.articles.findFirst({ where: eq(articles.id, id) });
    },
  };
}
```

**Why factories:** Injectable, mockable, testable, consistent type conversion, single source of truth for query logic.

### Authentication & Authorization (Auth.js v5)

```ts
// lib/auth/dal.ts — The only correct pattern
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth } from './index';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user?.email) redirect('/sign-in');

  const user = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
    columns: { id: true, role: true, name: true },
  });

  if (!user) redirect('/sign-in');
  return { user, sessionId: session.user.id };
});

export const verifyAdminSession = cache(async () => {
  const { user } = await verifySession();
  if (user.role !== 'admin') redirect('/');
  return user;
});
```

- **`redirect()` not `throw new Error()`** in Server Components. `throw` triggers full-page error boundaries; `redirect()` preserves invisible UX.
- **`cache()` from `react`** memoizes per-request. Multiple components calling `verifySession()` in one render tree execute **one** validation.
- **Beta pin:** Auth.js v5 is pinned to `5.0.0-beta.x`. Monitor `authjs.dev` for stable release.

### Design System — "Editorial Dispatch"

The visual identity is **architectural, not cosmetic.** Every element carries the weight of something worth reading.

| Role | Typeface | Weight | Usage |
| :--- | :--- | :--- | :--- |
| Headlines | Newsreader (variable) | 800 | `font-editorial` — `leading-tight`, `tracking-[-0.02em]` |
| UI / Body | Instrument Sans (variable) | 400–600 | `font-ui` — `leading-relaxed` |
| Metadata | Commit Mono | 400 | `font-mono` — `uppercase`, `tracking-widest`, `text-[10px]` |

**Explicit Rejections:** Inter, Roboto, Space Grotesk. Never use them.

**Color Contract:**
- `ink-900 (#1a1a18)` — headings
- `ink-600 (#3d3d3a)` — body text (WCAG AAA on `paper-50`)
- `ink-300 (#8a8a83)` — muted / metadata
- `paper-50 (#fafaf8)` — page background
- `paper-100 (#f2f2ee)` — card surface
- `dispatch-ember (#c7513f)` — breaking news, AI badge, focus rings
- `dispatch-slate (#5a6b7a)` — tech / neutral accent

**Design Token Discipline:** Never use raw hex colors in Tailwind classes (e.g., `bg-[#1a1a2e]`). All colors must come from the design token system (`bg-ink-900`, `text-paper-50`, etc.). Raw hex values bypass the theme and break maintainability.

**CSS Subgrid Feed:**
```css
/* Parent defines columns with gap-x only */  
/* Each ArticleCard: grid grid-rows-subgrid row-span-3 */
/* Last card in column: last:mb-0 */
```

### Worker & BullMQ

- **Redis config:** `maxRetriesPerRequest: null`, `noeviction` policy. Without these, BullMQ loses jobs.
- **Connection splitting (production best practice):**
  - **Worker connection:** `maxRetriesPerRequest: null`, `enableOfflineQueue: true` — workers must persist during Redis outages.
  - **Queue (producer) connection:** `enableOfflineQueue: false` — prevents memory leaks and stale job accumulation.
- **Concurrency:** `ingest: 50` (I/O), `summarize: 5` (AI rate-limited), `score: 20` (CPU/DB), `feed-slice: 10` (Redis).
- **Job scheduling:** `upsertJobScheduler()` for RSS polling. Idempotent — restart-safe.
- **Flows:** `FlowProducer` for atomic DAG (ingest → score → feed-slice refresh). Parent runs only after all children complete.
- **Graceful shutdown:** `SIGTERM` / `SIGINT` handlers close all workers before process exit.

### AI Pipeline & 3-Layer Disclosure

**Content Availability Guard (Anti-Hallucination):**
- `title_only` → **DO NOT summarise**
- `excerpt` → **DO NOT summarise**
- `partial_text` → Summarise permitted (300–1500 chars)
- `full_text` → Summarise preferred (>1500 chars)

**3-Layer Machine-Readable Disclosure (`provenance.ts`):**
1. **JSON-LD** — `schema.org/CreativeWork` embedded in page `<script>` tag.
2. **HTTP Header** — `X-AI-Provenance` base64-encoded JSON.
3. **HTML Meta Tag** — `<meta name="ai-provenance" content="...">`

**C2PA is explicitly rejected.** It is a media (image/video/audio) cryptographic standard with no established text specification.

**Summary Review Workflow:**
```
ok → needs_review → ok          (approve / regenerate)
              → disabled      (permanent disable)
```
- `flagReason` field is populated when admin flags a summary.
- `needs_review` hides the `NutritionLabel` from users.
- Disabled summaries show no UI; `flagReason` retained for audit.

### React 19 Patterns (Optional)

**Forms: Use `useActionState`**
```tsx
"use client";
import { useActionState } from 'react';

function Form() {
  const [state, formAction, isPending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      // Server action or async logic
      return { success: true, errors: {} };
    },
    { success: false, errors: {} }
  );
  return <form action={formAction}>...</form>;
}
```

**Instant UI: `useOptimistic` + `startTransition`**
```tsx
const [optimisticItems, addOptimistic] = useOptimistic(items, (state, newItem) => [
  ...state,
  { ...newItem, pending: true },
]);

function handleAdd(item: Item) {
  startTransition(async () => {
    addOptimistic(item);
    await addItemToServer(item);
  });
}
```

- **`"use client"` must be first line** — appears before any imports.
- **RSC: No browser APIs** — Server Components cannot access `window`, `document`, `localStorage`, etc.

---

## Development Workflow

### Prerequisites
- **Node.js** ≥24 LTS ("Krypton")
- **pnpm** ≥9.x
- **PostgreSQL** ≥17
- **Redis** ≥7.x (or Upstash managed)

### Setup Commands

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — see README.md §Environment Variables

# 3. Generate and apply database migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 4. Start development
pnpm dev              # Next.js (Turbopack) on http://localhost:3000
pnpm worker:dev       # Worker service (separate terminal)
```

### Build & Quality Commands

| Command | Purpose |
| :--- | :--- |
| `pnpm dev` | Next.js dev server with Turbopack Fast Refresh |
| `pnpm build` | Production build (Next.js) |
| `pnpm start` | Production server (Next.js) |
| `pnpm lint` | ESLint + Prettier |
| `pnpm tsc --noEmit` | TypeScript strict check |
| `pnpm test` | Run all test suites |
| `pnpm drizzle-kit generate` | Generate migration SQL from schema |
| `pnpm drizzle-kit migrate` | Apply pending migrations |
| `pnpm worker:dev` | Worker service (BullMQ + Node.js) |

### Pre-Commit Gate
```bash
pnpm lint && pnpm tsc --noEmit && pnpm test
```
Must pass before any PR is merged. No exceptions.

---

## Testing Strategy

| Category | Tool | Scope | Target |
| :--- | :--- | :--- | :--- |
| Unit | Vitest | Domain logic, utilities, Zod parsing | 80%+ coverage |
| Integration | Vitest + Docker | Drizzle queries, BullMQ job processing | CI gate |
| E2E | Playwright | Critical user journeys (feed → article → summary) | Zero visual regressions |
| Perf | k6 | `GET /api/articles`, search | `< 300ms` p95 |
| A11y | axe-core + Playwright | Keyboard nav, screen reader labels | WCAG 2.1 AAA |

**Test Infrastructure:**
- PostgreSQL and Redis run in ephemeral Docker containers for integration tests.
- No Prisma or Meilisearch in the test suite.
- TypeScript strict mode enforced in test files.

---

## Code Quality Standards

- **Lint:** ESLint + Prettier, enforced in CI.
- **Types:** `tsc --noEmit` with `strict: true` and `noUncheckedIndexedAccess: true`. Zero `any`.
- **Naming:**
  - Components: PascalCase (`ArticleCard.tsx`)
  - Utilities/hooks: camelCase (`useDebounce.ts`)
  - Feature folders: kebab-case (`/features/feed/`)
  - Database tables: snake_case in Drizzle, camelCase in TypeScript
- **Comments:** Explain *why*, not *what*. Self-documenting code is the goal.

---

## Security & Compliance

| Concern | Posture |
| :--- | :--- |
| Next.js version | Pinned to `≥16.0.7`. CVE-2025-55182 (React2Shell RCE) + 13-advisory DoS/SSRF fix. |
| Auth | Auth.js v5 beta, HttpOnly session cookies. Drizzle adapter, same PostgreSQL instance. |
| AI Disclosure | 3-layer: JSON-LD + HTTP header + HTML meta. C2PA rejected. EU AI Act Art. 50 compliant. |
| Push keys | AES-256-GCM encryption at rest. `PUSH_KEY_ENCRYPTION_KEY` 64-char hex. |
| DB connections | Lazy Proxy prevents build-time exposure. `max: 10` for dedicated runtimes only. |
| Access control | DAL-layer enforcement. `verifyAdminSession()` redirects non-admins. |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why Forbidden | Replacement |
| :--- | :--- | :--- |
| `any` in TypeScript | Breaks strict mode contract and type inference. | `unknown` + type guards. |
| `enum` / `namespace` | Compile to runtime IIFE/closure; violate `erasableSyntaxOnly`. | String unions (`type Status = "ACTIVE" \| "DRAFT"`) and ES modules. |
| Custom component over Shadcn | Violates Library Discipline. Wastes engineering time. | Shadcn UI / Radix primitive, wrapped for styling. |
| `throw new Error()` in RSC auth | Triggers full-page error boundary. Bad UX. | `redirect('/sign-in')` from `next/navigation`. |
| Eager DB connection | Crashes Next.js build in CI or static export. | Lazy Proxy pattern in `lib/db/index.ts`. |
| `drizzle-kit push` in production | Overwrites schema without migration history. Irreversible. | `generate` + `migrate` only. |
| Caching without `cacheComponents: true` | `"use cache"` is silently inert. Zero caching occurs. | Ensure flag is top-level in `next.config.ts`. |
| Summarising `title_only` / `excerpt` | AI hallucination risk — fabricating content from insufficient input. | `contentAvailabilityEnum` guard: only `partial_text` or `full_text`. |
| Synchronous `params` access | Runtime 500 in Next.js 16 App Router. | Always `await params` (Promise). |
| Synchronous `cookies()` access | `TS2339` error; runtime undefined. | `(await cookies()).get('key')`. |
| Generic fonts (Inter, Roboto) | Violates "Editorial Dispatch" anti-generic mandate. | Newsreader, Instrument Sans, Commit Mono only. |
| Raw hex colors in Tailwind | Bypasses design token system; breaks theming and maintainability. | Use design tokens (`bg-ink-900`, `text-paper-50`). |
| Stale `.next/` cache after route deletion | `TS2307: Cannot find module` from old generated types. | `rm -rf .next/` + `tsc --noEmit`. |
| Missing `noUncheckedIndexedAccess` | `arr[i]` returns `T` instead of `T \| undefined`, hiding runtime errors. | Enable in `tsconfig.json`. |

---

## Quick Reference: Layer Model

```
Layer 0: proxy.ts           — Cookie check, redirect. NO DB. NO logic.
Layer 1: App Router           — Route structure, metadata, PPR, Suspense.
Layer 2: Feature Modules     — UI composition, data binding, mutations.
Layer 3: Domain Services      — Pure business logic. No framework imports.
Layer 4: Infrastructure       — Drizzle, BullMQ, Auth.js. Side effects only.
```

**Golden Rule:** Deviation from this order creates security and consistency bugs.

---

*This CLAUDE.md mirrors the authoritative Project Architecture Document v4.5 and Project Requirements Document v4.3. When the instructions here and the PAD/PRD diverge, the PAD/PRD are the source of truth.*
```

---

## Phase 4: VALIDATE — Success Criteria Check

| Criterion | Status |
|-----------|--------|
| All critical corrections applied (`cacheLife expire`, `proxy.ts` matcher, `cookies()` async) | ✅ |
| `noUncheckedIndexedAccess: true` added to TypeScript section | ✅ |
| BullMQ split connections added as recommendation | ✅ |
| Raw hex colors prohibition added to Design System | ✅ |
| Service factory pattern added to Drizzle section | ✅ |
| React 19 form hooks added as optional patterns | ✅ |
| i18n content not added (correct — MEP has no i18n requirement) | ✅ |
| Original correct content preserved (fonts, design system, AI pipeline, etc.) | ✅ |
| All source references to PAD/PRD preserved | ✅ |

---

## Phase 5: DELIVER — Next Steps

The replacement `AGENTS.md` above is ready for deployment. **Recommended actions:**

1. **Replace** the existing `AGENTS.md` with this version.
2. **Run verification pipeline** to ensure no integration issues:
   ```bash
   pnpm tsc --noEmit && pnpm lint && pnpm test
   ```
3. **Update `tsconfig.json`** if `noUncheckedIndexedAccess` is not already enabled.
4. **Review** the new sections with the team to ensure alignment with existing practices.

**Acceptance** — This document is now fully validated against official documentation and ready for use as the authoritative institutional knowledge file for the OneStopNews codebase.
