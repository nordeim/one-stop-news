import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeedContainer } from "./FeedContainer";
import type { ArticleWithSource } from "@/domain/articles/types";

// ─── Test Fixtures ─────────────────────────────────────────────────────────

function makeArticle(id: string, title: string): ArticleWithSource {
  return {
    id,
    title,
    excerpt: `Excerpt for ${title}.`,
    body: null,
    sourceName: null, // Phase 19 (H11): denormalized source name (nullable)
    canonicalUrl: `https://example.com/${id}`,
    publishedAt: new Date(`2024-06-${id.padStart(2, "0")}T00:00:00Z`),
    hasSummary: false,
    summaryStatus: "none",
    sourceId: "src-1",
    categoryId: null,
    subcategoryId: null,
    contentHash: `hash-${id}`,
    contentAvailability: "full_text",
    importanceScore: 0.5,
    politicalLeaning: null,
    ingestedAt: new Date("2024-06-01T00:00:00Z"),
    searchVector: "test",
    source: {
      id: "src-1",
      name: "Example Source",
      url: "https://example.com",
    },
  };
}

const initialArticles = [
  makeArticle("1", "First Article"),
  makeArticle("2", "Second Article"),
];

const nextPageArticles = [
  makeArticle("3", "Third Article"),
  makeArticle("4", "Fourth Article"),
];

// Mock the global fetch function
const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  // Stub global.fetch so the component's `fetch(url)` calls hit our mock
  vi.stubGlobal("fetch", mockFetch);
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("FeedContainer", () => {
  it("renders initial articles passed from the server", () => {
    render(
      <FeedContainer
        initialArticles={initialArticles}
        initialNextCursor={null}
        initialHasMore={false}
      />,
    );
    expect(screen.getByText("First Article")).toBeDefined();
    expect(screen.getByText("Second Article")).toBeDefined();
  });

  it("does not render Load More button when initialHasMore is false", () => {
    render(
      <FeedContainer
        initialArticles={initialArticles}
        initialNextCursor={null}
        initialHasMore={false}
      />,
    );
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });

  it("renders Load More button when initialHasMore is true", () => {
    render(
      <FeedContainer
        initialArticles={initialArticles}
        initialNextCursor="2024-06-01T00:00:00.000Z"
        initialHasMore={true}
      />,
    );
    expect(screen.getByRole("button", { name: /load more/i })).toBeDefined();
  });

  it("fetches next page and appends articles on Load More click", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        articles: nextPageArticles,
        nextCursor: null,
        hasNextPage: false,
      }),
    });

    render(
      <FeedContainer
        initialArticles={initialArticles}
        initialNextCursor="2024-06-01T00:00:00.000Z"
        initialHasMore={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() => {
      expect(screen.getByText("Third Article")).toBeDefined();
      expect(screen.getByText("Fourth Article")).toBeDefined();
    });

    // Original articles still present
    expect(screen.getByText("First Article")).toBeDefined();
    expect(screen.getByText("Second Article")).toBeDefined();

    // Fetch called with the correct cursor
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchUrl = mockFetch.mock.calls[0]?.[0];
    expect(String(fetchUrl)).toContain("cursor=2024-06-01T00%3A00%3A00.000Z");
  });

  it("hides Load More button after fetching the last page", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        articles: nextPageArticles,
        nextCursor: null,
        hasNextPage: false,
      }),
    });

    render(
      <FeedContainer
        initialArticles={initialArticles}
        initialNextCursor="2024-06-01T00:00:00.000Z"
        initialHasMore={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() => {
      expect(screen.getByText("Third Article")).toBeDefined();
    });

    // Button should be gone after the last page
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });

  it("shows loading state during fetch", async () => {
    // Never resolves — keeps loading state visible
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    render(
      <FeedContainer
        initialArticles={initialArticles}
        initialNextCursor="2024-06-01T00:00:00.000Z"
        initialHasMore={true}
      />,
    );

    const button = screen.getByRole("button", { name: /load more/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button.hasAttribute("disabled")).toBe(true);
    });
  });

  it("shows error retry UI when fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(
      <FeedContainer
        initialArticles={initialArticles}
        initialNextCursor="2024-06-01T00:00:00.000Z"
        initialHasMore={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
    });
  });

  it("retries fetch when Retry button is clicked after error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        articles: nextPageArticles,
        nextCursor: null,
        hasNextPage: false,
      }),
    });

    render(
      <FeedContainer
        initialArticles={initialArticles}
        initialNextCursor="2024-06-01T00:00:00.000Z"
        initialHasMore={true}
      />,
    );

    // First click fails
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
    });

    // Retry succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        articles: nextPageArticles,
        nextCursor: null,
        hasNextPage: false,
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => {
      expect(screen.getByText("Third Article")).toBeDefined();
    });
  });
});
