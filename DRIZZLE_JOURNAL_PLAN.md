# Plan: Investigate and Validate Drizzle Journal Registration

**Problem:** The Drizzle journal (`drizzle/meta/_journal.json`) is out of sync with the actual migration state. Two migrations (0006, 0007) were applied manually via direct SQL execution but never registered in the journal. A phantom migration (`0006_closed_mother_askani`) was registered but its SQL file was deleted.

**Date:** 2026-06-26
**Severity:** 🟡 Medium — doesn't break `drizzle-kit generate` (it sees no changes) but creates a landmine for future developers.

---

## Phase 1: ANALYZE — Current State

### Journal state vs Reality

| Journal Entry | Tag                           | SQL File                                 | Actually Applied? | DB State       |
| ------------- | ----------------------------- | ---------------------------------------- | ----------------- | -------------- |
| idx 0         | `0000_purple_blue_marvel`     | ✅ Exists                                | ✅ Yes            | ✅ Matches     |
| idx 1         | `0001_panoramic_makkari`      | ✅ Exists                                | ✅ Yes            | ✅ Matches     |
| idx 2         | `0002_flippant_screwball`     | ✅ Exists                                | ✅ Yes            | ✅ Matches     |
| idx 3         | `0003_strong_mac_gargan`      | ✅ Exists                                | ✅ Yes            | ✅ Matches     |
| idx 4         | `0004_smiling_newton_destine` | ✅ Exists                                | ✅ Yes            | ✅ Matches     |
| idx 5         | `0005_neat_wolverine`         | ✅ Exists                                | ✅ Yes            | ✅ Matches     |
| idx 6         | `0006_closed_mother_askani`   | ❌ **DELETED**                           | ❌ **NEVER**      | ❌ No effect   |
| —             | (missing)                     | `0006_cross_field_search.sql`            | ✅ **Manually**   | ⚠️ **Partial** |
| —             | (missing)                     | `0007_accounts_user_provider_unique.sql` | ✅ **Manually**   | ✅ Applied     |

### Critical Discovery: Migration 0006 Was Never Fully Applied

The `search_vector` column in the database uses the **old 2-weight definition**:

```sql
-- ACTUAL (database):
setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
setweight(to_tsvector('english', COALESCE(excerpt, '')), 'B')
```

But schema.ts specifies the **new 4-weight definition**:

```sql
-- EXPECTED (schema.ts):
setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
setweight(to_tsvector('english', COALESCE(excerpt, '')), 'B') ||
setweight(to_tsvector('english', COALESCE(body, '')), 'C') ||
setweight(to_tsvector('english', COALESCE(source_name, '')), 'D')
```

**Evidence:**

- `information_schema.columns` shows `articles` has 17 columns (no `source_name`)
- `generation_expression` for `search_vector` only has title+A and excerpt+B
- The `source_name` column does not exist in the database

**Why `drizzle-kit generate` doesn't detect this:**
Drizzle-kit uses the **journal** to determine what migrations have been applied. Since the journal has `0006_closed_mother_askani` (even though its SQL file is deleted), drizzle-kit considers that migration as applied and doesn't check whether the actual database state matches.

### Migration 0007 Was Applied Successfully

The `accounts_user_provider_idx` unique index exists in the database:

```
accounts_pkey                        | (id)
accounts_provider_account_idx        | (provider, provider_account_id)
accounts_user_provider_idx           | (user_id, provider)  ← from 0007
```

---

## Phase 2: PLAN — Remediation Options

### Option A: Fix the Journal Only (Minimal)

**Goal:** Make the journal accurately reflect reality without touching the database.

**Steps:**

1. Remove `0006_closed_mother_askani` entry from journal
2. Add `0006_cross_field_search` entry to journal
3. Add `0007_accounts_user_provider_unique` entry to journal

**Pros:**

- No database changes needed
- Low risk

**Cons:**

- Doesn't fix the actual schema drift (0006 was never applied)
- `drizzle-kit generate` will then detect the diff and want to recreate `source_name` + `search_vector`

### Option B: Apply Missing Migration + Fix Journal (Complete)

