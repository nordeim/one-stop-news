import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeedGrid } from "./FeedGrid";
import type { ArticleWithSource } from "@/domain/articles/types";

const mockArticles: ArticleWithSource[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "Test Article 1",
    excerpt: "A brief excerpt.",
    body: null,
    sourceName: null, // Phase 19 (H11): denormalized source name (nullable)
    canonicalUrl: "https://example.com/1",
    publishedAt: new Date("2024-06-01T00:00:00Z"),
    hasSummary: false,
    summaryStatus: "none",
    sourceId: "550e8400-e29b-41d4-a716-446655440001",
    categoryId: "550e8400-e29b-41d4-a716-446655440002",
    subcategoryId: null,
    contentHash: "abc123",
    contentAvailability: "full_text",
    importanceScore: 0.75,
    politicalLeaning: null,
    ingestedAt: new Date("2024-06-01T00:00:00Z"),
    searchVector: "test vector",
    source: {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Example Source",
      url: "https://example.com",
    },
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    title: "Test Article 2",
    excerpt: "Another excerpt.",
    body: null,
    sourceName: null, // Phase 19 (H11): denormalized source name (nullable)
    canonicalUrl: "https://example.com/2",
    publishedAt: new Date("2024-06-02T00:00:00Z"),
    hasSummary: true,
    summaryStatus: "ok",
    sourceId: "550e8400-e29b-41d4-a716-446655440003",
    categoryId: "550e8400-e29b-41d4-a716-446655440004",
    subcategoryId: null,
    contentHash: "def456",
    contentAvailability: "full_text",
    importanceScore: 0.85,
    politicalLeaning: null,
    ingestedAt: new Date("2024-06-02T00:00:00Z"),
    searchVector: "test vector",
    source: {
      id: "550e8400-e29b-41d4-a716-446655440003",
      name: "Another Source",
      url: "https://another.com",
    },
  },
];

describe("FeedGrid", () => {
  it("renders articles when provided", () => {
    render(<FeedGrid articles={mockArticles} />);
    expect(screen.getByText("Test Article 1")).toBeDefined();
    expect(screen.getByText("Test Article 2")).toBeDefined();
  });

  it("renders empty state when no articles", () => {
    const { container } = render(<FeedGrid articles={[]} />);
    expect(container.querySelector("[role='feed']")).toBeNull();
    expect(screen.getByText(/No stories in this category yet/i)).toBeDefined();
  });

  it("has role='feed' and aria-label", () => {
    const { container } = render(<FeedGrid articles={mockArticles} />);
    const feed = container.querySelector("[role='feed']");
    expect(feed).toBeDefined();
    expect(feed?.getAttribute("aria-label")).toBe("News articles");
  });
});
