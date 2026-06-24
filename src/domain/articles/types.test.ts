import { describe, it, expect } from "vitest";
import type { ArticleWithSource, ArticleWithSummary, FeedPage } from "./types";

describe("ArticleWithSource", () => {
  it("has required properties", () => {
    const article: ArticleWithSource = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      excerpt: "A brief excerpt.",
      body: null,
      sourceName: null, // Phase 19 (H11): denormalized source name (nullable)
      canonicalUrl: "https://example.com/article",
      contentHash: "abc123",
      contentAvailability: "full_text",
      importanceScore: 0.75,
      hasSummary: false,
      summaryStatus: "none",
      publishedAt: new Date("2024-06-01T00:00:00Z"),
      ingestedAt: new Date("2024-06-01T00:00:00Z"),
      searchVector: "test vector",
      sourceId: "550e8400-e29b-41d4-a716-446655440001",
      categoryId: "550e8400-e29b-41d4-a716-446655440002",
      subcategoryId: null,
      politicalLeaning: null,
      source: {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Example Source",
        url: "https://example.com",
      },
    };

    expect(article.title).toBe("Test Article");
    expect(article.source.name).toBe("Example Source");
  });
});

describe("ArticleWithSummary", () => {
  it("has optional summary", () => {
    const article: ArticleWithSummary = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      excerpt: null,
      body: null,
      sourceName: null, // Phase 19 (H11): denormalized source name (nullable)
      canonicalUrl: "https://example.com/article",
      contentHash: "abc123",
      contentAvailability: "full_text",
      importanceScore: 0.75,
      hasSummary: true,
      summaryStatus: "ok",
      publishedAt: new Date("2024-06-01T00:00:00Z"),
      ingestedAt: new Date("2024-06-01T00:00:00Z"),
      searchVector: "test vector",
      sourceId: "550e8400-e29b-41d4-a716-446655440001",
      categoryId: "550e8400-e29b-41d4-a716-446655440002",
      subcategoryId: null,
      politicalLeaning: null,
      source: {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Example Source",
        url: "https://example.com",
      },
      category: null,
      summary: null,
    };

    expect(article.summary).toBeNull();
    expect(article.hasSummary).toBe(true);
  });
});

describe("FeedPage", () => {
  it("has correct structure", () => {
    const page: FeedPage = {
      articles: [],
      nextCursor: null,
      hasMore: false,
    };

    expect(page.articles).toEqual([]);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });
});
