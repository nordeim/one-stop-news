import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

// ─── MANDATORY: Production Migration Runner ──────────────────────────────────
//
// NEVER use `drizzle-kit push` in production. This script uses the safe
// `generate + migrate` workflow as mandated by the Project Architecture
// Document (PAD v4.5 §7.3) and AGENTS.md.
//
// Usage: npx tsx scripts/migrate.ts
// ─────────────────────────────────────────────────────────────────────────────

async function runMigrations() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.error("[Migrate] FATAL: DATABASE_URL is not set.");
    process.exit(1);
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("[Migrate] Running migrations...");

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("[Migrate] Migrations complete.");
  } catch (err) {
    console.error("[Migrate] Migration failed:", err);
    // Ensure we close the client even on failure
    await client.end();
    process.exit(1);
  }

  await client.end();
}

runMigrations().catch((err) => {
  console.error("[Migrate] Unexpected error:", err);
  process.exit(1);
});
