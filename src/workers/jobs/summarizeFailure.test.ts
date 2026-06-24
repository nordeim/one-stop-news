/**
 * summarizeFailure.test.ts — Tests for the summarize failure state logic.
 *
 * Phase 14 (G): When BullMQ exhausts all retry attempts (3), the article's
 * summaryStatus should be set to 'needs_review' with a flagReason indicating
 * AI failure. This makes failed summaries visible in the admin review queue
 * instead of silently leaving them as 'none' (which allows infinite retry).
 */

import { describe, it, expect } from "vitest";
import { getSummaryFailureState } from "./summarizeFailure";

describe("getSummaryFailureState", () => {
  it("returns 'none' when attemptsMade < maxAttempts (allow retry)", () => {
    const result = getSummaryFailureState(1, 3);
    expect(result.summaryStatus).toBe("none");
    expect(result.flagReason).toBeNull();
  });

  it("returns 'none' when attemptsMade = 0 (first failure)", () => {
    const result = getSummaryFailureState(0, 3);
    expect(result.summaryStatus).toBe("none");
    expect(result.flagReason).toBeNull();
  });

  it("returns 'needs_review' when attemptsMade >= maxAttempts (final retry exhausted)", () => {
    const result = getSummaryFailureState(3, 3);
    expect(result.summaryStatus).toBe("needs_review");
    expect(result.flagReason).toMatch(/AI summarization failed/i);
    expect(result.flagReason).toContain("3");
  });

  it("returns 'needs_review' when attemptsMade exceeds maxAttempts", () => {
    const result = getSummaryFailureState(5, 3);
    expect(result.summaryStatus).toBe("needs_review");
    expect(result.flagReason).toMatch(/AI summarization failed/i);
  });

  it("includes attempt count in flagReason for observability", () => {
    const result = getSummaryFailureState(3, 3);
    expect(result.flagReason).toContain("3 attempts");
  });

  it("uses custom maxAttempts when provided", () => {
    const result = getSummaryFailureState(5, 5);
    expect(result.summaryStatus).toBe("needs_review");
    expect(result.flagReason).toContain("5 attempts");
  });
});
