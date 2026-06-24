"use server";

/**
 * Account actions — Phase 19+ remediation, Batch 3 / F2.
 *
 * Closes the gap documented in lib/auth/index.ts:signIn() TODO and the
 * AuthErrorMessage.tsx "link from your account settings" message that
 * previously pointed to a non-existent page.
 *
 * Exports:
 *   - getLinkedProviders(): Returns the list of provider names already linked
 *     to the current user (e.g., ["credentials", "google"]).
 *   - linkOAuthProvider(provider): Marks an OAuth provider as linked to the
 *     current user's account. The actual OAuth flow still goes through
 *     /api/auth/signin (Auth.js), but this server action pre-creates the
 *     `accounts` row so the OAuth callback's `adapter.linkAccount()` call
 *     succeeds instead of throwing `OAuthAccountNotLinked`.
 *
 * Security:
 *   - Both actions call `verifySession()` first (auth required).
 *   - Provider name is validated against an allowlist (only "google" | "github").
 *   - The `accounts.userId` is taken from the session, never from user input.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";

const ALLOWED_OAUTH_PROVIDERS = ["google", "github"] as const;
type OAuthProvider = (typeof ALLOWED_OAUTH_PROVIDERS)[number];

export type LinkResult =
  | { status: "linked"; provider: string }
  | { status: "already_linked"; provider: string }
  | { status: "error"; message: string };

export type LinkedProviderList = string[];

/**
 * Returns the list of provider names already linked to the current user.
 *
 * Example: ["credentials", "google"] means the user signed up with
 * Credentials and has since linked Google.
 */
export async function getLinkedProviders(): Promise<LinkedProviderList> {
  const { user } = await verifySession();

  const rows = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, user.id));

  return rows.map((r) => r.provider);
}

/**
 * Links a new OAuth provider to the current user's account.
 *
 * This pre-creates the `accounts` row so that when the OAuth callback
 * runs `adapter.linkAccount()`, it succeeds instead of throwing
 * `OAuthAccountNotLinked`. The user must still complete the OAuth flow
 * via /api/auth/signin to populate the access/refresh tokens.
 *
 * Behavior:
 *   - If the provider is already linked → returns `{ status: "already_linked" }`
 *   - If the provider name is invalid → returns `{ status: "error", message }`
 *   - On DB failure → returns `{ status: "error", message }`
 *   - On success → returns `{ status: "linked", provider }`
 */
export async function linkOAuthProvider(provider: string): Promise<LinkResult> {
  // Auth check — verifySession throws (redirects) if not signed in
  const { user } = await verifySession();

  // Validate provider name against the allowlist
  if (!ALLOWED_OAUTH_PROVIDERS.includes(provider as OAuthProvider)) {
    return {
      status: "error",
      message: `Invalid provider "${provider}". Allowed: ${ALLOWED_OAUTH_PROVIDERS.join(", ")}`,
    };
  }

  const typedProvider = provider as OAuthProvider;

  try {
    // Phase 24 / F3 fix: Query by (userId, provider) tuple — NOT by provider
    // alone. The original code queried `eq(accounts.provider, typedProvider)`
    // and then did a post-hoc `existing.userId === user.id` check. This had
    // two bugs:
    //   1. The query returned ANY user's row matching the provider, wasting
    //      a round-trip and leaking account existence to other users.
    //   2. Race condition: two concurrent calls by the same user could both
    //      pass the `existing === undefined` check before either insert ran,
    //      producing duplicate "pending" rows.
    //
    // The fixed query trusts the database to enforce the (userId, provider)
    // uniqueness — if findFirst returns a row, it belongs to THIS user by
    // construction. No post-hoc userId check needed.
    const existing = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, user.id),
        eq(accounts.provider, typedProvider),
      ),
    });
    if (existing) {
      return { status: "already_linked", provider: typedProvider };
    }

    // Insert the new account link
    await db
      .insert(accounts)
      .values({
        userId: user.id,
        provider: typedProvider,
        // The OAuth callback will populate these fields later:
        providerAccountId: `pending-${Date.now()}`,
        type: "oauth",
      })
      .onConflictDoNothing();

    return { status: "linked", provider: typedProvider };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: "error", message };
  }
}
