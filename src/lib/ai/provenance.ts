/**
 * provenance.ts — 3-layer machine-readable AI provenance disclosure.
 *
 * PRD §7.1: "Every AI summary carries a 3-layer provenance disclosure:
 * JSON-LD + HTTP header + HTML meta tag — for EU AI Act Art. 50 compliance."
 *
 * PAD §8.4: "generateProvenanceMetadata returns { metaTag, jsonLd, httpHeader }
 * C2PA is explicitly rejected — no text standard exists."
 *
 * All three layers are deterministic pure functions derived from the same
 * Summary data structure.
 */

import type { SummarisationOutput } from "@/features/summaries/lib/summariseSchema";

export interface ProvenanceInput {
  /** The validated AI summary output */
  summary: SummarisationOutput;
  /** Article metadata for provenance context */
  articleId: string;
  articleUrl: string;
  articleTitle: string;
  /** Model information */
  model: string;
  /** ISO timestamp of generation */
  generatedAt: string;
}

export interface ProvenanceResult {
  /** Layer 1: JSON-LD structured data for_ELEMENTS */
  jsonLd: string;
  /** Layer 2: Base64-encoded JSON for HTTP header */
  httpHeader: string;
  /** Layer 3: Semicolon-delimited string for HTML meta tag */
  metaTag: string;
}

/**
 * Generates all three layers of AI provenance disclosure from a single input.
 *
 * Pure function — no side effects.
 */
export function generateProvenanceMetadata(
  input: ProvenanceInput,
): ProvenanceResult {
  return {
    jsonLd: generateJsonLd(input),
    httpHeader: generateHttpHeader(input),
    metaTag: generateMetaTag(input),
  };
}

/**
 * Layer 1: JSON-LD — schema.org/CreativeWork with AI provenance.
 *
 * Embeds in page <script type="application/ld+json"> tag.
 */
function generateJsonLd(input: ProvenanceInput): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: input.articleTitle,
    url: input.articleUrl,
    isBasedOn: input.summary.sourcesCited.map((s) => s.url),
    accountablePerson: {
      "@type": "Person",
      name: `AI System: ${input.model}`,
    },
    dateModified: input.generatedAt,
    description: input.summary.summaryText.substring(0, 200),
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "aiModel",
        value: input.model,
      },
      {
        "@type": "PropertyValue",
        name: "coveragePercentage",
        value: input.summary.coveragePercentage,
      },
      {
        "@type": "PropertyValue",
        name: "sourcesVerified",
        value: input.summary.sourcesCited.length,
      },
      {
        "@type": "PropertyValue",
        name: "compliance",
        value: "eu-ai-act-art50",
      },
    ],
  };

  return JSON.stringify(jsonLd, null, 2);
}

/**
 * Layer 2: HTTP Header — X-AI-Provenance.
 *
 * Base64-encoded JSON containing machine-readable provenance.
 * Set via generateMetadata() `other` field in Next.js App Router.
 */
function generateHttpHeader(input: ProvenanceInput): string {
  const payload = {
    model: input.model,
    generatedAt: input.generatedAt,
    sourcesVerified: input.summary.sourcesCited.length,
    coveragePercentage: input.summary.coveragePercentage,
    compliance: "eu-ai-act-art50",
    articleId: input.articleId,
  };

  const json = JSON.stringify(payload);
  return btoa(json);
}

/**
 * Layer 3: HTML Meta Tag — <meta name="ai-provenance">.
 *
 * Semicolon-delimited key=value pairs for direct HTML embedding.
 * Example:
 *   <meta name="ai-provenance" content="model:claude-4;...">
 */
function generateMetaTag(input: ProvenanceInput): string {
  const parts = [
    `model:${input.model}`,
    `generated-at:${input.generatedAt}`,
    `sources-verified:${input.summary.sourcesCited.length}`,
    `coverage:${input.summary.coveragePercentage}`,
    `compliance:eu-ai-act-art50`,
    `article-id:${input.articleId}`,
  ];

  return parts.join(";");
}
