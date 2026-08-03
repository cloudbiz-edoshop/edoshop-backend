CREATE TABLE IF NOT EXISTS "admin_panel_access_logs" (
  "id" serial PRIMARY KEY,
  "user_id" integer REFERENCES "users"("id"),
  "login_identifier" varchar(255),
  "auth_method" varchar(64) NOT NULL,
  "ip_address" varchar(45),
  "user_agent" text,
  "success" boolean NOT NULL DEFAULT true,
  "failure_reason" varchar(255),
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "admin_panel_access_logs_user_id_idx"
  ON "admin_panel_access_logs" ("user_id");

CREATE INDEX IF NOT EXISTS "admin_panel_access_logs_created_at_idx"
  ON "admin_panel_access_logs" ("created_at" DESC);
