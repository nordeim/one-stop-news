/**
 * summarize.ts — AI summarization module using Vercel AI SDK.
 *
 * Calls Anthropic (Claude 4.5 Haiku) as the primary model with OpenAI
 * (GPT-5 Mini) as fallback. Uses `generateObject` with the Zod-validated
 * `summarisationOutputSchema` to guarantee structured output.
 *
 * Per MEP §5 / PRD §7:
 *   - Temperature: 0.1 (factual-only mode)
 *   - Schema: summarisationOutputSchema (50-800 char summary, 1-5 key points, etc.)
 *   - Fallback: OpenAI GPT-5 Mini when Anthropic fails
 *   - On total failure: throws (caller resets summaryStatus to 'none' for retry)
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import {
  summarisationOutputSchema,
  type SummarisationOutput,
} from "@/features/summaries/lib/summariseSchema";
import { buildSummarisationMessages } from "@/lib/ai/prompts";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ArticleForSummarization {
  title: string;
  excerpt: string | null;
  body: string | null;
  sourceName: string;
  sourceUrl: string;
}

export interface SummarizationResult extends SummarisationOutput {
  /** Model ID that produced this summary (e.g., "claude-haiku-4-5") */
  model: string;
  /** Total tokens consumed (input + output) */
  tokensUsed: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const PRIMARY_MODEL = "claude-haiku-4-5";
const FALLBACK_MODEL = "gpt-5-mini";
const TEMPERATURE = 0.1; // Factual-only mode per Nutrition Label display

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generates an AI summary for an article using Anthropic primary + OpenAI fallback.
 *
 * @param article — Article with title, excerpt, body, and source metadata
 * @returns Validated summary + model ID + token usage
 * @throws When both Anthropic and OpenAI fail (caller should reset summaryStatus)
 */
export async function callAISummary(
  article: ArticleForSummarization,
): Promise<SummarizationResult> {
  // Content priority: body > excerpt > title. The content availability guard
  // (enforced upstream in processSummarizeJob) ensures we never reach here
  // with only title_only or excerpt content — but defensive fallback is safe.
  const content = article.body ?? article.excerpt ?? article.title;

  const messages = buildSummarisationMessages({
    content,
    title: article.title,
    sourceName: article.sourceName,
    sourceUrl: article.sourceUrl,
  });

  // Primary: Anthropic Claude 4.5 Haiku
  try {
    const result = await generateObject({
      model: anthropic(PRIMARY_MODEL),
      schema: summarisationOutputSchema,
      messages,
      temperature: TEMPERATURE,
    });

    return {
      ...result.object,
      model: PRIMARY_MODEL,
      tokensUsed: result.usage?.totalTokens ?? 0,
    };
  } catch (primaryError) {
    console.warn(
      "[Summarize] Anthropic failed, falling back to OpenAI:",
      primaryError,
    );
  }

  // Fallback: OpenAI GPT-5 Mini
  const result = await generateObject({
    model: openai(FALLBACK_MODEL),
    schema: summarisationOutputSchema,
    messages,
    temperature: TEMPERATURE,
  });

  return {
    ...result.object,
    model: FALLBACK_MODEL,
    tokensUsed: result.usage?.totalTokens ?? 0,
  };
}
