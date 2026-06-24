"use cache";

/**
 * queries.ts — Summaries data access layer for admin review queue.
 *
 * Uses "use cache" to prevent blocking-route errors in Next.js 16.
 * Admin review data is cached for the feed profile duration.
 */

import { db } from "@/lib/db";
import { summaries, articles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cacheLife } from "next/cache";

export interface FlaggedSummary {
  id: string;
  summaryText: string | null;
  flagReason: string | null;
  model: string | null;
  generatedAt: Date | null;
  status: string | null;
  articleId: string;
  articleTitle: string | null;
}

export async function getFlaggedSummaries(): Promise<FlaggedSummary[]> {
  cacheLife("feed");
  return db
    .select({
      id: summaries.id,
      summaryText: summaries.summaryText,
      flagReason: summaries.flagReason,
      model: summaries.model,
      generatedAt: summaries.generatedAt,
      status: summaries.status,
      articleId: summaries.articleId,
      articleTitle: articles.title,
    })
    .from(summaries)
    .innerJoin(articles, eq(summaries.articleId, articles.id))
    .where(eq(summaries.status, "needs_review"));
}
