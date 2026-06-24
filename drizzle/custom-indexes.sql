-- ═══════════════════════════════════════════════════════════════════════════════
-- OneStopNews — Custom PostgreSQL Indexes (Phase 2)
-- These are applied AFTER Drizzle migrations and augment schema-level indexes.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. pg_trgm Extension (for autocomplete / fuzzy search)
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Full-Text Search GIN Index (optimised for consistent latency)
--    Phase 19 (M8): fastupdate=off is now ACTIVE (was previously commented out).
--    With fastupdate=on (the default), GIN accumulates pending-list entries
--    that aren't immediately searchable — fine for read-heavy workloads but
--    problematic when the ingest worker writes 100s of articles per minute
--    (search results go stale for ~4s, the GinPendingListCleanInterval).
--    With fastupdate=off, every insert is immediately searchable at the
--    cost of slightly higher write latency (acceptable for our ingest
--    concurrency of 50).
--
--    This DROP+CREATE replaces the schema-level GIN index (defined in
--    schema.ts) which uses the default fastupdate=on. The schema-level
--    index is dropped first to avoid maintaining two indexes on the same
--    column (which would double the write cost).
-- ------------------------------------------------------------------------------
DROP INDEX IF EXISTS articles_search_vector_gin_idx;
CREATE INDEX IF NOT EXISTS articles_search_vector_gin_idx
ON articles USING gin (search_vector) WITH (fastupdate = off);

-- 3. Partial Index for Recent Articles
--    Accelerates the main feed query which only shows articles from last 30 days.
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS articles_recent_published_idx
ON articles (published_at DESC)
WHERE published_at > (CURRENT_TIMESTAMP - INTERVAL '30 days');

-- 4. pg_trgm Index on Article Titles (for autocomplete)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS articles_title_trgm_idx
ON articles USING gin (title gin_trgm_ops);
