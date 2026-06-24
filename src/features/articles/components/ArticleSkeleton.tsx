/**
 * ArticleSkeleton.tsx — Loading placeholder for article detail page.
 *
 * Mirrors the article layout for zero-layout-shift loading.
 */

export function ArticleSkeleton() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
      <article className="max-w-3xl mx-auto">
        <header className="mb-8">
          <div className="h-10 bg-paper-200 rounded w-3/4 mb-4" />
          <div className="flex items-center gap-3">
            <div className="h-3 bg-paper-200 rounded w-24" />
            <div className="w-1 h-1 rounded-full bg-paper-200" />
            <div className="h-3 bg-paper-200 rounded w-20" />
          </div>
        </header>
        <div className="space-y-2 mb-8">
          <div className="h-4 bg-paper-200 rounded w-full" />
          <div className="h-4 bg-paper-200 rounded w-5/6" />
          <div className="h-4 bg-paper-200 rounded w-4/6" />
        </div>
        <div className="bg-paper-100 border-l-2 border-dispatch-ember p-6 my-8">
          <div className="h-3 bg-paper-200 rounded w-32 mb-2" />
          <div className="h-4 bg-paper-200 rounded w-full mb-4" />
          <div className="h-8 bg-paper-200 rounded w-32" />
        </div>
      </article>
    </div>
  );
}
