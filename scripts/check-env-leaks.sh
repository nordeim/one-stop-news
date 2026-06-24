#!/usr/bin/env bash
# check-env-leaks.sh — CI guard against accidental commit of real .env files.
#
# Phase 24 / F1 remediation: Only .env.example is allowed to be tracked.
# All other .env* files contain real secrets (DB passwords, API keys, VAPID
# keys, encryption keys) and MUST NOT be committed to version control.
#
# This script fails CI (exit 1) if any .env* file (except .env.example) is
# tracked by git. It also warns (exit 0 with warning) if .env.example is
# missing tracked status (which would indicate a different problem).
#
# Usage:
#   bash scripts/check-env-leaks.sh
#   # Or add to .husky/pre-commit:
#   #   bash scripts/check-env-leaks.sh || exit 1

set -euo pipefail

echo "[env-leak-check] Scanning git-tracked files for .env* leaks..."

# Get all tracked .env* files (excluding .env.example which is the template)
leaked_files=$(git ls-files | grep -E "^\.env" | grep -v "^\.env\.example$" || true)

if [ -n "$leaked_files" ]; then
  echo "❌ ERROR: Real .env files are tracked by git. These contain secrets!"
  echo ""
  echo "Leaked files:"
  echo "$leaked_files" | sed 's/^/  - /'
  echo ""
  echo "Fix: git rm --cached <file>  (for each leaked file)"
  echo "     Then rotate ALL secrets that were in those files."
  echo "     See: SECURITY_REMEDIATION.md"
  exit 1
fi

# Verify .env.example IS tracked (it's the template)
# Note: use `|| true` to prevent `set -e` from exiting on grep's non-zero exit
example_tracked=$(git ls-files | grep "^\.env\.example$" || true)
if [ -z "$example_tracked" ]; then
  echo "⚠️  WARNING: .env.example is NOT tracked by git."
  echo "   This file is the template and SHOULD be tracked."
  echo "   Fix: git add .env.example"
  exit 0
fi

echo "✅ No .env leaks detected. Only .env.example is tracked."
exit 0
