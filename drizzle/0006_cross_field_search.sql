-- Phase 19 (H11): Cross-field search migration.
--
-- Previously the searchVector generated column only indexed title (A) and
-- excerpt (B). This migration:
--   1. Adds a denormalized source_name column to articles (kept in sync by
--      the ingest worker on every upsert) — needed because Postgres generated
--      columns can't reference joined tables.
--   2. Backfills source_name from the sources table for existing articles.
--   3. Drops and recreates the searchVector generated column to include
--      body (weight C) and source_name (weight D).
--   4. Recreates the GIN index on the new searchVector.
--
-- This is a DESTRUCTIVE migration — it drops and recreates the searchVector
-- column and its index. Run during a maintenance window or while the app is
-- stopped to avoid concurrent-write errors. The migration is idempotent:
-- it uses IF EXISTS / IF NOT EXISTS guards so re-running is safe.

-- Step 1: Add source_name column (nullable, populated by Step 2).
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "source_name" text;

-- Step 2: Backfill source_name from the sources table for existing articles.
-- This is a one-time operation; future inserts/updates are handled by the
-- ingest worker (which sets source_name = source.name on every upsert).
UPDATE "articles" AS a
SET "source_name" = s."name"
FROM "sources" AS s
WHERE a."source_id" = s."id" AND a."source_name" IS NULL;

-- Step 3: Drop the existing searchVector column + its GIN index.
-- The generated column definition can't be altered in-place; we must drop
-- and recreate. The DROP COLUMN cascades to the GIN index automatically.
DROP INDEX IF EXISTS "articles_search_vector_gin_idx";
ALTER TABLE "articles" DROP COLUMN IF EXISTS "search_vector";

-- Step 4: Recreate searchVector with the new 4-weight definition.
ALTER TABLE "articles" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(source_name, '')), 'D')
  ) STORED NOT NULL;

-- Step 5: Recreate the GIN index.
-- Note: fastupdate is left at the default (on) for write-heavy workloads.
-- For production read-heavy workloads, consider recreating with
-- WITH (fastupdate = off) — see drizzle/custom-indexes.sql.
CREATE INDEX IF NOT EXISTS "articles_search_vector_gin_idx"
  ON "articles" USING gin ("search_vector");
