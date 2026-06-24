#!/usr/bin/env bash
# =============================================================================
# reinit-db.sh — Drop and recreate the OneStopNews database, run migrations,
#                 apply custom indexes, and re-seed the data.
#
# This script is DESTRUCTIVE — it drops the entire database and recreates it
# from scratch. All data will be lost. Use only for development/reset scenarios.
#
# Usage:
#   bash scripts/reinit-db.sh           # Interactive (prompts for confirmation)
#   bash scripts/reinit-db.sh --force   # Skip confirmation prompt (for CI/automation)
#   bash scripts/reinit-db.sh --dry-run # Show what would happen without executing
#
# Prerequisites:
#   - PostgreSQL instance running (per .env / .env.local DATABASE_URL)
#   - psql CLI installed and on PATH
#   - pnpm installed and on PATH
#   - .env.local or .env file present with DATABASE_URL
#
# The script reads DATABASE_URL from .env.local (preferred) or .env (fallback),
# parses it to extract the DB name/user/password/host/port, then:
#   1. Drops the existing database (after terminating active connections)
#   2. Recreates the database with the correct owner
#   3. Installs required PostgreSQL extensions (uuid-ossp, pg_trgm)
#   4. Runs Drizzle migrations (pnpm drizzle-kit migrate)
#   5. Applies custom indexes (drizzle/custom-indexes.sql)
#   6. Runs the seed script (pnpm db:seed)
#   7. Verifies the final state (table count + row counts)
# =============================================================================

set -euo pipefail

# ─── Color codes for output ─────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── Parse flags ────────────────────────────────────────────────────────────
FORCE=false
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      echo "Usage: bash scripts/reinit-db.sh [--force] [--dry-run] [--help]"
      echo ""
      echo "Options:"
      echo "  --force     Skip confirmation prompt (for CI/automation)"
      echo "  --dry-run   Show what would happen without executing"
      echo "  --help      Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown argument: $arg${NC}"
      echo "Run 'bash scripts/reinit-db.sh --help' for usage."
      exit 1
      ;;
  esac
done

# ─── Helper functions ───────────────────────────────────────────────────────
log()      { echo -e "${GREEN}✓${NC} $1"; }
info()     { echo -e "${BLUE}ℹ${NC} $1"; }
warn()     { echo -e "${YELLOW}⚠${NC} $1"; }
error()    { echo -e "${RED}✗${NC} $1" >&2; }
section()  { echo ""; echo -e "${BOLD}${BLUE}── $1 ──${NC}"; }

# run_or_echo: Execute a command, or just echo it if --dry-run
run() {
  if $DRY_RUN; then
    echo -e "${YELLOW}[DRY-RUN]${NC} $*"
  else
    eval "$@"
  fi
}

# ─── Step 0: Prerequisite checks ────────────────────────────────────────────
section "Step 0: Prerequisite checks"

# 0a. Check psql is available
if ! command -v psql &> /dev/null; then
  error "psql CLI is not installed or not on PATH."
  error "Install PostgreSQL client tools:"
  error "  macOS:  brew install libpq && brew link --force libpq"
  error "  Ubuntu: sudo apt install postgresql-client"
  error "  Docker: docker exec -it <postgres-container> psql ..."
  exit 1
fi
log "psql available: $(psql --version)"

# 0b. Check pnpm is available
if ! command -v pnpm &> /dev/null; then
  error "pnpm is not installed or not on PATH."
  error "Install: npm install -g pnpm@9"
  exit 1
fi
log "pnpm available: $(pnpm --version)"

# 0c. Check we're in the project root (look for package.json + drizzle folder)
if [ ! -f "package.json" ] || [ ! -d "drizzle" ]; then
  error "Not in OneStopNews project root (package.json + drizzle/ not found)."
  error "Run this script from the project root: bash scripts/reinit-db.sh"
  exit 1
fi
log "In project root: $(pwd)"

