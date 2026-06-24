/**
 * SourcesData.tsx — Server Component for fetching source list.
 *
 * Separates data fetching from the page to enable <Suspense> wrapping
 * in Next.js 16 with cacheComponents enabled.
 *
 * NOTE: Admin authorization is enforced at the (admin)/layout.tsx boundary
 * via <AdminGuard>. No per-page guard needed here.
 */

import { getAllSources, getCategoryMap } from "@/features/sources/queries";
// Phase 22 (N5 fix, audit Report 16): Import pauseSourceAction for the
// Pause button in each active source row.
import { pauseSourceAction } from "@/app/(admin)/admin/sources/actions";

/** Source item as returned by the database query. */
interface SourceRow {
  id: string;
  name: string;
  feedUrl: string | null;
  categoryId: string | null;
  isActive: boolean;
  failureCount: number;
}

/**
 * SourceTable — Pure presentational component for the sources list.
 *
 * Exported for direct unit testing (avoids needing to mock async DB queries
 * that SourcesData wraps). Phase 22 (N5 fix, audit Report 16).
 */
export function SourceTable({
  sources,
  categoryMap,
}: {
  sources: SourceRow[];
  categoryMap: Record<string, string>;
}) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-ink-700">
          <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-widest text-paper-400">
            Name
          </th>
          <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-widest text-paper-400">
            Feed URL
          </th>
          <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-widest text-paper-400">
            Category
          </th>
          <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-widest text-paper-400">
            Status
          </th>
          <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-widest text-paper-400">
            Failures
          </th>
          <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-widest text-paper-400">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {sources.map((source) => (
          <tr key={source.id} className="border-b border-ink-800">
            <td className="py-3 px-4 font-ui text-sm text-paper-200">
              {source.name}
            </td>
            <td className="py-3 px-4 font-ui text-sm text-paper-400 truncate max-w-xs">
              {source.feedUrl}
            </td>
            <td className="py-3 px-4 font-ui text-sm text-paper-400">
              {source.categoryId ? categoryMap[source.categoryId] || "—" : "—"}
            </td>
            <td className="py-3 px-4">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase ${source.isActive ? "bg-dispatch-sage/20 text-dispatch-sage" : "bg-dispatch-ember/20 text-dispatch-ember"}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${source.isActive ? "bg-dispatch-sage" : "bg-dispatch-ember"}`}
                />
                {source.isActive ? "Active" : "Paused"}
              </span>
            </td>
            <td className="py-3 px-4 font-mono text-sm text-paper-400">
              {source.failureCount}
            </td>
            <td className="py-3 px-4">
              {/* Phase 22 (N5 fix, audit Report 16): Wire pauseSource to UI.
                  Previously the action existed in actions.ts and was tested
                  in actions.test.ts but no UI button called it — making it
                  dead code from the user's perspective. Now each active row
                  has a Pause form button bound to the pauseSourceAction server
                  action.

                  Resume is intentionally NOT wired — that would require a
                  symmetric `resumeSource` action which is out of scope for
                  this fix. Paused sources show an em-dash placeholder so the
                  column doesn't look broken. A future Phase can add the
                  resume action and replace the placeholder with a Resume
                  button. */}
              {source.isActive ? (
                <form action={pauseSourceAction}>
                  <input type="hidden" name="id" value={source.id} />
                  <button
                    type="submit"
                    className="font-mono text-[10px] uppercase tracking-widest text-paper-300 hover:text-dispatch-ember transition-colors"
                  >
                    Pause
                  </button>
                </form>
              ) : (
                <span
                  className="font-mono text-[10px] uppercase tracking-widest text-paper-700"
                  aria-label="No action available for paused sources"
                >
                  —
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export async function SourcesData() {
  const sources = await getAllSources();
  const categoryMap = await getCategoryMap();

  // Phase 19 (M13): Empty state — previously the table rendered headers
  // but zero rows, leaving the admin with no feedback. Now we show a
  // branded empty message guiding them to add their first source.
  if (sources.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-paper-400 mb-2">
          No sources configured
        </p>
        <p className="font-ui text-sm text-paper-200">
          Add your first RSS/Atom/JSON feed to start ingesting articles.
        </p>
      </div>
    );
  }

  return <SourceTable sources={sources} categoryMap={categoryMap} />;
}
