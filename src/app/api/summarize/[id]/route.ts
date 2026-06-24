import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { summarizeQueue } from "@/lib/queue";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * POST /api/summarize/:id — Request AI summarisation for an article.
 *
 * PRD §7: Enqueue summarisation job with content availability guard.
 * PAD §7.1: Route Handler for public HTTP endpoint.
 *
 * Phase 19 (Critical gap C2): Per-user rate limiting (5 req/min/user) to
 * prevent unbounded BullMQ job fan-out → unbounded AI spend. The bucket is
 * keyed on session.user.id (not IP) because the endpoint is authenticated —
 * IP-only would let one user behind NAT burn the budget for everyone, and
 * per-user is more precise for paid AI work.
 *
 * S3 fix: Uses auth() directly (not verifySession) because API routes must
 * return 401 JSON, not redirect. verifySession() calls redirect() which
 * throws NEXT_REDIRECT — inappropriate for JSON API responses. auth()
 * returns a session or null, letting the route return a proper 401.
 */
const SUMMARIZE_RATE_LIMIT_MAX = 5;
const SUMMARIZE_RATE_LIMIT_WINDOW_SEC = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // ── Auth: use auth() directly for JSON 401 (not verifySession redirect) ──
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // ── Rate limit check (per user, not per IP) ────────────────────────────
  // Keyed on session.user.id so an authenticated user cannot fan out
  // unlimited BullMQ jobs by iterating distinct article UUIDs. Each user
  // gets 5 summarize requests per minute — sufficient for genuine use
  // while capping AI spend exposure.
  //
  // Phase 22 (N1 fix, audit Report 16): Fail-OPEN on Redis outage, mirroring
  // the pattern in /api/articles/route.ts (Phase 21 S7). When Redis is
  // unreachable, checkRateLimit() throws. We catch this and fail OPEN
  // (allow the request, log a warning) rather than returning 500. This is
  // the standard pattern for rate limiting: a monitoring outage should not
  // take down the API. The request proceeds without rate limiting — an
  // acceptable degradation during Redis outages.
  let rateLimitResult;
  try {
    rateLimitResult = await checkRateLimit(
      `api:summarize:${session.user.id}`,
      SUMMARIZE_RATE_LIMIT_MAX,
      SUMMARIZE_RATE_LIMIT_WINDOW_SEC,
    );
  } catch (rateLimitError) {
    console.warn(
      "[API /summarize] Rate limiter unavailable (Redis down?), failing open:",
      rateLimitError,
    );
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
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  const { id: articleId } = await params;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(articleId)) {
    return NextResponse.json(
      { error: "Invalid article ID format" },
      { status: 400 },
    );
  }

  try {
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, articleId),
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    if (
      article.contentAvailability === "title_only" ||
      article.contentAvailability === "excerpt"
    ) {
      return NextResponse.json(
        {
          error: `Cannot summarise articles with only ${article.contentAvailability}. Insufficient content.`,
        },
        { status: 400 },
      );
    }

    if (article.summaryStatus !== "none") {
      return NextResponse.json(
        {
          error: `Summary already exists with status: ${article.summaryStatus}`,
        },
        { status: 409 },
      );
    }

    await db
      .update(articles)
      .set({ summaryStatus: "pending" })
      .where(eq(articles.id, articleId));

    const job = await summarizeQueue.add("summarize", {
      articleId,
      content: article.excerpt ?? article.title,
    });

    if (!job) {
      return NextResponse.json(
        { error: "Failed to enqueue summarisation job" },
        { status: 502 },
      );
    }

    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (error) {
    console.error("[summarize] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
