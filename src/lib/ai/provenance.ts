/**
 * provenance.ts — 3-layer machine-readable AI provenance disclosure.
 *
 * PRD §7.1: "Every AI summary carries a 3-layer provenance disclosure:
 * JSON-LD + HTTP header + HTML meta tag — for EU AI Act Art. 50 compliance."
 *
 * PAD §8.4: "generateProvenanceMetadata returns { metaTag, jsonLd }
 * C2PA is explicitly rejected — no text standard exists."
 *
 * Layer 2 (HTTP header X-AI-Provenance) is set statically in next.config.ts
 * headers() for /article/:id* routes. It is NOT generated here — Phase 23 /
 * BUG-2 removed the dynamic base64 payload because Next.js 16's
 * metadata.other API only emits <meta> tags, not HTTP headers. The static
 * header value is: "eu-ai-act-art50-compliant; disclosure-in-meta-and-jsonld".
 *
 * Phase 24 / F4: Removed dead `generateHttpHeader()` function and the
 * `httpHeader` field on ProvenanceResult. They were unused since Phase 23.
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
  /** Layer 1: JSON-LD structured data (escaped for safe <script> embedding) */
  jsonLd: string;
  /** Layer 3: Semicolon-delimited string for HTML <meta name="ai-provenance"> tag */
  metaTag: string;
}

/**
 * Generates the dynamic provenance layers (JSON-LD + meta tag) from a single input.
 *
 * Layer 2 (X-AI-Provenance HTTP header) is set statically in next.config.ts
 * and is NOT produced here — see file header for rationale.
 *
 * Pure function — no side effects.
 */
export function generateProvenanceMetadata(
  input: ProvenanceInput,
): ProvenanceResult {
  return {
    jsonLd: generateJsonLd(input),
    metaTag: generateMetaTag(input),
  };
}

/**
 * Escapes characters that would break out of a `<script type="application/ld+json">`
 * tag when the JSON is embedded via `dangerouslySetInnerHTML`.
 *
 * `JSON.stringify` does NOT escape `<`, `>`, `&`, U+2028, or U+2029 — but all
 * of these are dangerous in an HTML script context:
 *   - `</script>` (case-insensitive) terminates the script tag early
 *   - `<!--` followed by `<script` can hijack parsing in some browsers
 *   - U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR) terminate JS
 *     string literals in older browsers (pre-2019)
 *
 * The escape uses JSON-compatible `\u00XX` sequences, so `JSON.parse()` on
 * the output recovers the original characters. This makes the escape safe
 * for both HTML embedding AND downstream JSON consumers.
 *
 * See OWASP XSS Prevention Cheat Sheet §Rule 3.1.
 */
function escapeForScriptContext(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Layer 1: JSON-LD — schema.org/CreativeWork with AI provenance.
 *
 * Embeds in page <script type="application/ld+json"> tag.
 *
 * Phase 24 / F2: The output is escaped via `escapeForScriptContext()` to
 * prevent XSS when rendered via `dangerouslySetInnerHTML`. The JSON is
 * still valid — `JSON.parse()` reverses the escapes automatically.
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

  return escapeForScriptContext(JSON.stringify(jsonLd, null, 2));
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
