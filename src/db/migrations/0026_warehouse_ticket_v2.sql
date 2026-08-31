-- Warehouse ticket v2: preparation, takeout, pending returns, extended statuses

ALTER TABLE warehouse_ticket_items
  ADD COLUMN IF NOT EXISTS prepared_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shortage_reason text,
  ADD COLUMN IF NOT EXISTS pending_return_quantity integer NOT NULL DEFAULT 0;

ALTER TABLE warehouse_tickets
  ADD COLUMN IF NOT EXISTS prepared_at timestamp,
  ADD COLUMN IF NOT EXISTS prepared_by_id integer REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS released_at timestamp,
  ADD COLUMN IF NOT EXISTS closed_at timestamp;

-- Migrate legacy completed tickets to received_borrowed
UPDATE warehouse_tickets
SET status = 'received_borrowed'
WHERE status = 'completed';

-- Backfill prepared qty from issued/received for existing rows
UPDATE warehouse_ticket_items
SET prepared_quantity = transferred_quantity
WHERE prepared_quantity = 0
  AND transferred_quantity > 0;
