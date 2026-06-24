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
   * Cursor for pagination — must be a `Date` object (NOT a string).
   *
   * Callers are responsible for parsing ISO 8601 strings from URL query
   * params BEFORE calling `searchArticles`. The API boundary at
   * `src/app/api/articles/route.ts:97-108` performs this validation and
   * returns HTTP 400 with a descriptive error for invalid ISO 8601 strings.
   *
   * TypeScript's `Date` type enforces this contract at compile time —
   * passing a string here is a type error. This is intentional: the data
   * layer should not duplicate input validation that the API boundary
   * already handles.
   */
  cursor?: Date;
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
