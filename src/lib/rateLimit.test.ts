/**
 * rateLimit.test.ts — Tests for Redis fixed-window rate limiter.
 *
 * Mocks ioredis to isolate the limiter logic from real Redis.
 * Tests verify the INCR + EXPIRE pattern, window reset behavior,
 * and proper returning of { allowed, remaining, resetAt }.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ioredis — capture the Redis class so we can inspect instances.
const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  quit: vi.fn(),
  on: vi.fn(),
};

// `Redis` must be a constructor (called with `new`). vi.fn(() => mockRedis)
// doesn't work because `new` on a vi.fn returns an empty object, ignoring
// the return value. We need a real class-like function.
vi.mock("ioredis", () => {
  return {
    Redis: class MockRedis {
      incr = mockRedis.incr;
      expire = mockRedis.expire;
      ttl = mockRedis.ttl;
      quit = mockRedis.quit;
      on = mockRedis.on;
    },
  };
});

// Import AFTER mocks are registered.
const { checkRateLimit } = await import("./rateLimit");

beforeEach(() => {
  vi.clearAllMocks();
  // Default: INCR returns 1 (first request), TTL returns 60 (60s left in window).
  mockRedis.incr.mockResolvedValue(1);
  mockRedis.expire.mockResolvedValue(1);
  mockRedis.ttl.mockResolvedValue(60);
});

describe("checkRateLimit", () => {
  it("allows first request within limit", async () => {
    mockRedis.incr.mockResolvedValue(1);

    const result = await checkRateLimit("test-id", 20, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(19); // 20 - 1 = 19
  });

  it("blocks request when count exceeds limit", async () => {
    mockRedis.incr.mockResolvedValue(21); // 21st request, limit is 20

    const result = await checkRateLimit("test-id", 20, 60);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0); // never negative
  });

  it("calls EXPIRE only on first request (when INCR returns 1)", async () => {
    mockRedis.incr.mockResolvedValue(1);

    await checkRateLimit("test-id", 20, 60);

    expect(mockRedis.expire).toHaveBeenCalledTimes(1);
    expect(mockRedis.expire).toHaveBeenCalledWith(
      expect.stringContaining("test-id"),
      60,
    );
  });

  it("does NOT call EXPIRE on subsequent requests (INCR > 1)", async () => {
    mockRedis.incr.mockResolvedValue(5);

    await checkRateLimit("test-id", 20, 60);

    expect(mockRedis.expire).not.toHaveBeenCalled();
  });

  it("returns resetAt as epoch ms based on TTL", async () => {
    mockRedis.incr.mockResolvedValue(3);
    mockRedis.ttl.mockResolvedValue(45); // 45 seconds left

    const before = Date.now();
    const result = await checkRateLimit("test-id", 20, 60);
    const after = Date.now();

    // resetAt should be ~45s in the future (between before+45s and after+45s).
    expect(result.resetAt).toBeGreaterThanOrEqual(before + 45_000);
    expect(result.resetAt).toBeLessThanOrEqual(after + 45_000);
  });

  it("falls back to full window when TTL returns -1 (no expiry set)", async () => {
    mockRedis.incr.mockResolvedValue(3);
    mockRedis.ttl.mockResolvedValue(-1); // key has no expiry

    const result = await checkRateLimit("test-id", 20, 30);

    // Should use the configured windowSec (30s) as fallback.
    const now = Date.now();
    expect(result.resetAt).toBeGreaterThanOrEqual(now + 29_000);
    expect(result.resetAt).toBeLessThanOrEqual(now + 31_000);
  });

  it("uses prefixed key format 'ratelimit:<identifier>'", async () => {
    await checkRateLimit("api:articles:1.2.3.4", 20, 60);

    expect(mockRedis.incr).toHaveBeenCalledWith(
      "ratelimit:api:articles:1.2.3.4",
    );
  });
});
