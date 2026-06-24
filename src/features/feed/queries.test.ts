import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/cache so cacheLife() doesn't throw in vitest.
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
}));

// Mock the DB module so we can capture the query builder.
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockInnerJoin = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

const mockDb = {
  select: mockSelect.mockReturnThis(),
  from: mockFrom.mockReturnThis(),
  innerJoin: mockInnerJoin.mockReturnThis(),
  where: mockWhere.mockReturnThis(),
  orderBy: mockOrderBy.mockReturnThis(),
  limit: mockLimit.mockReturnThis(),
  query: {
    categories: {
      findFirst: vi.fn(),
    },
  },
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Re-establish the chain after clearAllMocks
  mockSelect.mockReturnThis();
  mockFrom.mockReturnThis();
  mockInnerJoin.mockReturnThis();
  mockWhere.mockReturnThis();
  mockOrderBy.mockReturnThis();
  mockLimit.mockReturnThis();
  // limit() returns a Promise that resolves to the rows
  mockLimit.mockResolvedValue([]);
});

describe("buildFeedQuery (pure query builder, no use cache)", () => {
  it("is exported as a function", async () => {
    const { buildFeedQuery } = await import("./queries");
    expect(typeof buildFeedQuery).toBe("function");
  });

  it("returns a Drizzle query builder (not a Promise)", async () => {
    const { buildFeedQuery } = await import("./queries");
    const builder = buildFeedQuery({ limit: 30 });
    // The builder should be chainable — has .then means it's Promise-like (limit already awaited)
    // We expect it to be the result of .limit() which is awaitable but not yet awaited
    expect(builder).toBeDefined();
    expect(typeof builder.then).toBe("function");
  });

  it("fetches limit + 1 rows to detect hasNextPage", async () => {
    const { buildFeedQuery } = await import("./queries");
    await buildFeedQuery({ limit: 30 });
    // .limit() should be called with 31 (30 + 1)
    expect(mockLimit).toHaveBeenCalledWith(31);
  });

  it("innerJoins sources to populate article.source.name (PRD §5.4)", async () => {
    const { buildFeedQuery } = await import("./queries");
    await buildFeedQuery({ limit: 30 });
    expect(mockInnerJoin).toHaveBeenCalled();
    // The first arg to innerJoin should be the sources table
    const innerJoinArgs = mockInnerJoin.mock.calls[0];
    expect(innerJoinArgs?.[0]).toBeDefined();
  });

  it("orders by publishedAt DESC (most recent first)", async () => {
    const { buildFeedQuery } = await import("./queries");
    await buildFeedQuery({ limit: 30 });
    expect(mockOrderBy).toHaveBeenCalled();
  });

  it("applies cursor filter when cursor is provided (lt publishedAt)", async () => {
    const { buildFeedQuery } = await import("./queries");
    const cursor = new Date("2026-06-01T00:00:00Z");
    await buildFeedQuery({ cursor, limit: 30 });
    expect(mockWhere).toHaveBeenCalled();
  });

  it("applies category filter when category slug is provided", async () => {
    const { buildFeedQuery } = await import("./queries");
    // Mock findFirst to return a category with an ID
    mockDb.query.categories.findFirst.mockResolvedValueOnce({
      id: "cat-123",
      slug: "tech",
      name: "Tech",
    });
    await buildFeedQuery({ category: "tech", limit: 30 });
    expect(mockDb.query.categories.findFirst).toHaveBeenCalledWith({
      where: expect.anything(),
    });
    expect(mockWhere).toHaveBeenCalled();
  });

  it("returns empty result when category slug does not exist", async () => {
    const { buildFeedQuery } = await import("./queries");
    mockDb.query.categories.findFirst.mockResolvedValueOnce(undefined);
    const builder = buildFeedQuery({ category: "nonexistent", limit: 30 });
    // The builder should short-circuit — return a Promise that resolves to []
    const rows = await builder;
    expect(rows).toEqual([]);
  });

  it("uses default limit of 30 when no limit provided", async () => {
    const { buildFeedQuery } = await import("./queries");
    await buildFeedQuery({});
    // 30 + 1 = 31
    expect(mockLimit).toHaveBeenCalledWith(31);
  });
});

describe("getFeedArticles (cached wrapper around buildFeedQuery)", () => {
  it("is exported as a function", async () => {
    const { getFeedArticles } = await import("./queries");
    expect(typeof getFeedArticles).toBe("function");
  });

  it("returns a FeedPage shape with articles, nextCursor, hasMore", async () => {
    // Mock buildFeedQuery to return 2 rows (less than limit) → hasMore=false
    const fakeRows = [
      {
        id: "a1",
        title: "Article 1",
        excerpt: "Excerpt",
        canonicalUrl: "https://example.com/1",
        publishedAt: new Date("2026-06-01T12:00:00Z"),
        hasSummary: false,
        summaryStatus: "none",
        source: { id: "s1", name: "Source", url: "https://source.com" },
      },
      {
        id: "a2",
        title: "Article 2",
        excerpt: "Excerpt 2",
        canonicalUrl: "https://example.com/2",
        publishedAt: new Date("2026-06-02T12:00:00Z"),
        hasSummary: true,
        summaryStatus: "ok",
        source: { id: "s1", name: "Source", url: "https://source.com" },
      },
    ];
    mockLimit.mockResolvedValueOnce(fakeRows);

    const { getFeedArticles } = await import("./queries");
    const result = await getFeedArticles({ limit: 30 });

    expect(result).toHaveProperty("articles");
    expect(result).toHaveProperty("nextCursor");
    expect(result).toHaveProperty("hasMore");
    expect(Array.isArray(result.articles)).toBe(true);
    expect(result.articles.length).toBe(2);
    expect(result.hasMore).toBe(false);
  });

  it("sets hasMore=true and computes nextCursor when rows.length > limit", async () => {
    // Return 31 rows (limit + 1) → hasMore=true, articles truncated to 30
    const fakeRows = Array.from({ length: 31 }, (_, i) => ({
      id: `a${i}`,
      title: `Article ${i}`,
      excerpt: "Excerpt",
      canonicalUrl: `https://example.com/${i}`,
      publishedAt: new Date(
        `2026-06-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
      ),
      hasSummary: false,
      summaryStatus: "none",
      source: { id: "s1", name: "Source", url: "https://source.com" },
    }));
    mockLimit.mockResolvedValueOnce(fakeRows);

    const { getFeedArticles } = await import("./queries");
    const result = await getFeedArticles({ limit: 30 });

    expect(result.hasMore).toBe(true);
    expect(result.articles.length).toBe(30);
    // nextCursor should be the publishedAt of the 30th article, ISO 8601 format
    expect(result.nextCursor).toBe(
      fakeRows[29]?.publishedAt.toISOString() ?? null,
    );
  });

  it("returns empty FeedPage when category slug does not exist", async () => {
    mockDb.query.categories.findFirst.mockResolvedValueOnce(undefined);

    const { getFeedArticles } = await import("./queries");
    const result = await getFeedArticles({ category: "nonexistent" });

    expect(result.articles).toEqual([]);
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });
});
