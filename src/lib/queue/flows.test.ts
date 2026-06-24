/**
 * flows.test.ts — Tests for the post-ingest FlowProducer DAG.
 *
 * Mocks BullMQ's FlowProducer to verify the atomic DAG structure:
 *   - Parent: refresh-feed-slice on feed-slice queue
 *   - Children: score-article jobs on score queue (one per new article)
 *   - Parent runs only after ALL children complete (atomic guarantee)
 *
 * Phase 19 (Critical C4): Resilience to Redis failures. Previously, if
 * flowProducer.add() threw (e.g., Redis unreachable), the error propagated
 * to processIngestJob's catch, which incremented failureCount and re-threw.
 * BullMQ would retry the entire ingest job — but the articles were already
 * persisted (xmax != 0), so newArticleIds would be empty on retry and the
 * flow would NEVER be re-enqueued. Articles existed but were never scored
 * and never cache-invalidated — silent data loss.
 *
 * Fix: enqueuePostIngestFlow now wraps flowProducer.add() in try/catch. On
 * failure, it falls back to direct scoreQueue.add() per article (less atomic
 * but at least scores get enqueued). It logs loudly and returns a status
 * object — it does NOT re-throw.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock FlowProducer — capture the add() calls to verify DAG structure.
// FlowProducer is called with `new`, so the mock must be a constructor.
const mockFlowAdd = vi.fn().mockResolvedValue({ job: { id: "flow-1" } });
const mockFlowClose = vi.fn();

vi.mock("bullmq", () => {
  return {
    FlowProducer: class MockFlowProducer {
      add = mockFlowAdd;
      close = mockFlowClose;
    },
    // Queue is imported by the fallback path (Phase 19 / C4).
    Queue: class MockQueue {
      add = vi.fn().mockResolvedValue({ id: "fallback-job" });
      close = vi.fn();
    },
  };
});

// Mock the queue connection factory (used by getFlowProducer).
vi.mock("@/lib/queue", () => ({
  createQueueConnection: vi.fn(() => ({
    host: "localhost",
    port: 6379,
  })),
  // Provide a mock scoreQueue so the fallback path can use it.
  scoreQueue: {
    add: vi.fn().mockResolvedValue({ id: "fallback-job" }),
  },
}));

// Import AFTER mocks are registered.
const { enqueuePostIngestFlow } = await import("./flows");
const { scoreQueue } = await import("@/lib/queue");

beforeEach(() => {
  vi.clearAllMocks();
  // Default: FlowProducer.add succeeds.
  mockFlowAdd.mockResolvedValue({ job: { id: "flow-1" } });
});

describe("enqueuePostIngestFlow", () => {
  it("creates a flow with parent refresh-feed-slice on feed-slice queue", async () => {
    await enqueuePostIngestFlow({
      newArticleIds: ["art-1"],
      categoryId: "cat-1",
    });

    expect(mockFlowAdd).toHaveBeenCalledTimes(1);
    const flowTree = mockFlowAdd.mock.calls[0]?.[0];
    expect(flowTree.name).toBe("refresh-feed-slice");
    expect(flowTree.queueName).toBe("feed-slice");
  });

  it("passes categoryId to parent job data", async () => {
    await enqueuePostIngestFlow({
      newArticleIds: ["art-1"],
      categoryId: "cat-42",
    });

    const flowTree = mockFlowAdd.mock.calls[0]?.[0];
    expect(flowTree.data).toEqual(
      expect.objectContaining({
        categoryId: "cat-42",
      }),
    );
  });

  it("creates one score-article child per new article ID", async () => {
    const newArticleIds = ["art-1", "art-2", "art-3"];

    await enqueuePostIngestFlow({
      newArticleIds,
      categoryId: "cat-1",
    });

    const flowTree = mockFlowAdd.mock.calls[0]?.[0];
    expect(flowTree.children).toHaveLength(3);
    expect(flowTree.children[0].name).toBe("score-article");
    expect(flowTree.children[0].queueName).toBe("score");
    expect(flowTree.children[0].data).toEqual({ articleId: "art-1" });
    expect(flowTree.children[1].data).toEqual({ articleId: "art-2" });
    expect(flowTree.children[2].data).toEqual({ articleId: "art-3" });
  });

  it("handles empty newArticleIds array (returns skipped status, no flow enqueued)", async () => {
    const status = await enqueuePostIngestFlow({
      newArticleIds: [],
      categoryId: "cat-1",
    });

    expect(status).toEqual(
      expect.objectContaining({
        status: "skipped",
        enqueuedCount: 0,
      }),
    );
    expect(mockFlowAdd).not.toHaveBeenCalled();
  });

  it("assigns priority 1 to parent and priority 2 to children", async () => {
    await enqueuePostIngestFlow({
      newArticleIds: ["art-1"],
      categoryId: "cat-1",
    });

    const flowTree = mockFlowAdd.mock.calls[0]?.[0];
    expect(flowTree.opts.priority).toBe(1);
    expect(flowTree.children[0].opts.priority).toBe(2);
  });

  it("returns status=ok (not undefined) when FlowProducer.add succeeds", async () => {
    const status = await enqueuePostIngestFlow({
      newArticleIds: ["art-1"],
      categoryId: "cat-1",
    });
    expect(status).toEqual(
      expect.objectContaining({
        status: "ok",
        fallbackUsed: false,
        enqueuedCount: 1,
      }),
    );
  });
});

// ── Phase 19 / Critical C4: Resilience to Redis failures ────────────────────

describe("enqueuePostIngestFlow — Redis failure resilience (Critical C4)", () => {
  it("does NOT throw when FlowProducer.add fails (Redis down)", async () => {
    // Simulate Redis being unreachable — FlowProducer.add rejects.
    mockFlowAdd.mockRejectedValue(new Error("Redis connection refused"));

    // Previously: this would throw, propagate to processIngestJob's catch,
    // increment failureCount, re-throw. BullMQ retries ingest, but articles
    // already exist (xmax != 0), so newArticleIds is empty on retry → flow
    // never re-enqueued → silent data loss.
    //
    // Now: enqueuePostIngestFlow swallows the error, falls back, and returns
    // a status object. The caller can decide what to do with the status.
    await expect(
      enqueuePostIngestFlow({
        newArticleIds: ["art-1", "art-2"],
        categoryId: "cat-1",
      }),
    ).resolves.toBeDefined();
  });

  it("falls back to direct scoreQueue.add() per article on flow failure", async () => {
    mockFlowAdd.mockRejectedValue(new Error("Redis connection refused"));

    await enqueuePostIngestFlow({
      newArticleIds: ["art-1", "art-2", "art-3"],
      categoryId: "cat-1",
    });

    // Each article should get its own scoreQueue.add() call as a fallback.
    // This is less atomic (no parent-waits-for-children guarantee) but
    // ensures scoring happens at all, vs. silent data loss.
    expect(scoreQueue.add).toHaveBeenCalledTimes(3);
    expect(scoreQueue.add).toHaveBeenCalledWith("score-article", {
      articleId: "art-1",
    });
    expect(scoreQueue.add).toHaveBeenCalledWith("score-article", {
      articleId: "art-2",
    });
    expect(scoreQueue.add).toHaveBeenCalledWith("score-article", {
      articleId: "art-3",
    });
  });

  it("returns status=degraded when fallback is used", async () => {
    mockFlowAdd.mockRejectedValue(new Error("Redis connection refused"));

    const status = await enqueuePostIngestFlow({
      newArticleIds: ["art-1"],
      categoryId: "cat-1",
    });

    expect(status).toEqual(
      expect.objectContaining({
        status: "degraded",
        fallbackUsed: true,
      }),
    );
  });

  it("returns status=ok when FlowProducer succeeds", async () => {
    const status = await enqueuePostIngestFlow({
      newArticleIds: ["art-1"],
      categoryId: "cat-1",
    });

    expect(status).toEqual(
      expect.objectContaining({
        status: "ok",
        fallbackUsed: false,
      }),
    );
  });

  it("does NOT call scoreQueue.add when FlowProducer succeeds (no fallback needed)", async () => {
    await enqueuePostIngestFlow({
      newArticleIds: ["art-1", "art-2"],
      categoryId: "cat-1",
    });

    expect(scoreQueue.add).not.toHaveBeenCalled();
  });

  it("continues falling back per-article even if some scoreQueue.add calls fail", async () => {
    mockFlowAdd.mockRejectedValue(new Error("Redis down"));
    // Make the second scoreQueue.add fail; the first and third should still succeed.
    // Cast to `never` because the BullMQ Job type is large and we only need
    // the `id` field for the test — providing the full Job shape would couple
    // the test to BullMQ internals unnecessarily.
    vi.mocked(scoreQueue.add)
      .mockResolvedValueOnce({ id: "fb-1" } as never)
      .mockRejectedValueOnce(new Error("Redis still down"))
      .mockResolvedValueOnce({ id: "fb-3" } as never);

    const status = await enqueuePostIngestFlow({
      newArticleIds: ["art-1", "art-2", "art-3"],
      categoryId: "cat-1",
    });

    expect(scoreQueue.add).toHaveBeenCalledTimes(3);
    expect(status.fallbackUsed).toBe(true);
    // Should report partial failure count
    expect(status.fallbackFailures).toBe(1);
  });
});
