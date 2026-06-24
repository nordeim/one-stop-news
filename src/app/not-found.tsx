/**
 * not-found.tsx — Branded 404 page.
 *
 * Phase 19 (High H5): Previously no not-found.tsx existed. Unknown URLs
 * rendered Next.js's default 404 page, not a branded one. Now this Server
 * Component renders a calm, editorial-style 404 with a link back to the
 * homepage.
 *
 * Includes <main id="main-content"> for the skip-to-content link (WCAG AAA).
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="max-w-3xl mx-auto px-4 py-24 text-center"
    >
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-300 mb-2">
        404
      </p>
      <h1 className="font-editorial text-3xl sm:text-4xl text-ink-900 leading-[1.05] mb-4">
        Page not found
      </h1>
      <p className="font-ui text-sm text-ink-600 mb-8 max-w-md mx-auto">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Return to the homepage to continue reading.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center h-9 px-4 rounded-sm text-sm font-medium text-paper-50 bg-ink-900 hover:bg-ink-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50"
      >
        Back to homepage
      </Link>
    </main>
  );
}
