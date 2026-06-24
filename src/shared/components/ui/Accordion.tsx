"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { type ReactNode } from "react";

interface FaqItem {
  question: string;
  answer: string | ReactNode;
}

const faqItems: FaqItem[] = [
  {
    question: "What is the AI Nutrition Label?",
    answer:
      "The AI Nutrition Label is a transparent breakdown of every AI-generated summary we produce. It shows you the model used, the temperature setting, the sources cited, and a confidence score — so you can decide for yourself whether to trust the summary.",
  },
  {
    question: "How are articles summarised?",
    answer:
      "Our system ingests full-text articles, scores them by importance, and queues high-priority stories for AI summarisation. Each summary is validated against its source material and assigned a coverage score.",
  },
  {
    question: "What sources does OneStopNews use?",
    answer:
      "We aggregate from over 200 verified news sources across 7 topic categories. Every source is rated for reliability, and we show you exactly which sources contributed to each summary.",
  },
  {
    question: "Is my data private?",
    answer:
      "Yes. We do not sell your data or share it with third parties. Your reading habits are encrypted at rest and we comply with the EU AI Act Article 50 disclosure requirements.",
  },
  {
    question: "How does the EU AI Act affect the summaries?",
    answer:
      "The EU AI Act Article 50 requires transparent disclosure when AI generates content. Our 3-layer provenance system (JSON-LD, HTTP header, HTML meta) ensures compliance at every touchpoint.",
  },
  {
    question: "Can I contribute a source?",
    answer:
      "Absolutely. Contact us at sources@onestop.news with the RSS feed or API endpoint you would like us to include. We review all submissions for editorial integrity before adding them to our ingestion pipeline.",
  },
];

export default function FaqAccordion() {
  return (
    <section className="py-16 lg:py-24 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="font-editorial text-3xl sm:text-4xl text-ink-900 leading-[1.05] mb-8 text-center">
        Frequently Asked Questions
      </h2>
      <AccordionPrimitive.Root
        type="single"
        collapsible
        className="max-w-3xl mx-auto"
      >
        {faqItems.map((item, index) => (
          <AccordionPrimitive.Item
            key={index}
            value={`item-${index}`}
            className="border-b border-paper-200"
          >
            <AccordionPrimitive.Trigger className="w-full flex items-center justify-between py-5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50 rounded-sm">
              <span className="font-editorial text-lg sm:text-xl font-[700] text-ink-900 leading-snug pr-4">
                {item.question}
              </span>
              <ChevronDown
                className="w-5 h-5 text-ink-400 shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </AccordionPrimitive.Trigger>
            <AccordionPrimitive.Content className="overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
              <div className="pb-5 text-ink-600 leading-relaxed text-[15px]">
                {item.answer}
              </div>
            </AccordionPrimitive.Content>
          </AccordionPrimitive.Item>
        ))}
      </AccordionPrimitive.Root>
    </section>
  );
}
