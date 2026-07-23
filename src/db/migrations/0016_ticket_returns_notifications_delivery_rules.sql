ALTER TABLE "user_notification_deliveries"
  ADD COLUMN IF NOT EXISTS "action_url" varchar(1024),
  ADD COLUMN IF NOT EXISTS "reference_type" varchar(64),
  ADD COLUMN IF NOT EXISTS "reference_id" integer,
  ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "deactivated_at" timestamp;

ALTER TABLE "warehouse_ticket_items"
  ADD COLUMN IF NOT EXISTS "returned_quantity" integer NOT NULL DEFAULT 0;

ALTER TABLE "warehouse_tickets"
  ADD COLUMN IF NOT EXISTS "borrow_due_at" timestamp;

ALTER TABLE "warehouse_ticket_settings"
  ADD COLUMN IF NOT EXISTS "return_reminder_days" integer NOT NULL DEFAULT 7;

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
);

INSERT INTO "delivery_fee_rules" (
  "delivery_plan_id",
  "min_distance_km",
  "max_distance_km",
  "min_weight_kg",
  "max_weight_kg",
  "max_length_cm",
  "max_width_cm",
  "max_height_cm",
  "fee",
  "sort_order"
)
SELECT
  plans."id",
  rules."min_distance_km",
  rules."max_distance_km",
  rules."min_weight_kg",
  rules."max_weight_kg",
  rules."max_length_cm",
  rules."max_width_cm",
  rules."max_height_cm",
  rules."fee",
  rules."sort_order"
FROM "delivery_plans" AS plans
CROSS JOIN (
  VALUES
    (0::numeric, 5::numeric, 0::numeric, 2::numeric, 30, 20, 15, 2000, 1),
    (0::numeric, 5::numeric, 2.01::numeric, 5::numeric, 50, 40, 30, 3500, 2),
    (5.01::numeric, 10::numeric, 0::numeric, 2::numeric, 30, 20, 15, 3000, 3),
    (5.01::numeric, 10::numeric, 2.01::numeric, 5::numeric, 50, 40, 30, 4500, 4)
) AS rules(
  "min_distance_km",
  "max_distance_km",
  "min_weight_kg",
  "max_weight_kg",
  "max_length_cm",
  "max_width_cm",
  "max_height_cm",
  "fee",
  "sort_order"
)
WHERE plans."code" = 'standard'
  AND NOT EXISTS (
    SELECT 1 FROM "delivery_fee_rules" AS existing
    WHERE existing."delivery_plan_id" = plans."id"
  );
