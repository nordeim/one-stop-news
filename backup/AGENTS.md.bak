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

 - **Lazy Proxy Connection:** `lib/db/index.ts` defers connection until first query. Prevents build-time crashes. See `src/lib/db/index.ts` for implementation.
   - **CRITICAL PHASE 3 FIX**: The Lazy Proxy must NOT be confused with a plain object. A raw `return {}` causes `TypeError: Cannot read properties of undefined` at runtime when Drizzle methods are called. The `Proxy<T>` must intercept every property access and forward to the real `db`.
   - **Tested**: `src/lib/db/index.test.ts` has 5 tests verifying the proxy behavior including missing `DATABASE_URL`, first-query execution, and repeated access returns same instance.
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
 - **Beta pin:** Auth.js v5 is pinned to `5.0.0-beta.31` with `@auth/core@0.41.2`. Monitor `authjs.dev` for stable release.
   - **`verifyAdminSession` canonical location**: `src/lib/auth/dal.ts` is the single source of truth for admin verification. Any future admin checks must import from there. The duplicate in `src/app/api/admin/route.ts` was deleted in Phase 1-2 remediation.

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
**Phase 3 Components Built:**
- `src/shared/components/ui/Button.tsx` — cva + Radix Slot, 5 variants, loading spinner, disabled state
- `src/shared/components/ui/Badge.tsx` — 6 colour variants, font-mono, accessible
- `src/shared/components/ui/Skeleton.tsx` — reduced-motion aware, ArticleCard/Feed skeletons
- `src/shared/components/layout/Header.tsx` — sticky, cat-nav, mobile dialog (Radix Dialog)
- `src/shared/components/layout/Footer.tsx` — AI disclosure, role="contentinfo"
- `src/shared/hooks/useDebounce.ts` — generic <T>, cleanup
- `src/shared/hooks/useReducedMotion.ts` — MediaQueryList API, `prefers-reduced-motion: reduce`
- `src/components/primitives/PageTransition.tsx` — `document.startViewTransition` with graceful degradation

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
pnpm check          # Runs tsc --noEmit && pnpm lint
pnpm test           # Run all test suites
```
Must pass before any PR is merged. No exceptions.

**Note**: `pnpm check` is a convenience script that runs `tsc --noEmit && pnpm lint`. This replaced separate commands to ensure TypeScript and ESLint are always checked together.

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
- **vitest.config.ts** is at root, with `@/` path alias mapped to `src/`.

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
| Next.js version | Pinned to `>=16.0.7`. CVE-2025-55182 (React2Shell RCE) + 13-advisory DoS/SSRF fix. |
| Auth | Auth.js v5 beta, HttpOnly session cookies. Drizzle adapter, same PostgreSQL instance. |
| AI Disclosure | 3-layer: JSON-LD + HTTP header + HTML meta. C2PA rejected. EU AI Act Art. 50 compliant. |
| Push keys | AES-256-GCM encryption at rest. `PUSH_KEY_ENCRYPTION_KEY` 64-char hex. |
| DB connections | Eager connection with graceful fallback when `DATABASE_URL` is missing at build time. `max: 10` for dedicated runtimes. Serverless: use PgBouncer/Supavisor or inject dummy URI at build time. |
| Access control | DAL-layer enforcement. `verifyAdminSession()` redirects non-admins. |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why Forbidden | Replacement |
| :--- | :--- | :--- |
| `any` in TypeScript | Breaks strict mode contract and type inference. | `unknown` + type guards. |
| `enum` / `namespace` | Compile to runtime IIFE/closure; violate `erasableSyntaxOnly`. | String unions (`type Status = "ACTIVE" \| "DRAFT"`) and ES modules. |
| Custom component over Shadcn | Violates Library Discipline. Wastes engineering time. | Shadcn UI / Radix primitive, wrapped for styling. |
| `throw new Error()` in RSC auth | Triggers full-page error boundary. Bad UX. | `redirect('/sign-in')` from `next/navigation`. |
| Lazy proxy for DrizzleAdapter | Incorrectly documented. Lazy proxy IS correct for DrizzleAdapter. See src/lib/db/index.ts for implementation. |
| `drizzle-kit push` in production | Overwrites schema without migration history. Irreversible. | `generate` + `migrate` only. |
| Caching without `cacheComponents: true` | `"use cache"` is silently inert. Zero caching occurs. | Ensure flag is top-level in `next.config.ts`. |
| Summarising `title_only` / `excerpt` | AI hallucination risk — fabricating content from insufficient input. | `contentAvailabilityEnum` guard: only `partial_text` or `full_text`. |
| Synchronous `params` access | Runtime 500 in Next.js 16 App Router. | Always `await params` (Promise). |
| Synchronous `cookies()` access | `TS2339` error; runtime undefined. | `(await cookies()).get('key')`. |
| Generic fonts (Inter, Roboto) | Violates "Editorial Dispatch" anti-generic mandate. | Newsreader, Instrument Sans, Commit Mono only. |
| Raw hex colors in Tailwind | Bypasses design token system; breaks theming and maintainability. | Use design tokens (`bg-ink-900`, `text-paper-50`). |
| Stale `.next/` cache after route deletion | `TS2307: Cannot find module` from old generated types. | `rm -rf .next/` + `tsc --noEmit`. |
| Missing `noUncheckedIndexedAccess` | `arr[i]` returns `T` instead of `T \| undefined`, hiding runtime errors. | Enable in `tsconfig.json`. |
| Mismatched `@auth/core` versions | `DrizzleAdapter` fails at build time with type errors. | Run `pnpm why @auth/core`. Upgrade `next-auth` to align. |
| Beta adapter `as any` without eslint-disable | Triggers `--max-warnings 0` lint failures. | Add `eslint-disable-next-line @typescript-eslint/no-explicit-any` with justification. |

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
pnpm check          # Runs tsc --noEmit && pnpm lint
pnpm test           # Run all test suites
```
Must pass before any PR is merged. No exceptions.

