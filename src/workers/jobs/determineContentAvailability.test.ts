import { describe, it, expect } from "vitest";
import { determineContentAvailability } from "./determineContentAvailability";

// ─── UNIT TEST: Content Availability Classification ──────────────────────────
//
// TDD Approach: Write failing test first, then implement.
//
// The content availability guard prevents AI hallucination by ensuring
// we only summarise articles with sufficient content.
//
// Rules (per PRD v4.3 §8.1):
//  - No title -> 'title_only' (DO NOT summarise)
//  - No excerpt -> 'excerpt' (DO NOT summarise)
//  - Body < 500 chars -> 'partial_text' (summarise permitted)
//  - Body >= 500 chars -> 'full_text' (summarise preferred)
// ─────────────────────────────────────────────────────────────────────────────

describe("determineContentAvailability", () => {
  it("returns 'title_only' when no title is provided", () => {
    const result = determineContentAvailability({
      title: "",
      excerpt: "Some excerpt",
      body: "Some body content that is long enough to be considered full text.",
    });
    expect(result).toBe("title_only");
  });

  it("returns 'excerpt' when title exists but no excerpt", () => {
    const result = determineContentAvailability({
      title: "A News Story",
      excerpt: "",
      body: "Some body content that is long enough to be considered full text.",
    });
    expect(result).toBe("excerpt");
  });

  it("returns 'partial_text' when body is less than 500 chars", () => {
    const result = determineContentAvailability({
      title: "A News Story",
      excerpt: "This is the excerpt.",
      body: "a".repeat(400),
    });
    expect(result).toBe("partial_text");
  });

  it("returns 'full_text' when body is 500+ chars", () => {
    const result = determineContentAvailability({
      title: "A News Story",
      excerpt: "This is the excerpt.",
      body: "a".repeat(500),
    });
    expect(result).toBe("full_text");
  });

  it("returns 'title_only' when all fields are empty", () => {
    const result = determineContentAvailability({
      title: "",
      excerpt: "",
      body: "",
    });
    expect(result).toBe("title_only");
  });

  it("returns 'excerpt' when only title is present", () => {
    const result = determineContentAvailability({
      title: "A News Story",
      excerpt: "",
      body: "",
    });
    expect(result).toBe("excerpt");
  });

  it("returns 'partial_text' at the boundary (300 chars)", () => {
    const result = determineContentAvailability({
      title: "A News Story",
      excerpt: "Excerpt here.",
      body: "x".repeat(300),
    });
    expect(result).toBe("partial_text");
  });

  it("returns 'full_text' for body > 500 chars", () => {
    const result = determineContentAvailability({
      title: "A News Story",
      excerpt: "Excerpt here.",
      body: "x".repeat(501),
    });
    expect(result).toBe("full_text");
  });
});
