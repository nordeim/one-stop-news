"use client";

/**
 * SearchPageClient.tsx — Client-side search interactivity.
 *
 * Wraps SearchBar and SearchResults with URL sync.
 * NOTE: Imports search action from actions.ts (Server Action), NOT queries.ts (DB layer).
 *
 * Phase 19 (High H3): Previously handleSearch had try/finally with NO catch
 * block — if searchArticlesAction rejected, the error became an unhandled
 * promise rejection and the UI stayed in loading state forever. Now we:
 *   1. Catch errors
 *   2. Set an error state
 *   3. Pass error + onRetry to SearchResults, which renders an error UI
 *      with a Retry button
 *   4. Clear the error on every new search attempt
 */

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "@/features/search/components/SearchBar";
import { SearchResults } from "@/features/search/components/SearchResults";
import { searchArticlesAction } from "@/features/search/actions";
import type { SearchResult } from "@/features/search/types";

interface SearchPageClientProps {
  initialResults: SearchResult[];
  initialQuery: string;
}

export function SearchPageClient({
  initialResults,
  initialQuery,
}: SearchPageClientProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [results, setResults] = useState<SearchResult[]>(initialResults);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState(initialQuery);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(
    async (query: string) => {
      setCurrentQuery(query);
      setError(null); // Clear any prior error before a new attempt.

      // Update URL without full page reload
      const params = new URLSearchParams(urlSearchParams);
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      router.push(`/search?${params.toString()}`, { scroll: false });

      setIsLoading(true);
      try {
        const { results: newResults } = await searchArticlesAction({ query });
        setResults(newResults);
      } catch (err) {
        // Phase 19 (H3): previously this catch block was missing — the
        // promise rejected silently, isLoading was reset by `finally`, and
        // the UI stayed in the "no results" state with no feedback that the
        // search had failed. Now we surface a user-friendly error message
        // and offer a Retry button.
        setError(err instanceof Error ? err.message : "Search failed");
        // Clear stale results so the user doesn't see outdated data mixed
        // with an error banner.
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [router, urlSearchParams],
  );

  return (
    <div className="space-y-8">
      <SearchBar
        defaultValue={initialQuery}
        onSearch={handleSearch}
        isLoading={isLoading}
      />
      <SearchResults
        results={results}
        query={currentQuery}
        isLoading={isLoading}
        error={error}
        onRetry={() => handleSearch(currentQuery)}
      />
    </div>
  );
}
