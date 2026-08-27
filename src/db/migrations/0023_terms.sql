CREATE TABLE IF NOT EXISTS "terms" (
  "id" serial PRIMARY KEY NOT NULL,
  "language_code" varchar(5) NOT NULL,
  "title" varchar(255) NOT NULL,
  "effective_date" varchar(100) NOT NULL,
  "version" varchar(50) NOT NULL,
  "acceptance_label" text NOT NULL,
  "contact" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "created_by" integer NOT NULL,
  "updated_by" integer NOT NULL,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "deleted_at" timestamp,
  "deleted_by" integer
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "terms" ADD CONSTRAINT "terms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "terms" ADD CONSTRAINT "terms_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "terms" ADD CONSTRAINT "terms_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "terms_language_code_active_unique"
  ON "terms" ("language_code")
  WHERE "is_deleted" = false;
