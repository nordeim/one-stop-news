import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── UNIT TEST: Cache Invalidation ───────────────────────────────────────────
//
// TDD Approach: Write failing tests first, then implement.
//
// Workers cannot use revalidateTag from next/cache (Next.js-only API).
// Instead, workers publish invalidation events to Redis, and the web app
// subscribes to these events or checks a Redis key on each request.
//
// Requirements (per PRD v4.3 §9.2):
//   - publishCacheInvalidation() writes to Redis channel
//   - Handles Redis connection errors gracefully
//   - Channel format: cache:invalidate:<tag>
//   - Reuses a single Redis publisher (singleton) across calls (Phase 13)
// ─────────────────────────────────────────────────────────────────────────────

// Track instantiation count to verify singleton behavior.
let instantiationCount = 0;
const mockPublish = vi.fn().mockResolvedValue(1);
const mockQuit = vi.fn().mockResolvedValue(undefined);

vi.mock("ioredis", () => {
  class MockRedis {
    publish = mockPublish;
    quit = mockQuit;
    constructor() {
      instantiationCount++;
    }
  }
  return { Redis: MockRedis };
});

// Mock env module
vi.mock("@/lib/env", () => ({
  env: {
    REDIS_URL: "redis://localhost:6379",
  },
}));

describe("cacheInvalidation", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockPublish.mockClear();
    mockQuit.mockClear();
    instantiationCount = 0;
    // Reset the module singleton so each test starts fresh.
    vi.resetModules();
  });

  describe("publishCacheInvalidation", () => {
    it("publishes cache invalidation event to Redis channel", async () => {
      const { publishCacheInvalidation } = await import("./cacheInvalidation");

      const result = await publishCacheInvalidation("feed:tech");

      expect(result).toBe(true);
      expect(mockPublish).toHaveBeenCalledWith(
        "cache:invalidate:feed:tech",
        expect.stringContaining("feed:tech"),
      );
    });

    it("handles Redis connection errors gracefully", async () => {
      // Reset and setup the reject
      mockPublish.mockRejectedValueOnce(new Error("Redis connection failed"));

      const { publishCacheInvalidation } = await import("./cacheInvalidation");

      // Should not throw even if Redis is unavailable
      const result = await publishCacheInvalidation("feed:tech");
      expect(result).toBe(false);
    });

    it("uses correct Redis channel format", async () => {
      const { publishCacheInvalidation } = await import("./cacheInvalidation");

      await publishCacheInvalidation("topic-shell");

      // Verify the channel uses the correct format
      expect(mockPublish).toHaveBeenCalledWith(
        "cache:invalidate:topic-shell",
        expect.any(String),
      );
    });

    it("reuses the same Redis publisher across multiple calls (singleton)", async () => {
      const { publishCacheInvalidation } = await import("./cacheInvalidation");

      // Call publishCacheInvalidation 5 times.
      await publishCacheInvalidation("feed:tech");
      await publishCacheInvalidation("feed:finance");
      await publishCacheInvalidation("topic-shell");
      await publishCacheInvalidation("feed:politics");
      await publishCacheInvalidation("feed:local");

      // Only ONE Redis instance should have been created (singleton reuse).
      // Before the Phase 13 refactor, each call created a new Redis + quit —
      // that caused connection churn under high ingest load.
      expect(instantiationCount).toBe(1);

      // And quit should NOT have been called (singleton stays alive).
      expect(mockQuit).not.toHaveBeenCalled();
    });
  });
});
