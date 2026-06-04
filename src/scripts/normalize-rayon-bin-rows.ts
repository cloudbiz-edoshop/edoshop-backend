/* eslint-disable no-console */
import { and, eq } from "drizzle-orm";

import db from "@/db";
import { bins, users } from "@/db/models";

const dryRun = process.argv.includes("--dry-run");
const warehouseArg = process.argv.find((arg) => arg.startsWith("--warehouse-id="));
const warehouseId = warehouseArg ? Number(warehouseArg.split("=")[1]) : undefined;

const buildLocationPrefix = (name: string | null) => {
  const trimmedName = String(name ?? "").trim();
  const withoutRayonPrefix = trimmedName.replace(/^rayon[\s-]*/i, "");
  const compact = withoutRayonPrefix.replace(/[^a-z0-9]/gi, "");
  const fallback = trimmedName.replace(/[^a-z0-9]/gi, "");
  return (compact || fallback).toUpperCase();
};

const getAvailableLocationCode = async (
  currentBinId: number,
  baseLocationCode: string,
  warehouseScopedLocationCode: string,
) => {
  const [existingBaseLocation] = await db
    .select({ id: bins.id })
    .from(bins)
    .where(eq(bins.locationCode, baseLocationCode))
    .limit(1);

  if (!existingBaseLocation || existingBaseLocation.id === currentBinId) {
    return baseLocationCode;
  }

  const [existingScopedLocation] = await db
    .select({ id: bins.id })
    .from(bins)
    .where(eq(bins.locationCode, warehouseScopedLocationCode))
    .limit(1);

  if (existingScopedLocation && existingScopedLocation.id !== currentBinId) {
    return null;
  }

  return warehouseScopedLocationCode;
};

const getOperatorUserId = async () => {
  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isAdmin, true), eq(users.isDeleted, false)))
    .limit(1);

  if (!adminUser) {
    throw new Error("No admin user found to use as updatedBy for normalized bins.");
  }

  return adminUser.id;
};

const operatorUserId = dryRun ? null : await getOperatorUserId();
const now = new Date().toISOString();

const rayonRows = await db.query.rayons.findMany({
  where: warehouseId
    ? (rayonsTable, { eq }) => eq(rayonsTable.warehouseId, warehouseId)
    : undefined,
  with: {
    shelves: {
      with: {
        bins: true,
      },
    },
  },
});

let normalizedCount = 0;
let skippedCount = 0;

for (const rayon of rayonRows) {
  const rowNumbers = Array.from(
    new Set(rayon.shelves.flatMap((shelf) => shelf.bins.map((bin) => bin.rowNumber))),
  ).sort((a, b) => a - b);

  const rowMap = new Map(rowNumbers.map((rowNumber, index) => [rowNumber, index + 1]));
  const locationPrefix = buildLocationPrefix(rayon.name);

  for (const shelf of rayon.shelves) {
    for (const bin of shelf.bins) {
      const normalizedRowNumber = rowMap.get(bin.rowNumber);
      if (!normalizedRowNumber || normalizedRowNumber === bin.rowNumber) continue;

      const baseLocationCode = `${locationPrefix}${shelf.columnLabel}${normalizedRowNumber}`;
      const scopedLocationCode = `W${rayon.warehouseId}-${baseLocationCode}`;
      const normalizedLocationCode = await getAvailableLocationCode(
        bin.id,
        baseLocationCode,
        scopedLocationCode,
      );

      if (!normalizedLocationCode) {
        console.warn(
          `Skipping ${bin.locationCode}: both ${baseLocationCode} and ${scopedLocationCode} are already in use.`,
        );
        skippedCount++;
        continue;
      }

      if (dryRun) {
        console.log(
          `Would update ${bin.locationCode} row ${bin.rowNumber} -> ${normalizedLocationCode} row ${normalizedRowNumber}`,
        );
        normalizedCount++;
        continue;
      }

      await db
        .update(bins)
        .set({
          rowNumber: normalizedRowNumber,
          locationCode: normalizedLocationCode,
          updatedAt: now,
          updatedBy: operatorUserId!,
        })
        .where(eq(bins.id, bin.id));

      console.log(
        `Updated ${bin.locationCode} row ${bin.rowNumber} -> ${normalizedLocationCode} row ${normalizedRowNumber}`,
      );
      normalizedCount++;
    }
  }
}

console.log(
  dryRun
    ? `Dry run complete. ${normalizedCount} bin(s) would be normalized, ${skippedCount} skipped.`
    : `Normalization complete. ${normalizedCount} bin(s) normalized, ${skippedCount} skipped.`,
);
process.exit(0);
