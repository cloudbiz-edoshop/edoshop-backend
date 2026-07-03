import fs from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";

import db from "@/db";
import { migrateConfig } from "@/db/migrate.config";

/** Detect whether a migration's effects are already present in the database. */
const MIGRATION_CHECKS: Record<string, string> = {
  "0000_graceful_stingray": `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'about-us'
    ) AS ok
  `,
  "0001_add_faq_store_id": `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'faqs' AND column_name = 'store_id'
    ) AS ok
  `,
  "0002_add_product_image_urls": `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'image_urls'
    ) AS ok
  `,
  "0003_add_direct_order_total_items": `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'direct_order_products'
        AND column_name = 'total_items'
    ) AS ok
  `,
  "0004_add_predefined_variant_options": `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'colors' AND column_name = 'is_predefined'
    ) AS ok
  `,
  "0005_scope_bin_location_codes_to_warehouse": `
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = 'bins_warehouse_location_code_unique'
    ) AS ok
  `,
  "0006_user_notification_system": `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user_notification_deliveries'
    ) AS ok
  `,
  "0007_order_fulfillment_method": `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'fulfillment_method'
    ) AS ok
  `,
};

type ExistsRow = { ok: boolean };

const readJournalTags = () => {
  const journalPath = path.join(migrateConfig.migrationsFolder, "meta/_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: Array<{ when: number; tag: string }>;
  };

  return new Map(journal.entries.map((entry) => [entry.when, entry.tag]));
};

const migrationTableExists = async () => {
  const rows = (await db.execute(sql.raw(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '__drizzle_migrations'
    ) AS ok
  `))) as ExistsRow[];

  return Boolean(rows[0]?.ok);
};

const readAppliedHashes = async () => {
  if (!(await migrationTableExists())) {
    return new Set<string>();
  }

  const rows = (await db.execute(sql.raw(`
    SELECT hash FROM "public"."__drizzle_migrations"
  `))) as Array<{ hash: string }>;

  return new Set(rows.map((row) => row.hash));
};

const schemaAlreadyExists = async () => {
  const rows = (await db.execute(sql.raw(MIGRATION_CHECKS["0000_graceful_stingray"]))) as ExistsRow[];
  return Boolean(rows[0]?.ok);
};

const migrationAlreadyApplied = async (tag: string) => {
  const checkSql = MIGRATION_CHECKS[tag];
  if (!checkSql) {
    return false;
  }

  const rows = (await db.execute(sql.raw(checkSql))) as ExistsRow[];
  return Boolean(rows[0]?.ok);
};

/**
 * Mark migrations as applied when the DB schema already exists but
 * __drizzle_migrations was never populated (common on first Dokploy deploy).
 */
export async function baselineAppliedMigrations() {
  if (!(await schemaAlreadyExists())) {
    return;
  }

  await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS "public"`));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS "public"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `));

  const appliedHashes = await readAppliedHashes();
  const tagsByWhen = readJournalTags();
  const migrations = readMigrationFiles(migrateConfig);

  for (const migration of migrations) {
    const tag = tagsByWhen.get(migration.folderMillis);
    if (!tag) {
      continue;
    }

    if (!(await migrationAlreadyApplied(tag))) {
      continue;
    }

    if (appliedHashes.has(migration.hash)) {
      continue;
    }

    await db.execute(sql`
      INSERT INTO "public"."__drizzle_migrations" (hash, created_at)
      VALUES (${migration.hash}, ${migration.folderMillis})
    `);

    appliedHashes.add(migration.hash);
    // eslint-disable-next-line no-console
    console.log(`Baselined migration: ${tag}`);
  }
}
