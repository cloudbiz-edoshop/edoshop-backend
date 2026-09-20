CREATE TABLE IF NOT EXISTS "package_packaging_videos" (
  "id" serial PRIMARY KEY,
  "package_id" integer NOT NULL REFERENCES "packages"("id") ON DELETE CASCADE,
  "video_url" varchar(1024) NOT NULL,
  "duration_seconds" integer,
  "recorded_by" integer REFERENCES "users"("id"),
  "recorded_at" timestamp NOT NULL DEFAULT now(),
  "customer_confirmed_at" timestamp,
  "customer_dispute_message" text,
  "customer_responded_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "package_packaging_videos_package_id_unique" UNIQUE("package_id")
);

CREATE INDEX IF NOT EXISTS "package_packaging_videos_package_id_idx"
  ON "package_packaging_videos" ("package_id");

WITH actor AS (
  SELECT "id" FROM "users" ORDER BY "id" LIMIT 1
)
INSERT INTO "notification_types" ("id", "name", "description", "createdBy", "updatedBy")
SELECT 15, 'packaging_video_ready', 'Packaging video ready for customer review', actor."id", actor."id"
FROM actor
WHERE NOT EXISTS (
  SELECT 1 FROM "notification_types" WHERE "id" = 15
);
