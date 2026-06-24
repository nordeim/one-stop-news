/**
 * queries.ts — Article detail data access layer.
 *
 * Provides getArticleWithSummary() for the article detail page.
 * Uses innerJoin with sources (required) and leftJoin with categories
 * and summaries (optional). Only summaries with status='ok' are included;
 * 'needs_review' and 'disabled' summaries return null in the summary field.
 */

import { db } from "@/lib/db";
import { articles, sources, categories, summaries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { ArticleWithSummary } from "@/domain/articles/types";

/**
 * Fetches a single article with its source, category, and optional summary.
 *
 * JOIN contract:
 *   - articles INNER JOIN sources (required — every article has a source)
 *   - articles LEFT JOIN categories (optional — categoryId may be null)
 *   - articles LEFT JOIN summaries WHERE status = 'ok' (only show approved summaries)
 *
 * @param id — Article UUID
 * @returns ArticleWithSummary if found, null otherwise
 */
export async function getArticleWithSummary(
  id: string,
): Promise<ArticleWithSummary | null> {
  const rows = await db
    .select({
      // Article fields
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      body: articles.body,
      canonicalUrl: articles.canonicalUrl,
      contentHash: articles.contentHash,
      contentAvailability: articles.contentAvailability,
      importanceScore: articles.importanceScore,
      hasSummary: articles.hasSummary,
      summaryStatus: articles.summaryStatus,
      politicalLeaning: articles.politicalLeaning,
      publishedAt: articles.publishedAt,
      ingestedAt: articles.ingestedAt,
      searchVector: articles.searchVector,
      sourceId: articles.sourceId,
      categoryId: articles.categoryId,
      subcategoryId: articles.subcategoryId,
      // Source (required via innerJoin)
      source: {
        id: sources.id,
        name: sources.name,
        url: sources.url,
      },
      // Category (optional via leftJoin)
      category: {
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      },
      // Summary (optional via leftJoin, only status='ok')
      summary: {
        id: summaries.id,
        articleId: summaries.articleId,
        summaryText: summaries.summaryText,
        keyPoints: summaries.keyPoints,
        sourcesCited: summaries.sourcesCited,
        model: summaries.model,
        tokensUsed: summaries.tokensUsed,
        generatedAt: summaries.generatedAt,
        status: summaries.status,
        flagReason: summaries.flagReason,
        aiStatement: summaries.aiStatement,
        complianceStatement: summaries.complianceStatement,
        coveragePercentage: summaries.coveragePercentage,
        originalArticleUrl: summaries.originalArticleUrl,
      },
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(
      summaries,
      and(eq(articles.id, summaries.articleId), eq(summaries.status, "ok")),
    )
    .where(eq(articles.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Structural cast — Drizzle's leftJoin result shape matches
  // ArticleWithSummary exactly, so a single assertion is sufficient.
  return row as ArticleWithSummary;
}
