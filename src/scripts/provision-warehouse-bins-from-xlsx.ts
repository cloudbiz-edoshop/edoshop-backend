/* eslint-disable no-console */
import "dotenv/config";

import { and, eq } from "drizzle-orm";

import { isSlotWithinWarehouseRayonPhysicalLayout } from "@/constants/warehouse-rayon-physical-layout.constants";
import { WarehouseIds } from "@/constants/warehouses.constants";
import db from "@/db";
import { bins, rayons, shelves } from "@/db/models";

import { getDefaultOperatorUserId } from "./warehouse-xlsx-bin-sync";
import {
  assertWarehouseXlsxExists,
  resolveWarehouseXlsxPath,
} from "./warehouse-xlsx-path";
import { resolveWarehouseDatabaseUrl } from "./warehouse-db-url";
import { loadWorkbookRowsByReference } from "./warehouse-import-utils";
import {
  isPlausibleSpreadsheetBinLocation,
  parseSpreadsheetBinSlot,
} from "./warehouse-xlsx-bin-location.util";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const warehouseArg = args.find((arg) => arg.startsWith("--warehouse-id="));
const warehouseId = warehouseArg
  ? Number(warehouseArg.split("=")[1])
  : WarehouseIds.WAREHOUSE_1;

const xlsxPath = resolveWarehouseXlsxPath(args);
assertWarehouseXlsxExists(xlsxPath);
process.env.DATABASE_URL = resolveWarehouseDatabaseUrl(args);

const buildLocationPrefix = (rayonName: string) => {
  const trimmedName = String(rayonName ?? "").trim();
  const withoutRayonPrefix = trimmedName.replace(/^rayon[\s-]*/i, "");
  const compact = withoutRayonPrefix.replace(/[^a-z0-9]/gi, "");
  const fallback = trimmedName.replace(/[^a-z0-9]/gi, "");
  return (compact || fallback).toUpperCase();
};

async function findRayon(warehouseId: number, rayonNumber: string) {
  const candidates = [rayonNumber, `Rayon ${rayonNumber}`, `RAYON ${rayonNumber}`];
  for (const name of candidates) {
    const row = await db.query.rayons.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.warehouseId, warehouseId), eq(table.name, name)),
    });
    if (row) return row;
  }
  return null;
}

async function main() {
  console.log(`Reading workbook: ${xlsxPath}`);
  console.log(`Warehouse ID: ${warehouseId}`);

  const rowsByReference = loadWorkbookRowsByReference(xlsxPath);
  const slotMap = new Map<string, ReturnType<typeof parseSpreadsheetBinSlot>>();

  for (const row of rowsByReference.values()) {
    if (!isPlausibleSpreadsheetBinLocation(row.binLocation)) continue;
    const slot = parseSpreadsheetBinSlot(row.binLocation);
    if (!slot) continue;
    slotMap.set(slot.locationCode, slot);
  }

  const slots = [...slotMap.values()].filter(Boolean);
  console.log(`Unique bin locations in sheet: ${slots.length}`);

  if (!slots.length) {
    console.log("No parseable bin locations found.");
    process.exit(0);
  }

  const operatorUserId = dryRun ? 0 : await getDefaultOperatorUserId();
  const now = new Date().toISOString();

  let rayonsCreated = 0;
  let shelvesCreated = 0;
  let binsCreated = 0;
  let skipped = 0;

  let outsidePhysicalLayout = 0;

  for (const slot of slots) {
    if (!slot) continue;

    if (
      !isSlotWithinWarehouseRayonPhysicalLayout(
        warehouseId,
        slot.rayonNumber,
        slot.columnLabel,
        slot.rowNumber,
      )
    ) {
      console.warn(
        `Skipping ${slot.locationCode}: outside W1 physical grid for rayon ${slot.rayonNumber}`,
      );
      outsidePhysicalLayout++;
      continue;
    }

    let rayon = await findRayon(warehouseId, slot.rayonNumber);
    if (!rayon && dryRun) {
      const locationCode = `${slot.rayonNumber}${slot.columnLabel}${slot.rowNumber}`;
      console.log(
        `Would provision rayon ${slot.rayonNumber}, shelf ${slot.columnLabel}, bin ${locationCode}`,
      );
      rayonsCreated++;
      shelvesCreated++;
      binsCreated++;
      continue;
    }

    if (!rayon) {
      const [created] = await db
        .insert(rayons)
        .values({
          warehouseId,
          name: slot.rayonNumber,
          description: `Auto-provisioned from warehouse spreadsheet (zone ${slot.rayonNumber})`,
          createdAt: now,
          updatedAt: now,
          createdBy: operatorUserId,
          updatedBy: operatorUserId,
        })
        .returning();
      rayon = created;
      console.log(`Created rayon "${slot.rayonNumber}" (id ${rayon.id})`);
      rayonsCreated++;
    }

    let shelf = await db.query.shelves.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.rayonId, rayon.id),
          eq(table.warehouseId, warehouseId),
          eq(table.columnLabel, slot.columnLabel),
        ),
    });

    if (!shelf) {
      if (dryRun) {
        console.log(
          `Would create shelf ${slot.columnLabel} on rayon ${rayon.name}`,
        );
        shelvesCreated++;
      } else {
        const [created] = await db
          .insert(shelves)
          .values({
            rayonId: rayon.id,
            warehouseId,
            columnLabel: slot.columnLabel,
            description: `Shelf ${slot.columnLabel} for rayon ${rayon.name}`,
            createdAt: now,
            updatedAt: now,
            createdBy: operatorUserId,
            updatedBy: operatorUserId,
          })
          .returning();
        shelf = created;
        console.log(`Created shelf ${slot.columnLabel} on rayon ${rayon.name}`);
        shelvesCreated++;
      }
    }

    if (!shelf) {
      skipped++;
      continue;
    }

    const locationPrefix = buildLocationPrefix(rayon.name);
    const locationCode = `${locationPrefix}${slot.columnLabel}${slot.rowNumber}`;

    const existingBin = await db.query.bins.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.warehouseId, warehouseId),
          eq(table.locationCode, locationCode),
        ),
    });

    if (existingBin) {
      skipped++;
      continue;
    }

    const existingRowOnShelf = await db.query.bins.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.shelfId, shelf.id), eq(table.rowNumber, slot.rowNumber)),
    });

    if (existingRowOnShelf) {
      console.warn(
        `Shelf ${slot.columnLabel} row ${slot.rowNumber} already has bin ${existingRowOnShelf.locationCode}; expected ${locationCode}`,
      );
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`Would create bin ${locationCode}`);
      binsCreated++;
      continue;
    }

    await db.insert(bins).values({
      shelfId: shelf.id,
      warehouseId,
      rowNumber: slot.rowNumber,
      locationCode,
      createdAt: now,
      updatedAt: now,
      createdBy: operatorUserId,
      updatedBy: operatorUserId,
    });
    console.log(`Created bin ${locationCode}`);
    binsCreated++;
  }

  console.log("\n=== Provision summary ===");
  console.log(`Rayons created: ${rayonsCreated}`);
  console.log(`Shelves created: ${shelvesCreated}`);
  console.log(`Bins created: ${binsCreated}`);
  console.log(`Skipped (already exists / conflict): ${skipped}`);
  if (outsidePhysicalLayout > 0) {
    console.log(`Skipped (outside physical W1 grid): ${outsidePhysicalLayout}`);
  }
  if (dryRun) {
    console.log("(Dry run — no database changes.)");
  }
  console.log(
    "\nNext: npm run products:sync-warehouse-xlsx-bins -- --sync-quantity --file",
    xlsxPath,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
