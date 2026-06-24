"use cache";

/**
 * queries.ts — Sources data access layer.
 *
 * Uses "use cache" to prevent blocking-route errors in Next.js 16.
 * Admin data changes infrequently; cached for feed profile duration.
 *
 * Phase 19 (M3): Added paginated variants (getAllSourcesPaginated) so the
 * admin sources table can use cursor-based Load More pagination instead of
 * fetching ALL rows at once. The original getAllSources() is retained for
 * backward compatibility (e.g., worker scheduler.ts iterates all sources).
 */

import { db } from "@/lib/db";
import { sources, categories } from "@/lib/db/schema";
import { cacheLife } from "next/cache";
import { desc, lt } from "drizzle-orm";

export interface SourceRow {
  id: string;
  name: string;
  feedUrl: string | null;
  categoryId: string | null;
  isActive: boolean;
  failureCount: number;
}

export interface CategoryMap {
  [id: string]: string;
}

export interface PaginatedSources {
  sources: SourceRow[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Returns ALL sources (no pagination). Used by the worker scheduler and
 * admin page initial load. For large deployments, prefer getAllSourcesPaginated.
 */
export async function getAllSources(): Promise<SourceRow[]> {
  cacheLife("feed");
  return db.select().from(sources);
}

/**
 * Phase 19 (M3): Paginated sources query (cursor-based, limit+1 pattern).
 *
 * @param cursor  — Optional createdAt ISO date string for cursor pagination.
 *                  Pass null/undefined for the first page.
 * @param limit   — Max sources to return per page (default 50).
 * @returns { sources, nextCursor, hasMore }
 */
export async function getAllSourcesPaginated(
  cursor?: string | null,
  limit: number = 50,
): Promise<PaginatedSources> {
  cacheLife("feed");

  // Cursor is an ISO date string; convert to Date for the query.
  const cursorDate = cursor ? new Date(cursor) : undefined;

  // limit + 1 pattern: fetch one extra row to determine hasMore.
  const rows = await db
    .select()
    .from(sources)
    .where(cursorDate ? lt(sources.createdAt, cursorDate) : undefined)
    .orderBy(desc(sources.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && sliced.length > 0
      ? sliced[sliced.length - 1]!.createdAt.toISOString()
      : null;

  return {
    sources: sliced,
    nextCursor,
    hasMore,
  };
}

export async function getCategoryMap(): Promise<CategoryMap> {
  cacheLife("feed");
  const rows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories);
  const map: CategoryMap = {};
  for (const row of rows) {
    map[row.id] = row.name;
  }
  return map;
}
