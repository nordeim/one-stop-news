/**
 * route.ts — Public REST API for articles.
 *
 * PRD §6: GET /api/articles?category=&cursor=&q=&limit=
 * MEP v6.0: CORS headers, cache-control, public access.
 *
 * Phase 13 hardening:
 *   - Cursor validation (returns 400 for invalid ISO 8601 date)
 *   - Rate limiting via Redis fixed-window (max 20 req/s per IP)
 *
 * Phase 19+ remediation (Batch 3 / F1):
 *   - getClientIp() extracted to src/lib/network/getClientIp.ts
 *   - Now supports TRUSTED_PROXY_CIDRS env var for CIDR chain walking
 *     (handles multi-hop proxy chains like Cloudflare → Nginx → app)
 */

import { NextRequest, NextResponse } from "next/server";
import { searchArticles } from "@/features/search/queries";
import { getFeedArticles } from "@/features/feed/queries";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/network/getClientIp";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Rate limit: 20 requests per second per IP (fixed window).
// Burst is naturally absorbed by the 1-second window.
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SEC = 1;

export async function GET(request: NextRequest) {
  // ── Rate limit check (fail-open on Redis outage) ────────────────────────
  // S7 fix: When Redis is unreachable, checkRateLimit() throws. We catch
  // this and fail OPEN (allow the request, log a warning) rather than
  // returning 500. This is the standard pattern for rate limiting: a
  // monitoring outage should not take down the API. The request proceeds
  // without rate limiting — an acceptable degradation during Redis outages.
  const ip = getClientIp(request);
  let rateLimitResult;
  try {
    rateLimitResult = await checkRateLimit(
      `api:articles:${ip}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_SEC,
    );
  } catch (rateLimitError) {
    console.warn(
      "[API /articles] Rate limiter unavailable (Redis down?), failing open:",
      rateLimitError,
    );
    // Proceed without rate limiting — do NOT return 500.
    // Skip the rate-limit check and continue to the query logic below.
    rateLimitResult = null;
  }

  if (rateLimitResult && !rateLimitResult.allowed) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
    );
    return NextResponse.json(
      { error: "Rate limit exceeded. Please retry later." },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // ── Parse + validate query params ────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const rawCursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "31"), 100);
  const category = searchParams.get("category") || undefined;

  // Cursor validation: must be a parseable ISO 8601 date if present.
  let cursorDate: Date | undefined;
  if (rawCursor) {
    cursorDate = new Date(rawCursor);
    if (isNaN(cursorDate.getTime())) {
      return NextResponse.json(
        {
          error:
            "Invalid cursor format. Expected ISO 8601 date string (e.g., 2024-06-01T00:00:00Z).",
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }
  }

  try {
    let response;

    if (query) {
      // Search mode
      const { results, hasMore, nextCursor } = await searchArticles({
        query,
        cursor: cursorDate,
        limit,
      });

      response = {
        articles: results.map((r) => r.article),
        nextCursor,
        hasNextPage: hasMore,
      };
    } else {
      // Feed mode
      const { articles, hasMore, nextCursor } = await getFeedArticles({
        category,
        cursor: cursorDate,
        limit,
      });

      response = {
        articles,
        nextCursor,
        hasNextPage: hasMore,
      };
    }

    return NextResponse.json(response, {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        // When rate limiter failed open (Redis down), rateLimitResult is null.
        // Omit the X-RateLimit-Remaining header in that case.
        ...(rateLimitResult
          ? { "X-RateLimit-Remaining": String(rateLimitResult.remaining) }
          : {}),
      },
    });
  } catch (error) {
    console.error("[API /articles] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export function OPTIONS() {
  return NextResponse.json(null, { headers: CORS_HEADERS });
}
