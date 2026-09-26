/* eslint-disable no-console */
import "dotenv/config";

import { eq, inArray } from "drizzle-orm";

import { WarehouseIds } from "@/constants/warehouses.constants";
import db from "@/db";
import { bins, rayons, shelves, storage, warehouseTransfers } from "@/db/models";

import { resolveWarehouseDatabaseUrl } from "./warehouse-db-url";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const warehouseArg = args.find((arg) => arg.startsWith("--warehouse-id="));
const warehouseId = warehouseArg
  ? Number(warehouseArg.split("=")[1])
  : WarehouseIds.WAREHOUSE_1;

process.env.DATABASE_URL = resolveWarehouseDatabaseUrl(args);

async function main() {
  if (!Number.isFinite(warehouseId) || warehouseId <= 0) {
    throw new Error("Invalid --warehouse-id");
  }

  console.log(`Database: ${process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ":***@")}`);
  console.log(
    `${dryRun ? "Dry run: would reset" : "Resetting"} EWMS layout for warehouse ${warehouseId}`,
  );
  console.log(
    "Catalog entries are kept; only storage placements and rayon/shelf/bin grid are removed.",
  );

  const binRows = await db
    .select({ id: bins.id })
    .from(bins)
    .where(eq(bins.warehouseId, warehouseId));
  const binIds = binRows.map((row) => row.id);

  const shelfRows = await db
    .select({ id: shelves.id })
    .from(shelves)
    .where(eq(shelves.warehouseId, warehouseId));

  const rayonRows = await db
    .select({ id: rayons.id })
    .from(rayons)
    .where(eq(rayons.warehouseId, warehouseId));

  const storageCount = binIds.length
    ? (
        await db
          .select({ id: storage.id })
          .from(storage)
          .where(inArray(storage.binId, binIds))
      ).length
    : 0;

  console.log("\n=== Reset summary (before) ===");
  console.log(`Bins: ${binIds.length}`);
  console.log(`Shelves: ${shelfRows.length}`);
  console.log(`Rayons: ${rayonRows.length}`);
  console.log(`Storage rows on those bins: ${storageCount}`);

  if (dryRun) {
    console.log("\n(Dry run — no database changes.)");
    return;
  }

  await db.transaction(async (tx) => {
    if (binIds.length) {
      await tx.delete(storage).where(inArray(storage.binId, binIds));
      await tx
        .update(warehouseTransfers)
        .set({ binId: null })
        .where(inArray(warehouseTransfers.binId, binIds));
      await tx.delete(bins).where(eq(bins.warehouseId, warehouseId));
    }
    await tx.delete(shelves).where(eq(shelves.warehouseId, warehouseId));
    await tx.delete(rayons).where(eq(rayons.warehouseId, warehouseId));
  });

  console.log("\nWarehouse layout cleared. Rebuild from spreadsheet:");
  console.log(
    "  npm run rayons:provision-from-xlsx -- --prod --file /tmp/warehouse-stock.xlsx",
  );
  console.log(
    "  npm run products:sync-warehouse-xlsx-bins -- --prod --sync-quantity --file /tmp/warehouse-stock.xlsx",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
