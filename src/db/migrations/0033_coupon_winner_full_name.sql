ALTER TABLE "coupon_winners"
  ADD COLUMN IF NOT EXISTS "full_name" varchar(255);

UPDATE "coupon_winners" AS cw
SET "full_name" = u."full_name"
FROM "users" AS u
WHERE cw."user_id" = u."id"
  AND (cw."full_name" IS NULL OR cw."full_name" = '');

ALTER TABLE "coupon_winners"
  ALTER COLUMN "full_name" SET NOT NULL;
