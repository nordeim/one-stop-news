/**
 * types.ts — Search domain types.
 *
 * PRD §6: Full-text search with pg_textsearch BM25 ranking.
 * PAD §3 (ADR-005): PostgreSQL FTS + pg_textsearch BM25.
 */

import type { ArticleWithSource } from "@/domain/articles/types";

/**
 * SearchParams — Parameters for searchArticles().
 */
export interface SearchParams {
  query: string;
  categorySlug?: string;
  /**
   * Cursor for pagination — a string token produced by a previous
   * `SearchPage.nextCursor` value.
   *
   * Phase 24 / F6: The cursor format is now a compound token
   * `"publishedAt|articleId"` (e.g., `"2024-06-01T12:00:00.000Z|art-031"`).
   * This enables deterministic pagination when multiple articles share the
   * same `rank` — the `articleId` tiebreaker ensures no rows are skipped
   * or duplicated across pages.
   *
   * Backward compatibility: If the cursor is a bare ISO 8601 date string
   * (the pre-F6 format, without a `|` separator), `searchArticles()` falls
   * back to date-only filtering. This degrades gracefully — no skip/duplicate
   * as long as no rank ties exist.
   *
   * Callers (e.g., the API route) pass the raw string cursor from the URL
   * query param. `searchArticles()` parses it internally.
   */
  cursor?: string;
  limit?: number;
}

/**
 * SearchResult — A single search result with BM25 relevance rank.
 */
export interface SearchResult {
  article: ArticleWithSource;
  rank: number; // ts_rank_cd score
}

/**
 * SearchPage — Paginated search results.
 */
export interface SearchPage {
  results: SearchResult[];
  nextCursor: string | null;
  hasMore: boolean;
}
