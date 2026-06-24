/**
 * FeedSkeleton — Loading placeholder for the feed grid.
 * Mirrors the structure of FeedGrid for zero-layout-shift loading.
 */

export function FeedSkeleton() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8"
      role="feed"
      aria-label="Loading news articles"
      aria-busy="true"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <article
          key={i}
          className="grid grid-rows-subgrid row-span-3 gap-y-3 mb-10 last:mb-0 border-b border-ink-100 pb-6 animate-pulse"
        >
          {/* Headline placeholder */}
          <div className="h-6 bg-paper-200 rounded w-3/4" />

          {/* Excerpt placeholder */}
          <div className="space-y-2">
            <div className="h-4 bg-paper-200 rounded w-full" />
            <div className="h-4 bg-paper-200 rounded w-5/6" />
            <div className="h-4 bg-paper-200 rounded w-4/6" />
          </div>

          {/* Metadata placeholder */}
          <div className="flex items-center gap-3">
            <div className="h-3 bg-paper-200 rounded w-24" />
            <div className="w-1 h-1 rounded-full bg-paper-200" />
            <div className="h-3 bg-paper-200 rounded w-16" />
          </div>
        </article>
      ))}
    </div>
  );
}
