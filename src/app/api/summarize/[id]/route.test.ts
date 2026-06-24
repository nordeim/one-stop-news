/**
 * route.test.ts — Tests for POST /api/summarize/[id]
 *
 * Tests auth, content-availability guard, idempotency guard, and rate limiting.
 * The underlying DB and queue are mocked to isolate route-handler logic.
 *
 * Phase 19 (Critical gap C2): rate limiting per user (5 req/min/user) to
 * prevent unbounded BullMQ job fan-out → unbounded AI spend.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────

// Mock the DB proxy. The route uses db.query.articles.findFirst and db.update.
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      articles: {
        findFirst: mockFindFirst,
      },
    },
    update: () => ({
      set: () => ({
        where: mockUpdate,
      }),
    }),
  },
}));

// Mock the queue so we don't need a live Redis for these tests.
const mockAdd = vi.fn().mockResolvedValue({ id: "job-1" });
vi.mock("@/lib/queue", () => ({
  summarizeQueue: {
    add: mockAdd,
  },
}));

// Mock the rate limiter — tests control allowed/blocked per scenario.
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 5,
    resetAt: Date.now() + 60_000,
  }),
}));

// Mock the auth module — tests control session presence per scenario.
// API routes use auth() directly (not verifySession) because they need to
// return 401 JSON, not redirect. verifySession() calls redirect() which
// throws NEXT_REDIRECT — inappropriate for JSON API responses.
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

// Import after mocks are registered.
const { POST } = await import("./route");
const { checkRateLimit } = await import("@/lib/rateLimit");

// ── Helpers ─────────────────────────────────────────────────────────────────

const VALID_ARTICLE_ID = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(articleId: string = VALID_ARTICLE_ID): Request {
  return new Request(`http://localhost:3000/api/summarize/${articleId}`, {
    method: "POST",
  });
}

function mockArticle(
  overrides: Partial<{
    id: string;
    contentAvailability:
      | "title_only"
      | "excerpt"
      | "partial_text"
      | "full_text";
    summaryStatus: "none" | "pending" | "ok" | "needs_review" | "disabled";
    excerpt: string;
    title: string;
  }> = {},
) {
  return {
    id: VALID_ARTICLE_ID,
    contentAvailability: "partial_text" as const,
    summaryStatus: "none" as const,
    excerpt: "Some excerpt text long enough to summarize.",
    title: "Test Article",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated, allowed by rate limiter, valid article ready to summarize.
  mockAuth.mockResolvedValue({
    user: { id: "user-1", role: "reader", email: "user@test.com" },
  });
  vi.mocked(checkRateLimit).mockResolvedValue({
    allowed: true,
    remaining: 5,
    resetAt: Date.now() + 60_000,
  });
  mockFindFirst.mockResolvedValue(mockArticle());
  mockUpdate.mockResolvedValue(undefined);
  mockAdd.mockResolvedValue({ id: "job-1" });
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/summarize/[id] — auth", () => {
  it("returns 401 when no session (uses auth() not verifySession)", async () => {
    // API routes use auth() directly — it returns null when unauthenticated
    // (no redirect). The route returns 401 JSON. This is the correct pattern
    // for API routes: verifySession() would redirect (throw NEXT_REDIRECT),
    // which is inappropriate for JSON API responses.
    mockAuth.mockResolvedValue(null);
    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: VALID_ARTICLE_ID }),
    });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toMatch(/authentication/i);
  });
});

describe("POST /api/summarize/[id] — input validation", () => {
  it("returns 400 for invalid UUID", async () => {
    const response = await POST(makeRequest("not-a-uuid"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/invalid article id/i);
  });
});

describe("POST /api/summarize/[id] — content guard", () => {
  it("returns 400 for title_only content availability", async () => {
    mockFindFirst.mockResolvedValue(
      mockArticle({ contentAvailability: "title_only" }),
    );
    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: VALID_ARTICLE_ID }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/title_only/);
  });

  it("returns 400 for excerpt content availability", async () => {
    mockFindFirst.mockResolvedValue(
      mockArticle({ contentAvailability: "excerpt" }),
    );
    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: VALID_ARTICLE_ID }),
    });
    expect(response.status).toBe(400);
  });

  it("returns 404 for missing article", async () => {
    mockFindFirst.mockResolvedValue(null);
    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: VALID_ARTICLE_ID }),
    });
    expect(response.status).toBe(404);
  });
});

describe("POST /api/summarize/[id] — idempotency", () => {
  it("returns 409 when summaryStatus is not 'none'", async () => {
    mockFindFirst.mockResolvedValue(mockArticle({ summaryStatus: "pending" }));
    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: VALID_ARTICLE_ID }),
    });
    expect(response.status).toBe(409);
  });
});

describe("POST /api/summarize/[id] — rate limiting (Phase 19 / Critical C2)", () => {
  it("calls checkRateLimit keyed on session.user.id", async () => {
    await POST(makeRequest(), {
      params: Promise.resolve({ id: VALID_ARTICLE_ID }),
    });
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("api:summarize:"),
      expect.any(Number),
      expect.any(Number),
    );
    // Key MUST contain the user id, not just a generic identifier — otherwise
    // a NAT-shared IP would let one user burn the budget for everyone.
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("user-1"),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("returns 429 with Retry-After when rate limit exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 45_000, // 45s remaining
    });
    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: VALID_ARTICLE_ID }),
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
    const body = await response.json();
    expect(body.error).toMatch(/rate limit/i);
  });

  it("does NOT enqueue a job when rate-limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 45_000,
    });
    await POST(makeRequest(), {
      params: Promise.resolve({ id: VALID_ARTICLE_ID }),
    });
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("does NOT call the DB to update summaryStatus when rate-limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 45_000,
    });
    await POST(makeRequest(), {
      params: Promise.resolve({ id: VALID_ARTICLE_ID }),
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // ── N1 fix (audit Report 16): Fail-open on Redis outage ─────────────────
  // The /api/articles route already has this pattern (Phase 21 S7): when
  // checkRateLimit() throws (Redis down), the route returns 200 with no
  // rate-limit headers — a monitoring outage should NOT take down the API.
  //
  // /api/summarize/[id] was missing this pattern (asymmetric protection).
  // When Redis is down, the throw propagated as an uncaught exception and
  // the catch block at line 128 returned HTTP 500 — taking the AI summary
  // endpoint down during Redis outages.
  //
  // Correct behavior: catch the throw, log a warning, proceed WITHOUT rate
  // limiting (acceptable degradation during Redis outages). Return 202 on
  // success — same as the normal happy path.
  it("fails OPEN (returns 202) when checkRateLimit throws (Redis down)", async () => {
    // Simulate Redis outage: checkRateLimit rejects
    vi.mocked(checkRateLimit).mockRejectedValue(
      new Error("Redis connection refused"),
    );

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: VALID_ARTICLE_ID }),
    });

    // Must NOT return 500 — Redis outage is a monitoring problem, not an
    // application error. The request proceeds without rate limiting.
    expect(response.status).not.toBe(500);
    // Must NOT return 429 — we couldn't check the limit, so we can't claim
    // the user is over it.
    expect(response.status).not.toBe(429);
    // Should succeed normally — the rate limiter was skipped.
    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.jobId).toBe("job-1");
    // The job must have been enqueued despite the rate limiter failure.
    expect(mockAdd).toHaveBeenCalled();
  });

  it("logs a warning when checkRateLimit throws (visible in monitoring)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(checkRateLimit).mockRejectedValue(
      new Error("Redis connection refused"),
    );

    await POST(makeRequest(), {
      params: Promise.resolve({ id: VALID_ARTICLE_ID }),
    });

    // The warning must be logged so monitoring can detect the Redis outage.
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/rate limit/i),
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });
});

describe("POST /api/summarize/[id] — success path", () => {
  it("returns 202 with jobId on successful enqueue", async () => {
    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: VALID_ARTICLE_ID }),
    });
    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.jobId).toBe("job-1");
  });
});
