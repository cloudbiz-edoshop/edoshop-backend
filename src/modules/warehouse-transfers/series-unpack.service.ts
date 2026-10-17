import { and, eq, sql } from "drizzle-orm";
import { EntryStateIds, EntryTypeIds } from "@/constants";
import { InventorySource } from "@/constants/inventory-source.constants";
import { WarehouseIds } from "@/constants/warehouses.constants";
import { NotFoundError, ValidationError } from "@/core/errors";
import db from "@/db";
import { bins, entries, items, series, storage } from "@/db/models";
import type { TX } from "@/lib/types";
import { assertUnpackQuantity } from "./series-unpack.validation";

async function nextItemCodeInTx(tx: TX, seriesCode: string): Promise<string> {
  const result = await tx.execute(sql`SELECT next_item_code(${seriesCode})`);
  return (result[0] as { next_item_code: string }).next_item_code;
}

export type UnpackSeriesRequest = {
  seriesEntryId: number;
  quantity: number;
  binId: number;
  sizeId?: number;
  userId: number;
};

export type UnpackSeriesResult = {
  seriesEntryId: number;
  seriesCode: string;
  itemCodes: string[];
  itemEntryIds: number[];
};

export class SeriesUnpackService {
  async unpackSeriesAtW1(data: UnpackSeriesRequest): Promise<UnpackSeriesResult> {
    const { seriesEntryId, quantity, binId, userId } = data;

    assertUnpackQuantity(quantity);

    const [seriesEntry] = await db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.id, seriesEntryId),
          eq(entries.isDeleted, false),
        ),
      )
      .limit(1);

    if (!seriesEntry) {
      throw new NotFoundError(`Series entry ${seriesEntryId} not found`);
    }

    if (seriesEntry.warehouseId !== WarehouseIds.WAREHOUSE_1) {
      throw new ValidationError("Series unpacking is only supported in Warehouse 1");
    }

    if (seriesEntry.entryTypeId !== EntryTypeIds.SERIES) {
      throw new ValidationError("Only series entries can be unpacked");
    }

    if (seriesEntry.isSeriesUnpacked) {
      throw new ValidationError("This series has already been unpacked");
    }

    const [seriesRecord] = await db
      .select()
      .from(series)
      .where(eq(series.entryId, seriesEntryId))
      .limit(1);

    if (!seriesRecord) {
      throw new NotFoundError("Series record not found for this entry");
    }

    const [bin] = await db
      .select({ id: bins.id })
      .from(bins)
      .where(
        and(eq(bins.id, binId), eq(bins.warehouseId, WarehouseIds.WAREHOUSE_1)),
      )
      .limit(1);

    if (!bin) {
      throw new ValidationError("Bin location is invalid for Warehouse 1");
    }

    const resolvedSizeId = await this.resolveSizeId(
      seriesRecord.id,
      data.sizeId,
    );

    const itemCodes: string[] = [];
    const itemEntryIds: number[] = [];
    const timestamp = new Date().toISOString();

    await db.transaction(async (tx) => {
      for (let index = 0; index < quantity; index += 1) {
        const itemCode = await nextItemCodeInTx(tx, seriesRecord.seriesCode);

        const [itemEntry] = await tx
          .insert(entries)
          .values({
            entryTypeId: EntryTypeIds.ITEM,
            entryStateId: EntryStateIds.NEW,
            quantity: 1,
            weight: seriesEntry.weight,
            date: seriesEntry.date,
            warehouseId: WarehouseIds.WAREHOUSE_1,
            supplierId: seriesEntry.supplierId,
            customerId: seriesEntry.customerId,
            description: `Unpacked from ${seriesRecord.seriesCode}`,
            inventorySource: InventorySource.UNPACK,
            unpackedFromEntryId: seriesEntryId,
            createdBy: userId,
            updatedBy: userId,
          })
          .returning();

        await tx.insert(items).values({
          entryId: itemEntry.id,
          seriesId: seriesRecord.id,
          itemCode,
          sizeId: resolvedSizeId,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: userId,
          updatedBy: userId,
        });

        await tx.insert(storage).values({
          binId,
          entryId: itemEntry.id,
          quantity: 1,
          action: true,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: userId,
          updatedBy: userId,
        });

        itemCodes.push(itemCode);
        itemEntryIds.push(itemEntry.id);
      }

      const [activeStorage] = await tx
        .select({
          id: storage.id,
          binId: storage.binId,
          quantity: storage.quantity,
        })
        .from(storage)
        .where(and(eq(storage.entryId, seriesEntryId), eq(storage.action, true)))
        .limit(1);

      if (activeStorage) {
        await tx.insert(storage).values({
          binId: activeStorage.binId,
          entryId: seriesEntryId,
          quantity: activeStorage.quantity,
          action: false,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: userId,
          updatedBy: userId,
        });
      }

      await tx
        .update(entries)
        .set({
          isSeriesUnpacked: true,
          isDeleted: true,
          deletedAt: timestamp,
          deletedBy: userId,
          updatedAt: timestamp,
          updatedBy: userId,
        })
        .where(eq(entries.id, seriesEntryId));
    });

    return {
      seriesEntryId,
      seriesCode: seriesRecord.seriesCode,
      itemCodes,
      itemEntryIds,
    };
  }

  private async resolveSizeId(seriesId: number, requestedSizeId?: number) {
    if (requestedSizeId) {
      return requestedSizeId;
    }

    const [existingItem] = await db
      .select({ sizeId: items.sizeId })
      .from(items)
      .where(eq(items.seriesId, seriesId))
      .limit(1);

    if (existingItem?.sizeId) {
      return existingItem.sizeId;
    }

    throw new ValidationError(
      "Size is required for unpacking because this series has no item size on record",
    );
  }
}
