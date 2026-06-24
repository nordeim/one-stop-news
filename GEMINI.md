# OneStopNews — Master Instruction Context

This file serves as the definitive instructional context for the OneStopNews project. It distills the institutional knowledge, architectural mandates, and engineering standards required for all development tasks.

---

## 1. Project Overview & Design Philosophy

OneStopNews is a topic-first news aggregation platform that reorganizes public news around subjects with source-cited AI summaries.

- **Design System**: "Editorial Dispatch" — High-end editorial aesthetic.
- **Typography**: Newsreader (Headlines), Instrument Sans (Body/UI), Commit Mono (Metadata).
- **Compliance**: EU AI Act Article 50 (3-layer machine-readable AI provenance).
- **Anti-Generic**: Rejects "AI slop" and safe templates. Whitespace and hierarchy as structural elements.

---

## 2. The Meticulous Approach (Mandatory SOP)

Every task must follow this 6-phase lifecycle:

1.  **ANALYZE**: Deep requirement mining. Identify explicit, implicit, and edge-case needs.
2.  **PLAN**: Structured execution roadmap. **Present for approval before writing code.**
3.  **VALIDATE**: Obtain explicit user confirmation of the plan.
4.  **IMPLEMENT**: Modular, tested, documented builds. Use library primitives first.
5.  **VERIFY**: Rigorous QA. Edge cases, accessibility (WCAG AAA), and performance.
6.  **DELIVER**: Complete handoff with knowledge transfer.

---

## 3. Tech Stack & Commands

| Layer              | Technology                                                               |
| :----------------- | :----------------------------------------------------------------------- |
| **Web Framework**  | Next.js 16.2.9+ (App Router, Turbopack, `cacheComponents: true`)         |
| **UI Runtime**     | React 19.2 (Stable, View Transitions, `useActionState`, `useOptimistic`) |
| **Language**       | TypeScript 5.7+ (Strict mode, `noUncheckedIndexedAccess: true`)          |
| **Styling**        | Tailwind CSS v4 (with PostCSS plugin), CSS Subgrid                       |
| **Database**       | PostgreSQL 17 + Drizzle ORM                                              |
| **Job Queue**      | BullMQ v5 on Redis (Upstash)                                             |
| **Worker Service** | Node.js 24 LTS (Krypton)                                                 |
| **AI Models**      | Claude 4.5 Haiku (Primary), GPT-5 Mini (Fallback)                        |
| **Authentication** | Auth.js v5 (beta.31)                                                     |

### Key Commands

- `pnpm dev`: Start Next.js (Turbopack).
- `pnpm worker`: Start the background job service.
- `pnpm check`: Runs `tsc --noEmit && pnpm lint` (Pre-commit gate).
- `pnpm test`: Run unit/integration tests (Vitest).
- `pnpm test:e2e`: Run Playwright tests.
- `pnpm db:generate` / `migrate`: Manage database schema.
- `pnpm db:seed`: Seed the database with sample data (idempotent).

---

## 4. Architecture: The 5-Layer Model

Adhere strictly to this hierarchy. Deviations create security and consistency bugs.

- **Layer 0: `proxy.ts`**: Network boundary. Optimistic redirects only. **NO DB, NO LOGIC.**
- **Layer 1: App Router**: Routes, Metadata, PPR, Suspense. **Layouts must not fetch data.**
- **Layer 2: Feature Modules**: UI + `queries.ts` (all DB access) + `actions.ts` (mutations).
- **Layer 3: Domain Services**: Pure business logic. No Next.js or DB client imports.
- **Layer 4: Infrastructure**: Drizzle, Auth.js, BullMQ, AI, Env. Side-effecting operations.

---

## 5. Critical Implementation Standards

### Database: Lazy Proxy Connection

Database connections in `src/lib/db/index.ts` must use a **Proxy** to defer initialization until the first query. This prevents build-time crashes when `DATABASE_URL` is missing.

- **Rule**: Never call `getDb()` directly at module load. Export the `db` proxy.

### Next.js 16: Suspense & Caching

- **Blocking-Route Fix**: Async data fetches in Server Components must be wrapped in `<Suspense>` with a fallback.
- **Rule**: Never `await` a DB query directly in a Page body without a Suspense boundary.

### AI & Provenance

- **Content Guard**: Only summarize articles with `partial_text` or `full_text` availability. Never summarize `title_only` or `excerpt`.
- **3-Layer Disclosure**: Every summary must emit JSON-LD, an `X-AI-Provenance` HTTP header, and a `<meta name="ai-provenance">` tag.

### Workers & Flows

- **Atomic DAG**: Use `FlowProducer` for the `ingest → score → feed-slice refresh` sequence.
- **Rule**: The parent (`feed-slice`) must only run after all children (`score`) complete.

### Environment Validation

- All variables must be declared and validated in `src/lib/env/index.ts` using Zod. The app must fail fast at module load if validation fails.

---

## 6. Anti-Patterns & Critical Pitfalls

| Anti-Pattern                      | Reason                                                                   | Fix                                                      |
| :-------------------------------- | :----------------------------------------------------------------------- | :------------------------------------------------------- |
| `new Date()` in Server Components | Non-deterministic; causes `next-prerender-current-time` build error.     | Move to Client Component or compute from headers.        |
| Missing `@tailwindcss/postcss`    | Tailwind v4 will generate zero utility classes.                          | Ensure `postcss.config.mjs` is present.                  |
| `revalidateTag` in Workers        | Next.js API not available in Node.js worker process.                     | Use Redis pub/sub for cache invalidation.                |
| `.reveal` on top-of-page elements | Causes hydration mismatch (invisible vs visible).                        | Only use scroll-reveal for below-the-fold content.       |
| Corrupted `className`             | Non-ASCII characters (e.g., `font浃着`) or typos break styling silently. | Use standard classes like `font-mono` and audit strings. |
| `as any` in Drizzle `.with()`     | Relational queries break type inference.                                 | Use explicit `.innerJoin()` for type-safety.             |

---

## 7. Current Project Status (Phase 13 Recap)

- **Completed**: Real RSS/Atom/JSON parsing, AI integration (SDK v6), FlowProducer DAG, Redis Rate Limiting (20 req/s), Category API, SHA-256 content hashing.
- **Total Tests**: 212 tests across 40 suites.
- **Next Milestone**: Wiring the Article Detail Page (`/article/[id]`) to real data and full provenance emission.

---

_Refer to **AGENTS.md** for granular technical rules and **PAD v4.5** for architectural deep dives._
