UPDATE "tracking_steps"
SET "step_order" = 11
WHERE "code" = 'deliveries';

UPDATE "tracking_steps"
SET "step_order" = 10
WHERE "code" = 'payment_for_deliveries';

UPDATE "tracking_steps"
SET "step_order" = 9
WHERE "code" = 'packaging';

UPDATE "tracking_steps"
SET "step_order" = 8
WHERE "code" = 'payment_of_kilo';

INSERT INTO "tracking_steps" ("step_order", "code", "label", "leg", "description")
VALUES (
  7,
  'bundle_to_order',
  'Bundle to Order',
  'manufacturer',
  'Bundle is unpacked and customer orders are sent to order tracking.'
)
ON CONFLICT ("code") DO UPDATE
SET
  "step_order" = EXCLUDED."step_order",
  "label" = EXCLUDED."label",
  "leg" = EXCLUDED."leg",
  "description" = EXCLUDED."description";
