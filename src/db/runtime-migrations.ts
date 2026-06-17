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
      INSERT INTO "colors" ("name", "description", "is_predefined")
      VALUES
        ('red', '#FF0000', true),
        ('blue', '#0000FF', true),
        ('green', '#008000', true),
        ('yellow', '#FFFF00', true),
        ('orange', '#FFA500', true),
        ('purple', '#800080', true),
        ('pink', '#FFC0CB', true),
        ('brown', '#8B4513', true),
        ('black', '#000000', true),
        ('white', '#FFFFFF', true),
        ('gray', '#808080', true),
        ('navy', '#000080', true),
        ('beige', '#F5F5DC', true)
      ON CONFLICT ("name") DO UPDATE SET
        "description" = EXCLUDED."description",
        "is_predefined" = true
    `),
  );

  await db.execute(
    sql.raw(`
      INSERT INTO "sizes" ("name", "description", "is_predefined")
      VALUES
        ('xs', 'Extra Small', true),
        ('s', 'Small', true),
        ('m', 'Medium', true),
        ('l', 'Large', true),
        ('xl', 'Extra Large', true),
        ('xxl', 'Extra Extra Large', true)
      ON CONFLICT ("name") DO UPDATE SET
        "description" = EXCLUDED."description",
        "is_predefined" = true
    `),
  );
}
