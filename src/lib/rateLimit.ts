/**
 * rateLimit.ts — Redis fixed-window rate limiter.
 *
 * Implements a simple INCR + EXPIRE fixed-window counter per identifier.
 * Per MEP §4 / Phase 9 recommendation: max 20 req/s per IP for /api/articles.
 *
 * Pattern:
 *   1. INCR ratelimit:<identifier>
 *   2. If INCR returns 1, this is the first request in the window → EXPIRE
 *   3. allowed = (count <= limit)
 *   4. remaining = max(0, limit - count)
 *   5. resetAt = now + TTL seconds (fallback to windowSec if TTL is -1)
 *
 * Why fixed-window over token bucket: simpler, atomic via single INCR,
 * sufficient for the documented "max 20 req/s per IP, burst 50" target.
 * Burst is naturally absorbed by the 1-second window.
 */

import { Redis } from "ioredis";
import { env } from "@/lib/env";

export interface RateLimitResult {
  /** Whether the request is allowed under the limit */
  allowed: boolean;
  /** Remaining requests in the current window (never negative) */
  remaining: number;
  /** Epoch milliseconds when the window resets */
  resetAt: number;
}

// Module-level singleton — reused across all rate limit checks in this process.
// Avoids per-request connection churn (same pattern as cacheInvalidation publisher).
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      enableOfflineQueue: false,
    });
  }
  return _redis;
}

/**
 * Checks whether a request is allowed under the fixed-window rate limit.
 *
 * @param identifier — Unique key for the rate-limit bucket (e.g., "api:articles:1.2.3.4")
 * @param limit      — Maximum requests allowed in the window
 * @param windowSec  — Window duration in seconds
 * @returns { allowed, remaining, resetAt }
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const redis = getRedis();
  const key = `ratelimit:${identifier}`;

  const count = await redis.incr(key);

  // Only set expiry on the first request of a new window.
  // This prevents resetting the TTL on every request (which would defeat the window).
  if (count === 1) {
    await redis.expire(key, windowSec);
  }

  // Read remaining TTL to compute resetAt. If TTL is -1 (no expiry set, e.g.,
  // after a Redis restart), fall back to the configured window duration.
  const ttlSec = await redis.ttl(key);
  const effectiveTtl = ttlSec > 0 ? ttlSec : windowSec;
  const resetAt = Date.now() + effectiveTtl * 1000;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}
