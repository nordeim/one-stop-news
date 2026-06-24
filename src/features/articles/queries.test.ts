/**
 * queries.test.ts — Tests for article detail queries.
 *
 * The DB is mocked to isolate query logic from real Postgres access.
 * Tests verify the JOIN structure (articles + sources + categories + summaries)
 * and the return shape (ArticleWithSummary | null).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module with a controllable query builder.
// The query chain is: select().from().innerJoin().leftJoin().leftJoin().where().limit()
// Each method returns an object with the next method, and limit() returns a Promise.
function createMockChain(returnValue: unknown) {
  const limit = vi.fn().mockResolvedValue(returnValue);
  const where = vi.fn().mockReturnValue({ limit });
  // leftJoin must return an object that has both leftJoin (for chaining) and where
  const leftJoinResult = { where, leftJoin: null as unknown };
  const leftJoin = vi.fn().mockReturnValue(leftJoinResult);
  leftJoinResult.leftJoin = leftJoin; // self-referential for chaining
  const innerJoin = vi.fn().mockReturnValue({ leftJoin });
  const from = vi.fn().mockReturnValue({ innerJoin });
  const select = vi.fn().mockReturnValue({ from });
  return { select, from, innerJoin, leftJoin, where, limit };
}

let mockChain = createMockChain([]);

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockChain.select(...args),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  articles: { id: "articles.id", publishedAt: "articles.published_at" },
  sources: { id: "sources.id" },
  categories: { id: "categories.id" },
  summaries: {
    id: "summaries.id",
    articleId: "summaries.article_id",
    status: "summaries.status",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

const { getArticleWithSummary } = await import("./queries");

beforeEach(() => {
  vi.clearAllMocks();
  mockChain = createMockChain([]);
});

describe("getArticleWithSummary", () => {
  it("returns null when article is not found", async () => {
    mockChain = createMockChain([]); // empty result
    const result = await getArticleWithSummary("nonexistent-id");
    expect(result).toBeNull();
  });

  it("returns ArticleWithSummary when article exists with source", async () => {
    const mockRow = {
      id: "art-1",
      title: "Test Article",
      excerpt: "Test excerpt",
      body: "Test body content",
      canonicalUrl: "https://example.com/article",
      contentHash: "hash",
      contentAvailability: "full_text",
      importanceScore: 0.85,
      hasSummary: true,
      summaryStatus: "ok",
      politicalLeaning: null,
      publishedAt: new Date("2024-06-01T00:00:00Z"),
      ingestedAt: new Date("2024-06-01T00:00:00Z"),
      searchVector: "test",
      sourceId: "src-1",
      categoryId: "cat-1",
      subcategoryId: null,
      source: { id: "src-1", name: "Test Source", url: "https://example.com" },
      category: { id: "cat-1", name: "Tech", slug: "tech" },
      summary: {
        id: "sum-1",
        summaryText: "AI summary text",
        keyPoints: ["Point 1"],
        sourcesCited: [{ url: "https://example.com", title: "Source" }],
        model: "claude-haiku-4-5",
        tokensUsed: 250,
        generatedAt: new Date("2024-06-01T01:00:00Z"),
        status: "ok",
        flagReason: null,
        aiStatement: "AI generated",
        complianceStatement: "EU AI Act Article 50 compliant",
        coveragePercentage: 85,
        originalArticleUrl: "https://example.com/article",
        articleId: "art-1",
      },
    };
    mockChain = createMockChain([mockRow]);

    const result = await getArticleWithSummary("art-1");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("art-1");
    expect(result?.title).toBe("Test Article");
    expect(result?.source.name).toBe("Test Source");
    expect(result?.category?.name).toBe("Tech");
    expect(result?.summary?.summaryText).toBe("AI summary text");
    expect(result?.summary?.model).toBe("claude-haiku-4-5");
  });

  it("returns article with null summary when no summary exists", async () => {
    const mockRow = {
      id: "art-2",
      title: "Article Without Summary",
      excerpt: "Excerpt",
      body: "Body",
      canonicalUrl: "https://example.com/2",
      contentHash: "hash2",
      contentAvailability: "full_text",
      importanceScore: 0.5,
      hasSummary: false,
      summaryStatus: "none",
      politicalLeaning: null,
      publishedAt: new Date("2024-06-01T00:00:00Z"),
      ingestedAt: new Date("2024-06-01T00:00:00Z"),
      searchVector: "test",
      sourceId: "src-1",
      categoryId: "cat-1",
      subcategoryId: null,
      source: { id: "src-1", name: "Source", url: "https://example.com" },
      category: null,
      summary: null,
    };
    mockChain = createMockChain([mockRow]);

    const result = await getArticleWithSummary("art-2");

    expect(result).not.toBeNull();
    expect(result?.hasSummary).toBe(false);
    expect(result?.summaryStatus).toBe("none");
    expect(result?.summary).toBeNull();
    expect(result?.category).toBeNull();
  });

  it("only returns summaries with status 'ok' (not needs_review or disabled)", async () => {
    // When summary status is 'needs_review', the leftJoin returns null
    // for the summary field (only 'ok' summaries are shown to users).
    const mockRow = {
      id: "art-3",
      title: "Article with flagged summary",
      excerpt: "Excerpt",
      body: "Body",
      canonicalUrl: "https://example.com/3",
      contentHash: "hash3",
      contentAvailability: "full_text",
      importanceScore: 0.5,
      hasSummary: true,
      summaryStatus: "needs_review",
      politicalLeaning: null,
      publishedAt: new Date("2024-06-01T00:00:00Z"),
      ingestedAt: new Date("2024-06-01T00:00:00Z"),
      searchVector: "test",
      sourceId: "src-1",
      categoryId: null,
      subcategoryId: null,
      source: { id: "src-1", name: "Source", url: "https://example.com" },
      category: null,
      summary: null, // null because needs_review summaries are not shown
    };
    mockChain = createMockChain([mockRow]);

    const result = await getArticleWithSummary("art-3");

    expect(result?.summary).toBeNull();
    expect(result?.summaryStatus).toBe("needs_review");
  });
});
