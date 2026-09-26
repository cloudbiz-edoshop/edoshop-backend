/* eslint-disable no-console */
import "dotenv/config";

import { eq } from "drizzle-orm";

import { WarehouseIds } from "@/constants/warehouses.constants";
import db from "@/db";
import { bins } from "@/db/models";
import { WarehouseTransfersRepository } from "@/modules/warehouse-transfers/warehouse-transfers.repository";

import {
  assertWarehouseXlsxExists,
  resolveWarehouseXlsxPath,
} from "./warehouse-xlsx-path";
import { resolveWarehouseDatabaseUrl } from "./warehouse-db-url";
import { loadWorkbookRowsByReference } from "./warehouse-import-utils";
import {
  compactBinLocationKey,
  createBinResolver,
  getDefaultOperatorUserId,
  syncWarehouseRowToBin,
} from "./warehouse-xlsx-bin-sync";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const syncQuantity = args.includes("--sync-quantity");
const warehouseArg = args.find((arg) => arg.startsWith("--warehouse-id="));
const warehouseId = warehouseArg
  ? Number(warehouseArg.split("=")[1])
  : WarehouseIds.WAREHOUSE_1;

const xlsxPath = resolveWarehouseXlsxPath(args);
assertWarehouseXlsxExists(xlsxPath);

const databaseUrl = resolveWarehouseDatabaseUrl(args);
process.env.DATABASE_URL = databaseUrl;

async function main() {
  console.log(`Database: ${databaseUrl.replace(/:[^:@/]+@/, ":***@")}`);
  console.log(`Reading workbook: ${xlsxPath}`);
  console.log(`Warehouse ID: ${warehouseId}`);
  console.log(`${dryRun ? "Dry run" : "Sync"} bin placements from column 10 (bin location).`);

  const rowsByReference = loadWorkbookRowsByReference(xlsxPath);
  const rows = [...rowsByReference.values()].filter((row) => row.binLocation?.trim());

  if (!rows.length) {
    console.log("No rows with bin locations found in the spreadsheet.");
    process.exit(0);
  }

  const binRows = await db
    .select({ id: bins.id, locationCode: bins.locationCode })
    .from(bins)
    .where(eq(bins.warehouseId, warehouseId));

  const binResolver = createBinResolver(binRows);
  if (!binRows.length) {
    console.warn(
      `No bins configured for warehouse ${warehouseId}. Run rayons:repair-bins first, then retry.`,
    );
    process.exit(1);
  }

  const sampleDbBins = binRows
    .slice(0, 8)
    .map((row) => `${row.locationCode} → ${compactBinLocationKey(row.locationCode)}`);
  console.log(`EWMS bins loaded: ${binRows.length}. Sample codes: ${sampleDbBins.join(", ")}`);

  const operatorUserId = dryRun ? 0 : await getDefaultOperatorUserId();
  const transfersRepository = new WarehouseTransfersRepository();

  const summary = {
    assigned: 0,
    wouldAssign: 0,
    missingBin: 0,
    missingEntry: 0,
    invalidBin: 0,
  };
  const missingBins: string[] = [];
  const missingEntries: string[] = [];

  for (const row of rows) {
    const result = await syncWarehouseRowToBin({
      row,
      warehouseId,
      binResolver,
      operatorUserId,
      transfersRepository,
      dryRun,
      syncQuantity,
    });

    switch (result.status) {
      case "assigned":
        summary.assigned += 1;
        break;
      case "would_assign":
        summary.wouldAssign += 1;
        break;
      case "missing_bin":
        summary.missingBin += 1;
        if (missingBins.length < 25) {
          missingBins.push(`${row.legacyReference} → ${row.binLocation}`);
        }
        break;
      case "missing_entry":
        summary.missingEntry += 1;
        if (missingEntries.length < 25) {
          missingEntries.push(row.legacyReference);
        }
        break;
      case "invalid_bin":
        summary.invalidBin += 1;
        break;
      default:
        break;
    }
  }

  console.log("\n=== Bin sync summary ===");
  console.log(`Rows with bin in sheet: ${rows.length}`);
  console.log(`Assigned: ${summary.assigned}`);
  if (dryRun) {
    console.log(`Would assign: ${summary.wouldAssign}`);
  }
  console.log(`Missing EWMS bin: ${summary.missingBin}`);
  console.log(`Invalid bin in sheet (fix Excel): ${summary.invalidBin}`);
  console.log(`Missing EWMS item entry: ${summary.missingEntry}`);

  if (missingBins.length) {
    console.log("\nSample missing bins (check rayons / location codes):");
    for (const line of missingBins) {
      console.log(`  - ${line}`);
    }
    console.log(
      "If EWMS bin grids are incomplete, run: npm run rayons:repair-bins -- --warehouse-id=1",
    );
  }

  if (missingEntries.length) {
    console.log("\nSample missing item entries (create/link EWMS items first):");
    for (const reference of missingEntries) {
      console.log(`  - ${reference}`);
    }
  }

  console.log(
    "\nVisualization (Rayons / Stock View) reads EWMS storage placements.",
    "Catalog-only imports do not appear until item entries are linked and this sync runs.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
