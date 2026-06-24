/**
 * AdminGuardSkeleton.tsx — Suspense fallback for AdminGuard.
 *
 * Renders a minimal dark skeleton matching the admin layout surface
 * (bg-ink-900) so the visual transition from fallback → real content
 * is seamless. Reduced-motion friendly (no spinner animation; static).
 */

import * as React from "react";

export function AdminGuardSkeleton() {
  return (
    <div
      className="min-h-screen bg-ink-900 text-paper-50"
      role="status"
      aria-label="Verifying admin access"
    >
      <div className="flex">
        <div className="w-64 min-h-screen bg-ink-900 border-r border-ink-700 p-6">
          <div className="h-5 w-32 bg-ink-700 rounded mb-8" />
          <div className="space-y-2">
            <div className="h-4 w-20 bg-ink-700 rounded" />
            <div className="h-4 w-24 bg-ink-700 rounded" />
          </div>
        </div>
        <div className="flex-1 p-8">
          <div className="h-8 w-48 bg-ink-700 rounded mb-4" />
          <div className="h-4 w-64 bg-ink-700 rounded" />
        </div>
      </div>
      <span className="sr-only">Loading admin console…</span>
    </div>
  );
}
