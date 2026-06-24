"use client";

import { useState, useCallback } from "react";
import type { ArticleWithSource } from "@/domain/articles/types";
import { FeedGrid } from "./FeedGrid";
import { LoadMoreButton } from "./LoadMoreButton";
import { Button } from "@/shared/components/ui/Button";

/**
 * FeedContainer — Client component managing the home feed article list
 * with cursor-based "Load More" pagination.
 *
 * Architecture:
 *   - Server Component (`FeedData`) fetches the initial page and passes
 *     `initialArticles` + `initialNextCursor` + `initialHasMore` as props.
 *   - This client component manages the appended article list, fetches
 *     subsequent pages from `/api/articles?cursor=...`, and renders the
 *     `LoadMoreButton` (or retry UI on error).
 *
 * UI states handled (per AGENTS.md "All UI states" mandate):
 *   - Success: article list + (Load More button if hasMore)
 *   - Loading: button disabled + spinner
 *   - Error: "Failed to load" message + Retry button
 *   - Empty: handled by FeedGrid's empty state
 *
 * @param initialArticles   - First page of articles (server-fetched)
 * @param initialNextCursor - Cursor for the next page (null if no more)
 * @param initialHasMore    - Whether more pages are available
 */
interface FeedContainerProps {
  initialArticles: ArticleWithSource[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
}

export function FeedContainer({
  initialArticles,
  initialNextCursor,
  initialHasMore,
}: FeedContainerProps) {
  const [articles, setArticles] =
    useState<ArticleWithSource[]>(initialArticles);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialNextCursor,
  );
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/articles?cursor=${encodeURIComponent(nextCursor)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        articles: ArticleWithSource[];
        nextCursor: string | null;
        hasNextPage: boolean;
      };

      setArticles((prev) => [...prev, ...data.articles]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasNextPage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [nextCursor, isLoading]);

  return (
    <>
      <FeedGrid articles={articles} />

      {error && (
        <div
          className="mt-12 flex flex-col items-center gap-4"
          role="alert"
          aria-live="polite"
        >
          <p className="font-mono text-[11px] uppercase tracking-widest text-dispatch-ember">
            Failed to load more articles
          </p>
          <Button
            variant="outline"
            size="md"
            onClick={loadMore}
            disabled={isLoading}
            aria-label="Retry loading articles"
          >
            Retry
          </Button>
        </div>
      )}

      {!error && (
        <LoadMoreButton
          hasMore={hasMore}
          isLoading={isLoading}
          onClick={loadMore}
        />
      )}
    </>
  );
}
