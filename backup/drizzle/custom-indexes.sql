-- ═══════════════════════════════════════════════════════════════════════════════
-- OneStopNews — Custom PostgreSQL Indexes (Phase 2)
-- These are applied AFTER Drizzle migrations and augment schema-level indexes.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. pg_trgm Extension (for autocomplete / fuzzy search)
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Full-Text Search GIN Index (optimised for consistent latency)
--    Replaces the default GIN with fastupdate = off to prevent WAL bloat
--    and ensure consistent search performance under high write load.
--    This is applied if the schema-defined index needs to be overridden,
--    otherwise the schema-defined GIN index is sufficient.
-- ------------------------------------------------------------------------------
-- NOTE: The articles_search_vector_gin_idx is already declared in schema.ts.
-- Only uncomment the following if you need fastupdate = off for production:
--
-- CREATE INDEX IF NOT EXISTS articles_search_vector_gin_fastupdate_off_idx
-- ON articles USING gin (search_vector) WITH (fastupdate = off);

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
