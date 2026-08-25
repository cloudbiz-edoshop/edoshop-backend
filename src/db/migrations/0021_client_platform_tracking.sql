ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "client_platform" varchar(20);

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "registration_platform" varchar(20);
