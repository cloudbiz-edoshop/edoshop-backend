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
