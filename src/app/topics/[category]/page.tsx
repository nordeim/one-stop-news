/**
 * page.tsx — Category page (topics/[category]).
 *
 * NOTE: This page is synchronous. All data access (params, searchParams,
 * feed data, year) is delegated to FeedData inside <Suspense>.
 * Header derives activeCategory from URL via usePathname().
 */

import { Suspense } from "react";
import { FeedData } from "@/features/feed/components/FeedData";
import { FeedSkeleton } from "@/features/feed/components/FeedSkeleton";
import { Header } from "@/shared/components/layout/Header";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ cursor?: string }>;
}

export default function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  return (
    <div className="min-h-screen bg-paper-50">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main
        id="main-content"
        className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12"
      >
        <Suspense fallback={<FeedSkeleton />}>
          <FeedData params={params} searchParams={searchParams} limit={6} />
        </Suspense>
      </main>
    </div>
  );
}
