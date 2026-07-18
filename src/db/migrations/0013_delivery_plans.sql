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
);

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
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "entities" ("name", "description")
SELECT 'delivery_plans', 'Delivery Plans'
WHERE NOT EXISTS (
  SELECT 1 FROM "entities" WHERE "name" = 'delivery_plans'
);

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
  );
