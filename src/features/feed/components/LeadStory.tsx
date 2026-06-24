"use client";

import Image from "next/image";
import Link from "next/link";

export function LeadStory() {
  return (
    <section aria-label="Lead story">
      {/* Category label */}
      <div className="flex items-center gap-3 mb-5">
        <span
          className="w-2.5 h-2.5 rounded-full bg-dispatch-slate"
          aria-hidden="true"
        />
        <span className="font-mono text-[11px] cat-label text-dispatch-slate font-semibold">
          Tech News / AI &amp; ML
        </span>
      </div>

      {/* Image + Headline — 7:5 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">
        {/* Image — 7 columns */}
        <div className="lg:col-span-7">
          <div className="relative overflow-hidden bg-paper-200 aspect-[16/9] lg:aspect-[16/10]">
            <Image
              src="https://picsum.photos/seed/eu-ai-act-vote/1200/750.jpg"
              alt="European Parliament building during a key legislative session on AI regulation"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 58vw"
            />
            {/* Breaking badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-dispatch-ember/95 px-2.5 py-1">
              <span
                className="w-1.5 h-1.5 rounded-full bg-white pulse-dot"
                aria-hidden="true"
              />
              <span className="font-mono text-[10px] text-white font-semibold cat-label">
                Breaking
              </span>
            </div>
          </div>
        </div>

        {/* Headline + Meta — 5 columns */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <h2
            className="font-editorial text-3xl sm:text-4xl lg:text-[46px] leading-[1.05] text-ink-900"
            style={{ fontVariationSettings: "'opsz' 72" }}
          >
            The Alignment Problem Is Now a Policy Problem
          </h2>

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-600">
            <span>Reuters, AP, TechCrunch</span>
            <span aria-hidden="true">&middot;</span>
            <span>42 min ago</span>
            <span aria-hidden="true">&middot;</span>
            <span className="flex items-center gap-1 text-dispatch-sage">
              3 sources
            </span>
          </div>

          <p className="mt-5 text-ink-600 text-[15px] leading-relaxed">
            As the EU's AI Act enforcement framework enters its final
            legislative stage, the debate has shifted from technical alignment
            to geopolitical competition. Three major outlets now cover the rift
            between member states on enforcement timelines.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-dispatch-ember/10 text-dispatch-ember border border-dispatch-ember/20 px-2.5 py-1 font-mono text-[11px] font-medium">
              AI Summary Available
            </span>
            <Link
              href="#ai-summary-demo"
              className="inline-flex items-center gap-1.5 text-ink-900 font-medium text-sm hover:text-dispatch-ember transition-colors duration-150 link-underline"
            >
              View Nutrition Label
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