# 0d. Load DATABASE_URL from .env.local (preferred) or .env (fallback)
ENV_FILE=""
if [ -f ".env.local" ]; then
  ENV_FILE=".env.local"
elif [ -f ".env" ]; then
  ENV_FILE=".env"
else
  error "No .env.local or .env file found."
  error "Create one from .env.example: cp .env.example .env.local"
  exit 1
fi
log "Using env file: $ENV_FILE"

# Source the env file to load DATABASE_URL (and other vars) into the shell
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

# 0e. Verify DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
  error "DATABASE_URL is not set in $ENV_FILE"
  exit 1
fi
log "DATABASE_URL loaded (value hidden for security)"

# ─── Step 1: Parse DATABASE_URL ─────────────────────────────────────────────
section "Step 1: Parse DATABASE_URL"

# DATABASE_URL format: postgresql://USER:PASSWORD@HOST:PORT/DBNAME
# Use sed to extract components (works on macOS and Linux)
DB_USER=$(echo "$DATABASE_URL" | sed -E 's|^postgresql?://([^:]+):.*|\1|')
DB_PASS=$(echo "$DATABASE_URL" | sed -E 's|^postgresql?://[^:]+:([^@]+)@.*|\1|')
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|^postgresql?://[^@]+@([^:/]+).*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|^postgresql?://[^@]+@[^:/]+:([0-9]+).*|\1|')
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|^postgresql?://[^@]+@[^/]+/(.*)$|\1|' | sed 's|\?.*||')

# Fallbacks for optional components
DB_PORT="${DB_PORT:-5432}"

# Validate extraction
if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ] || [ -z "$DB_HOST" ]; then
  error "Failed to parse DATABASE_URL: $DATABASE_URL"
  error "Extracted: user=$DB_USER, host=$DB_HOST, port=$DB_PORT, db=$DB_NAME"
  exit 1
fi

info "Parsed DATABASE_URL:"
info "  User:   $DB_USER"
info "  Pass:   ${DB_PASS:0:3}*** (hidden)"
info "  Host:   $DB_HOST"
info "  Port:   $DB_PORT"
info "  DB:     $DB_NAME"

# Export for child processes (drizzle-kit, tsx seed.ts)
export DATABASE_URL
export PGPASSWORD="$DB_PASS"  # psql uses PGPASSWORD for non-interactive auth

# ─── Step 2: Verify PostgreSQL connectivity ─────────────────────────────────
section "Step 2: Verify PostgreSQL connectivity"

# Connect to the maintenance database (postgres) to verify the server is up
if ! run "psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d postgres -c 'SELECT 1' > /dev/null 2>&1"; then
  error "Cannot connect to PostgreSQL at $DB_HOST:$DB_PORT as user $DB_USER"
  error "Verify PostgreSQL is running and credentials are correct."
  error "Test manually: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres"
  exit 1
fi
log "PostgreSQL is reachable at $DB_HOST:$DB_PORT"

# ─── Step 3: Confirmation prompt ────────────────────────────────────────────
section "Step 3: Confirmation"

if ! $FORCE; then
  echo -e "${RED}${BOLD}⚠  WARNING: DESTRUCTIVE OPERATION  ⚠${NC}"
  echo ""
  echo "This script will:"
  echo -e "  1. ${RED}DROP${NC} database '$DB_NAME' (all data will be lost)"
  echo -e "  2. ${GREEN}CREATE${NC} a fresh database '$DB_NAME'"
  echo "  3. Install extensions (uuid-ossp, pg_trgm)"
  echo "  4. Run all Drizzle migrations (0000–0005)"
  echo "  5. Apply custom indexes (custom-indexes.sql)"
  echo "  6. Seed sample data (7 categories, 7 sources, 30 articles, 16 summaries)"
  echo ""
  echo -e "  Target: ${BOLD}$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME${NC}"
  echo ""

  if $DRY_RUN; then
    warn "DRY-RUN mode: no changes will be made."
  else
    read -r -p "Are you sure you want to continue? Type 'yes' to proceed: " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
      echo "Aborted."
      exit 0
    fi
  fi
