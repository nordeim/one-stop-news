---
IMPORTANT: Read fresh for every conversation. This file encodes the institutional knowledge of the OneStopNews codebase. When in doubt, consult AGENTS.md as the canonical source.
---

# OneStopNews

**Topic-first news aggregation with source-cited AI summaries.**

A Next.js 16 + React 19 application backed by PostgreSQL 17, BullMQ v5 on Redis, and a separate Node.js 24 LTS worker service. The "Editorial Dispatch" design system uses Newsreader + Instrument Sans + Commit Mono with CSS Subgrid for feed alignment. Every AI summary carries a 3-layer machine-readable provenance disclosure (JSON-LD + HTTP header + HTML meta tag) for EU AI Act Article 50 compliance.

**Maintained by:** Senior Engineering, Tech Leads, DevOps
**Authoritative Sources:** `AGENTS.md` | `onestopnews_SKILL.md` | `README.md`

---

## Foundational Principles

### The Meticulous Approach (Mandatory 6-Phase Workflow)

1. **ANALYZE** — Deep requirement mining. Read actual source files (never assume). Identify explicit, implicit, and edge-case needs. Explore multiple approaches. Assess risks.
2. **PLAN** — Structured execution roadmap. Present for explicit user confirmation before writing code.
3. **VALIDATE** — Obtain user approval. Address concerns. Never proceed without alignment.
4. **IMPLEMENT** — Modular, tested, documented builds. TDD: RED → GREEN → REFACTOR → COMMIT. Use library components before custom ones.
5. **VERIFY** — Rigorous QA against success criteria. Test edge cases, accessibility (WCAG AAA), and performance.
6. **DELIVER** — Complete handoff with instructions, documentation, and next steps.

**Non-negotiable:** Never write code without completing ANALYZE and PLAN. Never skip VALIDATE.

### Project-Specific Principles

| Principle                  | Rationale                                                                                                                                                                 |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Library Discipline**     | If Shadcn UI / Radix provides the primitive, use it. Wrap for bespoke styling. Never rebuild from scratch.                                                                |
| **Single Source of Truth** | The Drizzle schema is the only source of DB types. Types derive from schema via `(typeof enum.enumValues)[number]`.                                                       |
| **Opt-In Caching**         | Next.js 16 makes caching opt-in via `"use cache"`. Everything is dynamic by default. Don't cache without explicit intent.                                                 |
| **Zero `any`**             | TypeScript strict mode, always. Prefer `unknown` over `any`. Use type inference; explicit types on public APIs only.                                                      |
| **Auth at the DAL**        | `proxy.ts` is UX-only (optimistic redirect). Real authorization lives in `verifySession()` / `verifyAdminSession()` (Server Components/Actions) or `auth()` (API routes). |
| **Content Guard**          | Never enqueue summarisation for `title_only` or `excerpt` articles. Prevents AI hallucination.                                                                            |
| **Fail Fast at Boot**      | Security-critical env vars validated at module load. Never lazily validate.                                                                                               |
| **Secret Hygiene**         | `.env*` files are gitignored (only `.env.example` tracked). `AUTH_SECRET` rejects known-weak values in production. Never commit real secrets. (Phase 21)                  |

---

## Implementation Standards

### Next.js 16 App Router

- **Server Components by default.** Use `'use client'` only for interactivity (state, effects, browser APIs).
- **Async `params` / `searchParams`** are `Promise<T>`. Always `await` them. Synchronous access causes runtime 500.
- **`cookies()` is async** — always `await` before calling `.get()`.
- **No data fetching in Layouts.** Layouts cause re-renders. Fetch in Pages.
- **`<Suspense>` + Server Component pattern** for all dynamic data. Never `await` a DB query directly in a page body — triggers `blocking-route` error.
- **Route Handlers** (`app/api/.../route.ts`) for public HTTP endpoints. Server Actions for mutations.
- **`<Image>` component** for all images (optimization, lazy loading, CLS prevention). External domains must be in `next.config.ts` `remotePatterns`.
- **`error.tsx`** and **`loading.tsx`** at every route segment for error boundaries and streaming UI.
- **`proxy.ts`** (not `middleware.ts`) is the network boundary. Cookie check + redirect only. NO DB calls.
- **Route groups `(name)` don't affect URLs.** To get `/admin/sources`, use `src/app/(admin)/admin/sources/` (folder inside the route group). (Phase 21)
- **API routes use `auth()` directly** (returns session or null → 401 JSON). **Server Components/Actions use `verifySession()`** (returns session or redirects). Never wrap `verifySession()` in try/catch — it catches the redirect. (Phase 21)

#### Critical Configuration (wrong placement = silent breakage)

| Flag                          | Placement                     | What Breaks if Wrong                  |
| :---------------------------- | :---------------------------- | :------------------------------------ |
| `cacheComponents: true`       | **Top-level**                 | Every `"use cache"` silently ignored  |
| `cacheLife` profiles          | **Top-level**                 | `cacheLife('feed')` throws at runtime |
| `turbopack: {}`               | **Top-level**                 | Ignored or config warning             |
| `experimental.viewTransition` | **Inside `experimental: {}`** | Transitions silently disabled         |
| `experimental.ppr`            | **DO NOT INCLUDE**            | Build error in Next.js 16             |
| `experimental.dynamicIO`      | **DO NOT INCLUDE**            | Deprecated                            |

### TypeScript

