import type { SummarisationOutput } from "@/features/summaries/lib/summariseSchema";

interface NutritionLabelProps {
  summary: SummarisationOutput;
}

/**
 * NutritionLabel — Source-cited AI summary with transparency panel.
 *
 * PRD §4.4: "AI Nutrition Label — A transparency label for AI-generated
 * summaries showing model, sources, and coverage."
 *
 * PAD §8.4: "Left border dispatch-ember, sources numbered [1], [2], etc.
 * 'Verify with original source' link."
 */
export function NutritionLabel({ summary }: NutritionLabelProps) {
  return (
    <aside
      aria-label="AI-generated summary transparency label"
      className="border-l-2 border-dispatch-ember bg-paper-100/50 p-6"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full bg-dispatch-ember"
          aria-hidden="true"
        />
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-300">
          AI-Generated Summary
        </span>
      </div>

      {/* Summary Text */}
      <p className="font-ui text-base leading-relaxed text-ink-900">
        {summary.summaryText}
      </p>

      {/* Key Points */}
      {summary.keyPoints.length > 0 && (
        <ol className="mt-4 list-decimal space-y-1 pl-5 font-ui text-sm text-ink-600">
          {summary.keyPoints.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ol>
      )}

      {/* Sources Cited */}
      <div className="mt-6 border-t border-ink-100 pt-4">
        <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-300">
          Sources Cited
        </h4>
        <ul className="space-y-2">
          {summary.sourcesCited.map((source, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="font-mono text-xs text-ink-300">
                [{index + 1}]
              </span>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-ui text-sm text-dispatch-slate hover:text-dispatch-ember hover:underline"
              >
                {source.title}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Transparency Details */}
      <div className="mt-6 border-t border-ink-100 pt-4 font-mono flex items-center justify-between text-xs text-ink-400">
        <span className="font-mono text-[10px] uppercase tracking-widest">
          Coverage: {summary.coveragePercentage}%
        </span>
        <a
          href="#original-source"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-dispatch-ember hover:underline"
        >
          Verify with original source →
        </a>
      </div>

      {/* AI Statement */}
      <p className="mt-2 font-mono text-[10px] text-ink-300">
        {summary.aiStatement}
      </p>
    </aside>
  );
}
