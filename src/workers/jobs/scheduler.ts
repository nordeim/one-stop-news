import { ingestQueue } from "@/lib/queue";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * syncSchedulers — Idempotent job scheduler for RSS feed polling.
 *
 * Fetches all active sources and ensures each has exactly one
 * BullMQ job scheduler. Calling this function multiple times is
 * safe — existing schedulers are updated, not duplicated.
 *
 * @returns Number of active sources scheduled
 */
export async function syncSchedulers(): Promise<number> {
  const activeSources = await db
    .select({
      id: sources.id,
      pollIntervalMinutes: sources.pollIntervalMinutes,
      priority: sources.priority,
    })
    .from(sources)
    .where(eq(sources.isActive, true));

  for (const source of activeSources) {
    const schedulerId = `ingest-source-${source.id}`;
    const intervalMs = source.pollIntervalMinutes * 60 * 1000;

    // upsertJobScheduler ensures exactly one scheduler per source.
    // On restart, existing schedulers are updated (not duplicated).
    await ingestQueue.upsertJobScheduler(
      schedulerId,
      { every: intervalMs },
      {
        name: "ingest-source",
        data: { sourceId: source.id, schedulerId },
        opts: { priority: source.priority },
      },
    );
  }

  return activeSources.length;
}