- **`strict: true`** — non-negotiable.
- **`noUncheckedIndexedAccess: true`** — `arr[i]` returns `T | undefined`, hiding runtime errors.
- **`verbatimModuleSyntax: true`** — requires `import type` for type-only imports.
- **`erasableSyntaxOnly: true`** — forbids `enum` / `namespace`. Use string unions + ES modules.
- **Prefer `interface` over `type`** for structural definitions. `type` for unions/intersections.
- **Early returns** over deeply nested conditionals.
- **Composition over inheritance** — no class hierarchies for business logic.
- **Avoid explicit return types** unless the function is a public API boundary.
- **`import type` for type-only imports** — required when `verbatimModuleSyntax` is enabled.

### Tailwind CSS v4

- **CSS-first configuration** via `@theme` block in `globals.css`. No `tailwind.config.js`.
- **`@tailwindcss/postcss` plugin is MANDATORY.** Without it, zero utility classes generate.
- **Design token discipline:** NEVER use raw hex colors (e.g., `bg-[#1a1a2e]`). All colors from `@theme` tokens.
- **Custom utility classes** defined in `globals.css` via `@layer components`.
- **CSS Subgrid** for feed alignment: `grid-rows-subgrid row-span-3` on cards.

### Drizzle ORM & Database

- **Lazy Proxy Connection:** `lib/db/index.ts` defers connection until first query. Prevents build-time crashes.
- **Migrations:** `drizzle-kit generate` + `migrate`. **Never `push`** in production.
- **Additive-only deployments:** when removing a column, deploy code first, drop column in next release.
- **All queries via `queries.ts`** in the relevant feature module. No raw Drizzle calls in components.
- **Service Factory Pattern:** Encapsulate database queries in factory functions. Injectable, mockable, testable.

### React 19 Patterns

- **Forms:** Use `useActionState` for form state with server actions.
- **Instant UI:** Use `useOptimistic` + `startTransition` for optimistic updates.
- **`"use client"` must be first line** — before any imports.
- **RSC:** No browser APIs in Server Components (`window`, `document`, `localStorage`).

### Design System — "Editorial Dispatch"

| Role      | Typeface                   | Weight  | Tailwind Class   |
| :-------- | :------------------------- | :------ | :--------------- |
| Headlines | Newsreader (variable)      | 800     | `font-editorial` |
| UI / Body | Instrument Sans (variable) | 400–600 | `font-ui`        |
| Metadata  | Commit Mono (self-hosted)  | 400     | `font-mono`      |

**Explicit rejections:** Inter, Roboto, Space Grotesk. Never use them.

**Key colors:** `ink-900 (#1a1a18)`, `ink-600 (#3d3d3a)`, `paper-50 (#fafaf8)`, `dispatch-ember (#c7513f)`.

### Worker & BullMQ

- **Redis config:** `maxRetriesPerRequest: null`, `noeviction` policy.
- **Connection splitting:** Worker connection persists during outages; Queue producer does not.
- **Concurrency:** `ingest: 50`, `summarize: 5`, `score: 20`, `feed-slice: 10`.
- **Flows:** `FlowProducer` for atomic DAG (ingest → score → feed-slice refresh).
- **Graceful shutdown:** `SIGTERM` / `SIGINT` handlers close all workers before exit.

### AI Pipeline & 3-Layer Disclosure

**Content Availability Guard (Anti-Hallucination):**

- `title_only` → **DO NOT summarise**
- `excerpt` → **DO NOT summarise**
- `partial_text` → Summarise permitted (300–1500 chars)
- `full_text` → Summarise preferred (>1500 chars)

**3-Layer Machine-Readable Disclosure (`provenance.ts`):**

1. **JSON-LD** — `<script type="application/ld+json">` in page body (NOT via `metadata.other`)
2. **HTTP Header** — `X-AI-Provenance` base64-encoded JSON
3. **HTML Meta Tag** — `<meta name="ai-provenance" content="...">`

**Summary Review Workflow:** `none → pending → ok` or `needs_review → ok/disabled`

---

## Development Workflow

### Prerequisites

- **Node.js** ≥24 LTS ("Krypton")
- **pnpm** ≥9.x
- **PostgreSQL** ≥17
- **Redis** ≥7.x

### Setup Commands

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — set all required vars (see Environment Variables below)

# 3. Generate and apply database migrations
pnpm db:generate
pnpm db:migrate

# 4. Seed sample data (idempotent)
pnpm db:seed