**Note**: `pnpm check` is a convenience script that runs `tsc --noEmit && pnpm lint`. This replaced separate commands to ensure TypeScript and ESLint are always checked together.

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
| DB connections | Eager connection with graceful fallback when `DATABASE_URL` is missing at build time. `max: 10` for dedicated runtimes. Serverless: use PgBouncer/Supavisor or inject dummy URI at build time. |
| Access control | DAL-layer enforcement. `verifyAdminSession()` redirects non-admins. |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why Forbidden | Replacement |
| :--- | :--- | :--- |
| `any` in TypeScript | Breaks strict mode contract and type inference. | `unknown` + type guards. |
| `enum` / `namespace` | Compile to runtime IIFE/closure; violate `erasableSyntaxOnly`. | String unions (`type Status = "ACTIVE" \| "DRAFT"`) and ES modules. |
| Custom component over Shadcn | Violates Library Discipline. Wastes engineering time. | Shadcn UI / Radix primitive, wrapped for styling. |
| `throw new Error()` in RSC auth | Triggers full-page error boundary. Bad UX. | `redirect('/sign-in')` from `next/navigation`. |
| Lazy proxy for DrizzleAdapter | Incorrectly documented. Lazy proxy IS correct for DrizzleAdapter. See src/lib/db/index.ts for implementation. |
| `drizzle-kit push` in production | Overwrites schema without migration history. Irreversible. | `generate` + `migrate` only. |
| Caching without `cacheComponents: true` | `"use cache"` is silently inert. Zero caching occurs. | Ensure flag is top-level in `next.config.ts`. |
| Summarising `title_only` / `excerpt` | AI hallucination risk — fabricating content from insufficient input. | `contentAvailabilityEnum` guard: only `partial_text` or `full_text`. |
| Synchronous `params` access | Runtime 500 in Next.js 16 App Router. | Always `await params` (Promise). |
| Synchronous `cookies()` access | `TS2339` error; runtime undefined. | `(await cookies()).get('key')`. |
| Generic fonts (Inter, Roboto) | Violates "Editorial Dispatch" anti-generic mandate. | Newsreader, Instrument Sans, Commit Mono only. |
| Raw hex colors in Tailwind | Bypasses design token system; breaks theming and maintainability. | Use design tokens (`bg-ink-900`, `text-paper-50`). |
| Stale `.next/` cache after route deletion | `TS2307: Cannot find module` from old generated types. | `rm -rf .next/` + `tsc --noEmit`. |
| Missing `noUncheckedIndexedAccess` | `arr[i]` returns `T` instead of `T \| undefined`, hiding runtime errors. | Enable in `tsconfig.json`. |
| Mismatched `@auth/core` versions | `DrizzleAdapter` fails at build time with type errors. | Run `pnpm why @auth/core`. Upgrade `next-auth` to align. |
| Beta adapter `as any` without eslint-disable | Triggers `--max-warnings 0` lint failures. | Add `eslint-disable-next-line @typescript-eslint/no-explicit-any` with justification. |

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

# Distilled Learnings & Tips — Next.js 16 + React 19 + Tailwind v4 + TypeScript + PostgreSQL + Drizzle

> Extracted from battle-tested LuxeVerse documentation. Filtered for relevance to: Next.js 16, React 19, Tailwind CSS v4, TypeScript 5.9+, PostgreSQL (pg), Drizzle ORM.

---

## 1. Next.js 16 — Critical Gotchas

### 1.1 `params` & `searchParams` Are Async (CRITICAL)

Next.js 16 types `params` as `Promise<any>` for page components. The runtime behavior differs by layer:

