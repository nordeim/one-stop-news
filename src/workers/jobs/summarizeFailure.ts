/**
 * summarizeFailure.ts — Pure function for determining summary failure state.
 *
 * Phase 14 (G): When BullMQ exhausts all retry attempts, the article's
 * summaryStatus should be set to 'needs_review' with a flagReason indicating
 * AI failure. This makes failed summaries visible in the admin review queue
 * instead of silently leaving them as 'none' (which allows infinite retry
 * and provides no observability).
 *
 * Extracted as a pure function for testability — the processSummarizeJob
 * catch block calls this to determine the correct failure state.
 */

export interface SummaryFailureState {
  /** The summaryStatus to set on the article */
  summaryStatus: "none" | "needs_review";
  /** The flagReason to set (null when retrying, string when permanently failed) */
  flagReason: string | null;
}

/**
 * Determines the summary failure state based on BullMQ retry progress.
 *
 * @param attemptsMade — Current number of attempts (0-indexed: 0 = first attempt)
 * @param maxAttempts  — Maximum attempts configured (default: 3, from defaultJobOptions)
 * @returns { summaryStatus, flagReason } — 'none' + null when retrying,
 *          'needs_review' + reason when all retries exhausted
 */
export function getSummaryFailureState(
  attemptsMade: number,
  maxAttempts: number = 3,
): SummaryFailureState {
  // If this is NOT the final retry, allow BullMQ to retry again.
  // summaryStatus stays 'none' so the summarize worker can retry.
  if (attemptsMade < maxAttempts) {
    return { summaryStatus: "none", flagReason: null };
  }

  // All retries exhausted — set to 'needs_review' so it appears in the
  // admin review queue. This provides observability and prevents infinite retry.
  return {
    summaryStatus: "needs_review",
    flagReason: `AI summarization failed after ${maxAttempts} attempts`,
  };
}
