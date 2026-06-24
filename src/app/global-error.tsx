"use client";

/**
 * global-error.tsx — Root-level error boundary.
 *
 * Phase 19 (High H5): Previously no global-error.tsx existed. If the root
 * layout itself threw during render (e.g., a font loading failure, a
 * SessionProvider error), Next.js had nothing to fall back to and crashed
 * with the default error page (which inherits the broken root layout).
 *
 * global-error.tsx REPLACES the root layout when it throws — so it MUST
 * render its own <html> and <body> tags. This is a Next.js requirement.
 *
 * Note: global-error.tsx MUST be a client component ("use client").
 */

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[GlobalError] Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-paper-50 text-ink-600 font-ui antialiased">
        <main
          id="main-content"
          className="max-w-3xl mx-auto px-4 py-24 text-center"
        >
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-300 mb-2">
            Critical Error
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl text-ink-900 leading-[1.05] mb-4">
            Something went wrong
          </h1>
          <p className="font-ui text-sm text-ink-600 mb-8 max-w-md mx-auto">
            A critical error occurred while loading the application. Please try
            again — if the problem persists, the issue has been logged.
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
      </body>
    </html>
  );
}
