ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "home_area" varchar(128);

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "home_town" varchar(128);

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "home_country" varchar(128);
