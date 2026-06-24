import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { contentAvailabilityEnum, feedFormatEnum } from "@/lib/db/schema";

/**
 * Seed Data Tests — TDD for database seed script.
 *
 * These tests verify the seed data structure before the script runs.
 * They ensure the constants (categories, sources, articles, summaries)
 * have the correct shape, counts, and relationships.
 *
 * The second describe block invokes the actual `seed()` function with a
 * mocked `db` to verify that the orchestration logic inserts each table
 * in the correct order with the correct foreign-key resolution.
 */

// ─── Compile-time type safety: seed data fields MUST derive from the Drizzle
// schema's enums (Single Source of Truth). If seed.ts hand-writes the unions
// AND the schema enums change, these checks will fail at compile time
// (caught by `pnpm check`).
// ───────────────────────────────────────────────────────────────────────────
type SchemaContentAvailability =
  (typeof contentAvailabilityEnum.enumValues)[number];
type SchemaFeedFormat = (typeof feedFormatEnum.enumValues)[number];

describe("seed data — enum type derivation (Single Source of Truth)", () => {
  beforeAll(() => {
    vi.resetModules();
  });

  it("seedArticles contentAvailability field matches schema contentAvailabilityEnum", async () => {
    const { seedArticles } = await import("./seed");
    // Runtime check: every value must be in the schema enum
    const validValues = new Set<SchemaContentAvailability>([
      "title_only",
      "excerpt",
      "partial_text",
      "full_text",
    ]);
    for (const article of seedArticles) {
      expect(validValues.has(article.contentAvailability)).toBe(true);
    }
  });

  it("seedSources feedFormat field matches schema feedFormatEnum", async () => {
    const { seedSources } = await import("./seed");
    // Runtime check: every value must be in the schema enum
    const validValues = new Set<SchemaFeedFormat>(["rss", "atom", "json_api"]);
    for (const source of seedSources) {
      expect(validValues.has(source.feedFormat)).toBe(true);
    }
  });
});

describe("seed data structure", () => {
  // Reset module cache so we get fresh imports
  beforeAll(() => {
    vi.resetModules();
  });

  it("should have 7 categories", async () => {
    const { seedCategories } = await import("./seed");
    expect(seedCategories).toBeDefined();
    expect(seedCategories.length).toBe(7);
    expect(seedCategories[0]).toHaveProperty("slug");
    expect(seedCategories[0]).toHaveProperty("name");
  });

  it("should have 7 sources", async () => {
    const { seedSources } = await import("./seed");
    expect(seedSources).toBeDefined();
    expect(seedSources.length).toBe(7);
    expect(seedSources[0]).toHaveProperty("name");
    expect(seedSources[0]).toHaveProperty("url");
    expect(seedSources[0]).toHaveProperty("feedUrl");
  });

  it("should have 30 articles", async () => {
    const { seedArticles } = await import("./seed");
    expect(seedArticles).toBeDefined();
    expect(seedArticles.length).toBe(30);
    expect(seedArticles[0]).toHaveProperty("title");
    expect(seedArticles[0]).toHaveProperty("canonicalUrl");
    expect(seedArticles[0]).toHaveProperty("contentHash");
  });

  it("should have articles with all content availability types", async () => {
    const { seedArticles } = await import("./seed");
    const availabilities = new Set(
      seedArticles.map((a) => a.contentAvailability),
    );
    expect(availabilities.has("title_only")).toBe(true);
    expect(availabilities.has("excerpt")).toBe(true);
    expect(availabilities.has("partial_text")).toBe(true);
    expect(availabilities.has("full_text")).toBe(true);
  });

  it("should have 16 summaries", async () => {
    const { seedSummaries } = await import("./seed");
    expect(seedSummaries).toBeDefined();
    expect(seedSummaries.length).toBe(16);
    expect(seedSummaries[0]).toHaveProperty("summaryText");
    expect(seedSummaries[0]).toHaveProperty("model");
    expect(seedSummaries[0]).toHaveProperty("aiStatement");
  });

  it("should have more articles with summaries than without", async () => {
    const { seedArticles } = await import("./seed");
    const withSummary = seedArticles.filter((a) => a.hasSummary).length;
    expect(withSummary).toBeGreaterThan(10);
  });
});

describe("seed function", () => {
  it("should export a seed function", async () => {
    const { seed } = await import("./seed");
    expect(typeof seed).toBe("function");
  });
});

// ─── seed() orchestration tests ──────────────────────────────────────────────
//
// Mock the `db` module to verify the seed() function:
//   1. Inserts categories, then sources, then articles, then summaries (order matters)
//   2. Resolves foreign keys by reading back inserted rows
//   3. Uses onConflictDoNothing (idempotent)
//
// The mock tracks every insert() and select() call. Each select() returns the
// most-recently-inserted batch of rows so the FK resolution logic in seed()
// can find matches.

