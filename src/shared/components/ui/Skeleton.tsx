import * as React from "react";
import { cn } from "@/shared/lib/utils";

/**
 * Skeleton — Editorial loading placeholder with `prefers-reduced-motion` support.
 *
 * PRD §4.4 (WCAG AAA): "When prefers-reduced-motion: reduce, DISABLE all
 * animations entirely. Do NOT just slow them."
 *
 * The skeleton component respects this by using a static colour block
 * when reduced motion is preferred.
 */

/* ─── Line Skeleton ─────────────────────────────────────────────────────── */
export interface SkeletonLineProps {
  className?: string;
  width?: string;
}

export function SkeletonLine({ className, width = "100%" }: SkeletonLineProps) {
  return (
    <div
      className={cn(
        "h-4 rounded-sm bg-paper-200",
        /* Animate only if motion is not reduced */
        "motion-safe:animate-pulse",
        className,
      )}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

/* ─── Multi-line Skeleton ─────────────────────────────────────────────── */
export interface SkeletonLinesProps {
  lines?: number;
  className?: string;
}

export function SkeletonLines({ lines = 3, className }: SkeletonLinesProps) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

/* ─── Card Skeleton (for ArticleCard loading state) ─────────────────────── */
export interface ArticleCardSkeletonProps {
  className?: string;
}

export function ArticleCardSkeleton({ className }: ArticleCardSkeletonProps) {
  return (
    <article
      className={cn(
        "grid grid-rows-subgrid row-span-3 gap-y-3 mb-10 border-b border-paper-200 pb-6",
        className,
      )}
      aria-hidden="true"
    >
      {/* Headline placeholder */}
      <SkeletonLine className="h-6" width="90%" />
      {/* Excerpt placeholder */}
      <div className="space-y-2">
        <SkeletonLine className="h-4" />
        <SkeletonLine className="h-4" width="80%" />
      </div>
      {/* Metadata placeholder */}
      <SkeletonLine className="h-3 w-1/3" />
    </article>
  );
}

/* ─── Feed Skeleton (multiple card skeletons) ───────────────────────────── */
export interface FeedSkeletonProps {
  count?: number;
  className?: string;
}

export function FeedSkeleton({ count = 6, className }: FeedSkeletonProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8",
        className,
      )}
      aria-label="Loading news articles"
      role="feed"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}
