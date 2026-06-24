/**
 * route.test.ts — Tests for /api/categories public REST API.
 *
 * Verifies the endpoint returns all categories as JSON with the correct
 * shape, and includes CORS headers for external consumers.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Drizzle db.query.categories findMany to return predictable data.
const mockCategories = [
  { id: "cat-1", slug: "tech", name: "Tech" },
  { id: "cat-2", slug: "finance", name: "Finance" },
  { id: "cat-3", slug: "politics", name: "Politics" },
];

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      categories: {
        findMany: vi.fn().mockResolvedValue(mockCategories),
      },
    },
  },
}));

const { GET, OPTIONS } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/categories", () => {
  it("returns 200 with categories array", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.categories).toEqual(mockCategories);
    expect(body.categories.length).toBe(3);
  });

  it("includes CORS headers for external consumers", async () => {
    const response = await GET();
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("includes Cache-Control header for CDN caching", async () => {
    const response = await GET();
    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("max-age");
  });

  it("returns each category with id, slug, and name", async () => {
    const response = await GET();
    const body = await response.json();
    const first = body.categories[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("slug");
    expect(first).toHaveProperty("name");
  });

  it("returns 500 when db query fails", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.query.categories.findMany).mockRejectedValueOnce(
      new Error("DB connection lost"),
    );

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toMatch(/internal server error/i);
  });
});

describe("OPTIONS /api/categories (CORS preflight)", () => {
  it("returns 200 with CORS headers for preflight requests", async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, OPTIONS",
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type",
    );
  });

  it("returns a null body (preflight has no content)", async () => {
    const response = await OPTIONS();
    const body = await response.json();
    expect(body).toBeNull();
  });

  it("does NOT call the database (preflight is cheap)", async () => {
    const { db } = await import("@/lib/db");
    const spy = vi.mocked(db.query.categories.findMany);
    await OPTIONS();
    expect(spy).not.toHaveBeenCalled();
  });
});
