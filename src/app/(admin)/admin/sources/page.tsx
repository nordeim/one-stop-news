/**
 * page.tsx — Admin source management page.
 *
 * PRD §6: Source management table with status badges.
 *
 * The page shell is synchronous; all data access (including the
 * admin-session check) happens inside the Suspense-wrapped
 * SourcesData component, satisfying Next.js 16 cacheComponents.
 */

import { Suspense } from "react";
import { SourcesData } from "@/features/sources/components/SourcesData";
import { SourcesSkeleton } from "@/features/sources/components/SourcesSkeleton";

export default function SourcesPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="font-editorial text-3xl text-paper-50">Sources</h1>
        <p className="mt-2 font-ui text-sm text-paper-300">
          Manage RSS/Atom/JSON sources
        </p>
      </header>

      <Suspense fallback={<SourcesSkeleton />}>
        <SourcesData />
      </Suspense>
    </div>
  );
}
