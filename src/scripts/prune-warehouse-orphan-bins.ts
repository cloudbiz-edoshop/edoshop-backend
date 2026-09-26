import { eq, inArray } from "drizzle-orm";

import db from "@/db";
import { bins, shelves, storage, warehouseTransfers } from "@/db/models";

import { loadWorkbookRowsByReference } from "./warehouse-import-utils";
import {
  compactBinLocationKey,
  isPlausibleSpreadsheetBinLocation,
  parseSpreadsheetBinSlot,
} from "./warehouse-xlsx-bin-location.util";

export const collectSpreadsheetBinLocationKeys = (xlsxPath: string) => {
  const rowsByReference = loadWorkbookRowsByReference(xlsxPath);
  const allowed = new Set<string>();

  for (const row of rowsByReference.values()) {
    if (!isPlausibleSpreadsheetBinLocation(row.binLocation)) continue;
    const slot = parseSpreadsheetBinSlot(row.binLocation);
    if (slot) allowed.add(slot.locationCode);
  }

  return allowed;
};

export async function pruneWarehouseOrphanBins({
  warehouseId,
  xlsxPath,
  dryRun,
}: {
  warehouseId: number;
  xlsxPath: string;
  dryRun: boolean;
}) {
  const allowed = collectSpreadsheetBinLocationKeys(xlsxPath);
  const binRows = await db
    .select({
      id: bins.id,
      shelfId: bins.shelfId,
      locationCode: bins.locationCode,
    })
    .from(bins)
    .where(eq(bins.warehouseId, warehouseId));

  const orphanBins = binRows.filter((bin) => {
    const compact = compactBinLocationKey(bin.locationCode);
    return compact && !allowed.has(compact);
  });

  if (!orphanBins.length) {
    console.log("Orphan bins (not in spreadsheet): 0");
    return { removedBins: 0, removedShelves: 0, removedStorage: 0 };
  }

  const orphanBinIds = orphanBins.map((bin) => bin.id);
  const orphanShelfIds = [...new Set(orphanBins.map((bin) => bin.shelfId))];

  console.log(
    `\nOrphan bins to remove (not in spreadsheet): ${orphanBins.length}`,
  );
  for (const bin of orphanBins.slice(0, 20)) {
    console.log(`  - ${bin.locationCode}`);
  }
  if (orphanBins.length > 20) {
    console.log(`  ... and ${orphanBins.length - 20} more`);
  }

  if (dryRun) {
    return {
      removedBins: orphanBins.length,
      removedShelves: 0,
      removedStorage: 0,
    };
  }

  let removedStorage = 0;
  let removedShelves = 0;

  await db.transaction(async (tx) => {
    const storageRows = await tx
      .select({ id: storage.id })
      .from(storage)
      .where(inArray(storage.binId, orphanBinIds));
    removedStorage = storageRows.length;

    await tx.delete(storage).where(inArray(storage.binId, orphanBinIds));
    await tx
      .update(warehouseTransfers)
      .set({ binId: null })
      .where(inArray(warehouseTransfers.binId, orphanBinIds));
    await tx.delete(bins).where(inArray(bins.id, orphanBinIds));

    for (const shelfId of orphanShelfIds) {
      const remaining = await tx
        .select({ id: bins.id })
        .from(bins)
        .where(eq(bins.shelfId, shelfId))
        .limit(1);
      if (!remaining.length) {
        await tx.delete(shelves).where(eq(shelves.id, shelfId));
        removedShelves += 1;
      }
    }
  });

  console.log(
    `Removed ${orphanBins.length} orphan bin(s), ${removedStorage} storage row(s), ${removedShelves} empty shelf(s).`,
  );

  return {
    removedBins: orphanBins.length,
    removedShelves,
    removedStorage,
  };
}
