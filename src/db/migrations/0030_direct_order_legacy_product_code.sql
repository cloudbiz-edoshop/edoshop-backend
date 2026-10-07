ALTER TABLE direct_order_products
  ADD COLUMN IF NOT EXISTS legacy_direct_order_code varchar(50);

CREATE INDEX IF NOT EXISTS direct_order_products_legacy_code_idx
  ON direct_order_products (legacy_direct_order_code);

-- Spreadsheet-era IDs remain searchable as legacy while primary ID moves to EWMS.
UPDATE direct_order_products dop
SET legacy_direct_order_code = dop.direct_order_code
WHERE dop.legacy_direct_order_code IS NULL
  AND dop.direct_order_code ~ '^DO-[A-Z]{2}-B[0-9]+-.+$';