# 5. Start development (TWO terminals)
pnpm dev      # Terminal 1 — Next.js (Turbopack) on http://localhost:3000
pnpm worker   # Terminal 2 — Worker service (BullMQ + RSS + AI)
```

### Build & Quality Commands

| Command                     | Purpose                                        |
| :-------------------------- | :--------------------------------------------- |
| `pnpm dev`                  | Next.js dev server with Turbopack Fast Refresh |
| `pnpm worker`               | Worker service (BullMQ consumers + RSS + AI)   |
| `pnpm build`                | Production build (Next.js)                     |
| `pnpm start`                | Production server (Next.js)                    |
| `pnpm lint`                 | ESLint (`--max-warnings 0`)                    |
| `pnpm check`                | `tsc --noEmit && pnpm lint` (combined gate)    |
| `pnpm test`                 | Run all test suites (`vitest run`)             |
| `pnpm test:watch`           | Vitest in watch mode                           |
| `pnpm test:e2e`             | Playwright E2E tests                           |
| `pnpm test:integration`     | DB integration tests (requires Docker)         |
| `pnpm drizzle-kit generate` | Generate migration SQL from schema             |
| `pnpm drizzle-kit migrate`  | Apply pending migrations                       |
| `pnpm db:seed`              | Seed sample articles/categories/sources        |
| `pnpm db:studio`            | Drizzle Studio (DB GUI)                        |
| `pnpm format`               | Prettier write                                 |
| `pnpm format:check`         | Prettier check                                 |

### Pre-Commit Gate

```bash
pnpm check    # Runs tsc --noEmit && pnpm lint
pnpm test     # Run all test suites
```

Must pass before any PR is merged. No exceptions.

### Database Commands

| Command            | Purpose                                    |
| :----------------- | :----------------------------------------- |
| `pnpm db:generate` | Generate migration SQL from Drizzle schema |
| `pnpm db:migrate`  | Apply pending migrations                   |
| `pnpm db:seed`     | Seed sample data (idempotent)              |
| `pnpm db:studio`   | Open Drizzle Studio GUI                    |

---

## Testing Strategy

| Category    | Tool                  | Scope                                | Target                  |
| :---------- | :-------------------- | :----------------------------------- | :---------------------- |
| Unit        | Vitest                | Domain logic, utilities, Zod parsing | 80%+ coverage           |
| Integration | Vitest + Docker       | Drizzle queries, BullMQ jobs         | CI gate                 |
| E2E         | Playwright            | Critical user journeys               | Zero visual regressions |
| A11y        | axe-core + Playwright | Keyboard nav, screen reader labels   | WCAG 2.1 AAA            |

**Test Infrastructure:**

- PostgreSQL and Redis run in ephemeral Docker containers for integration tests.
- TypeScript strict mode enforced in test files.
- `vitest.config.ts` at root, with `@/` path alias mapped to `src/`.
- Separate `vitest.integration.config.ts` for DB integration tests (node env, 120s timeout).

**Coverage thresholds:** 80% lines / 80% functions / 70% branches / 80% statements.

---

## Code Quality Standards

- **Lint:** ESLint + Prettier, enforced in CI with `--max-warnings 0`.
- **Types:** `tsc --noEmit` with `strict: true` and `noUncheckedIndexedAccess: true`. Zero `any`.
- **Naming:**
  - Components: PascalCase (`ArticleCard.tsx`)
  - Utilities/hooks: camelCase (`useDebounce.ts`)
  - Feature folders: kebab-case (`/features/feed/`)
  - Database tables: snake_case in Drizzle, camelCase in TypeScript
- **Comments:** Explain _why_, not _what_. Self-documenting code is the goal.

---

## Project-Specific Standards

### The 5-Layer Architecture Model (Golden Rule)

```
Layer 0: proxy.ts           — Cookie check, redirect. NO DB. NO logic.
Layer 1: App Router          — Route structure, metadata, PPR, Suspense.
Layer 2: Feature Modules     — UI composition, data binding, mutations.
Layer 3: Domain Services     — Pure business logic. No framework or DB runtime imports.
Layer 4: Infrastructure      — Drizzle, Auth.js, BullMQ, AI SDK. Side effects only.
```

**Golden Rule:** Deviation from this order creates security and consistency bugs.

### Authentication & Authorization (Auth.js v5)

```ts
// lib/auth/dal.ts — The only correct pattern
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "./index";

export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");
  const user = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
    columns: { id: true, role: true, name: true },
  });
  if (!user) redirect("/sign-in");
  return { user, sessionId: session.user.id };
});

export const verifyAdminSession = cache(async () => {
  const { user } = await verifySession();
  if (user.role !== "admin") redirect("/");
  return user;
});
```

- **`redirect()` not `throw new Error()`** in Server Components.
- **`cache()`** memoizes per-request. Multiple components calling `verifySession()` execute one validation.
- **Every Server Action** must call `verifySession()` or `verifyAdminSession()` as its first line.

### Environment Variables (17 total: 10 required + 6 optional + 1 with default)

All validated by Zod at module load in `src/lib/env/index.ts`. The app fails fast with a descriptive error if any required var is missing.

**Phase 21 Security:** `.env`, `.env.docker`, `.env.local` are gitignored. Only `.env.example` is tracked (placeholder values). `AUTH_SECRET` rejects known-weak values (containing `dev`, `test`, `ci-dummy`, `change-me`, `placeholder`, etc.) in production via `superRefine`.

```bash
# Required (10)
DATABASE_URL=postgresql://user:pass@localhost:5432/onestopnews
REDIS_URL=redis://localhost:6379
AUTH_SECRET=  # min 32 chars, generate: openssl rand -base64 33
                 # Phase 21: rejects known-weak values in production
AUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...  # must start with sk-ant-
OPENAI_API_KEY=sk-...  # must start with sk-
NEXT_PUBLIC_VAPID_PUBLIC_KEY=  # npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@onestopnews.com
PUSH_KEY_ENCRYPTION_KEY=  # 64 hex chars, openssl rand -hex 32

# Optional (6) — OAuth providers (both ID + SECRET required to enable)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
TRUSTED_PROXY=  # "true" | unset — use rightmost IP behind CDN
TRUSTED_PROXY_CIDRS=  # comma-separated CIDRs for proxy-chain walking