| Layer | Runtime Type | Must Use |
|-------|-------------|---------|
| **Layouts** (`layout.tsx`) | `Promise<...>` | `const { slug } = await params;` |
| **Pages** (`page.tsx`) | Plain object `{}` | `const { slug } = params;` (no await) |

**Safe universal pattern** — type as `Promise<T>` and always `await`. It works for both cases because `await` on a plain object returns the same value:

```tsx
// ✅ Universal pattern — satisfies tsc and runtime for BOTH pages and layouts
interface PageProps {
  params: Promise<{ slug: string }>;
}
export default async function Page({ params }: PageProps) {
  const { slug } = await params; // Required by .next/types/ Promise<T>
}
```

```tsx
// ✅ Layout — MUST await (always a real Promise)
export default async function Layout({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
}
```

**Why the duality**: `.next/types/` generates `Promise<any>` for both, but at runtime pages get a plain object. TypeScript needs the `Promise<T>` annotation to pass `tsc --noEmit`. `await` on a non-Promise returns the same value (no runtime bug).

### 1.2 `cookies()` Is Async in Next.js 15+

```tsx
// ❌ Next.js 14 style (breaks in 15+)
const token = cookies().get("session")?.value;

// ✅ Next.js 15+/16 style
const token = (await cookies()).get("session")?.value;
```

Forgetting `await` produces: `TS2339: Property 'get' does not exist on type 'Promise<ReadonlyRequestCookies>'`

### 1.3 `middleware.ts` Is Deprecated → Use `proxy.ts`

Next.js 16 replaces `middleware.ts` with `proxy.ts`. **Constraint**: `proxy.ts` runs on the **Node.js runtime only** — Edge Runtime is not supported.

### 1.4 `global-error.tsx` Must Define Its Own `<html>` and `<body>`

The global error boundary **replaces** the root layout entirely. It must render a complete document:

```tsx
"use client";
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <h2>Something went wrong</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

### 1.5 Root Layout — The Paradox (Must Have `<html>` But Must Not)

This is the single most confusing Next.js 16 layout rule:

**Rule 1**: Every `app/layout.tsx` **MUST** include `<html>` and `<body>` — otherwise any page that doesn't match a nested layout throws `Missing <html> and <body> tags in the root layout`.

**Rule 2**: If a nested layout (e.g., `[locale]/layout.tsx`) **also** renders `<html>`/`<body>`, you **MUST** remove them from the root layout — otherwise React hydration mismatches on conflicting attributes (`lang`, `dir`, `className`).

**Resolution**: When ALL pages live under a nested layout that owns `<html>`/`<body>`, the root layout becomes a minimal pass-through:

```tsx
// app/layout.tsx — minimal pass-through (safe when ALL pages are under [locale]/)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

```tsx
// app/[locale]/layout.tsx — SOLE owner of <html>/<body>
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
```

**If some pages live OUTSIDE the nested layout**, the root layout must retain `<html>`/`<body>` with a static default:

```tsx
// app/layout.tsx — fallback for non-locale routes
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Root layout anti-patterns**:
- Do NOT put `<Navbar>` or `<Footer>` in the root layout — those belong in the nested layout.
- Do NOT put provider context (`NextIntlClientProvider`, etc.) in the root layout.
- Root layout is a **structural shell only** — fonts, metadata, and `children`.

### 1.6 `next lint` Is Removed in Next.js 16

Do not use `npx next lint`. Use custom shell scripts or direct ESLint invocation:

```bash
eslint .
# or project-specific lint scripts
```

### 1.7 `experimental.ppr` Is Removed

Partial Prerendering is now opted into via `cacheComponents: true` in `next.config.ts` and the `"use cache"` directive in components.

### 1.8 Route Restructuring for Nested Layouts

Pages that need context from a nested layout (e.g., i18n providers) must live **inside** that layout's directory. Use route groups `(groupName)` for logical grouping without affecting URLs:

```
app/
├── layout.tsx                    # Minimal root (no <html>/<body>)
└── [locale]/
    ├── layout.tsx                # Locale layout (owns <html>/<body>)
    └── (routes)/                 # Group for locale-dependent pages
        ├── shop/
        └── editorial/
