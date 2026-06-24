/**
 * SummariesSkeleton.tsx — Loading placeholder for admin summaries table.
 *
 * Mirrors the structure of the review table for zero-layout-shift loading.
 */

export function SummariesSkeleton() {
  return (
    <div
      className="overflow-x-auto"
      role="status"
      aria-label="Loading summaries"
      aria-busy="true"
    >
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-ink-700">
            {["Article", "Flag Reason", "Model", "Generated", "Actions"].map(
              (header) => (
                <th
                  key={header}
                  className="py-3 px-4 font-mono text-[10px] uppercase tracking-widest text-paper-400"
                >
                  {header}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-ink-800 animate-pulse">
              <td className="py-3 px-4">
                <div className="h-4 bg-paper-400/20 rounded w-48 max-w-xs" />
              </td>
              <td className="py-3 px-4">
                <div className="h-4 bg-paper-400/20 rounded w-32" />
              </td>
              <td className="py-3 px-4">
                <div className="h-4 bg-paper-400/20 rounded w-20" />
              </td>
              <td className="py-3 px-4">
                <div className="h-4 bg-paper-400/20 rounded w-24" />
              </td>
              <td className="py-3 px-4">
                <div className="h-4 bg-paper-400/20 rounded w-28" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
