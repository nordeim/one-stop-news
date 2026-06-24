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
 *
 * Phase 24 / F6: Fixed cursor pagination bug. The original query used
 * `ORDER BY (rank, publishedAt)` with a single-column cursor
 * `publishedAt < cursor`. When multiple rows shared the same rank, this
 * caused skip/duplicate across pages. The fix adds `articles.id` as a
 * deterministic tiebreaker to ORDER BY and uses a composite cursor
 * `(publishedAt, id)`. The cursor is encoded as `"publishedAt|articleId"`
 * for backward compatibility with old-format (bare ISO date) cursors.
 */

"use cache";

import { desc, eq, and, sql, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { articles, sources } from "@/lib/db/schema";
import { cacheLife } from "next/cache";
import type { ArticleWithSource } from "@/domain/articles/types";
import type { SearchParams, SearchPage, SearchResult } from "./types";

const SEARCH_PAGE_SIZE = 31;

// ── Cursor encoding/decoding (Phase 24 / F6) ────────────────────────────────

/**
 * Parsed compound cursor: (publishedAt, articleId).
 *
 * The `articleId` is the deterministic tiebreaker that ensures correct
 * pagination when multiple articles share the same `publishedAt`.
 */
interface ParsedCursor {
  publishedAt: Date;
  articleId: string;
}

/**
 * Parses a cursor string into (publishedAt, articleId).
 *
 * Accepts two formats:
 *   1. Compound (current): "2024-06-01T12:00:00.000Z|art-031"
 *   2. Legacy (pre-F6): "2024-06-01T12:00:00.000Z" (bare ISO date)
 *
 * For the legacy format, `articleId` is undefined — the caller falls back
 * to date-only filtering (degraded but functional).
 *
 * Returns `undefined` if the cursor is invalid or unparseable.
 */
function parseSearchCursor(raw: string): ParsedCursor | undefined {
  const pipeIdx = raw.indexOf("|");
  if (pipeIdx === -1) {
    // Legacy format: bare ISO date. No tiebreaker.
    const date = new Date(raw);
    if (isNaN(date.getTime())) return undefined;
    return { publishedAt: date, articleId: "" };
  }

  const dateStr = raw.slice(0, pipeIdx);
  const articleId = raw.slice(pipeIdx + 1);
  if (!articleId) return undefined;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return undefined;

  return { publishedAt: date, articleId };
}

/**
 * Encodes a (publishedAt, articleId) tuple into a cursor string.
 *
 * Format: "publishedAt|articleId" (e.g., "2024-06-01T12:00:00.000Z|art-031")
 */
function encodeSearchCursor(publishedAt: Date, articleId: string): string {
  return `${publishedAt.toISOString()}|${articleId}`;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * searchArticles — Full-text search with BM25 relevance ranking.
 *
 * Uses PostgreSQL native FTS via Drizzle sql template literal.
 * ts_rank_cd weights: title(A) = 1.0, excerpt(B) = 0.4, body(C) = 0.2, source(D) = 0.1
 *
 * Phase 24 / F6: ORDER BY now includes `articles.id` as a deterministic
 * tiebreaker. The cursor is a compound `(publishedAt, id)` token.
 */
export async function searchArticles(
  params: SearchParams,
): Promise<SearchPage> {
  // Phase 19 (M4): Cache search results at the reference profile (1h stale,
  // 1d revalidate, 7d expire). Repeat searches within the window are served
  // from cache, dramatically reducing FTS query load on the DB.
  cacheLife("reference");

  const { query, cursor: rawCursor, limit = SEARCH_PAGE_SIZE } = params;

  if (!query.trim()) {
    return { results: [], nextCursor: null, hasMore: false };
  }

  const tsQuery = sql`websearch_to_tsquery('english', ${query})`;
  const rank = sql<number>`ts_rank_cd('{0.1, 0.2, 0.4, 1.0}', ${articles.searchVector}, ${tsQuery})`;

  // Phase 24 / F6: Parse the compound cursor. If the cursor is legacy
  // (bare ISO date), articleId is "" — we fall back to date-only filtering.
  const parsedCursor = rawCursor ? parseSearchCursor(rawCursor) : undefined;

  // Build the cursor filter clause:
  //   - Compound cursor: (publishedAt, id) < (cursor.publishedAt, cursor.articleId)
  //     Implemented as: publishedAt < cursor.publishedAt OR
  //                     (publishedAt = cursor.publishedAt AND id < cursor.articleId)
  //   - Legacy cursor: publishedAt < cursor.publishedAt (date only)
  //   - No cursor: no filter (first page)
  let cursorClause: ReturnType<typeof sql> | undefined;
  if (parsedCursor) {
    if (parsedCursor.articleId) {
      // Compound cursor with tiebreaker — handles rank ties correctly
      cursorClause = sql`(${articles.publishedAt} < ${parsedCursor.publishedAt} OR (${articles.publishedAt} = ${parsedCursor.publishedAt} AND ${articles.id} < ${parsedCursor.articleId}))`;
    } else {
      // Legacy cursor — date only (backward compat)
      cursorClause = lt(articles.publishedAt, parsedCursor.publishedAt);
    }
  }

  const whereClause = and(
    sql`${articles.searchVector} @@ ${tsQuery}`,
    cursorClause,
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
    // Phase 24 / F6: Add articles.id as deterministic tiebreaker.
    // This ensures stable ordering when multiple rows share the same
    // (rank, publishedAt) — which happens for short queries or common terms.
    .orderBy(desc(rank), desc(articles.publishedAt), desc(articles.id))
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

  // Phase 24 / F6: Encode the cursor as a compound token.
  // The last row's (publishedAt, id) becomes the cursor for the next page.
  const lastRow = resultRows[resultRows.length - 1];
  const nextCursor =
    hasMore && lastRow
      ? encodeSearchCursor(lastRow.publishedAt, lastRow.id)
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
