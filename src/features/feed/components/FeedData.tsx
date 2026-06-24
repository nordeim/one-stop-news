import { FeedContainer } from "./FeedContainer";
import { getFeedArticles } from "@/features/feed/queries";
import { Footer } from "@/shared/components/layout/Footer";

interface FeedDataProps {
  category?: string;
  cursor?: Date;
  limit?: number;
  params?: Promise<{ category: string }>;
  searchParams?: Promise<{ cursor?: string }>;
}

/**
 * FeedData — Server Component for fetching and rendering feed articles.
 *
 * This component fetches the initial page of articles and renders the
 * `FeedContainer` (client component) which manages cursor-based "Load More"
 * pagination by calling `/api/articles?cursor=...` on user click.
 *
 * Wrapped in <Suspense> by the parent to prevent blocking the page render
 * in Next.js 16 with cacheComponents enabled.
 */
export async function FeedData({
  category: propCategory,
  cursor: propCursor,
  limit = 6,
  params,
  searchParams,
}: FeedDataProps) {
  let category = propCategory;
  let cursor = propCursor;

  if (params) {
    const resolvedParams = await params;
    category = resolvedParams.category;
  }

  if (searchParams) {
    const resolvedSearchParams = await searchParams;
    const cursorString = resolvedSearchParams?.cursor;
    if (cursorString) {
      cursor = new Date(cursorString);
    }
  }

  const feed = await getFeedArticles({ category, cursor, limit });

  return (
    <>
      <FeedContainer
        initialArticles={feed.articles}
        initialNextCursor={feed.nextCursor}
        initialHasMore={feed.hasMore}
      />
      <Footer />
    </>
  );
}
