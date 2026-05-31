/* eslint-disable no-console */
import { and, eq } from "drizzle-orm";

import db from "@/db";
import { bins, rayons, shelves, users } from "@/db/models";

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

const getOperatorUserId = async () => {
  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isAdmin, true), eq(users.isDeleted, false)))
    .limit(1);

  if (!adminUser) {
    throw new Error("No admin user found to use as createdBy for repaired bins.");
  }

  return adminUser.id;
};

const operatorUserId = dryRun ? null : await getOperatorUserId();

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

let repairedCount = 0;
let skippedCount = 0;
const now = new Date().toISOString();

for (const rayon of rayonRows) {
  const maxRowNumber = Math.max(
    0,
    ...rayon.shelves.flatMap((shelf) => shelf.bins.map((bin) => bin.rowNumber)),
  );

  if (maxRowNumber === 0) {
    console.log(`Skipping rayon ${rayon.name}: no existing bins to infer row count.`);
    skippedCount++;
    continue;
  }

  const locationPrefix = buildLocationPrefix(rayon.name);

  for (const shelf of rayon.shelves) {
    const existingRows = new Set(shelf.bins.map((bin) => bin.rowNumber));

    for (let rowNumber = 1; rowNumber <= maxRowNumber; rowNumber++) {
      if (existingRows.has(rowNumber)) continue;

      const locationCode = `${locationPrefix}${shelf.columnLabel}${rowNumber}`;
      const [existingLocation] = await db
        .select({ id: bins.id })
        .from(bins)
        .where(eq(bins.locationCode, locationCode))
        .limit(1);

      if (existingLocation) {
        console.warn(
          `Skipping ${locationCode}: location code already exists on bin ${existingLocation.id}.`,
        );
        skippedCount++;
        continue;
      }

      if (dryRun) {
        console.log(
          `Would create ${locationCode} for rayon ${rayon.name}, shelf ${shelf.columnLabel}, row ${rowNumber}`,
        );
        repairedCount++;
        continue;
      }

      await db.insert(bins).values({
        shelfId: shelf.id,
        warehouseId: shelf.warehouseId,
        rowNumber,
        locationCode,
        createdAt: now,
        updatedAt: now,
        createdBy: operatorUserId!,
        updatedBy: operatorUserId!,
      });

      console.log(
        `Created ${locationCode} for rayon ${rayon.name}, shelf ${shelf.columnLabel}, row ${rowNumber}`,
      );
      repairedCount++;
    }
  }
}

console.log(
  dryRun
    ? `Dry run complete. ${repairedCount} missing bin(s) would be created, ${skippedCount} skipped.`
    : `Repair complete. ${repairedCount} missing bin(s) created, ${skippedCount} skipped.`,
);
process.exit(0);
