/**
 * queries.test.ts — Search query unit tests.
 *
 * Tests searchArticles() edge cases (empty queries, cursor pagination).
 * Full integration tests require a running PostgreSQL database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Phase 19 (M4): Mock next/cache so cacheLife() doesn't throw outside a
// Next.js cache context (the test env doesn't have one).
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
}));

// ── Mock DB with captured where/orderBy/limit calls ─────────────────────────
// Phase 24 / F6: Use vi.hoisted() so the mock factories can reference the
// mock functions (vi.mock factories are hoisted above all imports).
// See CLAUDE.md anti-pattern #13: vi.mock() factory referencing let/const
// below it causes ReferenceError.
const { mockLimit, mockOrderBy, mockWhere, mockSelect } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
  const mockInnerJoin = vi.fn(() => ({ where: mockWhere }));
  const mockFrom = vi.fn(() => ({ innerJoin: mockInnerJoin }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return {
    mockLimit,
    mockOrderBy,
    mockWhere,
    mockInnerJoin,
    mockFrom,
    mockSelect,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      categories: { findFirst: vi.fn() },
    },
    select: mockSelect,
  },
}));

import { searchArticles, getSearchSuggestions } from "./queries";

// Helper: create a mock article row for search results
function makeArticleRow(
  overrides: Partial<{
    id: string;
    title: string;
    excerpt: string | null;
    canonicalUrl: string;
    publishedAt: Date;
    hasSummary: boolean;
    summaryStatus: string;
    rank: number;
    source: { id: string; name: string; url: string };
  }> = {},
) {
  return {
    id: "art-001",
    title: "Test Article",
    excerpt: "Test excerpt",
    canonicalUrl: "https://example.com/article",
    publishedAt: new Date("2024-06-01T12:00:00Z"),
    hasSummary: false,
    summaryStatus: "none",
    rank: 1.0,
    source: { id: "src-1", name: "Test Source", url: "https://example.com" },
    ...overrides,
  };
}

describe("searchArticles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([]);
  });

  it("returns empty results for empty query", async () => {
    const result = await searchArticles({ query: "" });
    expect(result.results).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("returns empty results for whitespace-only query", async () => {
    const result = await searchArticles({ query: "   " });
    expect(result.results).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  // ── Phase 24 / F6: Cursor pagination regression tests ─────────────────────
  // The original query used `ORDER BY (rank, publishedAt)` with a cursor
  // filter `publishedAt < cursor`. When multiple rows share the same rank,
  // this cursor skips/duplicates rows across pages.
  //
  // The fix adds `articles.id` as a deterministic tiebreaker to ORDER BY
  // and uses a composite cursor `(publishedAt, id)` for pagination.

  it("encodes nextCursor as a compound 'publishedAt|articleId' token when hasMore", async () => {
    // Return 31 rows (limit + 1) to trigger hasMore=true.
    // The cursor is built from the LAST row of the SLICED results (row 30,
    // index 29) — NOT row 31 (which is only used to detect hasMore).
    const rows = Array.from({ length: 31 }, (_, i) =>
      makeArticleRow({
        id: `art-${String(i + 1).padStart(3, "0")}`,
        publishedAt: new Date(
          `2024-06-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
        ),
      }),
    );
    // Fix the dates that would overflow June (days 31+)
    rows[30] = makeArticleRow({
      id: "art-031",
      publishedAt: new Date("2024-07-01T12:00:00Z"),
    });
    mockLimit.mockResolvedValue(rows);

    const result = await searchArticles({ query: "test", limit: 30 });

    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();
    // The cursor must be a compound token: "publishedAt|articleId"
    // (NOT a bare ISO date string — that was the original bug)
    expect(result.nextCursor).toContain("|");
    const [datePart, idPart] = (result.nextCursor ?? "").split("|");
    // The cursor is built from resultRows[29] (the 30th row, last of the page)
    expect(datePart).toBe("2024-06-30T12:00:00.000Z");
    expect(idPart).toBe("art-030");
  });

  it("returns null nextCursor when there are no more results", async () => {
    // Return exactly 30 rows (limit, no extra) — hasMore=false
    const rows = Array.from({ length: 30 }, (_, i) =>
      makeArticleRow({ id: `art-${i + 1}` }),
    );
    mockLimit.mockResolvedValue(rows);

    const result = await searchArticles({ query: "test", limit: 30 });

    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("accepts a compound cursor 'publishedAt|articleId' for pagination", async () => {
    mockLimit.mockResolvedValue([]);

    await searchArticles({
      query: "test",
      cursor: "2024-06-01T12:00:00.000Z|art-031",
      limit: 30,
    });

    // The where clause must be a compound filter (AND of FTS match + cursor).
    // Drizzle's and() produces an object with queryChunks. We can't safely
    // JSON.stringify it (circular refs), so we assert the where was called
    // and the limit was reached (proving the query executed).
    expect(mockWhere).toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalled();
    // Verify the limit was limit + 1 (31 for default 30)
    expect(mockLimit).toHaveBeenCalledWith(31);
  });

  it("falls back to date-only filter for backward compat (old-format cursor)", async () => {
    // Old clients send a bare ISO date as the cursor (pre-F6 format).
    // The parser should accept this and filter by publishedAt only
    // (degraded but functional — no skip/duplicate if no ties exist).
    mockLimit.mockResolvedValue([]);

    // Should NOT throw — legacy cursor is accepted
    await expect(
      searchArticles({
        query: "test",
        cursor: "2024-06-01T12:00:00.000Z",
        limit: 30,
      }),
    ).resolves.toBeDefined();

    // The query executed (where + limit called)
    expect(mockWhere).toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalled();
  });

  it("includes articles.id in ORDER BY as a deterministic tiebreaker", async () => {
    mockLimit.mockResolvedValue([]);

    await searchArticles({ query: "test", limit: 30 });

    // orderBy must be called with multiple columns (rank, publishedAt, id)
    expect(mockOrderBy).toHaveBeenCalled();
    const orderArgs = mockOrderBy.mock.calls[0];
    expect(orderArgs).toBeDefined();
    // The ORDER BY arguments should include at least 3 columns
    // (rank DESC, publishedAt DESC, id DESC)
    expect(orderArgs?.length).toBeGreaterThanOrEqual(3);
  });
});

describe("getSearchSuggestions", () => {
  it("returns empty array for empty input", async () => {
    const suggestions = await getSearchSuggestions("");
    expect(suggestions).toHaveLength(0);
  });

  it("returns empty array for short input", async () => {
    const suggestions = await getSearchSuggestions("x");
    expect(suggestions).toHaveLength(0);
  });
});
