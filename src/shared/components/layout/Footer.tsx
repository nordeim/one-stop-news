"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";

/**
 * Footer — Editorial footer with AI disclosure and role="contentinfo".
 *
 * PRD §4.2, PAD §5.5, HTML Mockup §12
 * - Background `bg-paper-100`
 * - AI disclosure statement in `font-mono text-[10px]`
 * - `<footer role="contentinfo">` for screen reader landmark
 *
 * NOTE: This is a Client Component because it accesses `new Date()`
 * to display the current year in the copyright notice. Next.js 16
 * forbids `new Date()` in Server Components during prerendering.
 * See: https://nextjs.org/docs/messages/next-prerender-current-time
 */

export interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className={cn("bg-paper-100 border-t border-ink-100 py-16", className)}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="font-editorial text-xl text-ink-900 tracking-tight mb-4 block">
              OneStopNews
            </span>
            <p className="font-ui text-sm text-ink-600 leading-relaxed mb-4">
              Topic-first news aggregation with source-cited AI summaries. EU AI
              Act Article 50 compliant.
            </p>
            <div className="flex items-center gap-2 font-mono text-[10px] text-ink-300">
              <span
                className="block w-1.5 h-1.5 rounded-full bg-dispatch-sage shrink-0"
                aria-hidden="true"
              />
              All systems operational
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-ink-300 mb-4">
              Product
            </h4>
            <ul className="space-y-3 font-ui text-sm text-ink-600">
              <li>Top Stories</li>
              <li>AI Nutrition Label</li>
              <li>Search</li>
              <li>Push Notifications</li>
              <li>Daily Briefing Email</li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-ink-300 mb-4">
              Company
            </h4>
            <ul className="space-y-3 font-ui text-sm text-ink-600">
              <li>About</li>
              <li>Blog</li>
              <li>Careers</li>
              <li>Contact</li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-ink-300 mb-4">
              Legal
            </h4>
            <ul className="space-y-3 font-ui text-sm text-ink-600">
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>AI Governance</li>
              <li>EU AI Act Compliance</li>
            </ul>
          </div>
        </div>

        {/* AI Disclosure */}
        <div className="border-t border-ink-100 pt-6 mb-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-300 leading-relaxed">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-dispatch-ember mr-2 align-middle"
              aria-hidden="true"
            />
            AI Disclosure: Every AI summary includes a Nutrition Label showing
            model, temperature, source coverage, and citations. EU AI Act
            Article 50 compliant.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-300">
            &copy; {currentYear} OneStopNews. All rights reserved.
          </p>
          <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-widest text-ink-300">
            <span>v0.1.0</span>
            <span className="flex items-center gap-2">
              <span
                className="block w-1.5 h-1.5 rounded-full bg-dispatch-sage shrink-0"
                aria-hidden="true"
              />
              95% feed freshness
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