**Goal:** Bring the database into full alignment with schema.ts AND fix the journal.

**Steps:**

1. Apply migration 0006 manually (add `source_name` column, backfill, recreate `search_vector`)
2. Fix journal: replace `0006_closed_mother_askani` with `0006_cross_field_search`, add `0007`
3. Verify `drizzle-kit generate` reports no changes

**Pros:**

- Full alignment between code and database
- Cross-field search actually works (body + source_name searchable)
- Future `drizzle-kit migrate` will work correctly

**Cons:**

- Migration 0006 is **destructive** (drops and recreates `search_vector` column + GIN index)
- Requires a maintenance window or careful online migration
- The `search_vector` GIN index will be temporarily unavailable during migration

### Option C: Regenerate from Scratch (Nuclear)

**Goal:** Delete all migrations, regenerate from current schema, and reapply.

**Steps:**

1. Delete all migration SQL files and journal
2. Run `drizzle-kit generate` to create a single "initial" migration
3. Since the DB already has the schema (minus 0006 changes), use `--custom` to create an empty migration baseline
4. Manually create the baseline migration that matches current DB state

**Pros:**

- Clean slate
- No phantom entries

**Cons:**

- Complex and error-prone
- Doesn't solve the underlying 0006 application gap
- Risk of losing migration history

---

## Phase 3: VALIDATE — Recommended Approach

### Recommendation: **Option B** (Apply 0006 + Fix Journal)

**Rationale:**

1. The `source_name` column and 4-weight `search_vector` are **required for cross-field search** (Phase 19 H11 feature)
2. Without this migration, searching for body text or source names doesn't work
3. The migration is idempotent and can be applied safely with `IF EXISTS` / `IF NOT EXISTS` guards
4. The journal fix is straightforward JSON editing

### Detailed Execution Plan

#### Step 1: Pre-flight checks (READ ONLY)

```bash
# 1.1 Verify current DB state
psql "postgresql://onestopnews:onestopnews_dev_password@localhost:5432/onestopnews_dev" -c "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'articles'
  ORDER BY ordinal_position;
"

# 1.2 Verify search_vector definition
psql "postgresql://onestopnews:onestopnews_dev_password@localhost:5432/onestopnews_dev" -c "
  SELECT generation_expression
  FROM information_schema.columns
  WHERE table_name = 'articles' AND column_name = 'search_vector';
"

# 1.3 Verify source_name column absence
psql "postgresql://onestopnews:onestopnews_dev_password@localhost:5432/onestopnews_dev" -c "
  SELECT count(*)
  FROM information_schema.columns
  WHERE table_name = 'articles' AND column_name = 'source_name';
"
# Expected: 0

# 1.4 Verify accounts_user_provider_idx exists (0007 already applied)
psql "postgresql://onestopnews:onestopnews_dev_password@localhost:5432/onestopnews_dev" -c "
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'accounts' AND indexname = 'accounts_user_provider_idx';
"
# Expected: 1 row

# 1.5 Verify current journal state
cat drizzle/meta/_journal.json | jq '.entries[] | {idx, tag}'
```

#### Step 2: Apply migration 0006 manually

```sql
-- 2.1 Add source_name column (nullable, will backfill)
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "source_name" text;

-- 2.2 Backfill source_name from sources table
UPDATE "articles" AS a
SET "source_name" = s."name"
FROM "sources" AS s
WHERE a."source_id" = s."id" AND a."source_name" IS NULL;

-- 2.3 Drop existing search_vector + GIN index
DROP INDEX IF EXISTS "articles_search_vector_gin_idx";
ALTER TABLE "articles" DROP COLUMN IF EXISTS "search_vector";

-- 2.4 Recreate search_vector with 4-weight definition
ALTER TABLE "articles" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(source_name, '')), 'D')
  ) STORED NOT NULL;

-- 2.5 Recreate GIN index
CREATE INDEX IF NOT EXISTS "articles_search_vector_gin_idx"
  ON "articles" USING gin ("search_vector");
```

#### Step 3: Fix the journal

