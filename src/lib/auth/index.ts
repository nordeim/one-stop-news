import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { env } from "@/lib/env";
import { authDb } from "@/lib/db/auth";
import * as schema from "@/lib/db/schema";
import { buildProviders } from "./providers";

/**
 * Auth.js v5 (beta) configuration using DrizzleAdapter.
 * Http-only session cookies, same-site, secure in production.
 *
 * Providers (configured in ./providers.ts):
 *   - Credentials  — always present (admin email/password login)
 *   - Google       — conditional on GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
 *   - GitHub       — conditional on GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
 *
 * OAuth providers are loaded only when their env vars are set, so existing
 * deployments without OAuth configuration continue to work unchanged.
 *
 * Phase 24 / F5: Replaced 4× `as any` casts with a typed wrapper function
 * `createPgAdapter()`. The wrapper explicitly specializes DrizzleAdapter's
 * `SqlFlavor` generic to `PgDatabase` (the postgres variant), which narrows
 * the schema parameter to `DefaultPostgresSchema`. This eliminates the union
 * type that prevented per-table `as unknown as` casts from compiling.
 *
 * The adapter's DefaultPostgres*Table types enforce a strict column structure
 * that doesn't match our custom schema (we have extra columns: `role`,
 * `passwordHash`, `createdAt`). The double cast via `unknown` inside the
 * wrapper is the minimal escape hatch — the runtime shape is correct
 * (verified by manual schema inspection), and the adapter accesses columns
 * by string key at runtime, not by type-level field access.
 */

/**
 * Creates a DrizzleAdapter specialized for PostgreSQL.
 *
 * The `SqlFlavor` generic is pinned to `PgDatabase<PgQueryResultHKT>` so
 * `DefaultSchema<SqlFlavor>` resolves to `DefaultPostgresSchema` (not the
 * union of pg/mysql/sqlite). This lets the cast target be the postgres-specific
 * schema type, which TypeScript accepts.
 *
 * Returns `Adapter` (the Auth.js adapter interface) — the same type
 * `DrizzleAdapter` returns.
 */
function createPgAdapter(
  db: unknown,
  config: {
    usersTable: typeof schema.users;
    accountsTable: typeof schema.accounts;
    sessionsTable: typeof schema.sessions;
    verificationTokensTable: typeof schema.verificationTokens;
  },
): ReturnType<typeof DrizzleAdapter> {
  // Cast `db` to the base PgDatabase type. The caller passes `authDb`
  // (PostgresJsDatabase<typeof schema>), which extends PgDatabase but has
  // a different schema type parameter. Casting via `unknown` is safe because
  // DrizzleAdapter only uses the db for query execution, not schema introspection.
  const pgDb = db as PgDatabase<PgQueryResultHKT>;
  // Cast the config through `unknown` to the adapter's expected schema type.
  // Specialized generic context: SqlFlavor = PgDatabase, so the schema is
  // DefaultPostgresSchema (not the union).
  return DrizzleAdapter(
    pgDb,
    config as unknown as Parameters<
      typeof DrizzleAdapter<PgDatabase<PgQueryResultHKT>>
    >[1],
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: createPgAdapter(authDb, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  trustHost: !!env.AUTH_URL,
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/sign-in",
    error: "/auth-error",
  },
  providers: buildProviders(),
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "reader";
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id ?? "";
        session.user.role = token.role ?? "reader";
      }
      return session;
    },
    // ── Phase 19 (M6) + Phase 19+ remediation (Batch 3 / F2) ─────────────
    // When a user signs in with Credentials first, then tries OAuth with
    // the same email, Auth.js v5 throws `OAuthAccountNotLinked` by default
    // (the email is already bound to a different credential). The default
    // behavior redirects to /auth-error with an opaque `?error=OAuthAccountNotLinked`
    // query param.
    //
    // The /auth-error page now renders an actionable message + a link to
    // /account, where the user can manually link the new OAuth provider
    // via the `linkOAuthProvider` server action (src/app/account/actions.ts).
    // That action pre-creates the `accounts` row so the next OAuth attempt
    // succeeds instead of throwing.
    //
    // This signIn callback remains a no-op (returns true) because Auth.js v5
    // beta's signIn callback signature doesn't expose the error type — the
    // /auth-error page handles detection via the `?error=` query param.
    async signIn({ user, account }) {
      void user;
      void account;
      return true;
    },
  },
});
