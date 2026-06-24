import { z } from "zod";

/**
 * summariseSchema.ts — Zod-validated AI output schema.
 *
 * PRD §7: "AI summaries must be structured, fact-checked, and cite sources."
 * PAD §7.1: "Output validation via Zod — no freeform text accepted from models."
 *
 * All fields are required. The AI model is instructed to produce JSON matching
 * this exact schema via the prompt template in prompts.ts.
 */

export const sourceCitationSchema = z.object({
  url: z.string().url("Source URL must be a valid URL"),
  title: z.string().trim().min(1, "Source title cannot be empty"),
});

export const summarisationOutputSchema = z.object({
  /**
   * The main AI-generated summary text.
   * Length constraint prevents verbose output while ensuring completeness.
   */
  summaryText: z
    .string()
    .min(50, "Summary must be at least 50 characters to be useful")
    .max(800, "Summary must not exceed 800 characters"),

  /**
   * Key bullet points extracted from the article.
   * Minimum 1, maximum 5 to balance brevity and coverage.
   */
  keyPoints: z
    .array(z.string().trim().min(1).max(120))
    .min(1, "At least one key point is required")
    .max(5, "No more than 5 key points allowed"),

  /**
   * Sources cited in the summary.
   * Minimum 1 source — every claim must be traceable.
   */
  sourcesCited: z
    .array(sourceCitationSchema)
    .min(1, "At least one source must be cited"),

  /**
   * Transparency statement about the AI model and generation process.
   */
  aiStatement: z
    .string()
    .min(20, "AI statement must be at least 20 characters")
    .max(200, "AI statement must not exceed 200 characters"),

  /**
   * Coverage percentage: how much of the original article
   * the summary represents. 0–100 integer.
   */
  coveragePercentage: z
    .number()
    .int()
    .min(0, "Coverage cannot be negative")
    .max(100, "Coverage cannot exceed 100%"),
});

/**
 * TypeScript type inferred from the Zod schema.
 * Use this for typing in components and actions.
 */
export type SummarisationOutput = z.infer<typeof summarisationOutputSchema>;

/**
 * Validates raw AI output against the schema.
 * Returns { success: true, data } or { success: false, error }.
 *
 * Pure function — no side effects.
 */
export function validateSummarisationOutput(
  raw: unknown,
):
  | { success: true; data: SummarisationOutput }
  | { success: false; error: string } {
  const result = summarisationOutputSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessages = result.error.issues.map((issue) => issue.message);
  return { success: false, error: errorMessages.join("; ") };
}
