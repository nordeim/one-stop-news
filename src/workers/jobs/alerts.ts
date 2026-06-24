/**
 * alerts.ts — Needs-review queue alerting.
 *
 * Phase 19 (High H10): Previously, failed summaries (status='needs_review')
 * were only discoverable by a human manually navigating to /admin/summaries.
 * If summaries failed silently after retries, they could pile up indefinitely
 * with no notification.
 *
 * checkNeedsReviewAlert counts summaries with status='needs_review' and
 * triggers an alert if the count exceeds a threshold. The alerting mechanism
 * is pluggable — by default it logs to console.warn, but production
 * deployments can swap in an email/webhook/Slack integration via the
 * `alert` callback option.
 *
 * This function is designed to be called from a BullMQ repeatable job
 * (e.g., every 24h). The scheduler wiring lives in the worker entrypoint
 * (src/workers/index.ts) or a dedicated cron module.
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const DEFAULT_ALERT_THRESHOLD = 3;

export interface NeedsReviewAlertResult {
  /** "ok" = count at or below threshold; "warning" = count exceeded threshold */
  status: "ok" | "warning";
  /** Number of summaries with status='needs_review' */
  count: number;
  /** True if the alert callback was invoked */
  alerted: boolean;
}

export interface NeedsReviewAlertOptions {
  /** Alert when count strictly exceeds this number. Default: 3. */
  threshold?: number;
  /** Custom alert callback (e.g., email, webhook, Slack). Default: console.warn. */
  alert?: (info: { count: number; threshold: number; message: string }) => void;
}

/**
 * Counts summaries with status='needs_review' and triggers an alert if the
 * count exceeds the threshold.
 *
 * @returns { status, count, alerted } — the caller can use this to log metrics
 *          or chain additional actions.
 */
export async function checkNeedsReviewAlert(
  options: NeedsReviewAlertOptions = {},
): Promise<NeedsReviewAlertResult> {
  const threshold = options.threshold ?? DEFAULT_ALERT_THRESHOLD;
  const alertFn = options.alert ?? defaultAlert;

  // Count summaries with status='needs_review'. Using a raw SQL count
  // because Drizzle's relational query API doesn't have a built-in count
  // helper (you'd have to fetch all rows and call .length, which is
  // wasteful when the queue is large).
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM summaries
    WHERE status = 'needs_review'
  `);

  // The result shape depends on the driver (postgres.js returns rows as
  // an array of objects). We extract the count safely.
  const row = (result as unknown as Array<{ count: number }>)[0];
  const count = row?.count ?? 0;

  if (count > threshold) {
    const message =
      `[OneStopNews] ${count} summaries need editorial review ` +
      `(threshold: ${threshold}). Visit /admin/summaries to action them.`;
    alertFn({ count, threshold, message });
    return { status: "warning", count, alerted: true };
  }

  return { status: "ok", count, alerted: false };
}

/**
 * Default alert callback — logs to console.warn.
 * Production deployments should override this with an email/webhook/Slack
 * integration by passing a custom `alert` option to checkNeedsReviewAlert.
 */
function defaultAlert(info: {
  count: number;
  threshold: number;
  message: string;
}): void {
  console.warn(`[ALERT] ${info.message}`);
}
