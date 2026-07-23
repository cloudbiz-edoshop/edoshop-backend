INSERT INTO "entities" ("name", "description")
SELECT 'ticket_approver', 'Tickets Approver'
WHERE NOT EXISTS (
  SELECT 1 FROM "entities" WHERE "name" = 'ticket_approver'
);

INSERT INTO "entities" ("name", "description")
SELECT 'ticket_borrow_limits', 'Limit Borrowed Products'
WHERE NOT EXISTS (
  SELECT 1 FROM "entities" WHERE "name" = 'ticket_borrow_limits'
);

CREATE TABLE IF NOT EXISTS "warehouse_ticket_settings" (
  "id" serial PRIMARY KEY,
  "max_line_items" integer NOT NULL DEFAULT 20,
  "max_total_quantity" integer NOT NULL DEFAULT 50,
  "max_open_tickets_per_user" integer NOT NULL DEFAULT 5,
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "updated_by" integer REFERENCES "users"("id")
);

INSERT INTO "warehouse_ticket_settings" (
  "max_line_items",
  "max_total_quantity",
  "max_open_tickets_per_user"
)
SELECT 20, 50, 5
WHERE NOT EXISTS (
  SELECT 1 FROM "warehouse_ticket_settings"
);

INSERT INTO "permissions" ("role_id", "entity_id", "operation_id")
SELECT
  roles."id",
  entities."id",
  operations."id"
FROM "roles" AS roles
CROSS JOIN "entities" AS entities
CROSS JOIN "operations" AS operations
WHERE entities."name" = 'ticket_approver'
  AND lower(operations."name") = 'read'
  AND roles."name" IN ('super_admin', 'admin', 'warehouse_supervisor', 'manager')
  AND NOT EXISTS (
    SELECT 1
    FROM "permissions" AS existing
    WHERE existing."role_id" = roles."id"
      AND existing."entity_id" = entities."id"
      AND existing."operation_id" = operations."id"
  );

INSERT INTO "permissions" ("role_id", "entity_id", "operation_id")
SELECT
  roles."id",
  entities."id",
  operations."id"
FROM "roles" AS roles
CROSS JOIN "entities" AS entities
CROSS JOIN "operations" AS operations
WHERE entities."name" = 'ticket_borrow_limits'
  AND lower(operations."name") = 'update'
  AND roles."name" IN ('super_admin', 'admin')
  AND NOT EXISTS (
    SELECT 1
    FROM "permissions" AS existing
    WHERE existing."role_id" = roles."id"
      AND existing."entity_id" = entities."id"
      AND existing."operation_id" = operations."id"
  );
