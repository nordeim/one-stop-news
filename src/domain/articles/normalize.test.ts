import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { normalizeCanonicalUrl, hashContent } from "./normalize";

describe("normalizeCanonicalUrl", () => {
  it("removes UTM parameters", () => {
    const url =
      "https://example.com/article?utm_source=newsletter&utm_medium=email";
    expect(normalizeCanonicalUrl(url)).toBe("https://example.com/article");
  });

  it("lower-cases scheme and host", () => {
    const url = "HTTPS://Example.COM/Article";
    expect(normalizeCanonicalUrl(url)).toBe("https://example.com/Article");
  });

  it("normalizes trailing slash", () => {
    // URL.toString() always includes the trailing slash when path is "/"
    // This is correct browser behavior; we normalize by not adding extra slashes
    const url = "https://example.com/";
    expect(normalizeCanonicalUrl(url)).toBe("https://example.com/");
  });

  it("preserves path and non-UTM query params", () => {
    const url = "https://example.com/article?page=2";
    expect(normalizeCanonicalUrl(url)).toBe(
      "https://example.com/article?page=2",
    );
  });

  it("returns invalid URL as-is", () => {
    const url = "not-a-valid-url";
    expect(normalizeCanonicalUrl(url)).toBe("not-a-valid-url");
  });
});

describe("hashContent", () => {
  it("produces consistent hash for same input", () => {
    const title = "Test Article";
    const body = "Body text";
    const date = new Date("2024-06-01T00:00:00Z");
    const hash1 = hashContent(title, body, date);
    const hash2 = hashContent(title, body, date);
    expect(hash1).toBe(hash2);
  });

  it("produces different hash for different title", () => {
    const date = new Date("2024-06-01T00:00:00Z");
    const hash1 = hashContent("Article A", "Body", date);
    const hash2 = hashContent("Article B", "Body", date);
    expect(hash1).not.toBe(hash2);
  });

  it("produces different hash when body changes but title+date same", () => {
    const title = "Test Article";
    const date = new Date("2024-06-01T00:00:00Z");
    const hash1 = hashContent(title, "Original body content", date);
    const hash2 = hashContent(title, "Updated body content", date);
    expect(hash1).not.toBe(hash2);
  });

  it("produces 64-character hex string (SHA-256)", () => {
    const hash = hashContent("Test", "Body", new Date());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches node:crypto SHA-256 output for the same input (algorithm verification)", () => {
    // Property-based: verify hashContent matches a direct node:crypto SHA-256
    // for the same input. This replaces the brittle hardcoded vector test.
    const title = "Test Article";
    const body = "Test body content for hashing";
    const date = new Date("2024-06-01T00:00:00Z");
    const expectedData = `${title.trim()}|${body}|${date.toISOString()}`;
    const expected = createHash("sha256")
      .update(expectedData, "utf8")
      .digest("hex");

    expect(hashContent(title, body, date)).toBe(expected);
  });

  it("is collision-resistant — small input change produces different hash", () => {
    const date = new Date("2024-06-01T00:00:00Z");
    const hash1 = hashContent("Test Article", "Body", date);
    const hash2 = hashContent("Test Article.", "Body", date); // added period
    expect(hash1).not.toBe(hash2);
  });

  it("trims title before hashing", () => {
    const date = new Date("2024-06-01T00:00:00Z");
    const body = "Body";
    const hash1 = hashContent("Test Article", body, date);
    const hash2 = hashContent("  Test Article  ", body, date);
    expect(hash1).toBe(hash2);
  });

  it("handles null body (treats as empty string)", () => {
    const title = "Test Article";
    const date = new Date("2024-06-01T00:00:00Z");
    const hash1 = hashContent(title, null, date);
    const hash2 = hashContent(title, "", date);
    expect(hash1).toBe(hash2);
  });

  it("handles undefined body (treats as empty string)", () => {
    const title = "Test Article";
    const date = new Date("2024-06-01T00:00:00Z");
    const hash1 = hashContent(title, undefined, date);
    const hash2 = hashContent(title, "", date);
    expect(hash1).toBe(hash2);
  });
});
