CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
  "id" serial PRIMARY KEY,
  "coupon_id" integer NOT NULL REFERENCES "coupons"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "order_id" integer REFERENCES "orders"("id") ON DELETE SET NULL,
  "redeemed_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "coupon_redemptions_coupon_user_unique"
  ON "coupon_redemptions" ("coupon_id", "user_id");

INSERT INTO "coupon_redemptions" ("coupon_id", "user_id", "order_id", "redeemed_at")
SELECT o."coupon_id", o."created_by", o."id", COALESCE(o."created_at", now())
FROM "orders" AS o
WHERE o."coupon_id" IS NOT NULL
  AND o."created_by" IS NOT NULL
  AND COALESCE(o."is_deleted", false) = false
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS "coupon_winners" (
  "id" serial PRIMARY KEY,
  "coupon_id" integer NOT NULL REFERENCES "coupons"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "phone_number" varchar(32) NOT NULL,
  "full_name" varchar(255) NOT NULL DEFAULT '',
  "redeemed_at" timestamp,
  "order_id" integer REFERENCES "orders"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "coupon_winners_coupon_user_unique"
  ON "coupon_winners" ("coupon_id", "user_id");
