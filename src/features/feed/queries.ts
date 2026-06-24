/**
 * queries.ts — Feed data access layer.
 *
 * PRD §5.4: "Feed queries must explicitly join with the sources table
to populate article.source.name."
 * MEP v6.0: LIMIT 31 pattern for cursor pagination.
 *
 * Architecture (Phase 19+ remediation / T6):
 *   - `buildFeedQuery` is a pure query builder (no "use cache" directive).
 *     It returns a Drizzle query builder that is awaitable. This makes it
 *     unit-testable in vitest without needing the Next.js runtime.
 *   - `getFeedArticles` is the cached public API. It wraps `buildFeedQuery`
 *     with `"use cache"` + `cacheLife("feed")` and transforms the rows into
 *     the `FeedPage` shape (slicing to `limit`, computing `hasMore` and
 *     `nextCursor`).
 */

import { desc, eq, lt, and } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { db } from "@/lib/db";
import { articles, sources, categories } from "@/lib/db/schema";
import type { ArticleWithSource } from "@/domain/articles/types";

const FEED_PAGE_SIZE = 30;

export interface FeedQueryOptions {
  category?: string;
  /**
   * Cursor for pagination — must be a `Date` object (NOT a string).
   *
   * Callers are responsible for parsing ISO 8601 strings from URL query
   * params BEFORE calling `buildFeedQuery` / `getFeedArticles`. The API
   * boundary at `src/app/api/articles/route.ts:97-108` performs this
   * validation and returns HTTP 400 with a descriptive error for invalid
   * ISO 8601 strings.
   *
   * TypeScript's `Date` type enforces this contract at compile time —
   * passing a string here is a type error. This is intentional: the data
   * layer should not duplicate input validation that the API boundary
   * already handles.
   */
  cursor?: Date;
  limit?: number;
}

export interface FeedPage {
  articles: ArticleWithSource[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * buildFeedQuery — Pure query builder for the feed.
 *
 * Returns the Drizzle query builder (awaitable). No "use cache" directive —
 * this function is safe to call from vitest and from non-cached contexts.
 *
 * Contract:
 *   - Fetches `limit + 1` rows so the caller can detect `hasMore`
 *   - innerJoins `sources` to populate `article.source.name` (PRD §5.4)
 *   - Orders by `publishedAt DESC` (most recent first)
 *   - Applies `cursor` filter via `lt(articles.publishedAt, cursor)` when provided
 *   - Applies `category` filter via slug → categoryId resolution when provided
 *   - Returns `[]` (empty array) when the category slug doesn't exist
 *
 * @returns Promise<ArticleWithSource[]> — the raw rows (limit + 1 of them)
 */
export function buildFeedQuery(
  options: FeedQueryOptions = {},
): Promise<ArticleWithSource[]> {
  const { category, cursor, limit = FEED_PAGE_SIZE } = options;

  // If a category slug is provided, resolve it to a categoryId first.
  // If the slug doesn't exist, short-circuit with an empty result.
  if (category) {
    return (async () => {
      const categoryRow = await db.query.categories.findFirst({
        where: eq(categories.slug, category),
      });
      if (!categoryRow) {
        return [] as ArticleWithSource[];
      }
      return runFeedQuery(categoryRow.id, cursor, limit);
    })();
  }

  return runFeedQuery(undefined, cursor, limit);
}

async function runFeedQuery(
  categoryId: string | undefined,
  cursor: Date | undefined,
  limit: number,
): Promise<ArticleWithSource[]> {
  const whereClause = and(
    categoryId ? eq(articles.categoryId, categoryId) : undefined,
    cursor ? lt(articles.publishedAt, cursor) : undefined,
  );

  // Fetch limit + 1 to determine if there's a next page
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      canonicalUrl: articles.canonicalUrl,
      publishedAt: articles.publishedAt,
      hasSummary: articles.hasSummary,
      summaryStatus: articles.summaryStatus,
      source: {
        id: sources.id,
        name: sources.name,
        url: sources.url,
      },
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(whereClause)
    .orderBy(desc(articles.publishedAt))
    .limit(limit + 1);

  return rows as ArticleWithSource[];
}

/**
 * getFeedArticles — Primary feed query with cursor pagination.
 *
 * Wraps `buildFeedQuery` with Next.js 16 `"use cache"` + `cacheLife("feed")`
 * and transforms the raw rows into the `FeedPage` shape:
 *   - Slices to `limit` rows
 *   - Computes `hasMore` (true if rows.length > limit)
 *   - Computes `nextCursor` (ISO 8601 string of last article's publishedAt)
 *
 * NOTE: Uses "use cache" to prevent blocking-route errors in Next.js 16.
 */
export async function getFeedArticles(
  options: FeedQueryOptions = {},
): Promise<FeedPage> {
  "use cache";
  cacheLife("feed");

  const { limit = FEED_PAGE_SIZE } = options;
  const rows = await buildFeedQuery(options);

  // If buildFeedQuery short-circuited (e.g., unknown category slug), rows is []
  if (rows.length === 0) {
    return { articles: [], nextCursor: null, hasMore: false };
  }

  const hasMore = rows.length > limit;
  const resultRows = rows.slice(0, limit);

  const nextCursor = hasMore
    ? (resultRows[resultRows.length - 1]?.publishedAt.toISOString() ?? null)
    : null;

  return {
    articles: resultRows,
    nextCursor,
    hasMore,
  };
}
