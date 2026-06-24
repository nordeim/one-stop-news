/**
 * route.test.ts — Tests for /api/articles public REST API.
 *
 * Tests cursor validation and rate limiting. The underlying data
 * access (getFeedArticles, searchArticles) is mocked to isolate
 * validation logic from DB access.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the data access modules BEFORE importing the route handler.
// Both getFeedArticles and searchArticles use "use cache" + DB — we
// want to test only the route handler's validation logic here.
vi.mock("@/features/feed/queries", () => ({
  getFeedArticles: vi.fn().mockResolvedValue({
    articles: [],
    nextCursor: null,
    hasMore: false,
  }),
}));

vi.mock("@/features/search/queries", () => ({
  searchArticles: vi.fn().mockResolvedValue({
    results: [],
    nextCursor: null,
    hasMore: false,
  }),
}));

// Mock the rate limiter so we can simulate allowed/blocked states.
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 20,
    resetAt: Date.now() + 1000,
  }),
}));

// Mock the env module so we can control env.TRUSTED_PROXY at test time.
// The route reads TRUSTED_PROXY via the typed `env` export (not process.env)
// so that typos are caught at boot by the Zod schema. Tests control the
// value by mutating this mock object directly.
const mockEnv = { TRUSTED_PROXY: undefined as string | undefined };
vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

// Import after mocks are registered.
const { GET, OPTIONS } = await import("./route");
const { getFeedArticles } = await import("@/features/feed/queries");
const { searchArticles } = await import("@/features/search/queries");
const { checkRateLimit } = await import("@/lib/rateLimit");

function makeRequest(url: string, ip = "127.0.0.1"): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, {
    headers: { "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset rate limit mock to default allowed state.
  vi.mocked(checkRateLimit).mockResolvedValue({
    allowed: true,
    remaining: 20,
    resetAt: Date.now() + 1000,
  });
  // Reset TRUSTED_PROXY to default (unset = leftmost-IP / spoofable mode).
  mockEnv.TRUSTED_PROXY = undefined;
});

describe("GET /api/articles — cursor validation", () => {
  it("returns 400 for invalid cursor (non-date string)", async () => {
    const response = await GET(makeRequest("/api/articles?cursor=not-a-date"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/invalid cursor/i);
  });

  it("returns 400 for cursor with impossible date (month 13)", async () => {
    const response = await GET(
      makeRequest("/api/articles?cursor=2024-13-45T00:00:00Z"),
    );
    expect(response.status).toBe(400);
  });

  it("accepts valid ISO 8601 cursor", async () => {
    const response = await GET(
      makeRequest("/api/articles?cursor=2024-06-01T00:00:00Z"),
    );
    expect(response.status).toBe(200);
    expect(getFeedArticles).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: new Date("2024-06-01T00:00:00Z"),
      }),
    );
  });

  it("accepts absent cursor", async () => {
    const response = await GET(makeRequest("/api/articles"));
    expect(response.status).toBe(200);
    expect(getFeedArticles).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: undefined }),
    );
  });
});

describe("GET /api/articles — rate limiting", () => {
  it("returns 429 with Retry-After header when rate limit exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 5000, // 5 seconds
    });

    const response = await GET(makeRequest("/api/articles"));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");

    const body = await response.json();
    expect(body.error).toMatch(/rate limit/i);

    // Data access should NOT have been called when rate-limited.
    expect(getFeedArticles).not.toHaveBeenCalled();
    expect(searchArticles).not.toHaveBeenCalled();
  });

  it("proceeds when rate limit allows", async () => {
    const response = await GET(makeRequest("/api/articles"));
    expect(response.status).toBe(200);
    expect(getFeedArticles).toHaveBeenCalled();
  });

  it("uses IP from x-forwarded-for as rate-limit identifier", async () => {
    await GET(makeRequest("/api/articles", "203.0.113.42"));
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("203.0.113.42"),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("uses leftmost IP from x-forwarded-for by default (no trusted proxy)", async () => {
    // Without TRUSTED_PROXY, the leftmost (first) IP is used.
    // This is the client-supplied value — spoofable but documented.
    const req = new NextRequest("http://localhost:3000/api/articles", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1, 192.168.1.1" },
    });
    await GET(req);
    expect(checkRateLimit).toHaveBeenCalledWith(
      "api:articles:1.2.3.4",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("uses rightmost IP from x-forwarded-for when TRUSTED_PROXY=true (behind CDN)", async () => {
    // When TRUSTED_PROXY is set to "true", the app trusts the proxy chain
    // and uses the rightmost IP (the trusted proxy's view of the client).
    // This prevents spoofing because only the trusted proxy can set the
    // header. We control the value via the mocked env object (not
    // vi.stubEnv) because the route reads env.TRUSTED_PROXY, which is
    // computed at module load — direct mutation of the mock is the only
    // way to test different values without re-importing the module.
    mockEnv.TRUSTED_PROXY = "true";
    const req = new NextRequest("http://localhost:3000/api/articles", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1, 192.168.1.1" },
    });
    await GET(req);
    // Rightmost (last) IP after trimming — the trusted proxy's client
    expect(checkRateLimit).toHaveBeenCalledWith(
      "api:articles:192.168.1.1",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
    const req = new NextRequest("http://localhost:3000/api/articles", {
      headers: { "x-real-ip": "198.51.100.42" },
    });
    await GET(req);
    expect(checkRateLimit).toHaveBeenCalledWith(
      "api:articles:198.51.100.42",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("falls back to 'unknown' when no IP headers present", async () => {
    const req = new NextRequest("http://localhost:3000/api/articles");
    await GET(req);
    expect(checkRateLimit).toHaveBeenCalledWith(
      "api:articles:unknown",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("fails OPEN (returns 200) when Redis is unreachable — not 500", async () => {
    // S7 fix: When Redis is down, checkRateLimit() throws. The API must
    // NOT return 500 — that would take down the entire public API during a
    // Redis outage. Instead, fail OPEN (allow the request, log a warning).
    // This is the standard pattern for rate limiting: a monitoring outage
    // should not take down the API. The request proceeds without rate
    // limiting — a acceptable degradation during Redis outages.
    vi.mocked(checkRateLimit).mockRejectedValue(
      new Error("Redis connection refused"),
    );
    const response = await GET(makeRequest("/api/articles"));
    expect(response.status).toBe(200);
    expect(getFeedArticles).toHaveBeenCalled();
  });
});

describe("OPTIONS /api/articles", () => {
  it("returns 200 with CORS headers", async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "GET",
    );
  });
});