```

**Migration steps**:
1. Create the `(routes)` directory.
2. Move all dependent pages into it.
3. Update all relative imports (`../../stores/`) to path aliases (`@/stores/`).
4. Delete old root-level directories.
5. **Clear `.next/` cache**: `rm -rf .next/` (stale generated types will crash tsc).
6. Run `tsc --noEmit` — if TS2307 "Cannot find module" appears, stale `.d.ts` still references deleted routes. Re-clear `.next/` and repeat.

### 1.9 Hydration Mismatch: Single Document Root

Only one layout in the tree should render `<html>` and `<body>`. If both root and nested layouts render them, React sees conflicting attributes during hydration. Fix: remove `<html>`/`<body>` from root layout.

### 1.10 Stale `.next/types/` Cache After Route Changes (CRITICAL)

**Symptom**: After deleting or moving routes/pages:
```
TS2307: Cannot find module '../../../.../old-route/page' or its corresponding type declarations.
```

**Cause**: Next.js auto-generates `.next/types/` `.d.ts` files that point to old route locations. These are **not** deleted when you remove the source files.

**Fix**:
```bash
rm -rf .next/
tsc --noEmit  # Regenerates from the new source tree
```

**Rule**: Always run `rm -rf .next/` after deleting routes or pages.

### 1.11 Import Path Hygiene After Restructuring

After moving pages deeper into nested directories, relative imports break:

```typescript
// ❌ Breaks after move to app/[locale]/(routes)/style-quiz/page.tsx
import { useQuizStore } from "../../stores/style-quiz";

// ✅ Stable via alias
import { useQuizStore } from "@/stores/style-quiz";
```

**Rule**: Always use path aliases (`@/...`) for cross-module imports. Use relative paths only within the same feature folder.

---

## 2. React 19 — Breaking Changes

### 2.1 `JSX.Element` Is Removed; `ReactElement` Is Legacy

The global `JSX` namespace no longer exists. Do not use `JSX.Element` as a return type. `ReactElement` from `react` is also a legacy pattern — prefer inferred return types exclusively.

```tsx
// ❌ BANNED
function Component(): JSX.Element { return <div />; }

// ⚠️ Legacy — do not use in new code
import type { ReactElement } from "react";
function Component(): ReactElement { return <div />; }

// ✅ CORRECT — inferred return type (preferred for all components)
function Component() { return <div />; }
```

**Migration**: Remove ALL `import type { ReactElement }` and `: ReactElement` / `: Promise<ReactElement>` annotations from existing components.

### 2.2 Forms: Use `useActionState`

```tsx
"use client";
import { useActionState } from "react";

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

### 2.3 Instant UI: `useOptimistic` + `startTransition`

For complex state that needs instant feedback with server confirmation:

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

### 2.4 `"use client"` Must Be First Line

The directive must appear before any imports:

```tsx
"use client"; // MUST be first line
import { useState } from "react";
```

### 2.5 RSC: No Browser APIs

Server Components cannot access `window`, `document`, `localStorage`, `requestAnimationFrame`, or any browser-only API. Use `"use client"` components for anything requiring these.

---

## 3. Tailwind CSS v4 — Migration & Patterns

### 3.1 Zero Config — CSS-First

No `tailwind.config.js` / `tailwind.config.ts`. All configuration lives in `globals.css`:

```css
@import "tailwindcss";

@theme inline {
  --color-brand: oklch(0.65 0.28 350);
  --font-display: "Cormorant Garamond", serif;
}
```

### 3.2 Critical Utility Migrations

| v3 Utility | v4 Replacement | Why |
|-----------|---------------|-----|
| `bg-gradient-to-r` | `bg-linear-to-r` | Build error if not migrated |
| `bg-gradient-to-t` | `bg-linear-to-t` | Build error if not migrated |
| `outline-none` | `outline-hidden` | **Critical a11y fix** — preserves Forced Colors Mode |
| `flex-shrink-0` | `shrink-0` | Silent style failure |

### 3.3 Custom Utilities

```css
/* ❌ v3 style */
@layer utilities {
  .font-display { font-family: var(--font-display); }
}

/* ✅ v4 style */
@utility font-display {
  font-family: var(--font-display);
}
```

### 3.4 CSS Variables

```tsx
// ❌ v3 bracket syntax
<div className="bg-[--brand]">

// ✅ v4 parenthesis syntax
<div className="bg-(--brand)">
```

### 3.5 Negative Values

Single hyphen: `-bottom-24`, not `bottom--24`.

### 3.6 No Raw Hex Colors

```tsx
// ❌ BANNED
<div className="bg-[#1a1a2e]">

// ✅ Use design tokens
<div className="bg-obsidian-900">
```

### 3.7 Variant Stacking Order

Left-to-right: `*:first:pt-0` (not `first:*:pt-0`).

### 3.8 Scanning for Deprecated Utilities

```bash
grep -rEn '\bbg-gradient-to-[a-z]+\b|\boutline-none\b|\bflex-shrink-0\b' src/
grep -rEn 'text-\[#[0-9A-Fa-f]{3,6}\]|bg-\[#[0-9A-Fa-f]{3,6}\]' src/
```

---

## 4. TypeScript — Strict Mode Enforcement

### 4.1 Zero Enums, Zero Namespaces

```ts
// ❌ BANNED (erasableSyntaxOnly)
enum Status { ACTIVE = "ACTIVE", DRAFT = "DRAFT" }
namespace MySpace { export interface Config {} }

// ✅ CORRECT
type Status = "ACTIVE" | "DRAFT";
interface Config { /* ... */ }
```

