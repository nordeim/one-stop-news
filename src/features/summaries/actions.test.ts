/**
 * actions.test.ts — Tests for summaries Server Actions.
 *
 * Phase 19 (Critical gaps C3 + C5):
 *   - C3: requestSummary MUST call verifySession() (was missing auth entirely).
 *         The HTTP route /api/summarize/[id] has auth; the Server Action didn't.
 *   - C3: requestSummary MUST enforce per-user rate limiting (5 req/min/user)
 *         to match the HTTP route's protection against BullMQ fan-out abuse.
 *   - C5: SummariesData Approve/Disable buttons need new server actions
 *         approveSummary(id) and disableSummary(id) that are admin-guarded.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockFindFirst = vi.fn();
const mockFindSummary = vi.fn();
const mockUpdate = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      articles: { findFirst: mockFindFirst },
      summaries: { findFirst: mockFindSummary },
    },
    update: vi.fn(() => ({
      set: () => ({
        where: mockUpdate,
      }),
    })),
  },
}));

const mockAdd = vi.fn().mockResolvedValue({ id: "job-1" });
vi.mock("@/lib/queue", () => ({
  summarizeQueue: { add: mockAdd },
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 5,
    resetAt: Date.now() + 60_000,
  }),
}));

const mockVerifySession = vi.fn();
const mockVerifyAdminSession = vi.fn();
vi.mock("@/lib/auth/dal", () => ({
  verifySession: mockVerifySession,
  verifyAdminSession: mockVerifyAdminSession,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocks are registered.
const { requestSummary, flagSummary, disableSummary } =
  await import("./actions");
const { checkRateLimit } = await import("@/lib/rateLimit");

// ── Helpers ─────────────────────────────────────────────────────────────────

const VALID_ARTICLE_ID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_SUMMARY_ID = "660e8400-e29b-41d4-a716-446655440001";

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
  mockVerifySession.mockResolvedValue({
    user: { id: "user-1", role: "reader" },
  });
  mockVerifyAdminSession.mockResolvedValue(undefined);
  vi.mocked(checkRateLimit).mockResolvedValue({
    allowed: true,
    remaining: 5,
    resetAt: Date.now() + 60_000,
  });
  mockFindFirst.mockResolvedValue(mockArticle());
  mockUpdate.mockResolvedValue(undefined);
  mockFindSummary.mockResolvedValue({ articleId: VALID_ARTICLE_ID });
  mockAdd.mockResolvedValue({ id: "job-1" });
});

// ── requestSummary ──────────────────────────────────────────────────────────

describe("requestSummary — auth (Critical C3)", () => {
  it("propagates redirect when no session (does NOT return error JSON)", async () => {
    // verifySession() calls redirect() which throws NEXT_REDIRECT.
    // The action must NOT catch this — the redirect must propagate so the
    // browser follows it to /sign-in. The old code had dead code
    // `if (!session)` that was unreachable because verifySession never
    // returns null — it either returns a session or throws via redirect().
    const redirectError = new Error("NEXT_REDIRECT");
    mockVerifySession.mockRejectedValue(redirectError);
    await expect(requestSummary(VALID_ARTICLE_ID)).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("calls verifySession before any DB access", async () => {
    await requestSummary(VALID_ARTICLE_ID);
    expect(mockVerifySession).toHaveBeenCalled();
    // DB query happens AFTER auth check
    const callOrder: string[] = [];
    mockVerifySession.mockImplementation(async () => {
      callOrder.push("verifySession");
      return { user: { id: "user-1", role: "reader" } };
    });
    mockFindFirst.mockImplementation(async () => {
      callOrder.push("findFirst");
      return mockArticle();
    });
    await requestSummary(VALID_ARTICLE_ID);
    expect(callOrder.indexOf("verifySession")).toBeLessThan(
      callOrder.indexOf("findFirst"),
    );
  });
});

describe("requestSummary — rate limiting (Critical C3)", () => {
  it("calls checkRateLimit keyed on session.user.id", async () => {
    await requestSummary(VALID_ARTICLE_ID);
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("api:summarize:user-1"),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("returns rate-limit error when exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 45_000,
    });
    const result = await requestSummary(VALID_ARTICLE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/rate limit/i);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("requestSummary — content guard + idempotency", () => {
  it("rejects title_only content", async () => {
    mockFindFirst.mockResolvedValue(
      mockArticle({ contentAvailability: "title_only" }),
    );
    const result = await requestSummary(VALID_ARTICLE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/title_only/);
  });

  it("rejects when summary already exists", async () => {
    mockFindFirst.mockResolvedValue(mockArticle({ summaryStatus: "pending" }));
    const result = await requestSummary(VALID_ARTICLE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already exists/);
  });

  it("returns jobId on successful enqueue", async () => {
    const result = await requestSummary(VALID_ARTICLE_ID);
    expect(result.success).toBe(true);
    expect(result.jobId).toBe("job-1");
  });
});

// ── flagSummary ─────────────────────────────────────────────────────────────

describe("flagSummary — admin guard", () => {
  it("propagates redirect when not admin (does NOT catch redirect)", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    mockVerifyAdminSession.mockRejectedValue(redirectError);
    await expect(flagSummary(VALID_SUMMARY_ID, "spam")).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("succeeds and updates the correct article's hasSummary", async () => {
    const result = await flagSummary(VALID_SUMMARY_ID, "spam");
    expect(result.success).toBe(true);
    // C2 fix: verifies the summary → article lookup and update
    expect(mockFindSummary).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("skips article update when summary not found", async () => {
    mockFindSummary.mockResolvedValue(undefined);
    const result = await flagSummary(VALID_SUMMARY_ID, "spam");
    expect(result.success).toBe(true);
    // Summaries update still happens; articles update is skipped
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});

// ── disableSummary ──────────────────────────────────────────────────────────

describe("disableSummary — admin guard", () => {
  it("propagates redirect when not admin (does NOT catch redirect)", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    mockVerifyAdminSession.mockRejectedValue(redirectError);
    await expect(disableSummary(VALID_SUMMARY_ID)).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("succeeds and updates the correct article's hasSummary", async () => {
    const result = await disableSummary(VALID_SUMMARY_ID);
    expect(result.success).toBe(true);
    // C2 fix: verifies the summary → article lookup and update
    expect(mockFindSummary).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("skips article update when summary not found", async () => {
    mockFindSummary.mockResolvedValue(undefined);
    const result = await disableSummary(VALID_SUMMARY_ID);
    expect(result.success).toBe(true);
    // Summaries update still happens; articles update is skipped
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});

// ── approveSummary (NEW — Critical C5) ──────────────────────────────────────

describe("approveSummary — admin guard (Critical C5)", () => {
  it("propagates redirect when not admin (does NOT catch redirect)", async () => {
    const { approveSummary } = await import("./actions");
    const redirectError = new Error("NEXT_REDIRECT");
    mockVerifyAdminSession.mockRejectedValue(redirectError);
    await expect(approveSummary(VALID_SUMMARY_ID)).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("succeeds and sets summary status to 'ok' and article hasSummary to true", async () => {
    const { approveSummary } = await import("./actions");
    const result = await approveSummary(VALID_SUMMARY_ID);
    expect(result.success).toBe(true);
    // C2 fix: verifies the summary → article lookup and update
    expect(mockFindSummary).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("skips article update when summary not found", async () => {
    mockFindSummary.mockResolvedValue(undefined);
    const { approveSummary } = await import("./actions");
    const result = await approveSummary(VALID_SUMMARY_ID);
    expect(result.success).toBe(true);
    // Summaries update still happens; articles update is skipped
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
