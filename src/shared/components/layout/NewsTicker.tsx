"use client";

import { cn } from "@/shared/lib/utils";

export interface TickerItem {
  label: string;
  text: string;
  labelColor: string;
}

export const tickerItems: TickerItem[] = [
  {
    label: "Breaking",
    text: "EU Parliament votes on AI Act enforcement framework — 142 in favor, 37 against",
    labelColor: "text-dispatch-ember",
  },
  {
    label: "Finance",
    text: "Global markets rally as inflation data cools across G7 nations",
    labelColor: "text-dispatch-sage",
  },
  {
    label: "Tech",
    text: "SpaceX Starship completes first orbital refueling test",
    labelColor: "text-dispatch-slate",
  },
  {
    label: "Politics",
    text: "Japan central bank signals end to negative interest rate era",
    labelColor: "text-dispatch-clay",
  },
  {
    label: "Culture",
    text: "WHO declares new mpox variant a public health emergency",
    labelColor: "text-dispatch-violet",
  },
  {
    label: "Breaking",
    text: "Singapore MRT Cross Island Line Phase 2 alignment confirmed",
    labelColor: "text-dispatch-ember",
  },
];

export function NewsTicker() {
  return (
    <div
      className="bg-ink-900 text-paper-100 font-mono text-[11px] leading-none overflow-hidden"
      role="marquee"
      aria-label="Breaking news ticker"
    >
      <div className="ticker-track flex items-center whitespace-nowrap py-2.5 gap-10">
        {tickerItems.map((item, i) => (
          <span key={`first-${i}`} className="flex items-center gap-2 shrink-0">
            <span className={cn("font-semibold cat-label", item.labelColor)}>
              {item.label}
            </span>
            {item.text}
          </span>
        ))}
        {/* Duplicate set for seamless scroll */}
        {tickerItems.map((item, i) => (
          <span
            key={`second-${i}`}
            className="flex items-center gap-2 shrink-0"
          >
            <span className={cn("font-semibold cat-label", item.labelColor)}>
              {item.label}
            </span>
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
