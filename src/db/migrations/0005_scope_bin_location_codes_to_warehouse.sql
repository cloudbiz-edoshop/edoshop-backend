ALTER TABLE "bins" DROP CONSTRAINT IF EXISTS "bins_locationCode_unique";

UPDATE "bins" AS b
SET "locationCode" = regexp_replace(b."locationCode", '^W[0-9]+-', '')
WHERE b."locationCode" ~ '^W[0-9]+-'
  AND NOT EXISTS (
    SELECT 1
    FROM "bins" AS other
    WHERE other."id" <> b."id"
      AND other."warehouseId" = b."warehouseId"
      AND other."locationCode" = regexp_replace(b."locationCode", '^W[0-9]+-', '')
  );

CREATE UNIQUE INDEX IF NOT EXISTS "bins_warehouse_location_code_unique"
ON "bins" ("warehouseId", "locationCode");
