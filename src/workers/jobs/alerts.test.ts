/**
 * alerts.test.ts — Tests for the needs_review queue alerting.
 *
 * Phase 19 (High H10): Previously, failed summaries (status='needs_review')
 * were only discoverable by a human manually navigating to /admin/summaries.
 * If summaries failed silently after retries, they could pile up indefinitely
 * with no notification.
 *
 * The checkNeedsReviewAlert function counts summaries with status='needs_review'
 * and triggers an alert if the count exceeds a threshold. The alerting
 * mechanism is pluggable — by default it logs to console.warn, but production
 * deployments can swap in an email/webhook/Slack integration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB.
const mockCountResult = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    execute: vi.fn(() => Promise.resolve([{ count: mockCountResult() }])),
  },
}));

// Import after mocks are registered.
const { checkNeedsReviewAlert, DEFAULT_ALERT_THRESHOLD } =
  await import("./alerts");

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no flagged summaries.
  mockCountResult.mockReturnValue(0);
});

describe("checkNeedsReviewAlert", () => {
  it("returns ok status with count when no flagged summaries", async () => {
    const result = await checkNeedsReviewAlert();
    expect(result.status).toBe("ok");
    expect(result.count).toBe(0);
    expect(result.alerted).toBe(false);
  });

  it("returns warning status when count exceeds default threshold", async () => {
    mockCountResult.mockReturnValue(DEFAULT_ALERT_THRESHOLD + 1);
    const result = await checkNeedsReviewAlert();
    expect(result.status).toBe("warning");
    expect(result.alerted).toBe(true);
  });

  it("returns ok status when count equals threshold (boundary)", async () => {
    mockCountResult.mockReturnValue(DEFAULT_ALERT_THRESHOLD);
    const result = await checkNeedsReviewAlert();
    // At exactly the threshold, we don't alert (alert is > threshold).
    expect(result.status).toBe("ok");
    expect(result.alerted).toBe(false);
  });

  it("accepts a custom threshold", async () => {
    mockCountResult.mockReturnValue(3);
    const result = await checkNeedsReviewAlert({ threshold: 2 });
    expect(result.status).toBe("warning");
    expect(result.alerted).toBe(true);
  });

  it("logs to console.warn when alerting (default alerting mechanism)", async () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    mockCountResult.mockReturnValue(5);
    await checkNeedsReviewAlert();
    expect(warnSpy).toHaveBeenCalled();
    // The alert message mentions editorial review and the admin URL.
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/editorial review/i);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/\/admin\/summaries/);
    warnSpy.mockRestore();
  });

  it("accepts a custom alert callback (e.g., email/webhook/Slack)", async () => {
    const alertCallback = vi.fn();
    mockCountResult.mockReturnValue(5);
    const result = await checkNeedsReviewAlert({ alert: alertCallback });
    expect(result.alerted).toBe(true);
    expect(alertCallback).toHaveBeenCalledWith(
      expect.objectContaining({ count: 5 }),
    );
  });
});