### 4.2 No `any` — Use `unknown` or Typed Interfaces

```ts
// ❌ BANNED
function process(data: any) { /* ... */ }
const ctx = {} as any;

// ✅ CORRECT
function process(data: unknown) { /* ... */ }
const ctx: Record<string, never> = {};
```

### 4.3 `import type` for Type-Only Imports

```ts
// ❌ BANNED with verbatimModuleSyntax
import { ReactElement } from "react";

// ✅ CORRECT
import type { ReactElement } from "react";
```

### 4.4 Interface Over Type for Structures

```ts
// Preferred for structural definitions
interface ProductCardProps {
  title: string;
  price: number;
}

// Use type for unions/intersections
type SortOption = "newest" | "price-asc" | "price-desc";
```

### 4.5 Verification Command

```bash
tsc --noEmit
# Or: pnpm typecheck
```

---

## 5. PostgreSQL + Drizzle ORM

### 5.1 Schema Sync Is Mandatory After Changes

After modifying `drizzle.config.ts` or schema files, regenerate:

```bash
npx drizzle-kit generate
npx drizzle-kit push   # or: npx drizzle-kit migrate
```

Symptom of stale types: `TS2339: Property 'X' does not exist on type 'Y'`

### 5.2 No Business-Logic Fields Without Schema backing

If a field like `relevance` makes business sense but isn't in your Drizzle schema, it does **not** exist at runtime. Always verify against the schema before using in queries.

### 5.3 Drizzle `decimal` → `number` Conversion

Drizzle's `decimal` type returns strings by default. Convert in your service layer before passing to client components:

```ts
// Service layer
const products = await db.select().from(productsTable);
return products.map(p => ({
  ...p,
  price: Number(p.price),
}));
```

### 5.4 Typed Query Results

Use Drizzle's inferred types for full type safety:

```ts
import { type InferSelectModel } from "drizzle-orm";
import { products } from "@/db/schema";

type Product = InferSelectModel<typeof products>;

// For complex joins
const results = await db
  .select()
  .from(products)
  .leftJoin(categories, eq(products.categoryId, categories.id));
// results type is inferred automatically
```

### 5.5 Raw `pg` Driver — Connection Management

```ts
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Always use pool.query() or pool.connect() with release
const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
```

### 5.6 Service Factory Pattern (RSC-First)

Use factory functions to encapsulate Drizzle queries. Never call the database directly in a page or server action:

```ts
// services/products.service.ts
import { db } from "@/db";
import { products, type InferSelectModel } from "@/db/schema";

type Product = InferSelectModel<typeof products>;

export function createProductsService() {
  return {
    async getNewArrivals(limit = 8): Promise<(Product & { price: number })[]> {
      const rows = await db
        .select()
        .from(products)
        .where(eq(products.status, "ACTIVE"))
        .orderBy(desc(products.createdAt))
        .limit(limit);
      return rows.map(p => ({ ...p, price: Number(p.price) }));
    },
    async getBySlug(slug: string) {
      return db.query.products.findFirst({ where: eq(products.slug, slug) });
    },
  };
}
```

**Why factories**: Injectable, mockable, testable, consistent type conversion, single source of truth for query logic.

---

## 6. Server/Client Component Patterns

### 6.1 RSC Data Fetching → Client Component Rendering

```tsx
// Server Component (RSC) — fetches data
import { ProductGrid } from "./ProductGrid";

export default async function ShopPage() {
  const products = await getProducts(); // runs on server
  return <ProductGrid products={products} />; // passes to client
}

// Client Component — handles interactivity
"use client";
export function ProductGrid({ products }: { products: Product[] }) {
  // interactive UI here
}
```

### 6.2 Server Actions for Mutations

```tsx
// actions/cart.ts
"use server";
import { cookies } from "next/headers";

export async function addToCart(productId: string) {
  const session = (await cookies()).get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  // ... mutation logic
}
```

### 6.3 Never Access Browser APIs in RSC

```tsx
// ❌ BANNED in Server Components
export default function Page() {
  const width = window.innerWidth; // CRASH
}

// ✅ Extract to client component
"use client";
import { useState, useEffect } from "react";
export function WindowWidth() {
  const [width, setWidth] = useState(0);
  useEffect(() => setWidth(window.innerWidth), []);
  return <span>{width}px</span>;
}
```

### 6.4 RSC Data Boundaries — Zero Client Waterfall

The RSC pattern eliminates client-side data fetching waterfalls:

1. **Server Component** fetches data (zero network cost to client).
2. **Client Component** receives data via props (handles scroll, interactivity, state).
3. Client Components handle mutations (form submissions, button clicks).

```tsx
// Server Component — zero client waterfall
import { createProductsService } from "@/services/products.service";
import { ProductGridClient } from "./ProductGridClient";

export default async function NewArrivals() {
  const service = createProductsService();
  const products = await service.getNewArrivals(8);
  return <ProductGridClient products={products} />;
}
```

