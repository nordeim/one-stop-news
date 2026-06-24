/**
 * providers.ts — Conditional Auth.js v5 provider configuration.
 *
 * Always includes the Credentials provider (admin email/password login).
 * Conditionally includes Google and GitHub OAuth providers ONLY when their
 * respective env vars are present. This preserves backward compatibility
 * with deployments that haven't configured OAuth (the app still works with
 * just Credentials).
 *
 * Extracted into a separate module so the provider-selection logic is
 * unit-testable without importing the full NextAuth() config (which
 * triggers the DrizzleAdapter and env validation at module load time).
 */

import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import type { Provider } from "next-auth/providers/index";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
// Phase 19 (H12): Read all env vars via the typed `env` export (validated
// by Zod at module load) instead of process.env.* directly. This catches
// typos like GOOGLE_CLIENTID at boot and centralizes the source of truth.
import { env } from "@/lib/env";

// ─── Credentials Provider (always present) ─────────────────────────────────

const credentialsProvider = Credentials({
  id: "credentials",
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials) return null;

    const parsed = z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
      })
      .safeParse(credentials);

    if (!parsed.success) return null;

    const { email, password } = parsed.data;

    const user = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        role: schema.users.role,
        passwordHash: schema.users.passwordHash,
      })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!user) return null;
    if (!user.passwordHash) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },
});

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Builds the list of Auth.js providers based on environment configuration.
 *
 * Always includes Credentials. Conditionally includes Google + GitHub when
 * both their CLIENT_ID and CLIENT_SECRET env vars are present (defensive —
 * partial config is silently ignored to avoid Auth.js throwing at boot).
 *
 * @returns Array of Auth.js Provider instances
 */
export function buildProviders(): Provider[] {
  const providers: Provider[] = [credentialsProvider];

  // Phase 19 (H12): Read OAuth creds via the typed `env` export. The Zod
  // schema in src/lib/env/index.ts declares these as optional strings, so
  // typos like GOOGLE_CLIENTID (missing S) would be caught at boot.
  const hasGoogle = env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET;
  if (hasGoogle) {
    providers.push(
      Google({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      }),
    );
  }

  const hasGitHub = env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET;
  if (hasGitHub) {
    providers.push(
      GitHub({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      }),
    );
  }

  return providers;
}
