import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
// Phase 19 (H12): Read env vars via the typed `env` export (validated by
// Zod at module load) instead of process.env.* directly. The lazy proxy
// pattern below defers the actual connection until first query, but the
// env reads happen at module load — using `env` ensures typos are caught
// at boot rather than silently returning undefined.
import { env } from "@/lib/env";

// ─── Lazy Proxy Connection ───────────────────────────────────────────────────
// [CRITICAL] Never eagerly create the database connection.
// Next.js imports modules at build time. An eager connection
// attempt at module load crashes the build in environments
// where DATABASE_URL is not available (CI, static export, etc.)
//
// The connection is deferred until the first property access via Proxy.
// This is the definitive pattern from PAD §5.4 / AGENTS.md §Drizzle ORM.
// ─────────────────────────────────────────────────────────────────────────────

function createClient(url: string) {
  return postgres(url, {
    max: env.NODE_ENV === "production" ? 10 : 3,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

// [DEPLOYMENT NOTE] max: 10 assumes a DEDICATED Node.js runtime
// (Docker, Railway, AWS ECS). Serverless platforms (Vercel, Lambda)
// will exhaust PostgreSQL max_connections rapidly.
// For serverless, swap to a connection pooler (PgBouncer or Supavisor).
function createDb(client: ReturnType<typeof postgres>) {
  return drizzle(client, {
    schema,
    logger: env.NODE_ENV === "development",
  });
}

let _db: ReturnType<typeof createDb> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function getDb() {
  if (_db) return _db;

  // Phase 19 (H12): Read via the typed `env` export. The Zod schema
  // already validates this is a non-empty string starting with postgres://.
  const url = env.DATABASE_URL;

  _client = createClient(url);
  _db = createDb(_client);

  return _db;
}

// Exported as a Proxy — the connection is only initialized on first property access
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    return getDb()[prop as keyof ReturnType<typeof getDb>];
  },
});