---

## 7. Error Tracking with Zero Hard Dependencies

`@sentry/nextjs` adds ~100KB to bundle and requires complex configuration. Use a dynamic import with fallback stub:

```ts
// lib/sentry.ts — fallback stub
export function captureException(error: Error): void {
  console.error("[Telemetry] Captured exception:", error);
}
```

```tsx
// app/global-error.tsx
"use client";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import("@sentry/nextjs")
        .then((Sentry) => Sentry.captureException(error))
        .catch(() =>
          import("@/lib/sentry").then(({ captureException }) => captureException(error))
        );
    }
  }, [error]);

  return (
    <html>
      <body>
        <h2>Something went wrong</h2>
        <button onClick={() => window.location.reload()}>Try again</button>
      </body>
    </html>
  );
}
```

---

## 8. 6-Phase Execution Framework

Follow this sequence for every non-trivial task:

| Phase | Objective | Gate |
|---|---|---|
| **ANALYZE** | Deep requirement mining, risk assessment, ambiguity identification | Existing code audited. Multiple approaches explored. |
| **PLAN** | File matrix, success criteria, timeline | No code without documented plan. |
| **VALIDATE** | Confirm alignment, address concerns | User explicitly confirms. |
| **IMPLEMENT** | Modular components, TDD, inline docs | Zero console errors, all states handled. |
| **VERIFY** | `tsc --noEmit`, lint, test, build | All checks green. |
| **DELIVER** | Handoff docs, runbook, next steps | Future agent can onboard from docs alone. |

---

## 9. Accessibility Patterns

### 9.1 `useReducedMotion` Hook

```ts
import { useEffect, useState } from "react";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
```

### 9.2 Scroll Reveal (`IntersectionObserver`)

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

export default function ScrollReveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true);
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={clsx("reveal", isVisible && "visible", className)}>
      {children}
    </div>
  );
}
```

---

## 10. Testing Patterns

### 10.1 `getByText` with Duplicate Text

```ts
// ❌ Fails with "Found multiple elements"
const el = screen.getByText("Sale");

// ✅ Use getAllByText
const els = screen.getAllByText("Sale");

// ✅ Or use container.querySelector for precision
const el = container.querySelector('[data-testid="sale-badge"]');
```

### 10.2 Mocking `cookies()` in Tests

```ts
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: vi.fn().mockReturnValue(undefined) })),
}));
```

### 10.3 Mocking `requestAnimationFrame`

```ts
// In setup.ts
vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(cb, 0));
vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
```

### 10.4 Mocking Database (Drizzle) in Server Action Tests

```ts
vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: vi.fn().mockReturnValue(undefined) })),
}));
```

### 10.5 TDD Workflow

1. **RED**: Write failing test
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Clean up while keeping tests green
4. **VERIFY**: Run `tsc --noEmit` + test suite

---

## 11. Verification Pipeline

```bash
# Full verification (must all pass before completion)
tsc --noEmit && eslint . && vitest run && next build
```

### Individual Commands

```bash
tsc --noEmit        # TypeScript check
eslint .            # Linting
vitest run          # Unit/component tests
next build          # Production build
```

### Post-Schema-Change Verification

```bash
npx drizzle-kit generate && tsc --noEmit
```

### Post-Route-Change Hygiene

```bash
rm -rf .next/       # Clear stale generated types
tsc --noEmit        # Regenerate from new source tree
```

### Scan Commands for Code Quality

```bash
# Tailwind v3 deprecated utilities
grep -rEn 'bg-gradient-to-(r|l|t|b)|outline-none[^-]|flex-shrink-0' src/

# Raw hex colors in className
grep -rEn 'text-\[#[0-9A-Fa-f]{3,6}\]|bg-\[#[0-9A-Fa-f]{3,6}\]' src/

# `enum` / `namespace` scan
grep -rn 'enum ' src/ --include="*.ts" --include="*.tsx"

# `any` type scan
grep -rn ': any' src/ --include="*.ts" --include="*.tsx"

# `window.location` usage (should use router.push)
grep -rn 'window.location' src/ --include="*.tsx"

