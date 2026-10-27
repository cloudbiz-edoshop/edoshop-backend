ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "product_types" text[] DEFAULT '{}';
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "payment_method_ids" integer[] DEFAULT '{}';
