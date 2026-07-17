ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "home_latitude" varchar(32);

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "home_longitude" varchar(32);
