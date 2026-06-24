"use client";

type SummaryStatus = "none" | "pending" | "ok" | "needs_review" | "disabled";

interface DisclosureBadgeProps {
  status: SummaryStatus;
  onClick?: () => void;
}

/**
 * DisclosureBadge — Summary status indicator with accessible dot.
 *
 * Shows a coloured dot and label indicating the AI summary status.
 * Clicking the badge scrolls to the #ai-summary section.
 *
 * States (PRD §4.4):
 *   - none:       No summary yet — dot hidden, no badge
 *   - pending:    Summary being generated — gray dot, "Processing"
 *   - ok:         Summary complete — green dot, "AI Brief"
 *   - needs_review: Flagged for review — amber dot, "Under Review"
 *   - disabled:   Permanently disabled — no badge
 *   - error:      Generation failed — red dot, "Error"
 */
export function DisclosureBadge({ status, onClick }: DisclosureBadgeProps) {
  if (status === "disabled" || status === "none") {
    return null;
  }

  const config = getStatusConfig(status);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${config.className}`}
      aria-label={`AI Summary Status: ${config.label}`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${config.dotColor}`}
        aria-hidden="true"
      />
      {config.label}
    </button>
  );
}

function getStatusConfig(status: SummaryStatus): {
  label: string;
  dotColor: string;
  className: string;
} {
  switch (status) {
    case "ok":
      return {
        label: "AI Brief",
        dotColor: "bg-dispatch-sage",
        className: "text-dispatch-sage hover:bg-dispatch-sage-light/50",
      };
    case "pending":
      return {
        label: "Processing",
        dotColor: "bg-ink-300 animate-pulse",
        className: "text-ink-400",
      };
    case "needs_review":
      return {
        label: "Under Review",
        // Phase 19 (M15): Use design-system warning tokens.
        dotColor: "bg-dispatch-warning",
        className:
          "text-dispatch-warning bg-dispatch-warning-light hover:bg-dispatch-warning-light/70",
      };
    default:
      return {
        label: "Unknown",
        dotColor: "bg-ink-300",
        className: "text-ink-400",
      };
  }
}
