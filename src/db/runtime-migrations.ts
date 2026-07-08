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

  await db.execute(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS "tracking_steps" (
        "id" serial PRIMARY KEY,
        "step_order" integer NOT NULL,
        "code" varchar(100) UNIQUE NOT NULL,
        "label" varchar(255) NOT NULL,
        "leg" varchar(50) NOT NULL,
        "description" text
      )
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS "tracking_bundles" (
        "id" serial PRIMARY KEY,
        "bundle_code" varchar(100) UNIQUE NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "store_type" varchar(50) NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'active',
        "current_step_id" integer NOT NULL REFERENCES "tracking_steps"("id"),
        "created_at" timestamp NOT NULL,
        "updated_at" timestamp,
        "created_by" integer REFERENCES "users"("id"),
        "updated_by" integer REFERENCES "users"("id")
      )
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS "tracking_bundle_items" (
        "id" serial PRIMARY KEY,
        "bundle_id" integer NOT NULL REFERENCES "tracking_bundles"("id") ON DELETE CASCADE,
        "order_id" integer NOT NULL UNIQUE,
        "created_at" timestamp NOT NULL,
        "created_by" integer REFERENCES "users"("id")
      )
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS "tracking_bundle_history" (
        "id" serial PRIMARY KEY,
        "bundle_id" integer NOT NULL REFERENCES "tracking_bundles"("id") ON DELETE CASCADE,
        "step_id" integer NOT NULL REFERENCES "tracking_steps"("id"),
        "notes" text,
        "attachment_url" varchar(500),
        "created_at" timestamp NOT NULL,
        "created_by" integer REFERENCES "users"("id")
      )
    `),
  );

  await db.execute(
    sql.raw(`
      INSERT INTO "tracking_steps" ("step_order", "code", "label", "leg", "description")
      VALUES
        (1, 'approval', 'Approval', 'manufacturer', 'Bundle orders are approved and ready to proceed.'),
        (2, 'payment_of_items', 'Payment Of Items (HT)', 'manufacturer', 'Payment for bundle items has been received.'),
        (3, 'order_received_by_manufacturer', 'Order Received By Manufacturer', 'manufacturer', 'Manufacturer has received the bundle order.'),
        (4, 'order_shipped_by_agent', 'Order Shipped By Agent', 'manufacturer', 'Agent has shipped the bundle order.'),
        (5, 'orders_arrived_at_local_customs', 'Orders Arrived At Local Custom', 'manufacturer', 'Bundle has arrived at local customs.'),
        (6, 'order_at_the_store', 'Order At The Store', 'manufacturer', 'Bundle goods are now at the Edoshop store.'),
        (7, 'payment_of_kilo', 'Payment Of Kilo', 'manufacturer', 'Kilo/shipping payment for the bundle has been received.'),
        (8, 'packaging', 'Packaging', 'store', 'Bundle orders are being packaged for delivery.'),
        (9, 'payment_for_deliveries', 'Payment For Deliveries', 'store', 'Delivery payment has been received.'),
        (10, 'deliveries', 'Deliveries', 'store', 'Bundle orders are out for delivery or collected.')
      ON CONFLICT ("code") DO NOTHING
    `),
  );
}
