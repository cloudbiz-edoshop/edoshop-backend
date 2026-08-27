ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "section" varchar(64);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_section_idx" ON "products" ("section");
