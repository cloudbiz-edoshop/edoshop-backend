import type { CreateEntriesRequest } from "../../entries.schema";

import { and, eq, or } from "drizzle-orm";
import { EntryStateIds, EntryTypeIds } from "@/constants";
import { InventorySource } from "@/constants/inventory-source.constants";
import { TransferStatusIds } from "@/constants/transfer-statuses.constants";
import { WarehouseIds } from "@/constants/warehouses.constants";
import { ValidationError } from "@/core/errors";
import db from "@/db";
import {
  entries,
  items,
  series,
  warehouseTransfers,
} from "@/db/models";

/**
 * W1 manual stock rules: transfer-managed inventory cannot be re-created manually.
 */
export async function validateW1ManualEntryEligibility(
  data: CreateEntriesRequest,
): Promise<void> {
  if (data.warehouseId !== WarehouseIds.WAREHOUSE_1) {
    return;
  }

  if (data.entryStateId !== EntryStateIds.NEW) {
    return;
  }

  if (
    data.entryTypeId !== EntryTypeIds.SERIES
    && data.entryTypeId !== EntryTypeIds.ITEM
  ) {
    return;
  }

  const seriesCode = data.seriesCode?.trim();
  const itemCode = data.itemCode?.trim();

  if (data.entryTypeId === EntryTypeIds.SERIES && seriesCode) {
    await assertNotInboundTransferProduct(seriesCode, "series");
    await assertNotTransferSourcedCode(seriesCode, "series");
  }

  if (data.entryTypeId === EntryTypeIds.ITEM) {
    if (seriesCode) {
      await assertNotInboundTransferProduct(seriesCode, "series");
    }
    if (itemCode) {
      await assertNotInboundTransferProduct(itemCode, "item");
      await assertNotTransferSourcedCode(itemCode, "item");
    }
  }
}

async function assertNotInboundTransferProduct(
  productCode: string,
  kind: "series" | "item",
) {
  const baseConditions = and(
    eq(warehouseTransfers.statusId, TransferStatusIds.SENT),
    eq(warehouseTransfers.destinationWarehouseId, WarehouseIds.WAREHOUSE_1),
  );

  const [pending] =
    kind === "series"
      ? await db
          .select({ id: warehouseTransfers.id })
          .from(warehouseTransfers)
          .innerJoin(series, eq(series.entryId, warehouseTransfers.entryId))
          .where(and(baseConditions, eq(series.seriesCode, productCode)))
          .limit(1)
      : await db
          .select({ id: warehouseTransfers.id })
          .from(warehouseTransfers)
          .innerJoin(items, eq(items.entryId, warehouseTransfers.entryId))
          .where(and(baseConditions, eq(items.itemCode, productCode)))
          .limit(1);

  if (pending) {
    throw new ValidationError(
      `${productCode} is on an inbound warehouse transfer. Receive it through Transfer Receipt — do not create a manual stock entry.`,
    );
  }
}

async function assertNotTransferSourcedCode(
  productCode: string,
  kind: "series" | "item",
) {
  if (kind === "series") {
    const [row] = await db
      .select({ id: entries.id })
      .from(series)
      .innerJoin(entries, eq(entries.id, series.entryId))
      .where(
        and(
          eq(series.seriesCode, productCode),
          eq(entries.inventorySource, InventorySource.TRANSFER),
          eq(entries.isDeleted, false),
        ),
      )
      .limit(1);

    if (row) {
      throw new ValidationError(
        `Series ${productCode} is already registered from a warehouse transfer. Manual stock entry is not allowed for this product ID.`,
      );
    }
    return;
  }

  const [row] = await db
    .select({ id: entries.id })
    .from(items)
    .innerJoin(entries, eq(entries.id, items.entryId))
    .where(
      and(
        eq(items.itemCode, productCode),
        or(
          eq(entries.inventorySource, InventorySource.TRANSFER),
          eq(entries.inventorySource, InventorySource.UNPACK),
        ),
        eq(entries.isDeleted, false),
      ),
    )
    .limit(1);

  if (row) {
    throw new ValidationError(
      `Item ${productCode} is already registered from transfer or unpack. Manual stock entry is not allowed for this product ID.`,
    );
  }
}