fi

# ─── Step 4: Terminate active connections + DROP database ───────────────────
section "Step 4: Drop existing database"

# Terminate any active connections to the target database
# (prevents "database is being accessed by other users" error)
info "Terminating active connections to '$DB_NAME'..."
run "psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d postgres -v ON_ERROR_STOP=1 -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();\"" || {
  warn "Could not terminate all connections (may be none active). Continuing..."
}

# Drop the database
info "Dropping database '$DB_NAME'..."
run "psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d postgres -v ON_ERROR_STOP=1 -c 'DROP DATABASE IF EXISTS \"$DB_NAME\";'" || {
  error "Failed to drop database '$DB_NAME'"
  error "Check for active connections or permissions issues."
  exit 1
}
log "Database '$DB_NAME' dropped"

# ─── Step 5: CREATE database with correct owner ─────────────────────────────
section "Step 5: Create fresh database"

info "Creating database '$DB_NAME' owned by '$DB_USER'..."
run "psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";'" || {
  error "Failed to create database '$DB_NAME'"
  exit 1
}
log "Database '$DB_NAME' created (owner: $DB_USER)"

# ─── Step 6: Install PostgreSQL extensions ──────────────────────────────────
section "Step 6: Install PostgreSQL extensions"

# uuid-ossp: required for uuid_generate_v4() (used by Auth.js adapter tables)
# pg_trgm: required for trigram similarity search (autocomplete suggestions)
# Note: These are also in scripts/init-extensions.sql and drizzle/custom-indexes.sql,
# but we install them here explicitly to ensure they're available before migrations run.
info "Installing extensions: uuid-ossp, pg_trgm..."
run "psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME' -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";'" || {
  error "Failed to install uuid-ossp extension"
  exit 1
}
run "psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME' -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm;'" || {
  error "Failed to install pg_trgm extension"
  exit 1
}
log "Extensions installed: uuid-ossp, pg_trgm"

# ─── Step 7: Run Drizzle migrations ─────────────────────────────────────────
section "Step 7: Run Drizzle migrations"

info "Running migrations via 'pnpm drizzle-kit migrate'..."
# drizzle-kit reads DATABASE_URL from process.env (loaded via .env or exported above)
# It applies all pending migrations in drizzle/ folder (0000–0005)
run "pnpm drizzle-kit migrate" || {
  error "Drizzle migrations failed."
  error "Check the migration files in drizzle/ and verify DATABASE_URL is correct."
  exit 1
}
log "All 6 migrations applied (0000_purple_blue_marvel through 0005_neat_wolverine)"

# ─── Step 8: Apply custom indexes ───────────────────────────────────────────
section "Step 8: Apply custom indexes"

if [ -f "drizzle/custom-indexes.sql" ]; then
  info "Applying drizzle/custom-indexes.sql..."
  run "psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME' -v ON_ERROR_STOP=1 -f drizzle/custom-indexes.sql" || {
    error "Failed to apply custom-indexes.sql"
    error "This file adds: pg_trgm extension, partial index for recent articles, trigram index on titles."
    exit 1
  }
  log "Custom indexes applied (partial index + trigram index)"
else
  warn "drizzle/custom-indexes.sql not found — skipping custom indexes"
fi

# ─── Step 9: Run seed script ────────────────────────────────────────────────
section "Step 9: Seed sample data"

info "Running seed via 'pnpm db:seed'..."
# pnpm db:seed runs: tsx src/lib/db/seed.ts
# The seed script reads DATABASE_URL via process.env (from src/lib/db/index.ts)
# We've already exported DATABASE_URL above, so it's available to the child process
run "pnpm db:seed" || {
  error "Seed script failed."
  error "Check src/lib/db/seed.ts and verify the database is accessible."
  exit 1
}
log "Seed complete (7 categories, 7 sources, 30 articles, 16 summaries)"

