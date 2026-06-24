/**
 * page.tsx — Search_without_suspense
 *
 * PRD §6: Server-rendered search page with client-side updates.
 * MEP v5.1: Uses searchParams for query persistence.
 *
 * NOTE: This page is synchronous. The searchParams promise is
 * passed into SearchData (Server Component), which waits for it
 * inside the <Suspense> boundary, satisfying Next.js 16
 * cacheComponents requirements.
 */

import { Suspense } from "react";
import { SearchData } from "@/features/search/components/SearchData";
import { SearchSkeleton } from "@/features/search/components/SearchSkeleton";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <main
      id="main-content"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <header className="mb-8">
        <h1 className="font-editorial text-3xl text-ink-900">Search News</h1>
        <p className="mt-2 font-ui text-sm text-ink-600">
          Find articles across all topics
        </p>
      </header>

      <Suspense fallback={<SearchSkeleton />}>
        <SearchData searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
