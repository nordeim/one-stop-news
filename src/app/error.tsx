"use client";

/**
 * error.tsx — Branded error boundary for route segments.
 *
 * Phase 19 (High H5): Previously no error.tsx existed. Thrown errors in
 * Server Components bubbled to Next.js's default error page, not a branded
 * one. Now this client component renders a calm, editorial-style error UI
 * with a "Try again" button that calls `reset()` to re-render the route.
 *
 * Includes <main id="main-content"> for the skip-to-content link to work
 * (WCAG AAA — every page template must have a main landmark).
 *
 * Note: error.tsx MUST be a client component ("use client") because it
 * needs the `reset` callback to re-render.
 */

import { useEffect } from "react";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log to console for production observability (a real Sentry/Datadog
    // integration would go here).
    console.error("[ErrorBoundary] Route segment error:", error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="max-w-3xl mx-auto px-4 py-24 text-center"
    >
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-300 mb-2">
        Error
      </p>
      <h1 className="font-editorial text-3xl sm:text-4xl text-ink-900 leading-[1.05] mb-4">
        Something went wrong
      </h1>
      <p className="font-ui text-sm text-ink-600 mb-8 max-w-md mx-auto">
        An unexpected error occurred while rendering this page. Please try again
        — if the problem persists, the issue has been logged.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center justify-center h-9 px-4 rounded-sm text-sm font-medium text-paper-50 bg-ink-900 hover:bg-ink-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50"
        aria-label="Try again"
      >
        Try again
      </button>
    </main>
  );
}
