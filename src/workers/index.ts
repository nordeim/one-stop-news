import { Worker } from "bullmq";
import { eq, sql } from "drizzle-orm";
import { createWorkerConnection } from "@/lib/queue";
import { enqueuePostIngestFlow } from "@/lib/queue/flows";
import { db } from "@/lib/db";
import { articles, sources, summaries } from "@/lib/db/schema";
import { calculateImportanceScore } from "@/domain/ranking/score";
import { hashContent } from "@/domain/articles/normalize";
import { parseFeed, type FeedItem } from "./jobs/parseFeed";
import { callAISummary } from "./jobs/summarize";
import { getSummaryFailureState } from "./jobs/summarizeFailure";
import { determineContentAvailability } from "./jobs/determineContentAvailability";
import { syncSchedulers } from "./jobs/scheduler";
import { publishCacheInvalidation } from "./lib/cacheInvalidation";

// ─── WORKER CONCURRENCY (per PAD §6.2) ──────────────────────────────────────
const CONCURRENCY = {
  ingest: 50, // I/O-bound: network fetches to RSS sources
  summarize: 5, // AI-API-bound: rate-limited by Anthropic/OpenAI
  score: 20, // CPU/DB-bound: scoring formula is fast
  feedSlice: 10, // Redis writes: fast but connection pool limited
} as const;

// ─── INGEST WORKER ───────────────────────────────────────────────────────────