# `<a>` tag for internal nav (should use Next.js Link)
grep -rn '<a href="/' src/ --include="*.tsx"
```

---

## 12. Common Error → Fix Reference

| Error / Symptom | Cause | Fix |
|----------------|-------|-----|
| `TS2339: Property 'X' does not exist` | Stale generated types | Regenerate: `drizzle-kit generate` + `tsc --noEmit` |
| `TS2307: Cannot find module` (after route move) | Stale `.next/types/` cache | `rm -rf .next/` then `tsc --noEmit` |
| `Property 'get' does not exist on type 'Promise<...>'` | Missing `await cookies()` | `(await cookies()).get("key")` |
| `JSX.Element` not found | React 19 removed global namespace | Use inferred return or `import type { ReactElement }` |
| `outline-none` not working a11y | Tailwind v4 renamed it | Use `outline-hidden` |
| `bg-gradient-to-r` build error | Tailwind v4 renamed it | Use `bg-linear-to-r` |
| `flex-shrink-0` silent failure | Tailwind v4 renamed it | Use `shrink-0` |
| `enum` / `namespace` errors | `erasableSyntaxOnly` bans them | Use string unions and ES modules |
| `window is not defined` in RSC | Browser API in Server Component | Move to `"use client"` component |
| `Type 'string' is not assignable to type 'Date'` | Decimal/date serialization | Convert in service layer before client |
| `middleware.ts deprecation warning` | Next.js 16 deprecated it | Rename to `proxy.ts` |
| Hydration mismatch on `<html>` | Two layouts render document shell | Root layout: pass-through only; nested layout: owns `<html>`/`<body>` |
| Import breaks after page move | Relative paths invalidated | Convert to path aliases (`@/...`) |

---

## 13. Anti-Pattern Checklist

Before submitting code, verify:

- [ ] No `enum` or `namespace` in TypeScript files
- [ ] No `any` type annotations
- [ ] No `JSX.Element` or `ReactElement` return types (prefer inferred)
- [ ] No `bg-gradient-to-*` (use `bg-linear-to-*`)
- [ ] No `outline-none` (use `outline-hidden`)
- [ ] No `flex-shrink-0` (use `shrink-0`)
- [ ] No raw hex colors in Tailwind classes
- [ ] No `window`/`document` access in Server Components
- [ ] No `cookies()` calls without `await`
- [ ] No direct `params` destructuring without `await` in layouts
- [ ] All `"use client"` directives are first line of file
- [ ] Schema changes followed by `drizzle-kit generate`
- [ ] Route deletions followed by `rm -rf .next/`
- [ ] Cross-module imports use path aliases (`@/...`)

---

Here's what was incorporated from luxeverse-architect-skill.md:
New sections added:
Section	Topic	Source
§1.5	Root Layout Paradox — must have <html>/<body> for non-locale routes, but must NOT when nested layout owns them	§7.1, §7.3
§1.10	Stale .next/types/ Cache — rm -rf .next/ mandatory after route deletions	§8.1
§1.11	Import Path Hygiene — relative imports break after moves, use @/ aliases	§8.2
§5.6	Service Factory Pattern — encapsulate Drizzle queries in create*Service() factories	§9.1, §16.2
§6.4	RSC Data Boundaries — zero client waterfall rationale	§16.3
§7	Error Tracking — dynamic Sentry import with fallback stub	§16.5
§8	6-Phase Execution Framework — ANALYZE→PLAN→VALIDATE→IMPLEMENT→VERIFY→DELIVER	§1
§9	Accessibility Patterns — useReducedMotion hook, ScrollReveal component	§11.1, §11.2
§10.4	Database Mocking — Drizzle mock pattern for server action tests	§16.6
§11	Scan Commands — grep patterns for code quality checks	§22
Existing sections updated:
- §1.1 — Added interface PageProps pattern as the safe universal approach
- §2.1 — ReactElement now explicitly marked as legacy, migration path added
- §12 — Added 3 new error rows (TS2307 stale cache, import breaks, route moves)
- §13 — Added 2 new checklist items (route deletions, path aliases)

Deep Understanding & Alignment Analysis
I have now thoroughly reviewed all six documents. Here is my comprehensive analysis of the WHAT, WHY, and HOW of the OneStopNews project, followed by an alignment check against the planning documents.
What: The Product
OneStopNews is a topic-first news aggregation and AI summarisation platform. It reorients news consumption away from "who published it" to "what it's about," using a two-level category/subcategory hierarchy.
Core Capabilities:
- Topic-First Feed: Articles from 50–200+ RSS/Atom/JSON sources, grouped by subject
- AI Nutrition Label: Source-cited AI summaries with full transparency (model, temperature, coverage %, citations)
- 3-Layer AI Disclosure: JSON-LD + HTTP header + HTML meta tag for EU AI Act Article 50 compliance (C2PA explicitly rejected for text)
- Web Push: AI-summarised push notifications with quiet hours and AES-256-GCM encrypted keys
- Admin Pipeline: BullMQ-powered ingestion, summarisation, scoring, and feed-slice refresh
Why: The Rationale
Decision	Rationale
Next.js 16	Opt-in caching eliminates v13/14 footguns; PPR + Cache Components + proxy.ts
Auth.js v5 beta	Native App Router, HttpOnly cookies, Drizzle adapter; PRD-mandated
BullMQ on Redis	Job graphs (Flows), priorities, built-in monitoring dashboard
PostgreSQL FTS + pg_textsearch	No Elasticsearch operational burden; BM25 ranking inside Postgres
Modular Monolith + Separate Worker	AI summarisation (2–10s) must not block HTTP; no microservices complexity
"Editorial Dispatch" Design	Anti-generic aesthetic: Newsreader + Instrument Sans + Commit Mono
How: The Architecture
Layer Model (Non-Negotiable)
Layer 0: proxy.ts           — Cookie check, redirect. NO DB. NO logic.
Layer 1: App Router           — Route structure, metadata, PPR, Suspense.
Layer 2: Feature Modules     — UI composition, data binding, mutations.
Layer 3: Domain Services      — Pure business logic. No framework imports.
Layer 4: Infrastructure       — Drizzle, BullMQ, Auth.js. Side effects only.
Tech Stack Summary
Layer	Technology	Version
Web Framework	Next.js	≥16.2.6 (CVE-2025-55182 mitigated)
UI Runtime	React	19.2
Language	TypeScript	5.x Strict (noUncheckedIndexedAccess: true)
Styling	Tailwind CSS	v4 (CSS-first, no tailwind.config.js)
Components	Shadcn UI + Radix	Latest
ORM	Drizzle ORM	Latest
Auth	Auth.js	5.0.0-beta.x
Database	PostgreSQL	17
Search	tsvector + pg_textsearch	Built-in / 1.0.0
Job Queue	BullMQ	5.x
Queue Backend	Redis	7.x
Worker Runtime	Node.js	24 LTS
Alignment Check: Current Status vs. Plans
What the Documents Mandate (8 Phases from MEP v5.1)
Phase	Status	Key Deliverables
Phase 1: Foundation & Configuration	**COMPLETE**	next.config.ts, proxy.ts, tsconfig.json, drizzle.config.ts, .env.example, docker-compose.yml
Phase 2: Database Schema & Infrastructure	**COMPLETE**	schema.ts (10 tables), lib/db/index.ts, lib/auth/index.ts, lib/auth/dal.ts, lib/queue/index.ts
Phase 3: Design System & Shared Components	**COMPLETE**	globals.css with @theme, fonts, Button.tsx, Badge.tsx, Skeleton.tsx, Header.tsx, Footer.tsx, PageTransition.tsx
Phase 4: Core Feed Feature	**COMPLETE**	FeedGrid.tsx, ArticleCard.tsx, TopicNav.tsx, home page, topic pages, article detail, cursor pagination (67 tests)
Phase 5: AI Summarisation Pipeline	**COMPLETE**	Zod schema, prompts, provenance, NutritionLabel, SummaryPanel, DisclosureBadge, actions, API route (99+ tests)
Phase 6: Search, Admin & Public API	NOT STARTED	FTS search, admin routes, source management, summary review, /api/articles
Phase 7: Worker Service, Push & Observability	NOT STARTED	4 workers, content guard, push encryption, quiet hours, health endpoint
Phase 8: Testing, CI/CD & Deployment	NOT STARTED	Vitest, Playwright, Lighthouse CI, Dockerfiles, GitHub Actions
Verified Infrastructure Status (Your Environment)
You confirmed:
- PostgreSQL 17 running in Docker on localhost:5432 ✅
- Redis 7 running in Docker on localhost:6379 ✅
- Applications (Next.js + Worker) will run directly on localhost, not in containers ✅
This matches the architecture: DB/Redis in containers, app code on host.
Identified Gaps & Risks from Document Review
Critical Configuration Risks (from PAD §5.3 / PRD §5.2)
Risk	Mitigation Required
cacheComponents: true must be top-level in next.config.ts	Enforce in Phase 1
cacheLife profiles (feed, topicShell, reference) must be top-level	Enforce in Phase 1
experimental.ppr and experimental.dynamicIO must NOT be present	Will cause build errors
experimental.viewTransition must be inside experimental: {}	Silent failure if misplaced
TypeScript Strictness (from AGENTS.md / PRD §1.5)
- noUncheckedIndexedAccess: true is mandatory — catches arr[i] returning T | undefined
- Zero any — use unknown with type guards
- interface for structures, type for unions/intersections
- No enum or namespace — string unions only
Database Connection (from AGENTS.md / PAD §5.4)
- Lazy Proxy Connection in lib/db/index.ts defers connection until first query
- max: 10 pool for dedicated runtime (Docker/local) — you are running on localhost, so this is correct
- Serverless warning: Not applicable since you're running on localhost
Auth.js v5 Beta Pin (from PAD §8.1 / PRD §1.1)
- next-auth must align with @auth/drizzle-adapter on same @auth/core version
- DrizzleAdapter type issues require as any casts with eslint-disable-next-line comments
Content Availability Guard (from PRD §8.1 / AGENTS.md)
- Never enqueue summarisation for title_only or excerpt — AI hallucination risk
- Only partial_text or full_text articles should be summarised
