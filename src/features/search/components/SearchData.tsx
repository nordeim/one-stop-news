/**
 * SearchData.tsx — Server Component for initial search results.
 *
 * Fetches initial results based on the query string and renders
 * the client-side search page. Wrapped in <Suspense> by the
 * parent to prevent blocking-route errors in Next.js 16.
 */

import { searchArticles } from "@/features/search/queries";
import { SearchPageClient } from "@/app/(public)/search/SearchPageClient";

interface SearchDataProps {
  searchParams: Promise<{ q?: string }>;
}

export async function SearchData({ searchParams }: SearchDataProps) {
  const { q = "" } = await searchParams;

  const initialResults = q
    ? await searchArticles({ query: q })
    : { results: [], hasMore: false, nextCursor: null };

  return (
    <SearchPageClient
      initialResults={initialResults.results}
      initialQuery={q}
    />
  );
}