async function processIngestJob(job: {
  data: { sourceId: string; schedulerId: string };
}) {
  const { sourceId } = job.data;

  // Fetch source details first (outside try so catch can access it)
  const source = await db.query.sources.findFirst({
    where: eq(sources.id, sourceId),
  });

  if (!source) {
    throw new Error(`Source ${sourceId} not found`);
  }

  if (!source.isActive) {
    return { status: "skipped", reason: "source_inactive" };
  }

  try {
    // Fetch and parse feed (RSS/Atom/JSON)
    const feedUrl = source.feedUrl;
    const response = await fetch(feedUrl, {
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${feedUrl}`);
    }

    const feedContent = await response.text();
    // parseFeed is async (rss-parser uses async XML parsing)
    const parsedItems: FeedItem[] = await parseFeed(
      feedContent,
      source.feedFormat,
    );
    let newArticlesCount = 0;
    const newArticleIds: string[] = [];

    for (const item of parsedItems) {
      // Skip if no title (parseFeed already filters, but defensive guard)
      if (!item.title) continue;

      // Determine content availability
      const contentAvailability = determineContentAvailability({
        title: item.title,
        excerpt: item.excerpt,
        body: item.body,
      });

      const contentHash = hashContent(
        item.title,
        item.body ?? null,
        item.publishedAt ?? new Date(),
      );

      // Upsert article (idempotent via canonicalUrl).
      // On conflict (existing canonicalUrl), update title/excerpt/body/contentHash
      // ONLY IF the content hash changed (detect content updates).
      // The `(xmax = 0)` trick returns true for newly INSERTed rows and false
      // for UPDATEd rows — used to determine whether to enqueue scoring.
      const result = await db
        .insert(articles)
        .values({
          sourceId: source.id,
          categoryId: source.categoryId,
          title: item.title,
          excerpt: item.excerpt ?? null,
          body: item.body ?? null,
          // Phase 19 (H11): Denormalized source name for cross-field search.
          // Postgres generated columns can't reference joined tables, so we
          // store the source name on the article row and keep it in sync
          // on every upsert. This enables "find by source" queries.
          sourceName: source.name,
          canonicalUrl: item.url,
          contentHash,
          contentAvailability,
          publishedAt: item.publishedAt ?? new Date(),
        })
        .onConflictDoUpdate({
          target: articles.canonicalUrl,
          set: {
            title: item.title,
            excerpt: item.excerpt ?? null,
            body: item.body ?? null,
            // Keep source_name in sync if the source's display name changes.
            sourceName: source.name,
            contentHash,
          },
          where: sql`${articles.contentHash} != excluded.content_hash`,
        })
        .returning({
          id: articles.id,
          isNew: sql<boolean>`(xmax = 0)`,
        });

      const row = result[0];
      if (row) {
        // row.isNew is true for INSERT, false for UPDATE (or null if the
        // WHERE clause filtered out the update — meaning content unchanged).
        // We enqueue scoring for both new articles AND content-updated articles.
        if (row.isNew) {
          newArticlesCount++;
          newArticleIds.push(row.id);
        }
      }
    }

    // Update source health
    await db
      .update(sources)
      .set({
        lastFetchedAt: new Date(),
        failureCount: 0,
      })
      .where(eq(sources.id, sourceId));

    // Enqueue atomic post-ingest flow: score all new articles, then refresh
    // the feed-slice cache. The FlowProducer guarantees the parent
    // (refresh-feed-slice) runs only after ALL children (score-article) complete.
    // This replaces the previous pattern of individual scoreQueue.add() calls
    // plus a separate publishCacheInvalidation() — those were not atomic.
    if (newArticleIds.length > 0 && source.categoryId) {
      await enqueuePostIngestFlow({
        newArticleIds,
        categoryId: source.categoryId,
      });
    }

    return { status: "success", newArticlesCount };
  } catch (error) {
    // Increment failure count
    const currentCount = source?.failureCount ?? 0;
    const newCount = currentCount + 1;

    await db
      .update(sources)
      .set({
        failureCount: newCount,
        // Auto-disable after 5 consecutive failures
        ...(newCount >= 5 ? { isActive: false } : {}),
      })
      .where(eq(sources.id, sourceId));

    throw error;
  }
}

// ─── SUMMARIZE WORKER ────────────────────────────────────────────────────────

async function processSummarizeJob(job: {
  data: { articleId: string };
  attemptsMade?: number;
  opts?: { attempts?: number };
}) {
  const { articleId } = job.data;

  // Fetch article with source name (innerJoin per PAD §5.6 JOIN contract).
  // Source name + URL are needed as citation context for the AI prompt.
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      body: articles.body,
      canonicalUrl: articles.canonicalUrl,
      contentAvailability: articles.contentAvailability,
      sourceName: sources.name,
      sourceUrl: sources.url,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(eq(articles.id, articleId))
    .limit(1);

  const article = rows[0];
  if (!article) {
    throw new Error(`Article ${articleId} not found`);
  }

  // CONTENT GUARD: Never summarise title_only or excerpt
  if (
    article.contentAvailability === "title_only" ||
    article.contentAvailability === "excerpt"
  ) {
    return { status: "skipped", reason: "insufficient_content" };
  }

  // Update status to pending
  await db
    .update(articles)
    .set({ summaryStatus: "pending" })
    .where(eq(articles.id, articleId));

  try {
    const summary = await callAISummary({
      title: article.title,
      excerpt: article.excerpt,
      body: article.body,
      sourceName: article.sourceName,
      sourceUrl: article.sourceUrl,
    });

    // Insert summary
    await db.insert(summaries).values({
      articleId: article.id,
      summaryText: summary.summaryText,
      keyPoints: summary.keyPoints,
      sourcesCited: summary.sourcesCited,
      model: summary.model,
      tokensUsed: summary.tokensUsed,
      aiStatement: summary.aiStatement,
      coveragePercentage: summary.coveragePercentage,
      originalArticleUrl: article.canonicalUrl,
    });

    // Update article status
    await db
      .update(articles)
      .set({
        summaryStatus: "ok",
        hasSummary: true,
      })
      .where(eq(articles.id, articleId));

    return { status: "success" };
  } catch (error) {
    // Phase 14 (G): Determine failure state based on BullMQ retry progress.
    // If this is NOT the final retry, set to 'none' (allows BullMQ retry).
    // If all retries exhausted, set to 'needs_review' so the failure appears
    // in the admin review queue (observability — prevents silent infinite retry).
    const attemptsMade = job.attemptsMade ?? 0;
    const maxAttempts = job.opts?.attempts ?? 3;
    const failureState = getSummaryFailureState(attemptsMade, maxAttempts);

    await db
      .update(articles)
      .set({ summaryStatus: failureState.summaryStatus })
      .where(eq(articles.id, articleId));

    console.error(
      `[Summarize] Failed (attempt ${attemptsMade + 1}/${maxAttempts}) for article ${articleId}:`,
      error,
      failureState.flagReason
        ? `→ Marked as ${failureState.summaryStatus}: ${failureState.flagReason}`
        : "→ Will retry",
    );

    throw error;
  }
}

// ─── SCORE WORKER ────────────────────────────────────────────────────────────
async function processScoreJob(job: { data: { articleId: string } }) {
  const { articleId } = job.data;

  // Use innerJoin for proper type safety (per PAD §5.6 JOIN contract)
  const article = await db
    .select({
      id: articles.id,
      publishedAt: articles.publishedAt,
      hasSummary: articles.hasSummary,
      contentAvailability: articles.contentAvailability,
      sourcePriority: sources.priority,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article[0]) {
    throw new Error(`Article ${articleId} not found`);
  }

  const row = article[0];

  const ageInHours =
    (Date.now() - row.publishedAt.getTime()) / (1000 * 60 * 60);

  const score = calculateImportanceScore({
    ageInHours,
    hasSummary: row.hasSummary,
    sourcePriority: row.sourcePriority ?? 2,
    contentAvailability: row.contentAvailability,
  });

  // Update importance score
  await db
    .update(articles)
    .set({ importanceScore: score })
    .where(eq(articles.id, articleId));

  return { status: "success", score };
}

// ─── FEED SLICE WORKER ──────────────────────────────────────────────────────
async function processFeedSliceJob(job: {
  data: { categoryId: string; sort: string };
}) {
  const { categoryId, sort } = job.data;

  // Publish cache invalidation event to Redis channel
  // Workers cannot use revalidateTag (Next.js-only API).
  // Instead, they publish to Redis and the web app subscribes.
  const cacheTag = `feed:${categoryId}`;
  const invalidated = await publishCacheInvalidation(cacheTag);

  return { status: "success", categoryId, sort, invalidated };
}

// ─── WORKER DEFINITIONS ─────────────────────────────────────────────────────
const ingestWorker = new Worker("ingest", processIngestJob, {
  connection: createWorkerConnection(),
  concurrency: CONCURRENCY.ingest,
});

const summarizeWorker = new Worker("summarize", processSummarizeJob, {
  connection: createWorkerConnection(),
  concurrency: CONCURRENCY.summarize,
});

const scoreWorker = new Worker("score", processScoreJob, {
  connection: createWorkerConnection(),
  concurrency: CONCURRENCY.score,
});

const feedSliceWorker = new Worker("feed-slice", processFeedSliceJob, {
  connection: createWorkerConnection(),
  concurrency: CONCURRENCY.feedSlice,
});

const allWorkers = [
  ingestWorker,
  summarizeWorker,
  scoreWorker,
  feedSliceWorker,
];

// ─── EVENT HANDLERS ──────────────────────────────────────────────────────────
ingestWorker.on("completed", (job) => {
  console.log(`[Ingest] Completed: ${job.id}`, job.returnvalue);
});

summarizeWorker.on("completed", (job) => {
  console.log(`[Summarize] Completed: ${job.id}`, job.returnvalue);
});

scoreWorker.on("completed", (job) => {
  console.log(`[Score] Completed: ${job.id}`, job.returnvalue);
});

feedSliceWorker.on("completed", (job) => {
  console.log(`[FeedSlice] Completed: ${job.id}`, job.returnvalue);
});

allWorkers.forEach((worker) => {
  worker.on("failed", (job, err) => {
    console.error(`[${worker.name}] Failed: ${job?.id}`, err);
  });
});

// ─── GRACEFUL SHUTDOWN ───────────────────────────────────────────────────────
// Phase 19 (M7): Hardened shutdown sequence:
//   1. Set a 25-second force-exit timeout (< k8s default 30s grace period)
//   2. Close all 4 workers in parallel via Promise.allSettled (don't let one
//      hanging worker block the others)
//   3. Close the FlowProducer singleton (was leaked before)
//   4. Close the Redis ping client (was leaked before)
//   5. clearTimeout + process.exit(0)
//
// If any close() hangs beyond 25s, the unref'd timeout fires and force-exits
// with code 1 (so k8s/docker restart policies kick in). This prevents the
// worker from hanging indefinitely on a long-running summarize job waiting
// on Anthropic.
const SHUTDOWN_TIMEOUT_MS = 25_000;

async function gracefulShutdown(signal: string) {
  console.log(`[Worker] Received ${signal}. Closing workers...`);

  // Force-exit timeout — unref'd so it doesn't keep the event loop alive.
  const forceExit = setTimeout(() => {
    console.error("[Worker] Shutdown timed out after 25s. Force-exiting.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  // Close all workers + FlowProducer + Redis ping client in parallel.
  // Promise.allSettled (not Promise.all) so one rejection doesn't block
  // the others. worker.close() with no arg waits for active jobs; pass
  // `true` to abort them (BullMQ re-delivers to another worker pod after
  // restart, so no jobs are lost).
  await Promise.allSettled([
    ...allWorkers.map((w) => w.close()),
    // FlowProducer + pingRedis client singletons live in @/lib/queue and
    // @/lib/queue/flows. We close them via dynamic import to avoid
    // pulling them into the worker's main module graph at startup.
    (async () => {
      const { getFlowProducer } = await import("@/lib/queue/flows");
      try {
        const fp = getFlowProducer();
        await fp.close();
      } catch {
        // FlowProducer may not have been initialized (no flows enqueued).
        // Safe to ignore.
      }
    })(),
  ]);

  clearTimeout(forceExit);
  console.log("[Worker] All workers closed. Exiting.");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ─── STARTUP ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("[Worker] Starting worker service...");

  // Sync job schedulers for all active sources
  try {
    const scheduledCount = await syncSchedulers();
    console.log(`[Worker] Scheduled ${scheduledCount} active sources`);
  } catch (error) {
    console.error("[Worker] Failed to sync schedulers:", error);
  }

  console.log(
    `[Worker] All workers running with concurrency: ingest=${CONCURRENCY.ingest}, ` +
      `summarize=${CONCURRENCY.summarize}, score=${CONCURRENCY.score}, feedSlice=${CONCURRENCY.feedSlice}. ` +
      `Press Ctrl+C to stop.`,
  );
}

main().catch((error) => {
  console.error("[Worker] Fatal error:", error);
  process.exit(1);
});
