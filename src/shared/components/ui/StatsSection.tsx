import { Check } from "lucide-react";

const stats = [
  {
    figure: "247",
    label: "Sources",
    description: "Verified news sources across 7 topic categories.",
  },
  {
    figure: "1.2M",
    label: "Articles Processed",
    description: "AI-analysed and de-duplicated every month.",
  },
  {
    figure: "450K",
    label: "AI Summaries",
    description: "With full source-cited provenance.",
  },
];

export function StatsSection() {
  return (
    <section className="py-16 lg:py-24 bg-paper-100">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-editorial text-3xl sm:text-4xl text-ink-900 leading-[1.05] mb-12 text-center">
          Our Commitment to Transparency
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          {stats.map((stat) => (
            <div key={stat.label} className="relative text-center p-6">
              {/* Large faded number */}
              <span className="commitment-number font-editorial text-ink-900 opacity-[0.08] select-none">
                {stat.figure}
              </span>
              <p className="font-editorial text-4xl text-ink-900 mb-2 relative z-10">
                {stat.figure}
              </p>
              <p className="font-mono text-[11px] cat-label text-ink-400 mb-1 relative z-10">
                {stat.label}
              </p>
              <p className="text-sm text-ink-600 max-w-[200px] mx-auto relative z-10">
                {stat.description}
              </p>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            "EU AI Act Article 50 Compliant",
            "Zero Data Retention",
            "Open Source Models",
            "Full Source Attribution",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-dispatch-sage flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-white" />
              </span>
              <span className="text-sm text-ink-700 font-medium">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
