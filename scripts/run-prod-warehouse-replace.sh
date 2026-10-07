#!/usr/bin/env sh
# Run inside the Edoshop backend container (Dokploy) where PROD Postgres is reachable.
# Upload the workbook first, e.g. to /app/data/imports/warehouse-stock.xlsx
set -euo pipefail
cd "$(dirname "$0")/.."
FILE="${1:-/app/data/imports/warehouse-stock.xlsx}"
echo "Using workbook: $FILE"
npm run products:replace-warehouse-xlsx -- --prod --file "$FILE"
