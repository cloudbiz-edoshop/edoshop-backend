/* eslint-disable no-console */
import type { Table } from "drizzle-orm";

import type { Database } from "@/db";

import { getTableName, sql } from "drizzle-orm";

import { allTables } from "@/db/tables";

/**
 * Resets the sequence for a table to the maximum ID value.
 * This is necessary when seeding tables with explicit IDs.
 *
 * @param db - The database instance
 * @param table - The table to reset the sequence for
 */
async function resetSequenceForTable(db: Database, table: Table) {
  const tableName = getTableName(table);

  try {
    // Construct the sequence name (PostgreSQL convention: tablename_id_seq)
    const sequenceName = `${tableName}_id_seq`;

    // Quote table name if it contains special characters (like hyphens)
    const quotedTableName = tableName.includes("-") ? `"${tableName}"` : tableName;

    // Reset the sequence to the maximum ID value (or 1 if table is empty)
    await db.execute(
      sql.raw(
        `SELECT setval('${sequenceName}', COALESCE((SELECT MAX(id) FROM ${quotedTableName}), 1), true);`,
      ),
    );

    console.log(`✓ Reset sequence for ${tableName}`);
  } catch (error) {
    // If the sequence doesn't exist (e.g., table doesn't have an auto-increment ID), skip it
    if (
      error instanceof Error &&
      error.message.includes("does not exist")
    ) {
      console.log(`⊘ Skipped ${tableName} (no sequence found)`);
    } else {
      console.error(`✗ Failed to reset sequence for ${tableName}:`, error);
      throw error;
    }
  }
}

/**
 * Resets all sequences for tables with auto-incrementing IDs.
 * Should be called after seeding to ensure new records get proper IDs.
 *
 * @param db - The database instance
 */
export async function resetAllSequences(db: Database) {
  console.log("\n=== Resetting sequences ===\n");

  // Reset sequences for all tables
  for (const table of allTables) {
    await resetSequenceForTable(db, table);
  }

  console.log("\n=== Sequence reset complete ===\n");
}
