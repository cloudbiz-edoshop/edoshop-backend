ALTER TABLE "colors"
ADD COLUMN IF NOT EXISTS "is_predefined" boolean NOT NULL DEFAULT false;

ALTER TABLE "sizes"
ADD COLUMN IF NOT EXISTS "is_predefined" boolean NOT NULL DEFAULT false;
