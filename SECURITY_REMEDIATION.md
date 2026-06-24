# Security Remediation — Phase 24 / F1

## Incident Summary

**Date discovered**: 2026-06-25
**Severity**: CRITICAL
**Finding**: Real secrets were committed to git history despite `.gitignore` rules.

## Root Cause

Phase 21 added `.gitignore` rules to exclude `.env*` files (except `.env.example`), but never ran `git rm --cached` on the files that were already tracked. The files remained in the git index and entered history in commit `282c2d8 v1 stable rel`.

## Exposed Secrets

The following real (non-placeholder) secrets were committed:

| Secret                                                      | File                                | Line | Status                                            |
| ----------------------------------------------------------- | ----------------------------------- | ---- | ------------------------------------------------- |
| `AUTH_SECRET` (64-hex, 32 bytes)                            | `.env`                              | 19   | **MUST ROTATE**                                   |
| `AUTH_SECRET` (same value)                                  | `.env.local`                        | 9    | **MUST ROTATE**                                   |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (55 chars)                   | `.env.local`                        | 18   | **MUST ROTATE**                                   |
| `VAPID_PRIVATE_KEY` (43 chars)                              | `.env.local`                        | 19   | **MUST ROTATE**                                   |
| `PUSH_KEY_ENCRYPTION_KEY` (64 zeros)                        | `.env`, `.env.local`, `.env.docker` | —    | Dummy value (all zeros) — acceptable for dev only |
| `AUTH_SECRET` (weak: `dev-secret-do-not-use-in-production`) | `.env.docker`                       | 17   | Already rejected by Zod schema in production      |

**Note**: `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in the leaked files use placeholder values (`sk-ant-dummy`, `sk-dummy`) — not real API keys.

## Impact

- **AUTH_SECRET leak**: Anyone with repo read access can forge JWT session cookies, including admin sessions. Full authentication bypass.
- **VAPID keypair leak**: Anyone can send arbitrary Web Push notifications to all subscribed devices, impersonating the service.

## Remediation Performed

### 1. Untracked env files from git index

```bash
git rm --cached .env .env.local .env.docker
```

The files remain on disk locally (untracked), but are no longer in the git index. Future commits will not include them.

### 2. Added CI guard

`scripts/check-env-leaks.sh` — fails CI if any `.env*` file (except `.env.example`) is tracked. Add to `.husky/pre-commit` and CI workflow:

```yaml
# .github/workflows/ci.yml
- name: Check for .env leaks
  run: bash scripts/check-env-leaks.sh
```

### 3. `.gitignore` already correct

The existing `.gitignore` rules are correct:

```
.env
.env.*
!.env.example
```

The issue was never the rules — it was that `git rm --cached` was never run on already-tracked files.

## Required Follow-up Actions (OWNER: DevOps)

### Immediate (within 24 hours)

1. **Rotate AUTH_SECRET**:

   ```bash
   openssl rand -hex 32
   ```

   Update `.env.local` on all environments (dev, staging, prod). All existing JWT sessions will be invalidated — users will need to sign in again.

2. **Rotate VAPID keypair**:

   ```bash
   npx web-push generate-vapid-keys
   ```

   Update `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in `.env.local` on all environments. All existing push subscriptions will need to be re-subscribed (the public key change invalidates them).

3. **Verify no production environment used the leaked secrets**. If production used these exact values, treat as a live breach.

### Short-term (within 1 week)

4. **Purge git history** (recommended but optional given rotation):

   ```bash
   # Using git-filter-repo (preferred over BFG for modern git)
   pip install git-filter-repo
   git filter-repo --path .env --path .env.local --path .env.docker --invert-paths
   git push origin --force --all
   git push origin --force --tags
   ```

   **Warning**: This rewrites history. All contributors must re-clone. Coordinate before executing.

5. **Add pre-commit hook** to `.husky/pre-commit`:

   ```bash
   bash scripts/check-env-leaks.sh || exit 1
   ```

6. **Add CI step** to `.github/workflows/ci.yml`:
   ```yaml
   - name: Check for .env leaks
     run: bash scripts/check-env-leaks.sh
   ```

### Long-term

7. **Move secrets to a secrets manager** (AWS Secrets Manager, Doppler, HashiCorp Vault) instead of `.env` files. `.env` files are acceptable for local dev only.

8. **Add secret scanning** to CI (e.g., `gitleaks` or `trufflehog`) to catch future leaks before they enter history.

## Verification

After remediation:

```bash
# Verify no leaks
bash scripts/check-env-leaks.sh
# Expected: ✅ No .env leaks detected. Only .env.example is tracked.

# Verify .gitignore is correct
git check-ignore .env .env.local .env.docker
# Expected: all three files listed (ignored)
```
