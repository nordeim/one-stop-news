"use client";

import * as React from "react";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * PageTransition — Progressive enhancement wrapper for smooth view transitions.
 *
 * PRD §5.3, PAD §5.7
 * Uses `document.startViewTransition` when available (Chrome 115+, Firefox 144+),
 * with graceful degradation for unsupported browsers.
 *
 * Note: This component does NOT use React's experimental `ViewTransition` API.
 * It uses the browser's native `document.startViewTransition` for cross-fade
 * transitions between pages. This is intentionally browser-native, not React-native,
 * because React's ViewTransition API is experimental and may change.
 */

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only intercept clicks if the browser supports startViewTransition
    if (typeof document === "undefined" || !document.startViewTransition) {
      return;
    }

    // Check for reduced motion preference
    // Guard matchMedia — jsdom and some older browsers don't implement it.
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      return;
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor) return;

      const href = anchor.getAttribute("href");
      // Only handle internal links
      if (!href || href.startsWith("http") || href.startsWith("#")) return;

      e.preventDefault();

      document.startViewTransition?.(() => {
        router.push(href);
      });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [router, pathname]);

  return <>{children}</>;
}
