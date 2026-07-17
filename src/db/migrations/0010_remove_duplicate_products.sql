-- Soft-delete duplicate placeholder catalog products.
UPDATE "products"
SET
  "is_deleted" = true,
  "deleted_at" = NOW(),
  "updated_by" = 1
WHERE "id" IN (
  SELECT dop."product_id"
  FROM "direct_order_products" dop
  WHERE dop."direct_order_code" = 'DO_PK_A01_B1_P3'
)
OR "id" IN (
  SELECT dsp."product_id"
  FROM "dropshipping_products" dsp
  WHERE dsp."dropshipping_code" = 'DS_PK_A01_MEN_P2'
);
