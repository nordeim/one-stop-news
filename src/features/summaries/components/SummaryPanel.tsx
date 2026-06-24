"use client";

import { useOptimistic } from "react";
import type { SummarisationOutput } from "@/features/summaries/lib/summariseSchema";
import { NutritionLabel } from "./NutritionLabel";
import { DisclosureBadge } from "./DisclosureBadge";
import type { ArticleWithSummary } from "@/domain/articles/types";

type SummaryStatus = ArticleWithSummary["summaryStatus"];

interface SummaryPanelProps {
  articleId: string;
  initialStatus: SummaryStatus;
  summary?: SummarisationOutput | null;
  onRequestSummary?: () => void;
  /**
   * Optional error message to display. When set, the panel renders an error
   * UI with a "Try Again" button instead of the optimistic "pending" state.
   *
   * Phase 19 (High H4): Previously, onRequestSummary was fire-and-forget.
   * If the underlying server action failed, useOptimistic stayed on "pending"
   * indefinitely — the user was stuck on "Generating AI summary..." with no
   * way to retry and no error feedback. Now the parent component (e.g.
   * ArticleData) is responsible for catching errors and setting this prop.
   */
  error?: string | null;
  /**
   * Optional callback invoked when an error occurs during summary request.
   * The parent can use this to roll back any optimistic state at a higher
   * level (e.g., reset the article's summaryStatus in the DB).
   */
  onError?: (error: Error) => void;
}

/**
 * SummaryPanel — 5-state state machine for AI summaries + error state.
 *
 * PRD §7.1 & PAD §7.4:
 *   none         → Show "Request AI Summary" button
 *   pending      → Show "Generating AI summary..." status
 *   ok           → Render <NutritionLabel>
 *   needs_review → Show "Summary under editorial review" notice
 *   disabled     → Render null (no UI hint)
 *   error        → (Phase 19 / H4) Show error UI with "Try Again" button
 *
 * Uses useOptimistic() for instant UI updates when requesting a summary.
 *
 * The error state takes precedence over the optimistic pending state —
 * if the parent sets `error`, we surface it immediately rather than
 * leaving the user on an infinite "Generating..." spinner.
 */
export function SummaryPanel({
  initialStatus,
  summary,
  onRequestSummary,
  error = null,
}: SummaryPanelProps) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    initialStatus,
    (_state, newStatus: SummaryStatus) => newStatus,
  );

  // Error state takes precedence — surfaces failures from the parent
  // (e.g., a rejected server action) without leaving the user stuck on
  // the "pending" spinner indefinitely.
  if (error) {
    return (
      <div
        id="ai-summary"
        className="my-8 border-l-2 border-dispatch-ember bg-paper-100/50 p-6"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 mb-4">
          <span
            className="h-2 w-2 rounded-full bg-dispatch-ember"
            aria-hidden="true"
          />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-300">
            AI Summary Error
          </span>
        </div>
        <p className="font-ui text-ink-600 mb-4">{error}</p>
        {onRequestSummary && (
          <button
            type="button"
            onClick={() => {
              setOptimisticStatus("pending");
              onRequestSummary();
            }}
            className="inline-flex items-center gap-2 rounded-sm bg-dispatch-ember px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white hover:bg-dispatch-ember/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2"
            aria-label="Try again"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  switch (optimisticStatus) {
    case "disabled":
      return null;

    case "none":
      return (
        <div
          id="ai-summary"
          className="my-8 border-l-2 border-dispatch-ember bg-paper-100/50 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span
              className="h-2 w-2 rounded-full bg-dispatch-ember"
              aria-hidden="true"
            />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-300">
              AI Summary
            </span>
          </div>
          <p className="font-ui text-ink-600 mb-4">
            No AI summary is available for this article yet.
          </p>
          {onRequestSummary && (
            <button
              type="button"
              onClick={() => {
                setOptimisticStatus("pending");
                onRequestSummary();
              }}
              className="inline-flex items-center gap-2 rounded-sm bg-dispatch-ember px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white hover:bg-dispatch-ember/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2"
              disabled={initialStatus === "pending"}
            >
              Request AI Summary
            </button>
          )}
        </div>
      );

    case "pending":
      return (
        <div
          id="ai-summary"
          className="my-8 border-l-2 border-ink-300 bg-paper-100/50 p-6"
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full bg-ink-300 animate-pulse"
              aria-hidden="true"
            />
            <span className="font-mono font-ui text-ink-600">
              Generating AI summary...
            </span>
          </div>
        </div>
      );

    case "needs_review":
      return (
        <div
          id="ai-summary"
          // Phase 19 (M15): Use design-system warning tokens instead of
          // Tailwind's default amber-* palette.
          className="my-8 border-l-2 border-dispatch-warning bg-dispatch-warning-light p-6"
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full bg-dispatch-warning"
              aria-hidden="true"
            />
            <span className="font-mono font-ui text-dispatch-warning">
              Summary under editorial review
            </span>
          </div>
          <p className="mt-2 font-ui text-sm text-dispatch-warning">
            This summary has been flagged for review by our editorial team. It
            will be re-examined shortly.
          </p>
        </div>
      );

    case "ok":
      if (!summary) {
        return (
          <div className="my-8 border-l-2 border-ink-300 bg-paper-100/50 p-6">
            <p className="font-ui text-ink-600">
              Summary status is marked as complete, but no summary data is
              available.
            </p>
          </div>
        );
      }
      return (
        <section id="ai-summary" className="my-8">
          <div className="mb-4 flex items-center gap-3">
            <DisclosureBadge status="ok" />
          </div>
          <NutritionLabel summary={summary} />
        </section>
      );

    default:
      // Ensure the status is exhausted
      return null;
  }
}
