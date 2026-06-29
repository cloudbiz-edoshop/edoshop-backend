/* eslint-disable no-console */
import { and, eq } from "drizzle-orm";

import db from "@/db";
import { bins, shelves, users } from "@/db/models";

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

const numberToColumnLabel = (value: number) => {
  let number = value;
  let label = "";

  while (number > 0) {
    const remainder = (number - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    number = Math.floor((number - 1) / 26);
  }

  return label;
};

const columnLabelToNumber = (value: string) => String(value ?? "")
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

let shelfCount = 0;
let binCount = 0;
let skippedCount = 0;
const now = new Date().toISOString();

for (const rayon of rayonRows) {
  const inferredMaxRow = Math.max(
    0,
    ...rayon.shelves.flatMap((shelf) => shelf.bins.map((bin) => bin.rowNumber)),
  );
  const maxRowNumber = inferredMaxRow > 0
    ? inferredMaxRow
    : (rayon.shelves.length > 0 ? 1 : 0);

  if (maxRowNumber === 0) {
    console.log(`Skipping rayon ${rayon.name}: no shelves configured.`);
    skippedCount++;
    continue;
  }

  const maxColumnNumber = Math.max(
    0,
    ...rayon.shelves
      .map((shelf) => columnLabelToNumber(shelf.columnLabel))
      .filter((value) => Number.isFinite(value) && value > 0),
  );

  if (maxColumnNumber === 0) {
    console.log(`Skipping rayon ${rayon.name}: no valid shelf column labels.`);
    skippedCount++;
    continue;
  }

  const locationPrefix = buildLocationPrefix(rayon.name);
  const shelvesByLabel = rayon.shelves.reduce<Record<string, typeof rayon.shelves[number]>>(
    (map, shelf) => {
      map[String(shelf.columnLabel ?? "").trim().toUpperCase()] = shelf;
      return map;
    },
    {},
  );

  for (let columnNumber = 1; columnNumber <= maxColumnNumber; columnNumber += 1) {
    const columnLabel = numberToColumnLabel(columnNumber);
    let shelf = shelvesByLabel[columnLabel];

    if (!shelf) {
      if (dryRun) {
        console.log(
          `Would create shelf ${columnLabel} for rayon ${rayon.name} (warehouse ${rayon.warehouseId})`,
        );
        shelfCount++;
      } else {
        const [createdShelf] = await db.insert(shelves).values({
          rayonId: rayon.id,
          warehouseId: rayon.warehouseId,
          columnLabel,
          description: `Shelf ${columnLabel} for rayon ${rayon.name}`,
          createdAt: now,
          updatedAt: now,
          createdBy: operatorUserId!,
          updatedBy: operatorUserId!,
        }).returning();

        shelf = {
          ...createdShelf,
          bins: [],
        };
        shelvesByLabel[columnLabel] = shelf;
        console.log(
          `Created shelf ${columnLabel} for rayon ${rayon.name} (warehouse ${rayon.warehouseId})`,
        );
        shelfCount++;
      }
    }

    if (!shelf) {
      continue;
    }

    const existingRows = new Set(shelf.bins.map((bin) => bin.rowNumber));

    for (let rowNumber = 1; rowNumber <= maxRowNumber; rowNumber += 1) {
      if (existingRows.has(rowNumber)) continue;

      const locationCode = `${locationPrefix}${columnLabel}${rowNumber}`;
      const [existingLocation] = await db
        .select({ id: bins.id })
        .from(bins)
        .where(and(
          eq(bins.warehouseId, rayon.warehouseId),
          eq(bins.locationCode, locationCode),
        ))
        .limit(1);

      if (existingLocation) {
        console.warn(
          `Skipping ${locationCode}: location code already exists on bin ${existingLocation.id} in warehouse ${rayon.warehouseId}.`,
        );
        skippedCount++;
        continue;
      }

      if (dryRun) {
        console.log(
          `Would create ${locationCode} for rayon ${rayon.name}, shelf ${columnLabel}, row ${rowNumber}`,
        );
        binCount++;
        continue;
      }

      await db.insert(bins).values({
        shelfId: shelf.id,
        warehouseId: rayon.warehouseId,
        rowNumber,
        locationCode,
        createdAt: now,
        updatedAt: now,
        createdBy: operatorUserId!,
        updatedBy: operatorUserId!,
      });

      console.log(
        `Created ${locationCode} for rayon ${rayon.name}, shelf ${columnLabel}, row ${rowNumber}`,
      );
      binCount++;
    }
  }
}

console.log(
  dryRun
    ? `Dry run complete. ${shelfCount} shelf(s) and ${binCount} bin(s) would be created, ${skippedCount} skipped.`
    : `Repair complete. ${shelfCount} shelf(s) and ${binCount} bin(s) created, ${skippedCount} skipped.`,
);
process.exit(0);
