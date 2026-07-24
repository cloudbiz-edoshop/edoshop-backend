import { inArray, sql } from "drizzle-orm";

import {
  ENTITY_DESCRIPTIONS,
  EntityType,
  ROLE_DESCRIPTIONS,
  RoleType,
} from "@/constants";
import db from "@/db";
import {
  entities,
  operations,
  permissions,
  roles,
} from "@/db/models";
import { getRolePermissionTemplate } from "@/modules/permissions/permissions.service";

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
        "source_bundle_id" integer UNIQUE REFERENCES "bundles"("id"),
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
        "order_id" integer REFERENCES "orders"("id"),
        "order_item_id" integer REFERENCES "order_items"("id"),
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
        (7, 'bundle_to_order', 'Bundle to Order', 'manufacturer', 'Bundle is unpacked and customer orders are sent to order tracking.'),
        (8, 'payment_of_kilo', 'Payment Of Kilo', 'manufacturer', 'Kilo/shipping payment for the bundle has been received.'),
        (9, 'packaging', 'Packaging', 'store', 'Bundle orders are being packaged for delivery.'),
        (10, 'payment_for_deliveries', 'Payment For Deliveries', 'store', 'Delivery payment has been received.'),
        (11, 'deliveries', 'Deliveries', 'store', 'Bundle orders are out for delivery or collected.')
      ON CONFLICT ("code") DO NOTHING
    `),
  );

  await db.execute(
    sql.raw(`
      ALTER TABLE "tracking_bundles"
      ADD COLUMN IF NOT EXISTS "source_bundle_id" integer REFERENCES "bundles"("id")
    `),
  );

  await db.execute(
    sql.raw(`
      UPDATE "tracking_bundles" AS tb
      SET "source_bundle_id" = b."id"
      FROM "bundles" AS b
      WHERE tb."source_bundle_id" IS NULL
        AND tb."bundle_code" = b."bundle_code"
    `),
  );

  await db.execute(
    sql.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'tracking_bundles_source_bundle_id_unique'
        ) THEN
          ALTER TABLE "tracking_bundles"
          ADD CONSTRAINT "tracking_bundles_source_bundle_id_unique" UNIQUE ("source_bundle_id");
        END IF;
      END $$;
    `),
  );

  await db.execute(
    sql.raw(`
      ALTER TABLE "tracking_bundle_items"
      ALTER COLUMN "order_id" DROP NOT NULL
    `),
  );

  await db.execute(
    sql.raw(`
      ALTER TABLE "tracking_bundle_items"
      ADD COLUMN IF NOT EXISTS "order_item_id" integer REFERENCES "order_items"("id")
    `),
  );

  await db.execute(
    sql.raw(`
      ALTER TABLE "tracking_bundle_items"
      DROP CONSTRAINT IF EXISTS "tracking_bundle_items_order_id_key"
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS "kilo_bills" (
        "id" serial PRIMARY KEY,
        "tracking_bundle_id" integer NOT NULL REFERENCES "tracking_bundles"("id") ON DELETE CASCADE,
        "order_id" integer NOT NULL REFERENCES "orders"("id"),
        "total_kg" decimal(10, 2) NOT NULL,
        "price_per_kg" decimal(10, 2) NOT NULL,
        "amount" decimal(10, 2) NOT NULL,
        "notes" text,
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "created_at" timestamp NOT NULL,
        "updated_at" timestamp,
        "created_by" integer REFERENCES "users"("id"),
        "updated_by" integer REFERENCES "users"("id"),
        UNIQUE ("tracking_bundle_id", "order_id")
      )
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS "delivery_plans" (
        "id" serial PRIMARY KEY,
        "code" varchar(50) UNIQUE NOT NULL,
        "label" varchar(255) NOT NULL,
        "lead_time" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "fee" integer NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "created_by" integer NOT NULL REFERENCES "users"("id"),
        "updated_by" integer NOT NULL REFERENCES "users"("id")
      )
    `),
  );

  await db.execute(
    sql.raw(`
      WITH actor AS (
        SELECT "id" FROM "users" ORDER BY "id" LIMIT 1
      )
      INSERT INTO "delivery_plans" (
        "code",
        "label",
        "lead_time",
        "description",
        "fee",
        "is_active",
        "sort_order",
        "created_by",
        "updated_by"
      )
      SELECT
        seed."code",
        seed."label",
        seed."lead_time",
        seed."description",
        seed."fee",
        true,
        seed."sort_order",
        actor."id",
        actor."id"
      FROM (
        VALUES
          (
            'standard',
            'Standard Delivery',
            '2-3 business days',
            'Best value option for regular delivery.',
            2000,
            1
          ),
          (
            'fast',
            'Fast Delivery',
            '24-48 hours',
            'Faster handling for customers who need the order sooner.',
            3500,
            2
          ),
          (
            'express',
            'Express Delivery',
            'Same day or next day',
            'Priority delivery, subject to location and order time.',
            5000,
            3
          )
      ) AS seed("code", "label", "lead_time", "description", "fee", "sort_order")
      CROSS JOIN actor
      ON CONFLICT ("code") DO NOTHING
    `),
  );

  await db.execute(
    sql.raw(`
      INSERT INTO "entities" ("name", "description")
      SELECT 'delivery_plans', 'Delivery Plans'
      WHERE NOT EXISTS (
        SELECT 1 FROM "entities" WHERE "name" = 'delivery_plans'
      )
    `),
  );

  await db.execute(
    sql.raw(`
      INSERT INTO "permissions" ("role_id", "entity_id", "operation_id")
      SELECT
        roles."id",
        entities."id",
        operations."id"
      FROM "roles" AS roles
      CROSS JOIN "entities" AS entities
      CROSS JOIN "operations" AS operations
      WHERE roles."name" = 'manager'
        AND entities."name" = 'delivery_plans'
        AND lower(operations."name") IN ('create', 'read', 'update')
        AND NOT EXISTS (
          SELECT 1
          FROM "permissions" AS existing
          WHERE existing."role_id" = roles."id"
            AND existing."entity_id" = entities."id"
            AND existing."operation_id" = operations."id"
        )
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS "warehouse_tickets" (
        "id" serial PRIMARY KEY,
        "ticket_code" varchar(64) UNIQUE NOT NULL,
        "warehouse_id" integer NOT NULL REFERENCES "warehouses"("id"),
        "reason" text NOT NULL,
        "status" varchar(32) NOT NULL,
        "paused_from_status" varchar(32),
        "status_comment" text,
        "requester_id" integer NOT NULL REFERENCES "users"("id"),
        "approver_id" integer REFERENCES "users"("id"),
        "warehouse_tech_id" integer REFERENCES "users"("id"),
        "approved_at" timestamp,
        "paused_at" timestamp,
        "rejected_at" timestamp,
        "confirmed_at" timestamp,
        "completed_at" timestamp,
        "total_quantity" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "created_by" integer NOT NULL REFERENCES "users"("id"),
        "updated_by" integer NOT NULL REFERENCES "users"("id")
      )
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS "warehouse_ticket_items" (
        "id" serial PRIMARY KEY,
        "ticket_id" integer NOT NULL REFERENCES "warehouse_tickets"("id") ON DELETE CASCADE,
        "entry_id" integer REFERENCES "entries"("id"),
        "product_label" varchar(255) NOT NULL,
        "sku" varchar(128),
        "quantity" integer NOT NULL,
        "transferred_quantity" integer NOT NULL DEFAULT 0,
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS "warehouse_ticket_events" (
        "id" serial PRIMARY KEY,
        "ticket_id" integer NOT NULL REFERENCES "warehouse_tickets"("id") ON DELETE CASCADE,
        "actor_id" integer NOT NULL REFERENCES "users"("id"),
        "action" varchar(32) NOT NULL,
        "comment" text,
        "previous_status" varchar(32),
        "new_status" varchar(32),
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE INDEX IF NOT EXISTS "warehouse_tickets_status_idx"
        ON "warehouse_tickets" ("status")
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE INDEX IF NOT EXISTS "warehouse_tickets_requester_idx"
        ON "warehouse_tickets" ("requester_id")
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE INDEX IF NOT EXISTS "warehouse_tickets_warehouse_idx"
        ON "warehouse_tickets" ("warehouse_id")
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS "warehouse_ticket_settings" (
        "id" serial PRIMARY KEY,
        "max_line_items" integer NOT NULL DEFAULT 20,
        "max_total_quantity" integer NOT NULL DEFAULT 50,
        "max_open_tickets_per_user" integer NOT NULL DEFAULT 5,
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "updated_by" integer REFERENCES "users"("id")
      )
    `),
  );

  await db.execute(
    sql.raw(`
      INSERT INTO "warehouse_ticket_settings" (
        "max_line_items",
        "max_total_quantity",
        "max_open_tickets_per_user"
      )
      SELECT 20, 50, 5
      WHERE NOT EXISTS (
        SELECT 1 FROM "warehouse_ticket_settings"
      )
    `),
  );

  await ensureAclRolesAndEntities();
}