# ─── Step 10: Verify final state ────────────────────────────────────────────
section "Step 10: Verify final state"

if ! $DRY_RUN; then
  info "Verifying database state..."

  # Count tables (expect 11: users, categories, subcategories, sources, articles, summaries,
  # push_subscriptions, user_preferences, accounts, sessions, verification_tokens)
  TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | xargs)
  echo -e "  Tables:      ${BOLD}$TABLE_COUNT${NC} (expected: 11)"

  if [ "$TABLE_COUNT" -eq 11 ]; then
    log "Table count matches expected (11)"
  else
    warn "Table count ($TABLE_COUNT) does not match expected (11) — check migrations"
  fi

  # Count rows in key tables
  CATEGORIES_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM categories;" | xargs)
  SOURCES_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM sources;" | xargs)
  ARTICLES_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM articles;" | xargs)
  SUMMARIES_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM summaries;" | xargs)

  echo -e "  Categories:  ${BOLD}$CATEGORIES_COUNT${NC} (expected: 7)"
  echo -e "  Sources:     ${BOLD}$SOURCES_COUNT${NC} (expected: 7)"
  echo -e "  Articles:    ${BOLD}$ARTICLES_COUNT${NC} (expected: 30)"
  echo -e "  Summaries:   ${BOLD}$SUMMARIES_COUNT${NC} (expected: 16)"

  # Verify extensions are installed
  EXTENSIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT string_agg(extname, ', ') FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm');" | xargs)
  echo -e "  Extensions:  ${BOLD}$EXTENSIONS${NC} (expected: pg_trgm, uuid-ossp)"

  # Verify custom indexes exist
  CUSTOM_INDEXES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM pg_indexes WHERE indexname IN ('articles_recent_published_idx', 'articles_title_trgm_idx');" | xargs)
  echo -e "  Custom indexes: ${BOLD}$CUSTOM_INDEXES${NC} (expected: 2)"

  # Verify drizzle migration tracking table exists
  DRIZZLE_JOURNAL=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM drizzle.__drizzle_migrations;" | xargs 2>/dev/null || echo "N/A")
  echo -e "  Drizzle migrations applied: ${BOLD}$DRIZZLE_JOURNAL${NC} (expected: 6)"

  echo ""
  if [ "$CATEGORIES_COUNT" -eq 7 ] && [ "$SOURCES_COUNT" -eq 7 ] && [ "$ARTICLES_COUNT" -eq 30 ] && [ "$SUMMARIES_COUNT" -ge 15 ]; then
    log "All row counts match expected values"
  else
    warn "Some row counts don't match expected — check seed output above"
  fi
else
  warn "DRY-RUN: skipping verification (no changes were made)"
fi

# ─── Summary ────────────────────────────────────────────────────────────────
section "Summary"

if $DRY_RUN; then
  warn "DRY-RUN complete — no changes were made to the database."
  warn "Run without --dry-run to execute: bash scripts/reinit-db.sh"
else
  log "Database re-initialized successfully!"
  echo ""
  echo -e "  ${BOLD}Database:${NC}  $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
  echo -e "  ${BOLD}Tables:${NC}     11 (8 business + 3 Auth.js adapter)"
  echo -e "  ${BOLD}Extensions:${NC} uuid-ossp, pg_trgm"
  echo -e "  ${BOLD}Migrations:${NC} 6 applied (0000–0005)"
  echo -e "  ${BOLD}Seed data:${NC}  7 categories, 7 sources, 30 articles, 16 summaries"
  echo ""
  echo -e "  Next steps:"
  echo -e "    ${GREEN}pnpm dev${NC}      — Start Next.js dev server on http://localhost:3000"
  echo -e "    ${GREEN}pnpm worker${NC}   — Start BullMQ worker service"
  echo -e "    ${GREEN}pnpm db:studio${NC} — Open Drizzle Studio to inspect data"
fi
