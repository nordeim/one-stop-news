/**
 * auth.ts — Dedicated Drizzle instance for Auth.js adapter.
 *
 * The main `db` proxy (in index.ts) defers connection until first query,
 * but `@auth/drizzle-adapter` requires a real drizzle instance at init time.
 * This file creates an eager instance for the adapter only.
 *
 * Phase 19 (H12): Reads env vars via the typed `env` export (validated by
 * Zod at module load) instead of process.env.* directly.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/lib/env";

// Phase 19 (H12): The Zod schema in env/index.ts already validated
// DATABASE_URL at module load — no need for the inline check.
const url = env.DATABASE_URL;

const client = postgres(url, {
  max: env.NODE_ENV === "production" ? 10 : 3,
  idle_timeout: 20,
  connect_timeout: 10,
});

/** Real Drizzle instance for Auth.js adapter (NOT a Proxy). */
export const authDb = drizzle(client, {
  schema,
  logger: env.NODE_ENV === "development",
});