async function ensureAclRolesAndEntities() {
  const newEntities = Object.entries(ENTITY_DESCRIPTIONS);

  for (const [name, description] of newEntities) {
    await db.execute(
      sql.raw(`
        INSERT INTO "entities" ("name", "description")
        SELECT '${name}', '${description}'
        WHERE NOT EXISTS (
          SELECT 1 FROM "entities" WHERE "name" = '${name}'
        )
      `),
    );
  }

  const newRoles = [
    RoleType.SUPER_ADMIN,
    RoleType.ADMIN,
    RoleType.MANAGER,
    RoleType.AUDITOR,
    RoleType.W1_TECH,
    RoleType.W2_TECH,
    RoleType.CUSTOMER_SERVICE,
    RoleType.WAREHOUSE_SUPERVISOR,
    RoleType.DIGITAL_MARKETER,
  ].map((role) => [role, ROLE_DESCRIPTIONS[role]]);

  for (const [name, description] of newRoles) {
    await db.execute(
      sql.raw(`
        WITH actor AS (
          SELECT "id" FROM "users" ORDER BY "id" LIMIT 1
        )
        INSERT INTO "roles" ("name", "description", "created_by", "updated_by")
        SELECT '${name}', '${description}', actor."id", actor."id"
        FROM actor
        WHERE NOT EXISTS (
          SELECT 1 FROM "roles" WHERE "name" = '${name}'
        )
      `),
    );
  }

  await db.execute(
    sql.raw(`
      INSERT INTO "permissions" ("role_id", "entity_id", "operation_id")
      SELECT roles."id", entities."id", operations."id"
      FROM "roles" AS roles
      CROSS JOIN "entities" AS entities
      CROSS JOIN "operations" AS operations
      WHERE roles."name" = 'admin'
        AND entities."name" NOT IN (
          'settings', 'payment_methods', 'suppliers', 'entities', 'operations',
          'roles', 'users', 'employees'
        )
        AND lower(operations."name") IN ('create', 'read', 'update', 'delete')
        AND NOT EXISTS (
          SELECT 1 FROM "permissions" AS existing
          WHERE existing."role_id" = roles."id"
            AND existing."entity_id" = entities."id"
            AND existing."operation_id" = operations."id"
        )
    `),
  );

  await db.execute(
    sql.raw(`
      INSERT INTO "permissions" ("role_id", "entity_id", "operation_id")
      SELECT roles."id", entities."id", operations."id"
      FROM "roles" AS roles
      CROSS JOIN "entities" AS entities
      CROSS JOIN "operations" AS operations
      WHERE roles."name" = 'auditor'
        AND entities."name" IN (
          'stores', 'orders', 'customers', 'retailers', 'discounts', 'faqs',
          'filters', 'banners', 'categories', 'reviews', 'products', 'variants',
          'new_arrivals', 'attributes', 'colors', 'sizes', 'tags', 'promotions',
          'warehouse_1', 'warehouse_2', 'entries', 'warehouse_transfers'
        )
        AND lower(operations."name") = 'read'
        AND NOT EXISTS (
          SELECT 1 FROM "permissions" AS existing
          WHERE existing."role_id" = roles."id"
            AND existing."entity_id" = entities."id"
            AND existing."operation_id" = operations."id"
        )
    `),
  );

  await db.execute(
    sql.raw(`
      INSERT INTO "permissions" ("role_id", "entity_id", "operation_id")
      SELECT roles."id", entities."id", operations."id"
      FROM "roles" AS roles
      CROSS JOIN "entities" AS entities
      CROSS JOIN "operations" AS operations
      WHERE roles."name" = 'w1_tech'
        AND entities."name" IN (
          'stores', 'orders', 'customers', 'retailers', 'discounts', 'faqs',
          'filters', 'banners', 'categories', 'reviews', 'products', 'variants',
          'new_arrivals', 'attributes', 'colors', 'sizes', 'tags', 'promotions',
          'warehouse_1', 'entries', 'warehouse_transfers', 'shipping_labels'
        )
        AND lower(operations."name") IN ('create', 'read', 'update', 'delete')
        AND NOT EXISTS (
          SELECT 1 FROM "permissions" AS existing
          WHERE existing."role_id" = roles."id"
            AND existing."entity_id" = entities."id"
            AND existing."operation_id" = operations."id"
        )
    `),
  );

  await db.execute(
    sql.raw(`
      INSERT INTO "permissions" ("role_id", "entity_id", "operation_id")
      SELECT roles."id", entities."id", operations."id"
      FROM "roles" AS roles
      CROSS JOIN "entities" AS entities
      CROSS JOIN "operations" AS operations
      WHERE roles."name" = 'w2_tech'
        AND entities."name" IN (
          'stores', 'orders', 'customers', 'retailers', 'discounts', 'faqs',
          'filters', 'banners', 'categories', 'reviews', 'products', 'variants',
          'new_arrivals', 'attributes', 'colors', 'sizes', 'tags', 'promotions',
          'warehouse_2', 'entries', 'warehouse_transfers'
        )
        AND lower(operations."name") IN ('create', 'read', 'update', 'delete')
        AND NOT EXISTS (
          SELECT 1 FROM "permissions" AS existing
          WHERE existing."role_id" = roles."id"
            AND existing."entity_id" = entities."id"
            AND existing."operation_id" = operations."id"
        )
    `),
  );

  await db.execute(
    sql.raw(`
      INSERT INTO "permissions" ("role_id", "entity_id", "operation_id")
      SELECT roles."id", entities."id", operations."id"
      FROM "roles" AS roles
      CROSS JOIN "entities" AS entities
      CROSS JOIN "operations" AS operations
      WHERE roles."name" = 'customer_service'
        AND entities."name" IN ('chat', 'testimonials', 'about_us', 'notifications', 'tracking', 'orders')
        AND lower(operations."name") IN ('create', 'read', 'update', 'delete')
        AND NOT EXISTS (
          SELECT 1 FROM "permissions" AS existing
          WHERE existing."role_id" = roles."id"
            AND existing."entity_id" = entities."id"
            AND existing."operation_id" = operations."id"
        )
    `),
  );

  await db.execute(
    sql.raw(`
      INSERT INTO "permissions" ("role_id", "entity_id", "operation_id")
      SELECT roles."id", entities."id", operations."id"
      FROM "roles" AS roles
      CROSS JOIN "entities" AS entities
      CROSS JOIN "operations" AS operations
      WHERE roles."name" = 'warehouse_supervisor'
        AND entities."name" IN (
          'stores', 'orders', 'customers', 'retailers', 'discounts', 'faqs',
          'filters', 'banners', 'categories', 'reviews', 'products', 'variants',
          'new_arrivals', 'attributes', 'colors', 'sizes', 'tags', 'promotions',
          'warehouse_1', 'warehouse_2', 'entries', 'warehouse_transfers',
          'ewms_management', 'warehouses', 'shipping_labels', 'delivery_plans'
        )
        AND lower(operations."name") IN ('create', 'read', 'update', 'delete')
        AND NOT EXISTS (
          SELECT 1 FROM "permissions" AS existing
          WHERE existing."role_id" = roles."id"
            AND existing."entity_id" = entities."id"
            AND existing."operation_id" = operations."id"
        )
    `),
  );

  await db.execute(
    sql.raw(`
      INSERT INTO "permissions" ("role_id", "entity_id", "operation_id")
      SELECT roles."id", entities."id", operations."id"
      FROM "roles" AS roles
      CROSS JOIN "entities" AS entities
      CROSS JOIN "operations" AS operations
      WHERE roles."name" = 'digital_marketer'
        AND entities."name" IN (
          'stores', 'orders', 'customers', 'retailers', 'discounts', 'faqs',
          'filters', 'banners', 'categories', 'reviews', 'products', 'variants',
          'new_arrivals', 'attributes', 'colors', 'sizes', 'tags', 'promotions'
        )
        AND lower(operations."name") IN ('create', 'read', 'update', 'delete')
        AND NOT EXISTS (
          SELECT 1 FROM "permissions" AS existing
          WHERE existing."role_id" = roles."id"
            AND existing."entity_id" = entities."id"
            AND existing."operation_id" = operations."id"
        )
    `),
  );

  await ensurePredefinedRolePermissions();

  await db.execute(
    sql.raw(`
      ALTER TABLE "user_notification_deliveries"
        ADD COLUMN IF NOT EXISTS "action_url" varchar(1024),
        ADD COLUMN IF NOT EXISTS "reference_type" varchar(64),
        ADD COLUMN IF NOT EXISTS "reference_id" integer,
        ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "deactivated_at" timestamp
    `),
  );

  await db.execute(
    sql.raw(`
      ALTER TABLE "warehouse_ticket_items"
        ADD COLUMN IF NOT EXISTS "returned_quantity" integer NOT NULL DEFAULT 0
    `),
  );

  await db.execute(
    sql.raw(`
      ALTER TABLE "warehouse_tickets"
        ADD COLUMN IF NOT EXISTS "borrow_due_at" timestamp
    `),
  );

  await db.execute(
    sql.raw(`
      ALTER TABLE "warehouse_ticket_settings"
        ADD COLUMN IF NOT EXISTS "return_reminder_days" integer NOT NULL DEFAULT 7
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS "delivery_fee_rules" (
        "id" serial PRIMARY KEY,
        "delivery_plan_id" integer NOT NULL REFERENCES "delivery_plans"("id") ON DELETE CASCADE,
        "min_distance_km" numeric(10, 2) NOT NULL DEFAULT 0,
        "max_distance_km" numeric(10, 2),
        "min_weight_kg" numeric(10, 2) NOT NULL DEFAULT 0,
        "max_weight_kg" numeric(10, 2),
        "max_length_cm" integer,
        "max_width_cm" integer,
        "max_height_cm" integer,
        "fee" integer NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `),
  );

  await db.execute(
    sql.raw(`
      ALTER TABLE "user_notification_deliveries"
        ADD COLUMN IF NOT EXISTS "audience" varchar(20) NOT NULL DEFAULT 'customer'
    `),
  );

  await db.execute(
    sql.raw(`
      UPDATE "user_notification_deliveries"
      SET "audience" = 'staff'
      WHERE "reference_type" IS NOT NULL
        AND "reference_type" != 'customer_groupage'
    `),
  );

  await db.execute(
    sql.raw(`
      UPDATE "user_notification_deliveries"
      SET "audience" = 'staff'
      WHERE "action_url" LIKE '/warehouse%'
         OR "action_url" LIKE '/warehouse-tickets%'
         OR "action_url" LIKE '/ongoing-groups%'
    `),
  );
}

