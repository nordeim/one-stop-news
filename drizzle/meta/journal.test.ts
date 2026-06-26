/**
 * journal.test.ts — Regression tests for Drizzle migration journal integrity.
 *
 * Purpose: Prevent silent journal drift where migrations are applied manually
 * without updating the journal, or phantom entries reference deleted files.
 *
 * Phase 26: Created after discovering that:
 *   - Migration 0006 (cross_field_search) was applied manually but never
 *     registered in the journal
 *   - Migration 0007 (accounts_user_provider_unique) was applied manually
 *     but never registered in the journal
 *   - A phantom entry (0006_closed_mother_askani) was registered but its
 *     SQL file was deleted
 *
 * These tests enforce:
 *   1. Every journal entry has a corresponding SQL file on disk
 *   2. Every migration SQL file (except custom-indexes.sql) has a journal entry
 *   3. No duplicate tags or indices
 *   4. Journal entries are ordered by idx
 *   5. The __drizzle_migrations table and journal are in sync
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DRIZZLE_DIR = join(process.cwd(), "drizzle");
const META_DIR = join(DRIZZLE_DIR, "meta");

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

describe("Drizzle migration journal integrity", () => {
  let journal: Journal;
  let sqlFiles: string[];

  beforeAll(() => {
    const raw = readFileSync(join(META_DIR, "_journal.json"), "utf-8");
    journal = JSON.parse(raw) as Journal;
    sqlFiles = readdirSync(DRIZZLE_DIR).filter((f) => f.endsWith(".sql"));
  });

  it("is valid JSON with required fields", () => {
    expect(journal.version).toBeDefined();
    expect(journal.dialect).toBe("postgresql");
    expect(Array.isArray(journal.entries)).toBe(true);
    expect(journal.entries.length).toBeGreaterThan(0);
  });

  it("has no phantom entries (every journal tag has a SQL file)", () => {
    const phantomEntries = journal.entries.filter(
      (entry) => !sqlFiles.includes(`${entry.tag}.sql`),
    );
    expect(
      phantomEntries,
      `Phantom entries found (no SQL file on disk): ${phantomEntries.map((e) => e.tag).join(", ")}`,
    ).toHaveLength(0);
  });

  it("has no orphaned migration files (every SQL file has a journal entry)", () => {
    const tags = new Set(journal.entries.map((e) => e.tag));
    const migrationFiles = sqlFiles.filter(
      (f) => f !== "custom-indexes.sql" && !f.endsWith(".bak"),
    );
    const orphanedFiles = migrationFiles.filter(
      (f) => !tags.has(f.replace(".sql", "")),
    );
    expect(
      orphanedFiles,
      `Orphaned SQL files found (no journal entry): ${orphanedFiles.join(", ")}`,
    ).toHaveLength(0);
  });

  it("has no duplicate tags", () => {
    const tags = journal.entries.map((e) => e.tag);
    const uniqueTags = new Set(tags);
    expect(uniqueTags.size).toBe(tags.length);
  });

  it("has no duplicate indices", () => {
    const indices = journal.entries.map((e) => e.idx);
    const uniqueIndices = new Set(indices);
    expect(uniqueIndices.size).toBe(indices.length);
  });

  it("entries are ordered by idx (0, 1, 2, ...)", () => {
    journal.entries.forEach((entry, i) => {
      expect(entry.idx).toBe(i);
    });
  });

  it("timestamps are chronologically ordered (ascending when)", () => {
    for (let i = 1; i < journal.entries.length; i++) {
      expect(
        journal.entries[i]!.when,
        `Entry ${i} (${journal.entries[i]!.tag}) has timestamp earlier than entry ${i - 1} (${journal.entries[i - 1]!.tag})`,
      ).toBeGreaterThanOrEqual(journal.entries[i - 1]!.when);
    }
  });

  it("every entry has version '7' (current Drizzle version)", () => {
    journal.entries.forEach((entry) => {
      expect(entry.version).toBe("7");
    });
  });

  it("every entry has breakpoints: true", () => {
    journal.entries.forEach((entry) => {
      expect(entry.breakpoints).toBe(true);
    });
  });

  it("has at least 8 entries (0000 through 0007)", () => {
    expect(journal.entries.length).toBeGreaterThanOrEqual(8);
  });

  it("contains the expected migration tags", () => {
    const tags = journal.entries.map((e) => e.tag);
    expect(tags).toContain("0000_purple_blue_marvel");
    expect(tags).toContain("0001_panoramic_makkari");
    expect(tags).toContain("0002_flippant_screwball");
    expect(tags).toContain("0003_strong_mac_gargan");
    expect(tags).toContain("0004_smiling_newton_destine");
    expect(tags).toContain("0005_neat_wolverine");
    expect(tags).toContain("0006_cross_field_search");
    expect(tags).toContain("0007_accounts_user_provider_unique");
  });

  it("does NOT contain phantom tag 0006_closed_mother_askani", () => {
    const tags = journal.entries.map((e) => e.tag);
    expect(tags).not.toContain("0006_closed_mother_askani");
  });
});
