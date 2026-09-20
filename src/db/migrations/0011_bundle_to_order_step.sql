CREATE TABLE IF NOT EXISTS "tracking_steps" (
  "id" serial PRIMARY KEY,
  "step_order" integer NOT NULL,
  "code" varchar(100) UNIQUE NOT NULL,
  "label" varchar(255) NOT NULL,
  "leg" varchar(50) NOT NULL,
  "description" text
);

INSERT INTO "tracking_steps" ("step_order", "code", "label", "leg", "description")
VALUES
  (1, 'approval', 'Approval', 'manufacturer', 'Bundle orders are approved and ready to proceed.'),
  (2, 'payment_of_items', 'Payment Of Items (HT)', 'manufacturer', 'Payment for bundle items has been received.'),
  (3, 'order_received_by_manufacturer', 'Order Received By Manufacturer', 'manufacturer', 'Manufacturer has received the bundle order.'),
  (4, 'order_shipped_by_agent', 'Order Shipped By Agent', 'manufacturer', 'Agent has shipped the bundle order.'),
  (5, 'orders_arrived_at_local_customs', 'Orders Arrived At Local Custom', 'manufacturer', 'Bundle has arrived at local customs.'),
  (6, 'order_at_the_store', 'Order At The Store', 'manufacturer', 'Bundle goods are now at the Edoshop store.'),
  (7, 'payment_of_kilo', 'Payment Of Kilo', 'manufacturer', 'Kilo/shipping payment for the bundle has been received.'),
  (8, 'packaging', 'Packaging', 'store', 'Bundle orders are being packaged for delivery.'),
  (9, 'payment_for_deliveries', 'Payment For Deliveries', 'store', 'Delivery payment has been received.'),
  (10, 'deliveries', 'Deliveries', 'store', 'Bundle orders are out for delivery or collected.')
ON CONFLICT ("code") DO NOTHING;

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
