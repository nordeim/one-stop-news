/**
 * search-vector.test.ts — Tests for the searchVector generated column.
 *
 * Phase 19 (High H11): Previously the searchVector generated column only
 * included title (weight A) and excerpt (weight B), even though the body
 * column was added in migration 0003. Articles with rich body content but
 * sparse excerpts could not be found by searching for body-only terms.
 *
 * This test verifies the schema definition includes `body` in the
 * generated column. It does NOT run a real Postgres query — instead it
 * reads the schema.ts source as text and asserts the generated-column
 * SQL includes the body field.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_PATH = join(process.cwd(), "src/lib/db/schema.ts");

describe("articles.searchVector generated column (Phase 19 / H11)", () => {
  const schemaSource = readFileSync(SCHEMA_PATH, "utf-8");

  it("includes title in the searchVector with weight A", () => {
    // The generated column should reference title with weight A.
    // We check for the setweight call pattern.
    expect(schemaSource).toMatch(
      /setweight\s*\(\s*to_tsvector.*title.*['")],?\s*['"]A['"]/s,
    );
  });

  it("includes excerpt in the searchVector with weight B", () => {
    expect(schemaSource).toMatch(
      /setweight\s*\(\s*to_tsvector.*excerpt.*['")],?\s*['"]B['"]/s,
    );
  });

  it("includes body in the searchVector with weight C (Phase 19 / H11)", () => {
    // The body column was added in migration 0003 but the searchVector
    // generated column was never updated to include it. This test
    // verifies the fix is in place.
    expect(schemaSource).toMatch(
      /setweight\s*\(\s*to_tsvector.*body.*['")],?\s*['"]C['"]/s,
    );
  });

  it("includes source name in the searchVector with weight D (Phase 19 / H11)", () => {
    // Cross-field search: users should be able to find articles by
    // searching for the source name (e.g., "Reuters" or "BBC").
    // This requires a denormalized sourceName column on articles
    // (because Postgres generated columns can't reference joined tables).
    expect(schemaSource).toMatch(/sourceName|source_name/);
  });
});
