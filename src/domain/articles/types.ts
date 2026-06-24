/**
 * Domain types for articles.
 * Derived from Drizzle schema via InferSelectModel.
 * These are the canonical types for all article-related data.
 *
 * Phase 19+ remediation (Batch 4 / H1) — Architectural note:
 * The `import type` statements below are TYPE-ONLY — they are erased at
 * compile time by TypeScript and create NO runtime coupling to
 * `@/lib/db/schema`. This is compliant with the documented rule that
 * `src/domain/**` must have zero Next.js / DB runtime imports. The ESLint
 * rule `no-restricted-imports` in `eslint.config.mjs` enforces this:
 * any non-type import from `@/lib/db*` in `src/domain/**` will fail lint.
 *
 * Rationale: keeping the domain layer runtime-pure means it can be unit-
 * tested without a database connection, reused in non-Next.js contexts
 * (workers, CLI scripts), and refactored without rippling DB-side changes.
 */

import type { InferSelectModel } from "drizzle-orm";
import type { articles, sources, categories, summaries } from "@/lib/db/schema";

// ─── Base Table Types (from Drizzle schema) ──────────────────────────────
export type Article = InferSelectModel<typeof articles>;
export type Source = InferSelectModel<typeof sources>;
export type Category = InferSelectModel<typeof categories>;
export type Summary = InferSelectModel<typeof summaries>;

// ─── Domain-Specific Types ───────────────────────────────────────────────

/**
 * ArticleWithSource — Article with its source information.
 * Requires a JOIN with the sources table in the query.
 */
export interface ArticleWithSource extends Article {
  source: Pick<Source, "id" | "name" | "url">;
}

/**
 * ArticleWithSummary — Article with source, category, and optional summary.
 * Used on the article detail page.
 */
export interface ArticleWithSummary extends ArticleWithSource {
  category: Pick<Category, "id" | "name" | "slug"> | null;
  summary: Summary | null;
}

/**
 * FeedPage — Result of a paginated feed query.
 */
export interface FeedPage {
  articles: ArticleWithSource[];
  nextCursor: string | null;
  hasMore: boolean;
}
