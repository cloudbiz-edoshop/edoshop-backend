/* eslint-disable no-console */
import "dotenv/config";

import { eq } from "drizzle-orm";

import { WarehouseIds } from "@/constants/warehouses.constants";
import db from "@/db";
import { bins, users } from "@/db/models";
import { repairRayonBinLayoutsForWarehouse } from "@/modules/rayons/rayon-bin-layout-repair";

const dryRun = process.argv.includes("--dry-run");
const warehouseArg = process.argv.find((arg) => arg.startsWith("--warehouse-id="));
const warehouseId = warehouseArg
  ? Number(warehouseArg.split("=")[1])
  : WarehouseIds.WAREHOUSE_1;

if (!Number.isFinite(warehouseId) || warehouseId <= 0) {
  console.error("Invalid --warehouse-id");
  process.exit(1);
}

const rayonCount = (
  await db.query.rayons.findMany({
    where: (rayonsTable, { eq: eqFn }) => eqFn(rayonsTable.warehouseId, warehouseId),
    columns: { id: true },
  })
).length;

const existingBinCount = (
  await db.select({ id: bins.id }).from(bins).where(eq(bins.warehouseId, warehouseId))
).length;

console.log(
  `Warehouse ${warehouseId}: ${rayonCount} rayon(s), ${existingBinCount} existing bin(s).`,
);

if (!rayonCount) {
  console.log(
    "No rayons found. Run: npm run rayons:provision-from-xlsx -- --prod --file <workbook>",
  );
  process.exit(0);
}

if (dryRun) {
  console.log(
    "Dry run is not supported for physical-layout repair (grid size is fixed). Run without --dry-run to apply.",
  );
  process.exit(0);
}

const [adminUser] = await db
  .select({ id: users.id })
  .from(users)
  .where((table, { and, eq: eqFn }) =>
    and(eqFn(table.isAdmin, true), eqFn(table.isDeleted, false)),
  )
  .limit(1);

if (!adminUser) {
  throw new Error("No admin user found to use as createdBy for repaired bins.");
}

const result = await repairRayonBinLayoutsForWarehouse(warehouseId, adminUser.id);

console.log(
  `Repair complete. ${result.shelvesCreated} shelf(s) and ${result.binsCreated} bin(s) created, ${result.skipped} skipped.`,
);
process.exit(0);
