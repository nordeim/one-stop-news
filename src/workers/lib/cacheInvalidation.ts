import { Redis } from "ioredis";
import { env } from "@/lib/env";

/**
 * publishCacheInvalidation — Publish a cache invalidation event to Redis.
 *
 * Workers cannot use revalidateTag from next/cache (Next.js-only API).
 * Instead, workers publish invalidation events to a Redis channel.
 * The web app can subscribe to these events or check a Redis key.
 *
 * Channel format: cache:invalidate:<tag>
 *
 * Phase 13 refactor: Uses a module-level singleton Redis publisher instead
 * of creating a new connection per call. Under high ingest load (50
 * concurrent workers), the previous per-call pattern caused connection
 * churn (50+ short-lived TCP connections per invalidation event).
 *
 * @param tag — Cache tag to invalidate (e.g., 'feed:tech', 'topic-shell')
 * @returns true if published successfully, false otherwise
 */
let _publisher: Redis | null = null;

function getPublisher(): Redis {
  if (!_publisher) {
    _publisher = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
    });
  }
  return _publisher;
}

export async function publishCacheInvalidation(tag: string): Promise<boolean> {
  try {
    const publisher = getPublisher();
    const channel = `cache:invalidate:${tag}`;
    const message = JSON.stringify({
      tag,
      timestamp: new Date().toISOString(),
    });

    await publisher.publish(channel, message);

    return true;
  } catch (error) {
    // Log but don't throw — cache invalidation is best-effort
    console.warn("[CacheInvalidation] Failed to publish invalidation:", error);
    return false;
  }
}
