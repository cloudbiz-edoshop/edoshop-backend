CREATE TABLE IF NOT EXISTS "tv_settings" (
  "id" serial PRIMARY KEY,
  "magazine_version" integer NOT NULL DEFAULT 1,
  "invitation_title" varchar(255) NOT NULL DEFAULT 'Download the EDOSHOP App',
  "ios_url" varchar(512),
  "android_url" varchar(512),
  "fallback_url" varchar(512),
  "qr_target_url" varchar(512),
  "catalog_mode" varchar(32) NOT NULL DEFAULT 'all',
  "include_banners" boolean NOT NULL DEFAULT true,
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "updated_by" integer REFERENCES "users"("id")
);

INSERT INTO "tv_settings" ("magazine_version", "catalog_mode", "include_banners")
SELECT 1, 'all', true
WHERE NOT EXISTS (SELECT 1 FROM "tv_settings");

CREATE TABLE IF NOT EXISTS "tv_ads" (
  "id" serial PRIMARY KEY,
  "title" varchar(255) NOT NULL,
  "subtitle" text,
  "media_type" varchar(16) NOT NULL DEFAULT 'image',
  "media_url" varchar(512) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "display_order" integer NOT NULL DEFAULT 0,
  "display_duration_ms" integer NOT NULL DEFAULT 8000,
  "is_permanent" boolean NOT NULL DEFAULT false,
  "starts_at" timestamp,
  "ends_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" integer NOT NULL REFERENCES "users"("id"),
  "updated_by" integer NOT NULL REFERENCES "users"("id"),
  "is_deleted" boolean NOT NULL DEFAULT false,
  "deleted_at" timestamp,
  "deleted_by" integer REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "tv_devices" (
  "id" serial PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "device_key" varchar(128) NOT NULL UNIQUE,
  "secret_hash" varchar(255) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "last_seen_at" timestamp,
  "registered_at" timestamp NOT NULL DEFAULT now(),
  "revoked_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" integer NOT NULL REFERENCES "users"("id"),
  "updated_by" integer NOT NULL REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "tv_device_refresh_tokens" (
  "id" serial PRIMARY KEY,
  "device_id" integer NOT NULL REFERENCES "tv_devices"("id") ON DELETE CASCADE,
  "token_hash" varchar(255) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tv_catalog_selections" (
  "id" serial PRIMARY KEY,
  "product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "display_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" integer NOT NULL REFERENCES "users"("id"),
  "updated_by" integer NOT NULL REFERENCES "users"("id"),
  CONSTRAINT "tv_catalog_selections_product_unique" UNIQUE ("product_id")
);

CREATE INDEX IF NOT EXISTS "tv_ads_active_idx" ON "tv_ads" ("is_active", "display_order");
CREATE INDEX IF NOT EXISTS "tv_devices_device_key_idx" ON "tv_devices" ("device_key");
CREATE INDEX IF NOT EXISTS "tv_device_refresh_tokens_device_idx" ON "tv_device_refresh_tokens" ("device_id");

INSERT INTO "entities" ("name", "description")
SELECT 'tv_app', 'TV App'
WHERE NOT EXISTS (SELECT 1 FROM "entities" WHERE "name" = 'tv_app');

INSERT INTO "entities" ("name", "description")
SELECT 'tv_ads', 'TV Ads'
WHERE NOT EXISTS (SELECT 1 FROM "entities" WHERE "name" = 'tv_ads');

INSERT INTO "entities" ("name", "description")
SELECT 'tv_devices', 'TV Devices'
WHERE NOT EXISTS (SELECT 1 FROM "entities" WHERE "name" = 'tv_devices');

INSERT INTO "entities" ("name", "description")
SELECT 'tv_settings', 'TV Settings'
WHERE NOT EXISTS (SELECT 1 FROM "entities" WHERE "name" = 'tv_settings');

INSERT INTO "entities" ("name", "description")
SELECT 'tv_catalog', 'TV Catalog'
WHERE NOT EXISTS (SELECT 1 FROM "entities" WHERE "name" = 'tv_catalog');

INSERT INTO "permissions" ("role_id", "entity_id", "operation_id")
SELECT roles."id", entities."id", operations."id"
FROM "roles" AS roles
CROSS JOIN "entities" AS entities
CROSS JOIN "operations" AS operations
WHERE entities."name" IN ('tv_app', 'tv_ads', 'tv_devices', 'tv_settings', 'tv_catalog')
  AND lower(operations."name") IN ('create', 'read', 'update', 'delete')
  AND roles."name" IN ('super_admin', 'admin', 'manager', 'digital_marketer')
  AND NOT EXISTS (
    SELECT 1 FROM "permissions" AS existing
    WHERE existing."role_id" = roles."id"
      AND existing."entity_id" = entities."id"
      AND existing."operation_id" = operations."id"
  );
