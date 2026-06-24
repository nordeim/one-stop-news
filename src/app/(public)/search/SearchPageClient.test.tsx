/**
 * SearchPageClient.test.tsx — Tests for the search page client component.
 *
 * Phase 19 (High H3): Previously handleSearch had try/finally with NO catch
 * block — if searchArticlesAction rejected, the error became an unhandled
 * promise rejection and the UI stayed in loading state forever. Now must:
 *   1. Catch errors
 *   2. Set an error state
 *   3. Render an error UI with retry option in SearchResults
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";

// Mock next/navigation — useSearchParams and useRouter.
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

// Mock useDebounce so the test doesn't have to wait 300ms.
vi.mock("@/shared/hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

// Mock the search action — tests control resolve/reject per scenario.
const mockSearchAction = vi.fn();
vi.mock("@/features/search/actions", () => ({
  searchArticlesAction: mockSearchAction,
}));

// Import after mocks are registered.
const { SearchPageClient } = await import("./SearchPageClient");

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams.delete("q");
  mockSearchAction.mockResolvedValue({
    results: [],
    hasMore: false,
    nextCursor: null,
  });
});

describe("SearchPageClient — initial render", () => {
  it("renders SearchBar with search role", () => {
    render(<SearchPageClient initialResults={[]} initialQuery="" />);
    expect(screen.getByRole("search")).toBeDefined();
  });
});

describe("SearchPageClient — successful search", () => {
  it("calls searchArticlesAction on search input change and updates results", async () => {
    mockSearchAction.mockResolvedValue({
      results: [
        {
          article: {
            id: "a1",
            title: "Test",
            excerpt: "Excerpt",
            source: { id: "s1", name: "Test Source" },
            category: { id: "c1", name: "Tech", slug: "tech" },
            publishedAt: new Date("2026-01-15T10:00:00Z"),
          },
        },
      ],
      hasMore: false,
      nextCursor: null,
    });

    render(<SearchPageClient initialResults={[]} initialQuery="" />);

    // The input has aria-label "Search news articles" and is the only
    // <input> element. Use input role to disambiguate from the outer
    // <div role="search" aria-label="Search news articles">.
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "test query" } });

    // useDebounce is mocked to return value synchronously, so the
    // useEffect in SearchBar fires immediately.
    await waitFor(() => {
      expect(mockSearchAction).toHaveBeenCalledWith({ query: "test query" });
    });
  });
});

describe("SearchPageClient — error handling (Phase 19 / H3)", () => {
  it("catches rejected searchArticlesAction and sets error state", async () => {
    mockSearchAction.mockRejectedValue(new Error("DB connection failed"));

    render(<SearchPageClient initialResults={[]} initialQuery="" />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "fail" } });

    // After rejection, an error UI should be visible
    await waitFor(() => {
      expect(screen.getByText(/search failed/i)).toBeDefined();
    });
  });

  it("clears error state on subsequent successful search", async () => {
    // First search fails
    mockSearchAction.mockRejectedValueOnce(new Error("DB down"));

    render(<SearchPageClient initialResults={[]} initialQuery="" />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "fail" } });

    await waitFor(() => {
      expect(screen.getByText(/search failed/i)).toBeDefined();
    });

    // Second search succeeds
    mockSearchAction.mockResolvedValueOnce({
      results: [],
      hasMore: false,
      nextCursor: null,
    });
    fireEvent.change(input, { target: { value: "ok" } });

    await waitFor(() => {
      expect(screen.queryByText(/search failed/i)).toBeNull();
    });
  });

  it("provides a Retry button when error state is shown", async () => {
    mockSearchAction.mockRejectedValue(new Error("DB down"));

    render(<SearchPageClient initialResults={[]} initialQuery="" />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "fail" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
    });
  });
});
