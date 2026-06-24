"use client";

import { Button } from "@/shared/components/ui/Button";

/**
 * LoadMoreButton — Cursor pagination trigger for the home feed.
 *
 * Uses the existing Button primitive (library discipline — never rebuild).
 * Hidden entirely when `hasMore` is false (no disabled "no more results"
 * button — the absence of the button IS the empty state).
 *
 * Accessibility:
 *   - `aria-busy="true"` during loading so screen readers announce status
 *   - `aria-label` makes the button's purpose explicit
 *   - Disabled during loading to prevent double-submit
 */
interface LoadMoreButtonProps {
  /** Whether more articles are available to fetch. When false, the button is not rendered. */
  hasMore: boolean;
  /** Whether a fetch is currently in progress. Disables the button and shows a spinner. */
  isLoading: boolean;
  /** Called when the user clicks the button to load the next page. */
  onClick: () => void;
}

export function LoadMoreButton({
  hasMore,
  isLoading,
  onClick,
}: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center mt-12">
      <Button
        variant="outline"
        size="lg"
        isLoading={isLoading}
        disabled={isLoading}
        onClick={onClick}
        aria-busy={isLoading}
        aria-label="Load more articles"
        data-testid="load-more-button"
      >
        {isLoading ? "Loading…" : "Load More"}
      </Button>
    </div>
  );
}
