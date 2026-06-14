import { sql } from "drizzle-orm";

import db from "@/db";

export async function ensureRuntimeMigrations() {
  await db.execute(
    sql.raw(
      `ALTER TABLE "faqs" ADD COLUMN IF NOT EXISTS "store_id" integer NOT NULL DEFAULT 2`,
    ),
  );

  await db.execute(
    sql.raw(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "image_urls" json DEFAULT '[]'::json`,
    ),
  );
}
