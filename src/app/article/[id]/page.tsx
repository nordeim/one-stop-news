/**
 * page.tsx — Article detail page.
 *
 * Phase 14 (MEDIUM-3): Fetches real article data, renders ArticleData
 * (which includes SummaryPanel + NutritionLabel), and emits 3-layer
 * provenance via generateMetadata() when an AI summary exists.
 *
 * The page is fully dynamic (no "use cache") because summary status
 * is real-time. Wrapped in <Suspense> to prevent blocking-route errors.
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { Header } from "@/shared/components/layout/Header";
import { ArticleData } from "@/features/articles/components/ArticleData";
import { ArticleSkeleton } from "@/features/articles/components/ArticleSkeleton";
import { getArticleWithSummary } from "@/features/articles/queries";
import { generateProvenanceMetadata } from "@/lib/ai/provenance";

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

/**
 * generateMetadata — Emits SEO metadata + 3-layer AI provenance.
 *
 * When the article has an 'ok' summary, this function:
 *   1. Calls generateProvenanceMetadata() to produce the provenance data
 *   2. Sets the <meta name="ai-provenance"> tag via `other` (Layer 3)
 *   3. The JSON-LD <script> is rendered directly in ArticleData.tsx body (Layer 1)
 *   4. The X-AI-Provenance HTTP header is set statically in next.config.ts
 *      for /article/:id* routes (Layer 2)
 *
 * Phase 23 / BUG-2 fix: Previously, `metadata.other` was used to set
 * "X-AI-Provenance" — but Next.js 16's `metadata.other` API only emits
 * `<meta>` tags, never HTTP headers. The "X-AI-Provenance" key was creating
 * a `<meta name="X-AI-Provenance">` tag (a useless duplicate), not an HTTP
 * header. The HTTP header is now set statically in next.config.ts headers().
 *
 * This is the EU AI Act Article 50 compliant disclosure mechanism.
 */
export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticleWithSummary(id);

  if (!article) {
    return {
      title: "Article Not Found",
      description: "The requested article could not be found.",
    };
  }

  const metadata: Metadata = {
    title: article.title,
    description: article.excerpt ?? undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      type: "article",
      publishedTime: article.publishedAt.toISOString(),
      authors: [article.source.name],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt ?? undefined,
    },
  };

  // Emit 3-layer provenance when an approved summary exists.
  // Layer 1 (JSON-LD <script>): Rendered directly in ArticleData.tsx body
  //   (NOT via metadata.other — Next.js renders metadata.other keys as <meta>
  //   tags, not <script> tags).
  // Layer 2 (HTTP header X-AI-Provenance): Set statically in next.config.ts
  //   headers() for /article/:id* routes. Previously tried via metadata.other
  //   but that only creates a <meta> tag, not an HTTP header (Phase 23 / BUG-2).
  // Layer 3 (<meta name="ai-provenance">): Emitted here via metadata.other.
  //   This is the ONLY layer emitted via metadata.other — it correctly becomes
  //   a <meta> tag (which is what metadata.other does).
  if (article.summary && article.summary.status === "ok") {
    const provenance = generateProvenanceMetadata({
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
    });

    // Layer 3: <meta name="ai-provenance" content="model:...;generated-at:...;...">
    // NOTE: We do NOT set "X-AI-Provenance" here — metadata.other only emits
    // <meta> tags, not HTTP headers. The HTTP header is in next.config.ts.
    metadata.other = {
      "ai-provenance": provenance.metaTag,
    };
  }

  return metadata;
}

export default function ArticlePage({ params }: ArticlePageProps) {
  return (
    <div className="min-h-screen bg-paper-50">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main id="main-content">
        <Suspense fallback={<ArticleSkeleton />}>
          <ArticleData params={params} />
        </Suspense>
      </main>
    </div>
  );
}
