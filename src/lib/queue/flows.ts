/**
 * flows.ts — BullMQ FlowProducer DAG for atomic post-ingest processing.
 *
 * Per PAD §6.4: After ingestion inserts new articles, enqueue an atomic
 * flow where:
 *   - Children: score-article jobs (one per new article) on the `score` queue
 *   - Parent:   refresh-feed-slice job on the `feed-slice` queue
 *
 * The parent runs ONLY after ALL children complete (BullMQ FlowProducer
 * guarantee). This ensures the feed-slice cache invalidation does not fire
 * until every new article has been scored — preventing stale ordering in
 * the feed.
 *
 * Connection: Uses the Queue (producer) connection config from @/lib/queue
 * (enableOfflineQueue: false) — flow producers are producers, not workers.
 *
 * Phase 19 (Critical C4): Resilience to Redis failures. Previously, if
 * flowProducer.add() threw (e.g., Redis unreachable during an ingest burst),
 * the error propagated to processIngestJob's catch, which incremented
 * failureCount and re-threw. BullMQ would retry the entire ingest job —
 * but the articles were already persisted (xmax != 0), so newArticleIds
 * would be empty on retry and the flow would NEVER be re-enqueued. Articles
 * existed but were never scored and never cache-invalidated — silent data
 * loss.
 *
 * Fix: enqueuePostIngestFlow now wraps flowProducer.add() in try/catch. On
 * failure, it falls back to direct scoreQueue.add() per article (less atomic
 * but at least scores get enqueued). It logs loudly and returns a status
 * object — it does NOT re-throw. The caller can decide whether to surface
 * the degraded status (e.g., increment a separate metric without re-throwing).
 */

import { FlowProducer } from "bullmq";
import { createQueueConnection, scoreQueue } from "./index";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PostIngestFlowInput {
  /** IDs of newly-inserted articles that need scoring */
  newArticleIds: string[];
  /** Category ID for the feed-slice cache invalidation */
  categoryId: string;
}

export interface PostIngestFlowStatus {
  /** "ok" = flow enqueued atomically; "degraded" = fallback used; "skipped" = no articles */
  status: "ok" | "degraded" | "skipped";
  /** True when the per-article scoreQueue.add() fallback was used */
  fallbackUsed: boolean;
  /** Number of fallback scoreQueue.add() calls that failed (0 when fallback not used) */
  fallbackFailures: number;
  /** Number of articles enqueued (either via flow children or fallback) */
  enqueuedCount: number;
}

// ── Singleton FlowProducer ─────────────────────────────────────────────────
// Module-level singleton — reused across all flow enqueues in this process.
// Avoids per-call connection churn.

let _flowProducer: FlowProducer | null = null;

/**
 * Returns the singleton FlowProducer instance.
 *
 * Phase 19 (M7): Exported so the worker's graceful shutdown can close it
 * (previously leaked). The function is idempotent — calling it before any
 * enqueue just creates the FlowProducer early.
 */
export function getFlowProducer(): FlowProducer {
  if (!_flowProducer) {
    _flowProducer = new FlowProducer({ connection: createQueueConnection() });
  }
  return _flowProducer;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Enqueues an atomic post-ingest flow:
 *   - Parent (refresh-feed-slice) runs only after ALL children complete
 *   - Children (score-article) run in parallel on the score queue
 *
 * Phase 19 (Critical C4): Resilient to Redis failures. On FlowProducer.add
 * failure, falls back to direct scoreQueue.add() per article. Never throws
 * — returns a status object so the caller can decide how to handle a
 * degraded enqueue (e.g., log a metric without re-throwing, which would
 * cause BullMQ to retry the entire ingest job and silently drop the
 * already-persisted articles from the scoring pipeline).
 *
 * @param input — newArticleIds + categoryId
 * @returns status object indicating whether the atomic flow succeeded or
 *          the fallback was used (and how many fallback failures occurred)
 */
export async function enqueuePostIngestFlow(
  input: PostIngestFlowInput,
): Promise<PostIngestFlowStatus> {
  // Edge case: no new articles. Nothing to do.
  if (input.newArticleIds.length === 0) {
    return {
      status: "skipped",
      fallbackUsed: false,
      fallbackFailures: 0,
      enqueuedCount: 0,
    };
  }

  const flowProducer = getFlowProducer();

  // Build children: one score-article job per new article.
  const children = input.newArticleIds.map((articleId) => ({
    name: "score-article",
    queueName: "score",
    data: { articleId },
    opts: { priority: 2 },
  }));

  // Build the flow tree: parent refresh-feed-slice + children score-article.
  // BullMQ guarantees the parent only runs after all children complete.
  try {
    await flowProducer.add({
      name: "refresh-feed-slice",
      queueName: "feed-slice",
      data: {
        categoryId: input.categoryId,
        sort: "latest",
      },
      opts: { priority: 1 },
      children,
    });

    return {
      status: "ok",
      fallbackUsed: false,
      fallbackFailures: 0,
      enqueuedCount: input.newArticleIds.length,
    };
  } catch (flowError) {
    // ── Fallback path: Redis down (or FlowProducer otherwise broken) ─────
    // The atomic flow failed. The articles are already in Postgres; if we
    // re-throw, BullMQ will retry the entire ingest job, but the upsert
    // will see xmax != 0 (existing rows) and newArticleIds will be empty
    // on retry → flow never re-enqueued → silent data loss.
    //
    // Instead: fall back to direct scoreQueue.add() per article. We lose
    // the atomic parent-waits-for-children guarantee (feed-slice may
    // invalidate before all scores land), but at least scoring happens.
    // The feed-slice cache will be refreshed on the next ingest cycle.
    console.error(
      "[FlowProducer] Atomic flow enqueue failed. Falling back to direct scoreQueue.add() per article.",
      flowError,
    );

    let fallbackFailures = 0;
    for (const articleId of input.newArticleIds) {
      try {
        await scoreQueue.add("score-article", { articleId });
      } catch (perArticleError) {
        fallbackFailures += 1;
        console.error(
          `[FlowProducer] Fallback scoreQueue.add() also failed for article ${articleId}.`,
          perArticleError,
        );
      }
    }

    return {
      status: "degraded",
      fallbackUsed: true,
      fallbackFailures,
      enqueuedCount: input.newArticleIds.length - fallbackFailures,
    };
  }
}
