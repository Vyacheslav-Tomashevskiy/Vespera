#!/usr/bin/env bash
# Verifies rollback + re-apply on the current DATABASE_URL / DB_* connection.
# Intended for CI and staging smoke tests (disposable database).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> migration:run (baseline)"
pnpm run migration:run

echo "==> migration:revert (last migration only)"
pnpm run migration:revert

echo "==> migration:run (re-apply)"
pnpm run migration:run

echo "==> Rollback / re-apply cycle completed successfully."
