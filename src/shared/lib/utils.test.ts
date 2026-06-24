import { describe, it, expect } from "vitest";
import { cn, formatTimeAgo, formatDate, truncate } from "./utils";

describe("cn", () => {
  it("combines class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("merges tailwind classes correctly", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("formatTimeAgo", () => {
  it("handles seconds", () => {
    const date = new Date(Date.now() - 5000);
    expect(formatTimeAgo(date)).toBe("5 seconds ago");
  });

  it("handles minutes", () => {
    const date = new Date(Date.now() - 60000 * 5);
    expect(formatTimeAgo(date)).toBe("5 minutes ago");
  });

  it("handles hours", () => {
    const date = new Date(Date.now() - 3600000 * 2);
    expect(formatTimeAgo(date)).toBe("2 hours ago");
  });

  it("handles days", () => {
    const date = new Date(Date.now() - 86400000 * 3);
    expect(formatTimeAgo(date)).toBe("3 days ago");
  });

  it("handles weeks", () => {
    const date = new Date(Date.now() - 604800000 * 2);
    expect(formatTimeAgo(date)).toBe("2 weeks ago");
  });

  it("handles months", () => {
    const date = new Date(Date.now() - 2592000000 * 2);
    expect(formatTimeAgo(date)).toBe("2 months ago");
  });

  it("handles years", () => {
    const date = new Date(Date.now() - 31536000000 * 1);
    expect(formatTimeAgo(date)).toBe("1 year ago");
  });

  it("handles singular form", () => {
    const date = new Date(Date.now() - 60000);
    expect(formatTimeAgo(date)).toBe("1 minute ago");
  });

  it("handles just now", () => {
    const date = new Date();
    expect(formatTimeAgo(date)).toBe("just now");
  });
});

describe("formatDate", () => {
  it("formats date correctly", () => {
    const date = new Date("2024-06-01T00:00:00Z");
    expect(formatDate(date)).toBe("June 1, 2024");
  });
});

describe("truncate", () => {
  it("truncates long strings", () => {
    expect(truncate("hello world", 5)).toBe("he...");
  });

  it("returns original string if within limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });
});
