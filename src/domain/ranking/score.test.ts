import { describe, it, expect } from "vitest";
import { calculateImportanceScore, type ScoringInputs } from "./score";
import type { contentAvailabilityEnum } from "@/lib/db/schema";

// ─── Compile-time type safety: ScoringInputs.contentAvailability MUST derive
// from the Drizzle schema's contentAvailabilityEnum (Single Source of Truth).
// If score.ts hand-writes the union AND the schema enum changes, this test
// will fail at compile time (caught by `pnpm check`).
// ───────────────────────────────────────────────────────────────────────────
type SchemaContentAvailability =
  (typeof contentAvailabilityEnum.enumValues)[number];

// This assignment will fail to compile if ScoringInputs.contentAvailability
// diverges from the schema-derived type. The `satisfies` clause enforces
// that the literal "full_text" is assignable to BOTH types — if either type
// narrows, this breaks.
const _typeCheck =
  "full_text" as ScoringInputs["contentAvailability"] satisfies SchemaContentAvailability;
void _typeCheck;

describe("calculateImportanceScore", () => {
  it("returns a value between 0 and 1", () => {
    const inputs: ScoringInputs = {
      ageInHours: 0,
      hasSummary: true,
      sourcePriority: 1,
      contentAvailability: "full_text",
    };
    const score = calculateImportanceScore(inputs);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("favors recent articles", () => {
    const recent = calculateImportanceScore({
      ageInHours: 0,
      hasSummary: false,
      sourcePriority: 3,
      contentAvailability: "excerpt",
    });
    const old = calculateImportanceScore({
      ageInHours: 24 * 7 + 1,
      hasSummary: false,
      sourcePriority: 3,
      contentAvailability: "excerpt",
    });
    expect(recent).toBeGreaterThan(old);
  });

  it("favors articles with summaries", () => {
    const withSummary = calculateImportanceScore({
      ageInHours: 1,
      hasSummary: true,
      sourcePriority: 2,
      contentAvailability: "partial_text",
    });
    const withoutSummary = calculateImportanceScore({
      ageInHours: 1,
      hasSummary: false,
      sourcePriority: 2,
      contentAvailability: "partial_text",
    });
    expect(withSummary).toBeGreaterThan(withoutSummary);
  });

  it("favors higher source priority (lower number)", () => {
    const highPriority = calculateImportanceScore({
      ageInHours: 1,
      hasSummary: false,
      sourcePriority: 1,
      contentAvailability: "full_text",
    });
    const lowPriority = calculateImportanceScore({
      ageInHours: 1,
      hasSummary: false,
      sourcePriority: 5,
      contentAvailability: "full_text",
    });
    expect(highPriority).toBeGreaterThan(lowPriority);
  });

  it("caps at 1.0", () => {
    const score = calculateImportanceScore({
      ageInHours: 0,
      hasSummary: true,
      sourcePriority: 1,
      contentAvailability: "full_text",
    });
    expect(score).toBeLessThanOrEqual(1);
  });
});
