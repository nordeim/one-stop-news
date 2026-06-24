-- Phase 24 / F3: Add unique index on (user_id, provider) to the accounts table.
--
-- This enforces the invariant that a given OAuth provider can be linked to a
-- given user at most once. The application-level check in
-- src/app/account/actions.ts:linkOAuthProvider() queries by (userId, provider)
-- and returns "already_linked" if a row exists — but a race condition could
-- allow two concurrent calls to both pass the check before either insert.
--
-- This DB-level unique index is the defense-in-depth backstop: even if the
-- application check races, the DB rejects the duplicate insert. The action's
-- onConflictDoNothing() handles the conflict gracefully (returns success).
--
-- IMPORTANT: This migration is safe to apply on a live database — it only
-- adds an index. If duplicate (user_id, provider) rows already exist, the
-- index creation will fail. In that case, run a cleanup query first:
--
--   DELETE FROM accounts a1 USING accounts a2
--   WHERE a1.id > a2.id
--     AND a1.user_id = a2.user_id
--     AND a1.provider = a2.provider
--     AND a1.provider_account_id LIKE 'pending-%';
--
-- (This deletes the newer "pending-" placeholder rows, keeping the real
-- linked accounts intact.)

CREATE UNIQUE INDEX IF NOT EXISTS "accounts_user_provider_idx"
  ON "accounts" USING btree ("user_id", "provider");
