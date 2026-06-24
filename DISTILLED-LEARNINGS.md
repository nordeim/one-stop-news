# Distilled Learnings & Tips — Next.js 16 + React 19 + Tailwind v4 + TypeScript + PostgreSQL + Drizzle

> Extracted from battle-tested LuxeVerse documentation. Filtered for relevance to: Next.js 16, React 19, Tailwind CSS v4, TypeScript 5.9+, PostgreSQL (pg), Drizzle ORM.

---

## 1. Next.js 16 — Critical Gotchas

### 1.1 `params` & `searchParams` Are Async (CRITICAL)

Next.js 16 types `params` as `Promise<any>` for page components. The runtime behavior differs by layer:

| Layer                      | Runtime Type      | Must Use                              |
| -------------------------- | ----------------- | ------------------------------------- |
| **Layouts** (`layout.tsx`) | `Promise<...>`    | `const { slug } = await params;`      |
| **Pages** (`page.tsx`)     | Plain object `{}` | `const { slug } = params;` (no await) |

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
export default async function Layout({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
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
export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
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
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

```tsx
// app/[locale]/layout.tsx — SOLE owner of <html>/<body>
export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
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
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
function Component(): JSX.Element {
  return <div />;
}

// ⚠️ Legacy — do not use in new code
import type { ReactElement } from "react";
function Component(): ReactElement {
  return <div />;
}

// ✅ CORRECT — inferred return type (preferred for all components)
function Component() {
  return <div />;
}
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
    { success: false, errors: {} },
  );
  return <form action={formAction}>...</form>;
}
```

### 2.3 Instant UI: `useOptimistic` + `startTransition`

For complex state that needs instant feedback with server confirmation:

```tsx
const [optimisticItems, addOptimistic] = useOptimistic(
  items,
  (state, newItem) => [...state, { ...newItem, pending: true }],
);

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

| v3 Utility         | v4 Replacement   | Why                                                  |
| ------------------ | ---------------- | ---------------------------------------------------- |
| `bg-gradient-to-r` | `bg-linear-to-r` | Build error if not migrated                          |
| `bg-gradient-to-t` | `bg-linear-to-t` | Build error if not migrated                          |
| `outline-none`     | `outline-hidden` | **Critical a11y fix** — preserves Forced Colors Mode |
| `flex-shrink-0`    | `shrink-0`       | Silent style failure                                 |

### 3.3 Custom Utilities

```css
/* ❌ v3 style */
@layer utilities {
  .font-display {
    font-family: var(--font-display);
  }
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
enum Status {
  ACTIVE = "ACTIVE",
  DRAFT = "DRAFT",
}
namespace MySpace {
  export interface Config {}
}

// ✅ CORRECT
type Status = "ACTIVE" | "DRAFT";
interface Config {
  /* ... */
}
```

### 4.2 No `any` — Use `unknown` or Typed Interfaces

```ts
// ❌ BANNED
function process(data: any) {
  /* ... */
}
const ctx = {} as any;

// ✅ CORRECT
function process(data: unknown) {
  /* ... */
}
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
return products.map((p) => ({
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
const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
  userId,
]);
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
      return rows.map((p) => ({ ...p, price: Number(p.price) }));
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
("use client");
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
("use client");
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

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import("@sentry/nextjs")
        .then((Sentry) => Sentry.captureException(error))
        .catch(() =>
          import("@/lib/sentry").then(({ captureException }) =>
            captureException(error),
          ),
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

| Phase         | Objective                                                          | Gate                                                 |
| ------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| **ANALYZE**   | Deep requirement mining, risk assessment, ambiguity identification | Existing code audited. Multiple approaches explored. |
| **PLAN**      | File matrix, success criteria, timeline                            | No code without documented plan.                     |
| **VALIDATE**  | Confirm alignment, address concerns                                | User explicitly confirms.                            |
| **IMPLEMENT** | Modular components, TDD, inline docs                               | Zero console errors, all states handled.             |
| **VERIFY**    | `tsc --noEmit`, lint, test, build                                  | All checks green.                                    |
| **DELIVER**   | Handoff docs, runbook, next steps                                  | Future agent can onboard from docs alone.            |

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
    <div
      ref={ref}
      className={clsx("reveal", isVisible && "visible", className)}
    >
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
  cookies: vi.fn(() =>
    Promise.resolve({ get: vi.fn().mockReturnValue(undefined) }),
  ),
}));
```

### 10.3 Mocking `requestAnimationFrame`

```ts
// In setup.ts
vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
  setTimeout(cb, 0),
);
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
  cookies: vi.fn(() =>
    Promise.resolve({ get: vi.fn().mockReturnValue(undefined) }),
  ),
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

| Error / Symptom                                        | Cause                             | Fix                                                                   |
| ------------------------------------------------------ | --------------------------------- | --------------------------------------------------------------------- |
| `TS2339: Property 'X' does not exist`                  | Stale generated types             | Regenerate: `drizzle-kit generate` + `tsc --noEmit`                   |
| `TS2307: Cannot find module` (after route move)        | Stale `.next/types/` cache        | `rm -rf .next/` then `tsc --noEmit`                                   |
| `Property 'get' does not exist on type 'Promise<...>'` | Missing `await cookies()`         | `(await cookies()).get("key")`                                        |
| `JSX.Element` not found                                | React 19 removed global namespace | Use inferred return or `import type { ReactElement }`                 |
| `outline-none` not working a11y                        | Tailwind v4 renamed it            | Use `outline-hidden`                                                  |
| `bg-gradient-to-r` build error                         | Tailwind v4 renamed it            | Use `bg-linear-to-r`                                                  |
| `flex-shrink-0` silent failure                         | Tailwind v4 renamed it            | Use `shrink-0`                                                        |
| `enum` / `namespace` errors                            | `erasableSyntaxOnly` bans them    | Use string unions and ES modules                                      |
| `window is not defined` in RSC                         | Browser API in Server Component   | Move to `"use client"` component                                      |
| `Type 'string' is not assignable to type 'Date'`       | Decimal/date serialization        | Convert in service layer before client                                |
| `middleware.ts deprecation warning`                    | Next.js 16 deprecated it          | Rename to `proxy.ts`                                                  |
| Hydration mismatch on `<html>`                         | Two layouts render document shell | Root layout: pass-through only; nested layout: owns `<html>`/`<body>` |
| Import breaks after page move                          | Relative paths invalidated        | Convert to path aliases (`@/...`)                                     |

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
Section Topic Source
§1.5 Root Layout Paradox — must have <html>/<body> for non-locale routes, but must NOT when nested layout owns them §7.1, §7.3
§1.10 Stale .next/types/ Cache — rm -rf .next/ mandatory after route deletions §8.1
§1.11 Import Path Hygiene — relative imports break after moves, use @/ aliases §8.2
§5.6 Service Factory Pattern — encapsulate Drizzle queries in create\*Service() factories §9.1, §16.2
§6.4 RSC Data Boundaries — zero client waterfall rationale §16.3
§7 Error Tracking — dynamic Sentry import with fallback stub §16.5
§8 6-Phase Execution Framework — ANALYZE→PLAN→VALIDATE→IMPLEMENT→VERIFY→DELIVER §1
§9 Accessibility Patterns — useReducedMotion hook, ScrollReveal component §11.1, §11.2
§10.4 Database Mocking — Drizzle mock pattern for server action tests §16.6
§11 Scan Commands — grep patterns for code quality checks §22
Existing sections updated:

- §1.1 — Added interface PageProps pattern as the safe universal approach
- §2.1 — ReactElement now explicitly marked as legacy, migration path added
- §12 — Added 3 new error rows (TS2307 stale cache, import breaks, route moves)
- §13 — Added 2 new checklist items (route deletions, path aliases)
