"use client";

import { useEffect } from "react";

/**
 * RevealProvider — IntersectionObserver-driven scroll animations.
 *
 * Elements with `.reveal` class start hidden (opacity-0, translate-y-6)
 * and are revealed when they enter the viewport. Adding `.visible`
 * triggers the CSS transition.
 *
 * PRD v4.3 §4.3: Scroll Reveal — Intersection Observer driven
 *  - Elements begin at opacity: 0, translateY(24px)
 *  - `.visible` triggers opacity: 1, translateY(0) over 700ms
 *  - Supports `.reveal-delay-N` for staggered entrance
 *  - Disabled entirely under prefers-reduced-motion: reduce
 */
export function RevealProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Skip if user prefers reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Immediately reveal all
      document
        .querySelectorAll(".reveal")
        .forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px",
      },
    );

    document.querySelectorAll(".reveal").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
}
