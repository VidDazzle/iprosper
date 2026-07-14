#!/usr/bin/env bash
# One-command Turso setup for Solvana.
# Creates the database, applies all migrations, and prints the env vars to set
# in Cloudflare (or any host). Run it once.
#
# Prereqs: Turso CLI installed and logged in.
#   curl -sSfL https://get.tur.so/install.sh | bash
#   turso auth login
#
# Usage: bash scripts/setup-turso.sh [db-name]   (default: solvana)
set -euo pipefail

DB_NAME="${1:-solvana}"
MIGRATIONS_DIR="$(cd "$(dirname "$0")/.." && pwd)/drizzle"

if ! command -v turso >/dev/null 2>&1; then
  echo "❌ Turso CLI not found. Install it first:"
  echo "   curl -sSfL https://get.tur.so/install.sh | bash && turso auth login"
  exit 1
fi

echo "▶ Creating database '$DB_NAME' (skips if it already exists)…"
turso db create "$DB_NAME" 2>/dev/null || echo "  (database already exists — continuing)"

echo "▶ Applying migrations…"
for f in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
  echo "  • $(basename "$f")"
  # Migrations are not idempotent; re-running on an existing DB is expected to
  # warn on already-created tables. That's fine for a fresh DB.
  turso db shell "$DB_NAME" < "$f" || echo "    (statement(s) skipped — likely already applied)"
done

URL="$(turso db show "$DB_NAME" --url)"
echo "▶ Creating an auth token…"
TOKEN="$(turso db tokens create "$DB_NAME")"

cat <<EOF

✅ Turso is ready.

Set these environment variables in your host (Cloudflare → Workers → Settings →
Variables, or a local .env.local for testing):

  TURSO_CONNECTION_URL=$URL
  TURSO_AUTH_TOKEN=$TOKEN

Keep TURSO_AUTH_TOKEN secret. To rotate it later:
  turso db tokens create $DB_NAME
EOF
