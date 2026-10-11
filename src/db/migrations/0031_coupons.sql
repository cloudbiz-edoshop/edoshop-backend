CREATE TABLE IF NOT EXISTS "coupons" (
  "id" serial PRIMARY KEY,
  "code" varchar(64) NOT NULL UNIQUE,
  "discount_id" integer NOT NULL REFERENCES "discounts"("id") ON DELETE RESTRICT,
  "usage_limit" integer,
  "usage_count" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "expires_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp,
  "created_by" integer REFERENCES "users"("id"),
  "updated_by" integer REFERENCES "users"("id")
);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coupon_id" integer REFERENCES "coupons"("id");
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coupon_code" varchar(64);
