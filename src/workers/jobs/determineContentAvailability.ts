import type { contentAvailabilityEnum } from "@/lib/db/schema";

type ContentAvailability = (typeof contentAvailabilityEnum.enumValues)[number];

interface ParsedContent {
  title?: string;
  excerpt?: string;
  body?: string;
}

/**
 * determineContentAvailability — Pure function that classifies article content.
 *
 * CRITICAL SAFETY GUARD: This determines whether an article is eligible
 * for AI summarisation. Only 'partial_text' and 'full_text' should ever
 * be enqueued for summarisation. Summarising 'title_only' or 'excerpt'
 * forces the AI to hallucinate content.
 *
 * Rules (per PRD v4.3 §8.1):
 *   - No title         -> 'title_only'  (DO NOT summarise)
 *   - No excerpt       -> 'excerpt'      (DO NOT summarise)
 *   - Body < 500 chars -> 'partial_text' (summarise permitted)
 *   - Body >= 500 chars-> 'full_text'    (summarise preferred)
 *
 * @param parsed — Article content fields
 * @returns ContentAvailability enum value
 */
export function determineContentAvailability(
  parsed: ParsedContent,
): ContentAvailability {
  const { title, excerpt, body } = parsed;

  if (!title || title.trim().length === 0) {
    return "title_only";
  }

  if (!excerpt || excerpt.trim().length === 0) {
    return "excerpt";
  }

  const bodyLength = body ? body.length : 0;

  if (bodyLength < 500) {
    return "partial_text";
  }

  return "full_text";
}
