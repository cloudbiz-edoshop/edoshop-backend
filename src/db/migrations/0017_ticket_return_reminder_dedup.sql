ALTER TABLE "warehouse_tickets"
  ADD COLUMN IF NOT EXISTS "last_return_reminder_at" timestamp;
