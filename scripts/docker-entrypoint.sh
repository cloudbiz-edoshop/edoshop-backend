#!/bin/sh
set -e

echo "==> Edoshop backend starting (NODE_ENV=${NODE_ENV:-unknown}, PORT=${PORT:-9999})"

if [ "${SKIP_DB_MIGRATE:-false}" != "true" ]; then
  echo "==> Running database migrations..."
  if npm run db:migrate; then
    echo "==> Migrations completed."
  else
    echo "==> ERROR: Database migration failed."
    echo "    Check DATABASE_URL in Dokploy Environment tab."
    echo "    Postgres host must be the internal service name, not localhost."
    exit 1
  fi
else
  echo "==> Skipping migrations (SKIP_DB_MIGRATE=true)."
fi

echo "==> Starting API server..."
exec npm start
