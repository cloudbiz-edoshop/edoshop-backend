INSERT INTO "package_statuses" ("name", "description", "created_by", "updated_by")
SELECT 'Grouped', 'Package is part of a group package (GPKG).', 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM "package_statuses" WHERE "name" = 'Grouped'
);

CREATE TABLE IF NOT EXISTS "group_packages" (
  "id" serial PRIMARY KEY NOT NULL,
  "group_package_code" varchar(64) NOT NULL,
  "warehouse_id" integer NOT NULL REFERENCES "warehouses"("id"),
  "destination_area" varchar(255) NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'Active',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "created_by" integer NOT NULL REFERENCES "users"("id"),
  "updated_by" integer NOT NULL REFERENCES "users"("id"),
  CONSTRAINT "group_packages_group_package_code_unique" UNIQUE("group_package_code")
);

CREATE TABLE IF NOT EXISTS "group_package_members" (
  "id" serial PRIMARY KEY NOT NULL,
  "group_package_id" integer NOT NULL REFERENCES "group_packages"("id") ON DELETE CASCADE,
  "package_id" integer REFERENCES "packages"("id"),
  "child_group_package_id" integer REFERENCES "group_packages"("id"),
  "added_at" timestamp DEFAULT now() NOT NULL,
  "added_by" integer NOT NULL REFERENCES "users"("id"),
  "removed_at" timestamp,
  "removed_by" integer REFERENCES "users"("id"),
  CONSTRAINT "group_package_members_one_target_chk" CHECK (
    ("package_id" IS NOT NULL AND "child_group_package_id" IS NULL)
    OR ("package_id" IS NULL AND "child_group_package_id" IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS "group_package_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "group_package_id" integer NOT NULL REFERENCES "group_packages"("id") ON DELETE CASCADE,
  "action" varchar(64) NOT NULL,
  "details" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by" integer NOT NULL REFERENCES "users"("id")
);

CREATE INDEX IF NOT EXISTS "group_packages_warehouse_idx"
  ON "group_packages" ("warehouse_id");

CREATE INDEX IF NOT EXISTS "group_packages_status_idx"
  ON "group_packages" ("status");

CREATE INDEX IF NOT EXISTS "group_package_members_group_idx"
  ON "group_package_members" ("group_package_id");

CREATE INDEX IF NOT EXISTS "group_package_members_package_idx"
  ON "group_package_members" ("package_id");

CREATE INDEX IF NOT EXISTS "group_package_members_child_group_idx"
  ON "group_package_members" ("child_group_package_id");

CREATE UNIQUE INDEX IF NOT EXISTS "group_package_members_active_package_uidx"
  ON "group_package_members" ("package_id")
  WHERE "removed_at" IS NULL AND "package_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "group_package_members_active_child_group_uidx"
  ON "group_package_members" ("child_group_package_id")
  WHERE "removed_at" IS NULL AND "child_group_package_id" IS NOT NULL;
