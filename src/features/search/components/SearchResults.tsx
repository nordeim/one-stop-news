/**
 * SearchResults.tsx — Server side search results display.
 *
 * Shows loading state, error state (with Retry), empty state, or a list of
 * ArticleCards. Pure Server Component — no 'use client' needed.
 *
 * Phase 19 (High H3): Added error + onRetry props. Previously, when the
 * underlying searchArticlesAction rejected, the error became an unhandled
 * promise rejection and the UI stayed in the "no results" state with no
 * feedback to the user. Now we render a branded error UI with a Retry
 * button that re-runs the search.
 */

import type { SearchResult } from "../types";
import { ArticleCard } from "@/features/feed/components/ArticleCard";

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  isLoading?: boolean;
  /** Error message to display (renders error UI instead of results). */
  error?: string | null;
  /** Callback invoked when the user clicks Retry. */
  onRetry?: () => void;
}

export function SearchResults({
  results,
  query,
  isLoading = false,
  error = null,
  onRetry,
}: SearchResultsProps) {
  // Error state takes precedence over loading and empty — show the user
  // that the search failed and offer a retry, rather than silently
  // rendering the stale "no results" UI.
  if (error) {
    return (
      <div
        className="py-24 flex flex-col items-center gap-4"
        role="alert"
        aria-live="polite"
      >
        <span
          className="block w-1.5 h-1.5 rounded-full bg-dispatch-ember"
          aria-hidden="true"
        />
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-300">
          Search failed
        </p>
        <p className="font-ui text-sm text-ink-600 max-w-md text-center">
          {error}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center h-9 px-4 rounded-sm text-sm font-medium text-paper-50 bg-ink-900 hover:bg-ink-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50"
            aria-label="Retry search"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center gap-3">
        <div className="w-5 h-5 border-2 border-ink-300 border-t-dispatch-ember rounded-full animate-spin" />
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-300">
          Searching
        </p>
      </div>
    );
  }

  if (results.length === 0 && query) {
    return (
      <div className="py-24 flex flex-col items-center gap-3">
        <span
          className="block w-1.5 h-1.5 rounded-full bg-dispatch-ember"
          aria-hidden="true"
        />
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-300">
          No results for &quot;{query}&quot;
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
        {results.length} result{results.length !== 1 ? "s" : ""}
      </p>
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8"
        role="feed"
        aria-label={`Search results for "${query}"`}
      >
        {results.map(({ article }) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
