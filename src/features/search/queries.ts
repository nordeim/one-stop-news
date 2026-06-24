/**
 * queries.ts — Search data access layer.
 *
 * PRD §6: Full-text search with ts_rank_cd BM25-style ranking.
 * PAD §3 (ADR-005): PostgreSQL native FTS (ts_rank_cd is built-in).
 * MEP v5.1: LIMIT 31 pattern for cursor pagination.
 *
 * Uses native PostgreSQL FTS:
 * - websearch_to_tsquery() for query parsing
 * - ts_rank_cd() for BM25 relevance ranking
 * - pg_trgm for autocomplete suggestions
 *
 * Phase 19 (M4): Added "use cache" + cacheLife("reference") so repeat
 * searches within the cache window are served from the Next.js cache
 * instead of re-running the FTS query. Search results change slowly
 * (new articles arrive every 15 min via ingest), so a 5-min stale +
 * 1-hour revalidate profile is appropriate.
 */

"use cache";

import { desc, eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { articles, sources } from "@/lib/db/schema";
import { cacheLife } from "next/cache";
import type { ArticleWithSource } from "@/domain/articles/types";
import type { SearchParams, SearchPage, SearchResult } from "./types";

const SEARCH_PAGE_SIZE = 31;

/**
 * searchArticles — Full-text search with BM25 relevance ranking.
 *
 * Uses PostgreSQL native FTS via Drizzle sql template literal.
 * ts_rank_cd weights: title(A) = 1.0, excerpt(B) = 0.4
 */
export async function searchArticles(
  params: SearchParams,
): Promise<SearchPage> {
  // Phase 19 (M4): Cache search results at the reference profile (1h stale,
  // 1d revalidate, 7d expire). Repeat searches within the window are served
  // from cache, dramatically reducing FTS query load on the DB.
  cacheLife("reference");

  const { query, cursor, limit = SEARCH_PAGE_SIZE } = params;

  if (!query.trim()) {
    return { results: [], nextCursor: null, hasMore: false };
  }

  const tsQuery = sql`websearch_to_tsquery('english', ${query})`;
  const rank = sql<number>`ts_rank_cd('{0.1, 0.2, 0.4, 1.0}', ${articles.searchVector}, ${tsQuery})`;

  const whereClause = and(
    sql`${articles.searchVector} @@ ${tsQuery}`,
    cursor ? sql`${articles.publishedAt} < ${cursor}` : undefined,
  );

  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      canonicalUrl: articles.canonicalUrl,
      publishedAt: articles.publishedAt,
      hasSummary: articles.hasSummary,
      summaryStatus: articles.summaryStatus,
      rank,
      source: {
        id: sources.id,
        name: sources.name,
        url: sources.url,
      },
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(whereClause)
    .orderBy(desc(rank), desc(articles.publishedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const resultRows = rows.slice(0, limit);

  const results: SearchResult[] = resultRows.map((row) => ({
    article: {
      id: row.id,
      title: row.title,
      excerpt: row.excerpt,
      canonicalUrl: row.canonicalUrl,
      publishedAt: row.publishedAt,
      hasSummary: row.hasSummary,
      summaryStatus: row.summaryStatus,
      source: row.source,
    } as ArticleWithSource,
    rank: Number(row.rank) || 0,
  }));

  const nextCursor = hasMore
    ? (resultRows[resultRows.length - 1]?.publishedAt.toISOString() ?? null)
    : null;

  return { results, nextCursor, hasMore };
}

/**
 * getSearchSuggestions — Autocomplete suggestions via pg_trgm.
 *
 * Uses similarity() for fuzzy matching on article titles.
 * Returns top 5 matching titles ordered by similarity.
 */
export async function getSearchSuggestions(partial: string): Promise<string[]> {
  if (!partial.trim() || partial.length < 2) {
    return [];
  }

  // Use pg_trgm similarity for fuzzy matching
  const similarity = sql<number>`similarity(${articles.title}, ${partial})`;

  const rows = await db
    .select({
      title: articles.title,
      sim: similarity,
    })
    .from(articles)
    .where(sql`${similarity} > 0.3`)
    .orderBy(desc(similarity))
    .limit(5);

  return rows.map((row) => row.title);
}
