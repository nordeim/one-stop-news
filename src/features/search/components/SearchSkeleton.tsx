/**
 * SearchSkeleton.tsx — Loading placeholder for search results.
 *
 * Mirrors the search result layout for zero-layout-shift loading.
 */

export function SearchSkeleton() {
  return (
    <div
      className="space-y-8"
      role="status"
      aria-label="Loading search results"
      aria-busy="true"
    >
      {/* SearchBar placeholder */}
      <div className="h-12 bg-paper-200 rounded-lg animate-pulse" />

      {/* Result count + sort placeholder */}
      <div className="flex items-center justify-between">
        <div className="h-4 bg-paper-200 rounded w-32 animate-pulse" />
        <div className="h-4 bg-paper-200 rounded w-24 animate-pulse" />
      </div>

      {/* Result items */}
      {Array.from({ length: 5 }).map((_, i) => (
        <article key={i} className="border-b border-ink-100 pb-6 animate-pulse">
          <div className="h-5 bg-paper-200 rounded w-3/4 mb-2" />
          <div className="space-y-2">
            <div className="h-4 bg-paper-200 rounded w-full" />
            <div className="h-4 bg-paper-200 rounded w-5/6" />
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="h-3 bg-paper-200 rounded w-24" />
            <div className="w-1 h-1 rounded-full bg-paper-200" />
            <div className="h-3 bg-paper-200 rounded w-16" />
          </div>
        </article>
      ))}
    </div>
  );
}
