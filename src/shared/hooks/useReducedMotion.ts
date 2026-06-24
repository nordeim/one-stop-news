"use client";

import { useState, useEffect } from "react";

/**
 * useReducedMotion — Detects `prefers-reduced-motion` user preference.
 *
 * PRD §4.4 (WCAG AAA): When `prefers-reduced-motion: reduce`,
 * DISABLE all animations entirely. Do NOT just slow them.
 *
 * This hook returns `true` if the user prefers reduced motion,
 * allowing components to conditionally skip animations.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    // Check on mount (for SSR compatibility)
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);

    // Listen for changes
    const onChange = (e: MediaQueryListEvent) => {
      setReduced(e.matches);
    };

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
