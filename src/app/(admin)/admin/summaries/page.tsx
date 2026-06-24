/**
 * page.tsx — Admin summary review queue.
 *
 * PRD §7.3: Summary review workflow with state machine.
 * ok → needs_review → disabled
 *
 * NOTE: Data fetching and auth verification happen inside the
 * Suspense-wrapped SummariesData component to satisfy Next.js 16
 * cacheComponents requirements.
 */

import { Suspense } from "react";
import { SummariesData } from "@/features/summaries/components/SummariesData";
import { SummariesSkeleton } from "@/features/summaries/components/SummariesSkeleton";

export default function SummariesPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="font-editorial text-3xl text-paper-50">
          Summary Review
        </h1>
        <p className="mt-2 font-ui text-sm text-paper-300">
          Review flagged AI summaries
        </p>
      </header>

      <Suspense fallback={<SummariesSkeleton />}>
        <SummariesData />
      </Suspense>
    </div>
  );
}