Replace the journal entry for idx 6 from the phantom `0006_closed_mother_askani` to the real `0006_cross_field_search`, and add `0007_accounts_user_provider_unique` as idx 7.

**Target journal state:**

```json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    { "idx": 0, "tag": "0000_purple_blue_marvel", ... },
    { "idx": 1, "tag": "0001_panoramic_makkari", ... },
    { "idx": 2, "tag": "0002_flippant_screwball", ... },
    { "idx": 3, "tag": "0003_strong_mac_gargan", ... },
    { "idx": 4, "tag": "0004_smiling_newton_destine", ... },
    { "idx": 5, "tag": "0005_neat_wolverine", ... },
    { "idx": 6, "tag": "0006_cross_field_search", ... },    // ← FIXED
    { "idx": 7, "tag": "0007_accounts_user_provider_unique", ... }  // ← ADDED
  ]
}
```

**Note:** The `when` timestamp for the new entries should be the actual application time (use `date +%s000`).

#### Step 4: Verify alignment

```bash
# 4.1 Verify source_name column now exists
psql "..." -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'source_name';"
# Expected: 1 row

# 4.2 Verify search_vector has 4 weights
psql "..." -c "SELECT generation_expression FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'search_vector';"
# Expected: expression containing 'C' and 'D' weights

# 4.3 Verify drizzle-kit sees no changes
DATABASE_URL="..." pnpm drizzle-kit generate
# Expected: "No schema changes, nothing to migrate"

# 4.4 Verify drizzle-kit migrate is clean
DATABASE_URL="..." pnpm drizzle-kit migrate
# Expected: no errors

# 4.5 Run full test suite
pnpm test
# Expected: 525 tests pass

# 4.6 Run quality gate
pnpm check
# Expected: 0 TS errors, 0 ESLint warnings
```

#### Step 5: Add regression test

Add a test in `next.config.test.ts` or a new `drizzle-journal.test.ts` that asserts:

- All migration tags in the journal have corresponding SQL files
- All SQL files in `drizzle/*.sql` (except `custom-indexes.sql`) have journal entries
- No phantom entries reference deleted files

---

## Phase 4: RISks & Mitigations

| Risk                                                       | Severity  | Mitigation                                                                                                        |
| ---------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| Migration 0006 fails mid-way (e.g., column already exists) | 🔴 High   | Use `IF EXISTS` / `IF NOT EXISTS` guards on every statement                                                       |
| GIN index rebuild takes long on large table                | 🟡 Medium | Run during low-traffic window; use `CONCURRENTLY` if needed (not available for CREATE INDEX on generated columns) |
| Data loss in `search_vector` during column drop/add        | 🟢 Low    | The column is GENERATED ALWAYS — it will be recalculated automatically after recreation                           |
| `source_name` backfill misses articles without a source    | 🟢 Low    | Column is nullable; `COALESCE(source_name, '')` handles NULL in search_vector                                     |
| Journal edit introduces JSON syntax error                  | 🟡 Medium | Validate with `jq` after editing                                                                                  |

---

## Phase 5: Success Criteria

| Criterion                                 | Verification                       |
| ----------------------------------------- | ---------------------------------- |
| `source_name` column exists in DB         | `information_schema.columns` query |
| `search_vector` has 4 weights             | `generation_expression` query      |
| `accounts_user_provider_idx` exists       | `pg_indexes` query                 |
| `drizzle-kit generate` reports no changes | Command output                     |
| `drizzle-kit migrate` runs clean          | Command output                     |
| All 525 tests pass                        | `pnpm test`                        |
| `pnpm check` passes                       | `tsc --noEmit && eslint`           |
| Journal has 8 entries, no phantoms        | `jq '.entries \| length'`          |
| Every journal tag has a SQL file          | Script check                       |

---

## Appendix: Journal Entry Format

Each journal entry has this structure:

```json
{
  "idx": 6,
  "version": "7",
  "when": 1782418186450,
  "tag": "0006_cross_field_search",
  "breakpoints": true
}
```

The `when` field is a Unix timestamp in milliseconds. The `tag` must match the SQL filename exactly (without `.sql` extension).
