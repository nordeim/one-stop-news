/**
 * layout.tsx — Admin route group layout.
 *
 * Design system: Editorial Dispatch — Ink-900 dark surface, Paper-50 UI.
 *
 * Auth boundary: AdminGuard wraps {children} inside <Suspense> to satisfy
 * Next.js 16 cacheComponents requirements. AdminGuard calls
 * verifyAdminSession() (memoized via React.cache() in dal.ts) so the
 * guard runs ONCE per request, at the LAYOUT boundary — any future admin
 * page added under (admin)/ is automatically protected without needing
 * its own per-page guard.
 *
 * If verifyAdminSession() finds a non-admin or no session, it calls
 * redirect() internally (see dal.ts). The Suspense fallback
 * (AdminGuardSkeleton) renders during the async guard evaluation.
 */

import { Suspense } from "react";
import { AdminGuard } from "@/shared/components/auth/AdminGuard";
import { AdminGuardSkeleton } from "@/shared/components/auth/AdminGuardSkeleton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ink-900 text-paper-50">
      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 min-h-screen bg-ink-900 border-r border-ink-700 p-6">
          <h2 className="font-editorial text-lg text-paper-50 mb-8">
            OneStopNews
          </h2>
          <ul className="space-y-2">
            <li>
              <a
                href="/admin/sources"
                className="block px-3 py-2 font-ui text-sm text-paper-300 hover:text-dispatch-ember transition-colors"
              >
                Sources
              </a>
            </li>
            <li>
              <a
                href="/admin/summaries"
                className="block px-3 py-2 font-ui text-sm text-paper-300 hover:text-dispatch-ember transition-colors"
              >
                Summaries
              </a>
            </li>
          </ul>
        </nav>

        {/* Main content — wrapped in AdminGuard via Suspense */}
        <main id="main-content" className="flex-1 p-8">
          <Suspense fallback={<AdminGuardSkeleton />}>
            <AdminGuard>{children}</AdminGuard>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
