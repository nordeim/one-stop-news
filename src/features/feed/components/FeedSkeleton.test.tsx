import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FeedSkeleton } from "./FeedSkeleton";

/**
 * FeedSkeleton — Loading placeholder for the feed grid.
 *
 * Mirrors the structure of FeedGrid for zero-layout-shift loading.
 * These tests verify the accessibility contract and the structural
 * parity with FeedGrid (6 articles, 3-row subgrid).
 */
describe("FeedSkeleton", () => {
  it("renders a feed role with aria-busy=true for screen readers", () => {
    const { getByRole } = render(<FeedSkeleton />);
    const feed = getByRole("feed");
    expect(feed).toBeDefined();
    expect(feed.getAttribute("aria-busy")).toBe("true");
  });

  it("exposes an aria-label that announces the loading state", () => {
    const { getByRole } = render(<FeedSkeleton />);
    expect(getByRole("feed").getAttribute("aria-label")).toBe(
      "Loading news articles",
    );
  });

  it("renders exactly 6 article placeholders (matches FeedGrid structure)", () => {
    const { container } = render(<FeedSkeleton />);
    const articles = container.querySelectorAll("article");
    expect(articles).toHaveLength(6);
  });

  it("applies the animate-pulse class to every article placeholder", () => {
    const { container } = render(<FeedSkeleton />);
    const articles = container.querySelectorAll("article");
    articles.forEach((article) => {
      expect(article.className).toContain("animate-pulse");
    });
  });

  it("uses the same grid layout as FeedGrid (3-column at lg breakpoint)", () => {
    const { getByRole } = render(<FeedSkeleton />);
    const feed = getByRole("feed");
    expect(feed.className).toContain("grid");
    expect(feed.className).toContain("lg:grid-cols-3");
  });

  it("applies the subgrid row-span-3 pattern to each article for aligned rows", () => {
    const { container } = render(<FeedSkeleton />);
    const articles = container.querySelectorAll("article");
    articles.forEach((article) => {
      expect(article.className).toContain("grid-rows-subgrid");
      expect(article.className).toContain("row-span-3");
    });
  });

  it("renders three placeholder rows per article (headline, excerpt, metadata)", () => {
    const { container } = render(<FeedSkeleton />);
    const firstArticle = container.querySelector("article");
    expect(firstArticle).toBeDefined();
    // Headline placeholder (single div with h-6)
    const headline = firstArticle!.querySelector(".h-6");
    expect(headline).toBeDefined();
    // Excerpt placeholder (3 lines)
    const excerptGroup = firstArticle!.querySelector(".space-y-2");
    expect(excerptGroup).toBeDefined();
    expect(excerptGroup!.querySelectorAll(".h-4")).toHaveLength(3);
    // Metadata placeholder (source • time)
    const metaGroup = firstArticle!.querySelector(".flex.items-center.gap-3");
    expect(metaGroup).toBeDefined();
  });
});
