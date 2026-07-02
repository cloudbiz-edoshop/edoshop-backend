CREATE TABLE IF NOT EXISTS "notification_recipients" (
  "id" serial PRIMARY KEY NOT NULL,
  "notification_id" integer NOT NULL REFERENCES "notifications"("id"),
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_notification_deliveries" (
  "id" serial PRIMARY KEY NOT NULL,
  "notification_id" integer REFERENCES "notifications"("id"),
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "title" varchar(255) NOT NULL,
  "message" varchar(255) NOT NULL,
  "category_key" varchar(100) NOT NULL,
  "channel" varchar(50) DEFAULT 'webapp' NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL,
  "read_at" timestamp,
  "sent_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_notification_deliveries_unique"
  ON "user_notification_deliveries" ("notification_id", "user_id", "channel");

CREATE TABLE IF NOT EXISTS "user_notification_preferences" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "preference_key" varchar(100) NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_notification_preferences_unique"
  ON "user_notification_preferences" ("user_id", "preference_key");
