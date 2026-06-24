import { Queue } from "bullmq";
import { env } from "@/lib/env";
import type { Redis } from "ioredis";

// ── Redis Connection Factories ──────────────────────────────────────────────
// Per MEP v5.1: Worker and Queue (producer) connections have different configs.
// This prevents memory leaks on the producer side during Redis disconnects.

/** Shared base Redis config derived from env.REDIS_URL. */
function getRedisUrlParts() {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
  };
}

/**
 * Queue (producer) connection — used by all BullMQ Queue instances.
 * - enableOfflineQueue: false (prevent memory leaks when Redis is unreachable)
 */
export function createQueueConnection() {
  return {
    ...getRedisUrlParts(),
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  };
}

/**
 * Worker connection — used by BullMQ Worker instances (Phase 7).
 * - maxRetriesPerRequest: null (REQUIRED for blocking commands)
 * - enableOfflineQueue: true (workers must persist during Redis outages)
 */
export function createWorkerConnection() {
  return {
    ...getRedisUrlParts(),
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  };
}

// ── Shared Default Job Options ──────────────────────────────────────────────
const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

// ── Queue Definitions (Producer Side) ───────────────────────────────────────
export const ingestQueue = new Queue("ingest", {
  connection: createQueueConnection(),
  defaultJobOptions,
});

export const summarizeQueue = new Queue("summarize", {
  connection: createQueueConnection(),
  defaultJobOptions,
});

export const scoreQueue = new Queue("score", {
  connection: createQueueConnection(),
  defaultJobOptions,
});

export const feedSliceQueue = new Queue("feed-slice", {
  connection: createQueueConnection(),
  defaultJobOptions,
});

// ── Redis Ping Utility (for health checks) ──────────────────────────────────
let _pingRedisClient: Redis | null = null;

/**
 * Ping Redis using a singleton client.
 *
 * Reuses a single connection across calls to avoid socket/TCP churn.
 * On ping failure, disconnects and nullifies the client so the next
 * call will attempt to reconnect.
 */
export async function pingRedis(): Promise<boolean> {
  try {
    if (!_pingRedisClient) {
      const { Redis } = await import("ioredis");
      const { host, port } = getRedisUrlParts();
      _pingRedisClient = new Redis({
        host,
        port,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        enableOfflineQueue: false,
      });

      _pingRedisClient.on("error", (err: Error) => {
        console.warn("[Redis Ping Client] Error encountered:", err.message);
      });
    }

    await _pingRedisClient.ping();
    return true;
  } catch {
    if (_pingRedisClient) {
      try {
        _pingRedisClient.disconnect();
      } catch {
        // Best-effort disconnect — ignore errors during cleanup.
      }
      _pingRedisClient = null;
    }
    return false;
  }
}