# With default
NODE_ENV=development  # development | production | test (default: development)
```

**CRITICAL:** Never read `process.env.*` directly in production code. Import `env` from `@/lib/env`. Never commit `.env*` files (only `.env.example` is tracked).

### Key File Paths

| What                            | Path                                                                                    |
| :------------------------------ | :-------------------------------------------------------------------------------------- |
| Next.js config                  | `next.config.ts`                                                                        |
| Next.js config regression tests | `next.config.test.ts` (Phase 22+23 — CSP/HSTS/XFO/XCTO + X-AI-Provenance header guards) |
| pnpm workspace + overrides      | `pnpm-workspace.yaml` (Phase 23 / BUG-3 — pnpm 9.15+ requires overrides here)           |
| TypeScript config               | `tsconfig.json`                                                                         |
| ESLint config                   | `eslint.config.mjs`                                                                     |
| Vitest config (unit)            | `vitest.config.ts`                                                                      |
| Vitest config (integration)     | `vitest.integration.config.ts`                                                          |
| Playwright config               | `playwright.config.ts`                                                                  |
| PostCSS config                  | `postcss.config.mjs`                                                                    |
| Global CSS + design tokens      | `src/app/globals.css`                                                                   |
| Root layout                     | `src/app/layout.tsx`                                                                    |
| Network boundary                | `proxy.ts` (repo root)                                                                  |
| DB schema                       | `src/lib/db/schema.ts`                                                                  |
| Lazy DB proxy                   | `src/lib/db/index.ts`                                                                   |
| Env validation (Zod)            | `src/lib/env/index.ts`                                                                  |
| Auth config                     | `src/lib/auth/index.ts`                                                                 |
| Auth DAL                        | `src/lib/auth/dal.ts`                                                                   |
| Auth providers                  | `src/lib/auth/providers.ts`                                                             |
| BullMQ queues                   | `src/lib/queue/index.ts`                                                                |
| FlowProducer DAG                | `src/lib/queue/flows.ts`                                                                |
| Rate limiter                    | `src/lib/rateLimit.ts`                                                                  |
| Trusted proxy CIDR walker       | `src/lib/network/getClientIp.ts`                                                        |
| Push key encryption             | `src/lib/security/encrypt.ts`                                                           |
| AI prompts                      | `src/lib/ai/prompts.ts`                                                                 |
| 3-layer provenance              | `src/lib/ai/provenance.ts`                                                              |
| Worker entry                    | `src/workers/index.ts`                                                                  |
| RSS parser                      | `src/workers/jobs/parseFeed.ts`                                                         |
| AI summarizer                   | `src/workers/jobs/summarize.ts`                                                         |
| Content guard                   | `src/workers/jobs/determineContentAvailability.ts`                                      |
| Cache invalidation              | `src/workers/lib/cacheInvalidation.ts`                                                  |
| Feed queries                    | `src/features/feed/queries.ts`                                                          |
| ArticleCard                     | `src/features/feed/components/ArticleCard.tsx`                                          |
| Summary actions                 | `src/features/summaries/actions.ts`                                                     |
| NutritionLabel                  | `src/features/summaries/components/NutritionLabel.tsx`                                  |
| Account page                    | `src/app/account/page.tsx`                                                              |
| Admin sources actions           | `src/app/(admin)/admin/sources/actions.ts`                                              |
| Admin summaries page            | `src/app/(admin)/admin/summaries/page.tsx`                                              |
| Domain types                    | `src/domain/articles/types.ts`                                                          |
| Domain normalize                | `src/domain/articles/normalize.ts`                                                      |
| Importance scoring              | `src/domain/ranking/score.ts`                                                           |
| `cn()` utility                  | `src/shared/lib/utils.ts`                                                               |
| Button                          | `src/shared/components/ui/Button.tsx`                                                   |
| useDebounce                     | `src/shared/hooks/useDebounce.ts`                                                       |
| useReducedMotion                | `src/shared/hooks/useReducedMotion.ts`                                                  |
| PageTransition                  | `src/components/primitives/PageTransition.tsx`                                          |
| CI pipeline                     | `.github/workflows/ci.yml`                                                              |
| E2E pipeline                    | `.github/workflows/e2e.yml`                                                             |
| Pre-commit hook                 | `.husky/pre-commit`                                                                     |
| Env leak CI guard               | `scripts/check-env-leaks.sh` (Phase 25 / F1)                                            |
| Security remediation runbook    | `SECURITY_REMEDIATION.md` (Phase 25 / F1)                                               |
| Accounts unique index migration | `drizzle/0007_accounts_user_provider_unique.sql` (Phase 25 / F3)                        |

---

## Anti-Patterns to Avoid

| #   | Anti-Pattern                                                                   | Fix                                                                                                                                                                                                                                                                                                                                                                                                       |
| :-- | :----------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------- |
| 1   | `any` in TypeScript                                                            | `unknown` + type guards                                                                                                                                                                                                                                                                                                                                                                                   |
| 2   | `enum` / `namespace`                                                           | String unions + ES modules (violates `erasableSyntaxOnly`)                                                                                                                                                                                                                                                                                                                                                |
| 3   | `throw new Error()` in RSC auth                                                | `redirect('/sign-in')`                                                                                                                                                                                                                                                                                                                                                                                    |
| 4   | `drizzle-kit push` in production                                               | `generate` + `migrate` only                                                                                                                                                                                                                                                                                                                                                                               |
| 5   | `process.env.*` outside `src/lib/env/`                                         | Import `env` from `@/lib/env`                                                                                                                                                                                                                                                                                                                                                                             |
| 6   | Runtime imports from `@/lib/db*` in `src/domain/**`                            | `import type` only (enforced by ESLint)                                                                                                                                                                                                                                                                                                                                                                   |
| 7   | `await` in page body without `<Suspense>`                                      | Wrap in `<Suspense fallback={<Skeleton />}>`                                                                                                                                                                                                                                                                                                                                                              |
| 8   | `new Date()` in Server Components                                              | Move to Client Component or compute from headers                                                                                                                                                                                                                                                                                                                                                          |
| 9   | JSON-LD via `metadata.other`                                                   | Render `<script type="application/ld+json">` in page body                                                                                                                                                                                                                                                                                                                                                 |
| 10  | Regex HTML stripping (`/<[^>]*>/g`)                                            | Use `cheerio`                                                                                                                                                                                                                                                                                                                                                                                             |
| 11  | `window.matchMedia()` without `typeof === "function"` guard                    | Add guard (crashes in jsdom + older browsers)                                                                                                                                                                                                                                                                                                                                                             |
| 12  | Server Action without `verifySession()`                                        | Every action starts with auth check                                                                                                                                                                                                                                                                                                                                                                       |
| 13  | `vi.mock()` factory referencing `let`/`const` below it                         | Use `vi.hoisted()`                                                                                                                                                                                                                                                                                                                                                                                        |
| 14  | `cacheLife()` in tests without `next/cache` mock                               | `vi.mock("next/cache", () => ({ cacheLife: vi.fn() }))`                                                                                                                                                                                                                                                                                                                                                   |
| 15  | Missing `SessionProvider` in tests using `useSession()`                        | Mock `next-auth/react` with passthrough `SessionProvider`                                                                                                                                                                                                                                                                                                                                                 |
| 16  | `flowProducer.add()` without try/catch                                         | Wrap + fallback to `scoreQueue.add()` + return status object                                                                                                                                                                                                                                                                                                                                              |
| 17  | `vi.clearAllMocks()` on structural mock chains                                 | Only reset leaf mocks via `mockResolvedValueOnce()`                                                                                                                                                                                                                                                                                                                                                       |
| 18  | Discriminated union assertions without `if` narrowing                          | Use `if (result.status === "linked") { ... }`                                                                                                                                                                                                                                                                                                                                                             |
| 19  | Missing `@tailwindcss/postcss` plugin                                          | Install + create `postcss.config.mjs` + clear `.next/` cache                                                                                                                                                                                                                                                                                                                                              |
| 20  | Raw hex colors in Tailwind classes                                             | Use design tokens (`bg-ink-900`, `text-paper-50`)                                                                                                                                                                                                                                                                                                                                                         |
| 21  | `.env*` files committed to git                                                 | Add `.env`, `.env.*`, `!.env.example` to `.gitignore` (Phase 21)                                                                                                                                                                                                                                                                                                                                          |
| 22  | Route group `(admin)/` expected to produce `/admin/` URLs                      | Add `admin/` subfolder inside route group: `(admin)/admin/sources/` (Phase 21)                                                                                                                                                                                                                                                                                                                            |
| 23  | `verifySession()` wrapped in try/catch (swallows redirect)                     | Remove try/catch — let `NEXT_REDIRECT` propagate; use `auth()` for API routes (Phase 21)                                                                                                                                                                                                                                                                                                                  |
| 24  | CSP with `'unsafe-eval'`                                                       | Remove `'unsafe-eval'` — no code uses `eval()` (Phase 21)                                                                                                                                                                                                                                                                                                                                                 |
| 25  | AES-256-GCM IV of 16 bytes (non-NIST-compliant)                                | Use 12-byte IV per NIST SP 800-38D (Phase 21)                                                                                                                                                                                                                                                                                                                                                             |
| 26  | Rate limiter fails-closed (500) on Redis outage                                | Wrap in try/catch, fail OPEN (200 + warning) (Phase 21)                                                                                                                                                                                                                                                                                                                                                   |
| 27  | `AUTH_SECRET` accepts known-weak values in production                          | `superRefine` rejecting weak patterns in production (Phase 21)                                                                                                                                                                                                                                                                                                                                            |
| 28  | `deleteSource` identical to `pauseSource` (both soft delete)                   | `deleteSource` = hard delete (`db.delete` with cascade); `pauseSource` = soft (Phase 21)                                                                                                                                                                                                                                                                                                                  |
| 29  | Comment claims a directive was removed but the actual string still contains it | Add a regression test asserting the absence. CSP `'unsafe-eval'` regression survived 2 phases because no test verified the claim (Phase 22 / H1).                                                                                                                                                                                                                                                         |
| 30  | Asymmetric rate-limiter protection across routes                               | When adding rate limiting to a new route, audit ALL existing rate-limited routes for the same patterns (fail-open, per-user keying, retry-after headers). `/api/summarize/[id]` was missing fail-open for 2 phases (Phase 22 / N1).                                                                                                                                                                       |
| 31  | Server Actions tested but not wired to UI                                      | Server Actions are dead code if no `<form action={...}>` or `useActionState` calls them. Add a UI integration test that renders the consuming component and asserts the form binding. `pauseSource` was dead for 1 phase (Phase 22 / N5).                                                                                                                                                                 |
| 32  | Tarball remediation snapshots committed to repo root                           | Use git history or external storage for snapshots. Add `*.tar.gz` to `.gitignore` proactively. 119MB of stale archives removed (Phase 22 / N2).                                                                                                                                                                                                                                                           |
| 33  | `pnpm format:check` scans vendored/historical docs by default                  | Create `.prettierignore` excluding `skills/`, `docs/`, `*.archived`, lockfiles, binary assets (Phase 22 / N6).                                                                                                                                                                                                                                                                                            |
| 34  | `pnpm audit \|\| true` in CI                                                   | Promote to hard gate after mitigations reduce vuln count below threshold. Document the runbook for handling future high/critical vulns (Phase 22 / F4).                                                                                                                                                                                                                                                   |
| 35  | `metadata.other` used for HTTP headers                                         | Next.js 16 `metadata.other` ONLY emits `<meta>` tags, NEVER HTTP headers. Setting `"X-AI-Provenance"` in `metadata.other` creates a `<meta name="X-AI-Provenance">` tag, not an HTTP header. Use `next.config.ts` `headers()` for HTTP headers (Phase 23 / BUG-2).                                                                                                                                        |
| 36  | `pnpm.overrides` in `package.json` (pnpm 9.15+)                                | pnpm 9.15+ no longer reads the `pnpm` field in `package.json` — overrides silently ignored, CVEs remain unmitigated. Move overrides to `pnpm-workspace.yaml` with `packages: []` + `overrides:` block. Regenerate lockfile (Phase 23 / BUG-3).                                                                                                                                                            |
| 37  | Missing `data-scroll-behavior` attribute on `<html>`                           | Next.js 16 view transitions warn: "Detected `scroll-behavior: smooth`". Add `data-scroll-behavior="smooth"` to `<html>` in `layout.tsx` (Phase 23 / F5).                                                                                                                                                                                                                                                  |
| 38  | `useSession()` in Client Components without mounted guard                      | `useSession()` returns `loading` during SSR but `unauthenticated`/`authenticated` on initial client render, causing hydration mismatch. Add `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])` and render a consistent skeleton while `!mounted                                                                                                                       |     | status === "loading"` (Phase 24). |
| 39  | Confusing primary key with foreign key in cross-table updates                  | `summaries.id` (PK) ≠ `articles.id` (PK); `summaries.articleId` is the FK. Using `summaries.id` in an `eq(articles.id, summaryId)` update silently affects zero rows. Always join or look up the correct FK before cross-table updates (Phase 24 / C2).                                                                                                                                                   |
| 40  | `JSON.stringify` output in `dangerouslySetInnerHTML` without HTML escaping     | `JSON.stringify` does NOT escape `<`, `>`, `&`, U+2028, U+2029. Embedding its output in `<script type="application/ld+json">` via `dangerouslySetInnerHTML` allows `</script>` injection from untrusted input (e.g., RSS article titles). Escape via `escapeForScriptContext()` after `JSON.stringify` — uses JSON-compatible `\u00XX` sequences so `JSON.parse()` round-trips correctly (Phase 25 / F2). |
| 41  | Application-level uniqueness check + post-hoc filter (race condition)          | Querying by a subset of the uniqueness key + post-hoc `if (existing.userId === user.id)` check is racy — two concurrent calls can both pass the check. Query by the FULL tuple `and(eq(a, x), eq(b, y))` AND enforce uniqueness at the DB level with a unique index. The post-hoc check is a code smell — it means the query wasn't scoped correctly (Phase 25 / F3).                                     |
| 42  | Composite `ORDER BY` with single-column cursor                                 | `ORDER BY (rank, publishedAt)` with cursor `publishedAt < cursor` skips/duplicates rows when multiple rows share the same rank. Add a deterministic tiebreaker (e.g., UUID `id`) to ORDER BY and use a composite cursor `(publishedAt, id) < (cursor.publishedAt, cursor.id)`. Design cursors as opaque tokens encoding the full sort key (Phase 25 / F6).                                                |
| 43  | Dead code surviving refactors                                                  | When refactoring a function out of use (e.g., Phase 23 / BUG-2 moved `X-AI-Provenance` from `metadata.other` to `next.config.ts`), always `grep` for ALL consumers before deleting. `generateHttpHeader()` survived 2 phases as dead code because the refactor removed the caller but not the function. Delete immediately or add a regression test asserting the absence (Phase 25 / F4).                |

## Git & Version Control

- **Atomic commits** — one logical change per commit.
- **TDD cycle** — one Red-Green-Refactor cycle per commit.
- **Pre-commit hooks** — husky + lint-staged runs eslint + prettier on staged `.ts`/`.tsx`.
- **No `db:push` script** — removed from `package.json`. Use `db:generate` + `db:migrate`.

---

## Error Handling & Debugging

### Error Handling Approach

- **Server Components:** Use `redirect()` for auth failures, not `throw`.
- **Client Components:** `try/catch` with user-friendly error messages + retry buttons.
- **API Routes:** Return structured JSON errors with appropriate HTTP status codes.
- **Server Actions:** Return status objects, never re-throw if side effect landed.

### Common Debugging Scenarios

| Symptom                                               | Cause                                                                                     | Fix                                                                                                                    |
| :---------------------------------------------------- | :---------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| Page completely unstyled                              | Missing `@tailwindcss/postcss`                                                            | Install plugin + create `postcss.config.mjs` + `rm -rf .next/`                                                         |
| `blocking-route` error                                | Uncached data fetch outside `<Suspense>`                                                  | Wrap in `<Suspense>`                                                                                                   |
| `next-prerender-current-time`                         | `new Date()` in Server Component                                                          | Move to Client Component                                                                                               |
| Commit Mono not loading                               | Using `@fontsource/commit-mono`                                                           | Self-host via `next/font/local`                                                                                        |
| 64 tsc errors in `skills/`                            | Vendored code not excluded                                                                | Add `"skills"` to tsconfig `exclude`                                                                                   |
| `cacheLife is not a function` in tests                | No Next.js cache context                                                                  | `vi.mock("next/cache", () => ({ cacheLife: vi.fn() }))`                                                                |
| `useSession` requires `SessionProvider`               | Test doesn't go through layout                                                            | Mock `next-auth/react`                                                                                                 |
| Rate limit 429 behind CDN                             | Leftmost XFF IP spoofable                                                                 | Set `TRUSTED_PROXY=true` + `TRUSTED_PROXY_CIDRS`                                                                       |
| Admin sidebar links 404                               | Route group `(admin)/` doesn't affect URLs                                                | Add `admin/` subfolder: `(admin)/admin/sources/` (Phase 21)                                                            |
| `revalidatePath("/admin/sources")` no-op              | Same route group issue                                                                    | Fixed by Phase 21 admin folder restructure                                                                             |
| API returns 500 instead of 401 (auth)                 | `verifySession()` redirect caught by try/catch                                            | Use `auth()` directly in API routes; remove try/catch (Phase 21)                                                       |
| Redis outage takes down `/api/articles`               | Rate limiter throws uncaught                                                              | Fail-open try/catch around `checkRateLimit()` (Phase 21)                                                               |
| `pnpm build` fails: weak AUTH_SECRET                  | Production rejects placeholder values                                                     | Generate strong secret: `openssl rand -base64 33` (Phase 21)                                                           |
| `.env.local` with real keys in git history            | `.gitignore` didn't exclude `.env*`                                                       | Untrack + rotate exposed secrets (Phase 21)                                                                            |
| CSP `'unsafe-eval'` "removed" but still present       | Comment claimed removal but the value was never edited                                    | Regression test in `next.config.test.ts` asserts the absence (Phase 22 / H1)                                           |
| `/api/summarize/[id]` returns 500 on Redis outage     | Rate limiter had no fail-open try/catch (asymmetric with `/api/articles`)                 | Wrap `checkRateLimit()` in try/catch + log warning (Phase 22 / N1)                                                     |
| Admin sources page has no Pause button                | `pauseSource` action existed but no UI consumed it                                        | Wire `<form action={pauseSourceAction}>` + add `pauseSourceAction(formData)` wrapper (Phase 22 / N5)                   |
| Repo bloat from `.tar.gz` remediation archives        | 119MB of phase snapshots committed to repo root                                           | Delete + add `*.tar.gz` to `.gitignore` (Phase 22 / N2)                                                                |
| `pnpm format:check` fails on 226+ markdown files      | No `.prettierignore` — scans vendored skills/ + historical docs                           | Create `.prettierignore` scoping format checks to src/ + active configs (Phase 22 / N6)                                |
| `X-AI-Provenance` HTTP header missing on articles     | `metadata.other` only emits `<meta>` tags, not HTTP headers (Next.js 16)                  | Add static header in `next.config.ts` `headers()` for `/article/:id*`; remove from `metadata.other` (Phase 23 / BUG-2) |
| `pnpm install` warns "pnpm field ignored" + HIGH CVEs | pnpm 9.15+ ignores `pnpm.overrides` in `package.json`                                     | Create `pnpm-workspace.yaml` with `overrides:`; remove `pnpm` field; regenerate lockfile (Phase 23 / BUG-3)            |
| View transitions warning: "Detected scroll-behavior"  | `<html>` missing `data-scroll-behavior` attribute                                         | Add `data-scroll-behavior="smooth"` to `<html>` in `layout.tsx` (Phase 23 / F5)                                        |
| Live site shows `eval()` CSP errors in console        | Production is running `pnpm dev` instead of `pnpm start`                                  | Run `pnpm build && pnpm start` in production (Phase 23 / BUG-1 — deployment fix)                                       |
| `/api/health` returns `redis: error`                  | Redis is not running on the production server                                             | Start Redis (docker-compose or standalone). Rate limiter fails open as designed (Phase 23 / BUG-4)                     |
| `TRUSTED_PROXY` warning in build logs                 | Site is behind CDN but `TRUSTED_PROXY=true` not set                                       | Set `TRUSTED_PROXY=true` + `TRUSTED_PROXY_CIDRS` (Cloudflare CIDRs) in `.env` (Phase 23 / BUG-5)                       |
| `</script>` appearing in rendered JSON-LD `<script>`  | `JSON.stringify` doesn't escape HTML delimiters; untrusted RSS title contains `</script>` | `escapeForScriptContext()` in `provenance.ts` escapes `<>&` + U+2028/2029 (Phase 25 / F2)                              |
| Duplicate "pending" rows in `accounts` table          | `linkOAuthProvider` race condition: query by `provider` only + post-hoc `userId` check    | Query by `(userId, provider)` tuple + DB unique index `accounts_user_provider_idx` (Phase 25 / F3)                     |
| Search results skip/duplicate across pages            | Composite `ORDER BY (rank, publishedAt)` with single-column cursor                        | Add `id` tiebreaker to ORDER BY + compound cursor `publishedAt\|articleId` (Phase 25 / F6)                             |
| CI fails with "Real .env files are tracked by git"    | `.env*` file accidentally `git add`ed despite `.gitignore`                                | `git rm --cached <file>` + verify `bash scripts/check-env-leaks.sh` passes (Phase 25 / F1)                             |
| `tsc` error: `as any` on DrizzleAdapter tables        | Adapter's union generic (pg/mysql/sqlite) prevents direct type-safe cast                  | Use `createPgAdapter()` wrapper specializing generic to `PgDatabase<PgQueryResultHKT>` (Phase 25 / F5)                 |

---

## Security & Compliance

| Concern                  | Posture                                                                                                                                                                                                                                                                                            |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js version          | Pinned to `^16.2.9` (≥16.0.7 mitigates CVE-2025-55182)                                                                                                                                                                                                                                             |
| Auth                     | Auth.js v5 beta (`5.0.0-beta.31`), HttpOnly session cookies                                                                                                                                                                                                                                        |
| AI Disclosure            | 3-layer: JSON-LD + HTTP header + HTML meta. EU AI Act Art. 50 compliant.                                                                                                                                                                                                                           |
| Push keys                | AES-256-GCM encryption at rest. `PUSH_KEY_ENCRYPTION_KEY` 64-char hex.                                                                                                                                                                                                                             |
| DB connections           | Lazy Proxy connection. `max: 10` for dedicated runtimes.                                                                                                                                                                                                                                           |
| Access control           | DAL-layer enforcement. `verifyAdminSession()` redirects non-admins.                                                                                                                                                                                                                                |
| Rate limiting            | `GET /api/articles`: 20 req/s per IP (fail-open on Redis outage, Phase 21 S7). `POST /api/summarize`: 5 req/min/user (fail-open on Redis outage, Phase 22 N1 — symmetric with `/api/articles`).                                                                                                    |
| Content hashing          | SHA-256 (`node:crypto`) of `title\|body\|publishedAt`.                                                                                                                                                                                                                                             |
| Env validation           | All required env vars validated by Zod at module load. `AUTH_SECRET` rejects weak values in production (Phase 21).                                                                                                                                                                                 |
| Cursor validation        | `/api/articles` cursor param validated as ISO 8601; returns `400` on invalid.                                                                                                                                                                                                                      |
| Secret hygiene           | `.env*` gitignored (only `.env.example` tracked). VAPID keys must be rotated if previously committed. (Phase 21)                                                                                                                                                                                   |
| CSP                      | `script-src 'self' 'unsafe-inline'` — `unsafe-eval` removed (Phase 22 / H1 with regression test in `next.config.test.ts`; Phase 21 S4 comment-only fix was incomplete). Migrate to nonce-based CSP in future.                                                                                      |
| AI Provenance (Layer 2)  | `X-AI-Provenance: eu-ai-act-art50-compliant` HTTP header on `/article/:id*` routes via `next.config.ts` `headers()` (Phase 23 / BUG-2 — was incorrectly in `metadata.other` which only emits `<meta>` tags). Regression test in `next.config.test.ts`.                                             |
| Push key IV              | AES-256-GCM with 12-byte IV per NIST SP 800-38D (Phase 21). Backward-compatible with legacy 16-byte IV data.                                                                                                                                                                                       |
| CI security audit        | `pnpm audit --audit-level=high --prod` runs in CI after install — HARD GATE as of Phase 22 / F4 (was non-blocking `\|\| true` in Phase 21). Fails CI on any new high/critical vuln. Lockfile regenerated in Phase 23 / BUG-3 to resolve undici 7.27.2 → 7.28.0 (patched) — 3 HIGH CVEs eliminated. |
| Dependency overrides     | `pnpm-workspace.yaml` with `overrides:` block (Phase 23 / BUG-3). pnpm 9.15+ no longer reads `pnpm.overrides` in `package.json` — must be in `pnpm-workspace.yaml`.                                                                                                                                |
| XSS prevention (JSON-LD) | Phase 25 / F2: `escapeForScriptContext()` escapes `<>&` + U+2028/2029 in JSON-LD output. 8 regression tests in `provenance.test.ts` covering 6 XSS payloads. Prevents `</script>` injection from untrusted RSS article titles via `dangerouslySetInnerHTML`.                                       |
| OAuth account invariant  | Phase 25 / F3: `linkOAuthProvider` queries by `(userId, provider)` tuple. DB unique index `accounts_user_provider_idx` (migration `0007`) enforces invariant. Eliminates race condition + duplicate "pending" rows. 5 regression tests.                                                            |
| Search cursor pagination | Phase 25 / F6: `searchArticles` uses compound cursor `publishedAt\|articleId` with `articles.id` ORDER BY tiebreaker. Eliminates skip/duplicate on rank ties. Backward-compatible with legacy bare-ISO-date cursors. 7 regression tests.                                                           |
| Env leak CI guard        | Phase 25 / F1: `scripts/check-env-leaks.sh` fails CI if any `.env*` (except `.env.example`) is git-tracked. Catches the root cause of the Phase 21 secret leak (`.gitignore` was correct but `git rm --cached` was never run). Add to `.husky/pre-commit` + CI.                                    |
| Type-safe auth adapter   | Phase 25 / F5: `createPgAdapter()` wrapper specializes `DrizzleAdapter` generic to `PgDatabase<PgQueryResultHKT>`. Zero `as any` / `eslint-disable` comments. Replaces 4 per-table casts with a single typed wrapper function.                                                                     |

---

_This CLAUDE.md is derived from AGENTS.md (the canonical institutional knowledge base) and onestopnews_SKILL.md (the complete engineering reference). For exhaustive detail on any topic, consult those files directly._

**Last Updated:** June 25, 2026 (Phase 25 — Independent Code Audit & TDD Remediation: F1 secrets untracked from git + `scripts/check-env-leaks.sh` CI guard + `SECURITY_REMEDIATION.md` runbook, F2 XSS in JSON-LD via `escapeForScriptContext()`, F3 `linkOAuthProvider` race condition fixed + `accounts_user_provider_idx` unique index [migration `0007`], F4 dead `generateHttpHeader()` removed, F5 4× `as any` → `createPgAdapter()` typed wrapper, F6 search cursor pagination compound cursor with `id` tiebreaker; 4 new anti-patterns #40-43; Phase 24 — `UserMenu.tsx` hydration fix, `getArticleWithSummary` status guard [C1], `getArticleIdFromSummary` hasSummary sync [C2]; Phase 23 — `X-AI-Provenance` HTTP header fix [BUG-2], `pnpm-workspace.yaml` for pnpm 9.15+ overrides [BUG-3], `data-scroll-behavior` attribute [F5]). **Tests:** 525 across 69 suites + 10 E2E + 4 a11y + 4 DB-integration (all green). **Deployment recommendations outstanding:** rotate `AUTH_SECRET` + VAPID keys [F1], apply migration `0007` [F3], wire `check-env-leaks.sh` into CI + pre-commit [F1], switch from `pnpm dev` to `pnpm start` [BUG-1], start Redis [BUG-4], set `TRUSTED_PROXY=true` + Cloudflare CIDRs [BUG-5].
