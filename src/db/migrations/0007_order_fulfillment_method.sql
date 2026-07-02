ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "fulfillment_method" varchar(20) DEFAULT 'delivery' NOT NULL;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "pickup_warehouse_id" integer REFERENCES "warehouses"("id");