async function ensurePredefinedRolePermissions() {
  const [roleRows, entityRows, operationRows] = await Promise.all([
    db.select({ id: roles.id, name: roles.name }).from(roles),
    db.select({ id: entities.id, name: entities.name }).from(entities),
    db.select({ id: operations.id, name: operations.name }).from(operations),
  ]);
  const roleIds = new Map(roleRows.map((role) => [role.name.toLowerCase(), role.id]));
  const entityIds = new Map(entityRows.map((entity) => [entity.name, entity.id]));
  const operationIds = new Map(
    operationRows.map((operation) => [operation.name.toLowerCase(), operation.id]),
  );
  const predefinedRoles = [
    RoleType.SUPER_ADMIN,
    RoleType.ADMIN,
    RoleType.MANAGER,
    RoleType.AUDITOR,
    RoleType.W1_TECH,
    RoleType.W2_TECH,
    RoleType.CUSTOMER_SERVICE,
    RoleType.WAREHOUSE_SUPERVISOR,
    RoleType.DIGITAL_MARKETER,
  ];
  const predefinedRoleIds = predefinedRoles
    .map((roleName) => roleIds.get(roleName))
    .filter((roleId): roleId is number => Boolean(roleId));

  // Predefined roles are managed templates. Remove legacy or manually-added
  // grants before inserting the current template so revoked access cannot
  // survive an application upgrade.
  if (predefinedRoleIds.length > 0) {
    await db
      .delete(permissions)
      .where(inArray(permissions.roleId, predefinedRoleIds));
  }

  const rows = predefinedRoles.flatMap((roleName) => {
    const roleId = roleIds.get(roleName);
    if (!roleId) {
      return [];
    }

    return getRolePermissionTemplate(roleName).flatMap((permissionKey) => {
      const [entityName, operationName] = permissionKey.split(":");
      const entityId = entityIds.get(entityName);
      const operationId = operationIds.get(operationName.toLowerCase());
      return entityId && operationId ? [{ roleId, entityId, operationId }] : [];
    });
  });

  for (let index = 0; index < rows.length; index += 100) {
    await db
      .insert(permissions)
      .values(rows.slice(index, index + 100))
      .onConflictDoNothing();
  }
}
