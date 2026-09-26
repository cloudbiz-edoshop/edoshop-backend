/* eslint-disable no-console */
import "dotenv/config";

import { WarehouseIds } from "@/constants/warehouses.constants";

import { pruneWarehouseOrphanBins } from "./prune-warehouse-orphan-bins";
import {
  assertWarehouseXlsxExists,
  resolveWarehouseXlsxPath,
} from "./warehouse-xlsx-path";
import { resolveWarehouseDatabaseUrl } from "./warehouse-db-url";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const warehouseArg = args.find((arg) => arg.startsWith("--warehouse-id="));
const warehouseId = warehouseArg
  ? Number(warehouseArg.split("=")[1])
  : WarehouseIds.WAREHOUSE_1;

const xlsxPath = resolveWarehouseXlsxPath(args);
assertWarehouseXlsxExists(xlsxPath);
process.env.DATABASE_URL = resolveWarehouseDatabaseUrl(args);

async function main() {
  await pruneWarehouseOrphanBins({ warehouseId, xlsxPath, dryRun });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
