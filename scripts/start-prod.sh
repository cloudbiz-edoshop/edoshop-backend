#!/bin/sh
set -e

echo "========================================"
echo " Edoshop Backend - Production Start"
echo "========================================"
echo "NODE_ENV=${NODE_ENV:-NOT SET}"
echo "PORT=${PORT:-9999}"

if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "FATAL: DATABASE_URL is missing."
  echo "Fix: Dokploy -> backend -> Environment -> add DATABASE_URL"
  echo "Use the internal Postgres service hostname, not localhost."
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo ""
  echo "FATAL: JWT_SECRET is missing."
  echo "Fix: Dokploy -> backend -> Environment -> add JWT_SECRET"
  exit 1
fi

export PATH="/app/node_modules/.bin:$PATH"

echo ""
echo "-- Step 1: Database migrations --"
if DB_MIGRATING=true tsx src/db/migrate.ts; then
  echo "Migrations OK."
else
  echo ""
  echo "FATAL: Migration failed. Check DATABASE_URL and that Postgres is running."
  exit 1
fi

echo ""
echo "-- Step 2: API server --"
exec tsx src/index.ts
