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
);

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
);

CREATE TABLE IF NOT EXISTS "warehouse_ticket_events" (
  "id" serial PRIMARY KEY,
  "ticket_id" integer NOT NULL REFERENCES "warehouse_tickets"("id") ON DELETE CASCADE,
  "actor_id" integer NOT NULL REFERENCES "users"("id"),
  "action" varchar(32) NOT NULL,
  "comment" text,
  "previous_status" varchar(32),
  "new_status" varchar(32),
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "warehouse_tickets_status_idx"
  ON "warehouse_tickets" ("status");

CREATE INDEX IF NOT EXISTS "warehouse_tickets_requester_idx"
  ON "warehouse_tickets" ("requester_id");

CREATE INDEX IF NOT EXISTS "warehouse_tickets_warehouse_idx"
  ON "warehouse_tickets" ("warehouse_id");

INSERT INTO "entities" ("name", "description")
SELECT 'ticketing', 'Ticketing'
WHERE NOT EXISTS (
  SELECT 1 FROM "entities" WHERE "name" = 'ticketing'
);

INSERT INTO "permissions" ("role_id", "entity_id", "operation_id")
SELECT
  roles."id",
  entities."id",
  operations."id"
FROM "roles" AS roles
CROSS JOIN "entities" AS entities
CROSS JOIN "operations" AS operations
WHERE entities."name" = 'ticketing'
  AND lower(operations."name") IN ('create', 'read', 'update', 'delete')
  AND roles."name" IN (
    'super_admin',
    'admin',
    'manager',
    'warehouse_supervisor',
    'w1_tech',
    'w2_tech',
    'digital_marketer'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "permissions" AS existing
    WHERE existing."role_id" = roles."id"
      AND existing."entity_id" = entities."id"
      AND existing."operation_id" = operations."id"
  );
