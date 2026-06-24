import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";

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
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(authDb, {
    // NOTE: `as any` is required because the adapter's DefaultPostgres*Table types
    // enforce a strict column structure that doesn't match our custom schema.
    // Our schema has all required columns (verified manually), just with
    // different TypeScript shapes. This is a known limitation of the adapter.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    usersTable: schema.users as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accountsTable: schema.accounts as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessionsTable: schema.sessions as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verificationTokensTable: schema.verificationTokens as any,
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
