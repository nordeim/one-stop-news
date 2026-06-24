/**
 * ArticleData.tsx — Server Component for article detail page.
 *
 * Phase 14 (MEDIUM-3): Fetches real article data via getArticleWithSummary(),
 * renders the article with SummaryPanel for AI summaries.
 *
 * 3-Layer AI Provenance (EU AI Act Art. 50):
 *   - Layer 1 (JSON-LD <script>): Rendered HERE in the page body when
 *     summary status is 'ok'. Next.js's metadata.other API renders keys
 *     as <meta> tags (NOT <script> tags), so JSON-LD MUST be a direct
 *     <script> element in the body. React 19 supports this in Server
 *     Components; the `key` prop deduplicates across renders.
 *   - Layer 2 (HTTP header X-AI-Provenance): Set statically in next.config.ts
 *     headers() for /article/:id* routes (Phase 23 / BUG-2 fix). Previously
 *     incorrectly documented as emitted via metadata.other.
 *   - Layer 3 (<meta name="ai-provenance">): Emitted via metadata.other
 *     in page.tsx generateMetadata().
 *
 * Wrapped in <Suspense> by the parent to prevent blocking-route errors
 * in Next.js 16 with cacheComponents enabled.
 */

import { Footer } from "@/shared/components/layout/Footer";
import { SummaryPanel } from "@/features/summaries/components/SummaryPanel";
import { getArticleWithSummary } from "@/features/articles/queries";
import { generateProvenanceMetadata } from "@/lib/ai/provenance";
import Link from "next/link";
import { formatTimeAgo } from "@/shared/lib/utils";

interface ArticleDataProps {
  params: Promise<{ id: string }>;
}

export async function ArticleData({ params }: ArticleDataProps) {
  const { id } = await params;

  const article = await getArticleWithSummary(id);

  if (!article) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto py-24 text-center">
          <span
            className="block w-1.5 h-1.5 rounded-full bg-dispatch-ember mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-300 mb-2">
            404
          </p>
          <h1 className="font-editorial text-2xl text-ink-900 mb-4">
            Article not found
          </h1>
          <p className="font-ui text-sm text-ink-600 mb-8">
            The article you&apos;re looking for may have been removed or is no
            longer available.
          </p>
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-widest text-dispatch-ember hover:underline"
          >
            ← Back to Top Stories
          </Link>
        </div>
      </div>
    );
  }

  // Layer 1: JSON-LD <script> tag — only emitted when summary is approved.
  // Rendered in the body (not via metadata.other) because Next.js renders
  // metadata.other keys as <meta> tags, NOT <script> tags.
  const jsonLdScript =
    article.summary && article.summary.status === "ok"
      ? generateProvenanceMetadata({
          summary: {
            summaryText: article.summary.summaryText,
            keyPoints: article.summary.keyPoints,
            sourcesCited: article.summary.sourcesCited,
            aiStatement: article.summary.aiStatement,
            coveragePercentage: article.summary.coveragePercentage,
          },
          articleId: article.id,
          articleUrl: article.canonicalUrl,
          articleTitle: article.title,
          model: article.summary.model,
          generatedAt: article.summary.generatedAt.toISOString(),
        }).jsonLd
      : null;

  return (
    <>
      {jsonLdScript && (
        <script
          type="application/ld+json"
          // `key` deduplicates the script across re-renders (React 19)
          key={`provenance-jsonld-${article.id}`}
          dangerouslySetInnerHTML={{ __html: jsonLdScript }}
        />
      )}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="max-w-3xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            {article.category && (
              <div className="mb-4">
                <span className="cat-label text-dispatch-slate">
                  {article.category.name}
                </span>
              </div>
            )}
            <h1 className="font-editorial text-3xl sm:text-4xl text-ink-900 mb-4 leading-[1.1]">
              {article.title}
            </h1>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-ink-600">
              <span className="text-dispatch-slate font-medium">
                {article.source.name}
              </span>
              <span aria-hidden="true">·</span>
              <time
                dateTime={article.publishedAt.toISOString()}
                className="tabular-nums"
              >
                {formatTimeAgo(article.publishedAt)}
              </time>
              <span aria-hidden="true">·</span>
              <a
                href={article.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-300 hover:text-dispatch-ember transition-colors"
              >
                View Source
              </a>
            </div>
          </header>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="font-ui text-ink-600 text-lg leading-relaxed mb-8 font-[500]">
              {article.excerpt}
            </p>
          )}

          {/* Body */}
          {article.body && (
            <div className="font-ui text-ink-600 leading-relaxed mb-8 whitespace-pre-line">
              {article.body}
            </div>
          )}

          {/* AI Summary Panel */}
          <SummaryPanel
            articleId={article.id}
            initialStatus={article.summaryStatus}
            summary={
              article.summary
                ? {
                    summaryText: article.summary.summaryText,
                    keyPoints: article.summary.keyPoints,
                    sourcesCited: article.summary.sourcesCited,
                    aiStatement: article.summary.aiStatement,
                    coveragePercentage: article.summary.coveragePercentage,
                  }
                : null
            }
          />

          {/* Back link */}
          <div className="mt-12 pt-8 border-t border-ink-100">
            <Link
              href="/"
              className="font-mono text-[11px] uppercase tracking-widest text-ink-600 hover:text-dispatch-ember transition-colors"
            >
              ← Back to Top Stories
            </Link>
          </div>
        </article>
      </div>
      <Footer />
    </>
  );
}
