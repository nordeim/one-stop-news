/**
 * queries.test.ts — Search query unit tests.
 *
 * Tests searchArticles() edge cases (empty queries).
 * Full integration tests require a running PostgreSQL database.
 */

import { describe, it, expect, vi } from "vitest";

// Phase 19 (M4): Mock next/cache so cacheLife() doesn't throw outside a
// Next.js cache context (the test env doesn't have one).
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
}));

// Mock the DB before importing queries
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      categories: { findFirst: vi.fn() },
    },
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: vi.fn(() => Promise.resolve([])),
            }),
          }),
        }),
      }),
    }),
  },
}));

import { searchArticles, getSearchSuggestions } from "./queries";

describe("searchArticles", () => {
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
