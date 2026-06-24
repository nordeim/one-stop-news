/**
 * SummariesData.tsx — Server Component for admin summary review queue.
 *
 * Fetches flagged summaries and renders the review table.
 * Wrapped in <Suspense> by the parent page to prevent blocking-route
 * errors in Next.js 16 with cacheComponents enabled.
 *
 * NOTE: Admin authorization is enforced at the (admin)/layout.tsx boundary
 * via <AdminGuard>. No per-page guard needed here. The layout's guard runs
 * before this component renders, so we can safely fetch data directly.
 *
 * Phase 19 (Critical C5): Approve and Disable buttons were previously inert
 * (<button type="button"> with no onClick, no form action). They are now
 * wired to the approveSummary / disableSummary server actions via
 * <form action={action.bind(null, summary.id)}> so admins can actually act
 * on flagged summaries. Server-action-bound forms use POST semantics and
 * re-render the page on completion (revalidatePath is called inside each
 * action).
 *
 * Phase 19 (H1): Action buttons now have focus-visible:ring-* classes for
 * WCAG AAA keyboard accessibility — previously they relied on the global
 * outline only, inconsistent with the Button primitive's pattern.
 */

import { getFlaggedSummaries } from "@/features/summaries/queries";
import { approveSummary, disableSummary } from "@/features/summaries/actions";

export async function SummariesData() {
  const flaggedSummaries = await getFlaggedSummaries();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-ink-700">
            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-widest text-paper-400">
              Article
            </th>
            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-widest text-paper-400">
              Flag Reason
            </th>
            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-widest text-paper-400">
              Model
            </th>
            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-widest text-paper-400">
              Generated
            </th>
            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-widest text-paper-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {flaggedSummaries.map((summary) => (
            <tr key={summary.id} className="border-b border-ink-800">
              <td className="py-3 px-4 font-ui text-sm text-paper-200 max-w-xs truncate">
                {summary.articleTitle}
              </td>
              <td className="py-3 px-4 font-ui text-sm text-paper-400">
                {summary.flagReason || "—"}
              </td>
              <td className="py-3 px-4 font-mono text-sm text-paper-400">
                {summary.model}
              </td>
              <td className="py-3 px-4 font-mono text-sm text-paper-400">
                {summary.generatedAt?.toLocaleDateString()}
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  {/*
                    React 19 form actions: the `action` prop accepts an async
                    function with signature (formData: FormData) => void | Promise<void>.
                    Server actions that return a status object (like
                    approveSummary) are valid Server Actions but not directly
                    assignable to the form-action signature — so we wrap them
                    in a void-returning closure. The .bind(null, summary.id)
                    pre-fills the articleId argument. revalidatePath inside
                    each action refreshes the table after the mutation lands.
                  */}
                  <form
                    action={async () => {
                      await approveSummary(summary.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-medium bg-dispatch-sage/20 text-dispatch-sage hover:bg-dispatch-sage/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
                    >
                      Approve
                    </button>
                  </form>
                  <form
                    action={async () => {
                      await disableSummary(summary.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-medium bg-dispatch-ember/20 text-dispatch-ember hover:bg-dispatch-ember/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
                    >
                      Disable
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {flaggedSummaries.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="py-8 text-center font-mono text-[11px] uppercase tracking-widest text-paper-400"
              >
                No summaries pending review
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
