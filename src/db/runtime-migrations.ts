import { sql } from "drizzle-orm";

import db from "@/db";

export async function ensureRuntimeMigrations() {
  await db.execute(
    sql.raw(
      `ALTER TABLE "faqs" ADD COLUMN IF NOT EXISTS "store_id" integer NOT NULL DEFAULT 2`,
    ),
  );

  await db.execute(
    sql.raw(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "image_urls" json DEFAULT '[]'::json`,
    ),
  );

  await db.execute(
    sql.raw(
      `ALTER TABLE "direct_order_products" ADD COLUMN IF NOT EXISTS "total_items" integer`,
    ),
  );

  await db.execute(
    sql.raw(
      `ALTER TABLE "colors" ADD COLUMN IF NOT EXISTS "is_predefined" boolean NOT NULL DEFAULT false`,
    ),
  );

  await db.execute(
    sql.raw(
      `ALTER TABLE "sizes" ADD COLUMN IF NOT EXISTS "is_predefined" boolean NOT NULL DEFAULT false`,
    ),
  );

  await db.execute(
    sql.raw(`ALTER TABLE "bins" DROP CONSTRAINT IF EXISTS "bins_locationCode_unique"`),
  );

  await db.execute(
    sql.raw(`ALTER TABLE "bins" DROP CONSTRAINT IF EXISTS "bins_location_code_unique"`),
  );

  await db.execute(
    sql.raw(`
      DO $$
      DECLARE
        location_col text;
        warehouse_col text;
      BEGIN
        SELECT column_name INTO location_col
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'bins'
          AND column_name IN ('location_code', 'locationCode')
        ORDER BY CASE column_name WHEN 'location_code' THEN 1 ELSE 2 END
        LIMIT 1;

        SELECT column_name INTO warehouse_col
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'bins'
          AND column_name IN ('warehouse_id', 'warehouseId')
        ORDER BY CASE column_name WHEN 'warehouse_id' THEN 1 ELSE 2 END
        LIMIT 1;

        IF location_col IS NOT NULL AND warehouse_col IS NOT NULL THEN
          EXECUTE format(
            'UPDATE "bins" AS b
             SET %1$I = regexp_replace(b.%1$I, ''^W[0-9]+-'', '''')
             WHERE b.%1$I ~ ''^W[0-9]+-''
               AND NOT EXISTS (
                 SELECT 1
                 FROM "bins" AS other
                 WHERE other."id" <> b."id"
                   AND other.%2$I = b.%2$I
                   AND other.%1$I = regexp_replace(b.%1$I, ''^W[0-9]+-'', '''')
               )',
            location_col,
            warehouse_col
          );

          EXECUTE format(
            'CREATE UNIQUE INDEX IF NOT EXISTS "bins_warehouse_location_code_unique"
             ON "bins" (%1$I, %2$I)',
            warehouse_col,
            location_col
          );
        END IF;
      END $$;
    `),
  );

  await db.execute(
    sql.raw(`
      WITH actor AS (
        SELECT "id" FROM "users" ORDER BY "id" LIMIT 1
      )
      INSERT INTO "colors" ("name", "description", "is_predefined", "created_by", "updated_by")
      SELECT seed."name", seed."description", true, actor."id", actor."id"
      FROM (
        VALUES
          ('red', '#FF0000'),
          ('blue', '#0000FF'),
          ('green', '#008000'),
          ('yellow', '#FFFF00'),
          ('orange', '#FFA500'),
          ('purple', '#800080'),
          ('pink', '#FFC0CB'),
          ('brown', '#8B4513'),
          ('black', '#000000'),
          ('white', '#FFFFFF'),
          ('gray', '#808080'),
          ('navy', '#000080'),
          ('beige', '#F5F5DC')
      ) AS seed("name", "description")
      CROSS JOIN actor
      ON CONFLICT ("name") DO UPDATE SET
        "description" = EXCLUDED."description",
        "is_predefined" = true,
        "updated_by" = EXCLUDED."updated_by",
        "updated_at" = now()
    `),
  );

  await db.execute(
    sql.raw(`
      WITH actor AS (
        SELECT "id" FROM "users" ORDER BY "id" LIMIT 1
      )
      INSERT INTO "sizes" ("name", "description", "is_predefined", "created_by", "updated_by")
      SELECT seed."name", seed."description", true, actor."id", actor."id"
      FROM (
        VALUES
          ('xs', 'Extra Small'),
          ('s', 'Small'),
          ('m', 'Medium'),
          ('l', 'Large'),
          ('xl', 'Extra Large'),
          ('xxl', 'Extra Extra Large')
      ) AS seed("name", "description")
      CROSS JOIN actor
      ON CONFLICT ("name") DO UPDATE SET
        "description" = EXCLUDED."description",
        "is_predefined" = true,
        "updated_by" = EXCLUDED."updated_by",
        "updated_at" = now()
    `),
  );
}
