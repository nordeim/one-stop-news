"use client";

export function NutritionLabelDemo() {
  return (
    <section
      id="ai-summary-demo"
      data-testid="nutrition-label-demo"
      className="py-16 lg:py-24"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left column: Explanation */}
          <div className="lg:col-span-5">
            <h2 className="font-editorial text-3xl sm:text-4xl text-ink-900 leading-[1.05] mb-6">
              AI Summary Nutrition Label
            </h2>
            <p className="text-[15px] leading-relaxed text-ink-600 mb-6">
              Every AI summary comes with a Nutrition Label — a transparent
              breakdown of the model, data sources, and confidence levels. We
              believe you have the right to know how your news was summarised.
            </p>
            <p className="text-[15px] leading-relaxed text-ink-600 mb-8">
              This is our response to EU AI Act Article 50: mandatory AI
              provenance disclosure at the point of generation.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-1 bg-dispatch-ember/10 text-dispatch-ember font-mono text-[11px] font-semibold cat-label">
                EU AI Act Compliant
              </span>
              <span className="inline-flex items-center px-2.5 py-1 bg-dispatch-sage/10 text-dispatch-sage font-mono text-[11px] font-semibold cat-label">
                Open Source Model
              </span>
            </div>
          </div>

          {/* Right column: The Label */}
          <div className="lg:col-span-7">
            <div className="nutrition-label p-6 lg:p-8 rounded-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-paper-200">
                <div>
                  <h3 className="font-editorial text-xl text-ink-900">
                    Nutrition Label
                  </h3>
                  <p className="font-mono text-[10px] text-ink-400 mt-1 cat-label">
                    Generated: 10 Jun 2026, 14:30 SGT
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-dispatch-ember font-bold font-mono text-sm">
                    A-
                  </span>
                  <p className="font-mono text-[10px] text-ink-400 cat-label">
                    Overall Grade
                  </p>
                </div>
              </div>

              {/* Model Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p className="font-mono text-[10px] text-ink-400 cat-label mb-1">
                    Model
                  </p>
                  <p className="text-ink-900 font-medium">claude-3-5-sonnet</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-ink-400 cat-label mb-1">
                    Temperature
                  </p>
                  <p className="text-ink-900 font-medium">
                    0.25 (Conservative)
                  </p>
                </div>
              </div>

              {/* Coverage Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] text-ink-400 cat-label">
                    Source Coverage
                  </span>
                  <span className="font-mono text-sm font-semibold text-ink-900">
                    87%
                  </span>
                </div>
                <div className="w-full bg-paper-200 rounded-full h-4">
                  <div
                    className="bg-dispatch-ember h-4 rounded-full"
                    style={{ width: "87%" }}
                    aria-label="87% source coverage"
                  />
                </div>
                <p className="text-ink-400 text-xs mt-2">
                  Based on 6 distinct sources of varying credibility
                </p>
              </div>

              {/* Citations */}
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-ink-400 cat-label mb-2">
                  Sources Cited
                </p>
                {[
                  {
                    rank: "A",
                    source: "Reuters",
                    url: "reuters.com/2026/ai-act",
                  },
                  { rank: "A", source: "AP", url: "apnews.com/2026/ai-act" },
                  {
                    rank: "B",
                    source: "Politico EU",
                    url: "politico.eu/2026/ai-act",
                  },
                ].map((c) => (
                  <div key={c.url} className="flex items-center gap-3 py-1.5">
                    <span className="w-6 h-6 rounded-full bg-dispatch-sage/10 flex items-center justify-center text-dispatch-sage font-mono text-xs font-bold">
                      {c.rank}
                    </span>
                    <span className="text-sm text-ink-900 font-medium">
                      {c.source}
                    </span>
                    <span className="text-xs text-ink-400 font-mono">
                      {c.url}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
