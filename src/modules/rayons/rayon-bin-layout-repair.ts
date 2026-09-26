import { and, eq } from "drizzle-orm";

import {
  getWarehouseRayonPhysicalLayout,
  numberToColumnLabel,
  parseRayonIndexFromName,
} from "@/constants/warehouse-rayon-physical-layout.constants";
import { WarehouseIds } from "@/constants/warehouses.constants";
import db from "@/db";
import { bins, shelves } from "@/db/models";

const buildLocationPrefix = (name: string | null) => {
  const trimmedName = String(name ?? "").trim();
  const withoutRayonPrefix = trimmedName.replace(/^rayon[\s-]*/i, "");
  const compact = withoutRayonPrefix.replace(/[^a-z0-9]/gi, "");
  const fallback = trimmedName.replace(/[^a-z0-9]/gi, "");
  return (compact || fallback).toUpperCase();
};

const columnLabelToNumber = (value: string) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .split("")
    .reduce((total, char) => {
      const code = char.charCodeAt(0);
      if (code < 65 || code > 90) {
        return Number.NaN;
      }
      return total * 26 + code - 64;
    }, 0);

export type RepairRayonBinLayoutResult = {
  shelvesCreated: number;
  binsCreated: number;
  skipped: number;
};

export async function repairRayonBinLayoutsForWarehouse(
  warehouseId: number,
  operatorUserId: number,
): Promise<RepairRayonBinLayoutResult> {
  const rayonRows = await db.query.rayons.findMany({
    where: (rayonsTable, { eq: eqFn }) => eqFn(rayonsTable.warehouseId, warehouseId),
    with: {
      shelves: {
        with: {
          bins: true,
        },
      },
    },
  });

  let shelfCount = 0;
  let binCount = 0;
  let skippedCount = 0;
  const now = new Date().toISOString();

  for (const rayon of rayonRows) {
    const physical = getWarehouseRayonPhysicalLayout(warehouseId, rayon.name);

    if (warehouseId === WarehouseIds.WAREHOUSE_1) {
      const rayonIndex = parseRayonIndexFromName(rayon.name);
      if (rayonIndex === 6) {
        skippedCount++;
        continue;
      }
    }

    const inferredMaxRow = Math.max(
      0,
      ...rayon.shelves.flatMap((shelf) => shelf.bins.map((bin) => bin.rowNumber)),
    );

    let maxRowNumber: number;
    let maxColumnNumber: number;

    if (physical) {
      maxRowNumber = physical.rowCount;
      maxColumnNumber = physical.maxColumnNumber;
    } else {
      maxRowNumber =
        inferredMaxRow > 0 ? inferredMaxRow : rayon.shelves.length > 0 ? 1 : 0;

      if (maxRowNumber === 0) {
        skippedCount++;
        continue;
      }

      maxColumnNumber = Math.max(
        0,
        ...rayon.shelves
          .map((shelf) => columnLabelToNumber(shelf.columnLabel))
          .filter((value) => Number.isFinite(value) && value > 0),
      );

      if (maxColumnNumber === 0) {
        skippedCount++;
        continue;
      }
    }

    const locationPrefix = buildLocationPrefix(rayon.name);
    const shelvesByLabel = rayon.shelves.reduce<
      Record<string, (typeof rayon.shelves)[number]>
    >((map, shelf) => {
      map[String(shelf.columnLabel ?? "").trim().toUpperCase()] = shelf;
      return map;
    }, {});

    for (let columnNumber = 1; columnNumber <= maxColumnNumber; columnNumber += 1) {
      const columnLabel = numberToColumnLabel(columnNumber);
      let shelf = shelvesByLabel[columnLabel];

      if (!shelf) {
        const [createdShelf] = await db
          .insert(shelves)
          .values({
            rayonId: rayon.id,
            warehouseId: rayon.warehouseId,
            columnLabel,
            description: `Shelf ${columnLabel} for rayon ${rayon.name}`,
            createdAt: now,
            updatedAt: now,
            createdBy: operatorUserId,
            updatedBy: operatorUserId,
          })
          .returning();

        shelf = {
          ...createdShelf,
          bins: [],
        };
        shelvesByLabel[columnLabel] = shelf;
        shelfCount++;
      }

      const existingRows = new Set(shelf.bins.map((bin) => bin.rowNumber));

      for (let rowNumber = 1; rowNumber <= maxRowNumber; rowNumber += 1) {
        if (existingRows.has(rowNumber)) continue;

        const locationCode = `${locationPrefix}${columnLabel}${rowNumber}`;
        const [existingLocation] = await db
          .select({ id: bins.id })
          .from(bins)
          .where(
            and(
              eq(bins.warehouseId, rayon.warehouseId),
              eq(bins.locationCode, locationCode),
            ),
          )
          .limit(1);

        if (existingLocation) {
          skippedCount++;
          continue;
        }

        await db.insert(bins).values({
          shelfId: shelf.id,
          warehouseId: rayon.warehouseId,
          rowNumber,
          locationCode,
          createdAt: now,
          updatedAt: now,
          createdBy: operatorUserId,
          updatedBy: operatorUserId,
        });

        binCount++;
      }
    }
  }

  return {
    shelvesCreated: shelfCount,
    binsCreated: binCount,
    skipped: skippedCount,
  };
}