const insertCalls: Array<unknown[]> = [];
const onConflictDoNothingMock = vi.fn().mockReturnThis();
let selectCallCount = 0;

vi.mock("@/lib/db", () => {
  const insertChain = (values: unknown) => {
    insertCalls.push(Array.isArray(values) ? values : [values]);
    return { onConflictDoNothing: onConflictDoNothingMock };
  };
  return {
    db: {
      insert: vi.fn(() => ({
        values: insertChain,
      })),
      // seed.ts pattern: await db.select({...}).from(table)
      // Select calls in order: (1) categories, (2) sources, (3) articles (for summary FK)
      select: vi.fn(() => ({
        from: vi.fn(async () => {
          selectCallCount++;
          // 1st select: return the categories that were just inserted (with synthetic IDs)
          if (selectCallCount === 1) {
            const catBatch = (insertCalls[0] ?? []) as Array<
              Record<string, unknown>
            >;
            return catBatch.map((c) => ({
              id: `cat-${c.slug}`,
              slug: c.slug,
            }));
          }
          // 2nd select: return the sources that were just inserted (with synthetic IDs)
          if (selectCallCount === 2) {
            const srcBatch = (insertCalls[1] ?? []) as Array<
              Record<string, unknown>
            >;
            return srcBatch.map((s) => ({
              id: `src-${s.name}`,
              url: s.url,
              name: s.name,
            }));
          }
          // 3rd select: return the articles that were just inserted (with synthetic IDs)
          if (selectCallCount === 3) {
            const artBatch = (insertCalls[2] ?? []) as Array<
              Record<string, unknown>
            >;
            return artBatch.map((a) => ({
              id: `art-${a.canonicalUrl}`,
              canonicalUrl: a.canonicalUrl,
            }));
          }
          return [];
        }),
      })),
    },
  };
});

beforeEach(() => {
  vi.resetModules();
  insertCalls.length = 0;
  selectCallCount = 0;
  onConflictDoNothingMock.mockReset().mockReturnThis();
});

describe("seed() orchestration with mocked db", () => {
  it("inserts categories first, then sources, then articles, then summaries", async () => {
    const { seed } = await import("./seed");
    await seed();

    // At minimum, we should have 3+ insert calls: categories, sources, articles, (optional summaries)
    expect(insertCalls.length).toBeGreaterThanOrEqual(3);

    // First insert: categories (7 items, each has slug + name, no feedUrl)
    const firstBatch = insertCalls[0] as Array<Record<string, unknown>>;
    expect(firstBatch.length).toBe(7);
    expect(firstBatch[0]).toHaveProperty("slug");
    expect(firstBatch[0]).toHaveProperty("name");
    expect(firstBatch[0]).not.toHaveProperty("feedUrl");

    // Second insert: sources (7 items, each has feedUrl)
    const secondBatch = insertCalls[1] as Array<Record<string, unknown>>;
    expect(secondBatch.length).toBe(7);
    expect(secondBatch[0]).toHaveProperty("feedUrl");

    // Third insert: articles (30 items, each has sourceId + categoryId resolved)
    const thirdBatch = insertCalls[2] as Array<Record<string, unknown>>;
    expect(thirdBatch.length).toBe(30);
    expect(thirdBatch[0]).toHaveProperty("sourceId");
    expect(thirdBatch[0]).toHaveProperty("categoryId");
    // Phase 19 / H11: articles should also have denormalized sourceName
    expect(thirdBatch[0]).toHaveProperty("sourceName");
  });

  it("uses onConflictDoNothing for idempotency (safe to run multiple times)", async () => {
    const { seed } = await import("./seed");
    await seed();

    // Every insert should be chained to onConflictDoNothing
    expect(onConflictDoNothingMock).toHaveBeenCalled();
    // Specifically, it should be called once per insert (at least 3: categories, sources, articles)
    expect(onConflictDoNothingMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("resolves foreign keys by reading back inserted categories and sources", async () => {
    const { seed, seedArticles } = await import("./seed");
    await seed();

    // Every article in the third insert batch must have a non-null sourceId and categoryId
    const articleBatch = insertCalls[2] as Array<Record<string, unknown>>;
    for (const article of articleBatch) {
      expect(article.sourceId).toMatch(/^src-/);
      expect(article.categoryId).toMatch(/^cat-/);
    }

    // If summaries were inserted, the count should be ≤ articles with hasSummary=true
    const articlesWithSummary = seedArticles.filter((a) => a.hasSummary);
    const summaryBatch = insertCalls[3] as
      | Array<Record<string, unknown>>
      | undefined;
    if (summaryBatch) {
      expect(summaryBatch.length).toBeLessThanOrEqual(
        articlesWithSummary.length,
      );
    }
  });
});
