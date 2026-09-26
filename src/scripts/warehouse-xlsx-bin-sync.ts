import { and, eq, sql } from "drizzle-orm";

import { EntryTypeIds } from "@/constants";
import db from "@/db";
import {
  directOrderProducts,
  entries,
  items,
  products,
  users,
  variants,
} from "@/db/models";
import { WarehouseTransfersRepository } from "@/modules/warehouse-transfers/warehouse-transfers.repository";

import type { WarehouseRow } from "./warehouse-import-utils";
import { normalizeLegacyReference } from "./warehouse-import-utils";

/** Matches Rayons UI `displayLocationCode` and spreadsheet bin labels. */
export const normalizeBinLocationKey = (value: string) =>
  String(value ?? "")
    .trim()
    .replace(/^W\d+-/i, "")
    .replace(/\s+/g, "")
    .toUpperCase();

export type BinIndex = Map<string, { id: number; locationCode: string }>;

export const buildBinIndex = (
  rows: Array<{ id: number; locationCode: string }>,
): BinIndex => {
  const index = new Map<string, { id: number; locationCode: string }>();
  for (const row of rows) {
    const key = normalizeBinLocationKey(row.locationCode);
    if (!key || index.has(key)) continue;
    index.set(key, row);
  }
  return index;
};

export const resolveBinFromIndex = (
  index: BinIndex,
  rawBinLocation: string,
  warehouseId: number,
) => {
  const trimmed = String(rawBinLocation ?? "").trim();
  if (!trimmed) return null;

  const keys = [
    normalizeBinLocationKey(trimmed),
    normalizeBinLocationKey(`W${warehouseId}-${trimmed}`),
  ].filter(Boolean);

  for (const key of keys) {
    const hit = index.get(key);
    if (hit) return hit;
  }

  return null;
};

export async function resolveEntryIdForWarehouseRow(
  legacyReference: string,
  warehouseId: number,
): Promise<number | null> {
  const code = normalizeLegacyReference(legacyReference);
  if (!code) return null;

  const [itemMatch] = await db
    .select({ entryId: items.entryId })
    .from(items)
    .innerJoin(entries, eq(entries.id, items.entryId))
    .where(
      and(
        eq(entries.warehouseId, warehouseId),
        eq(entries.entryTypeId, EntryTypeIds.ITEM),
        sql`upper(replace(${items.itemCode}, ' ', '')) = ${code}`,
      ),
    )
    .limit(1);

  if (itemMatch?.entryId) {
    return itemMatch.entryId;
  }

  const [catalogMatch] = await db
    .select({ entryId: items.entryId })
    .from(directOrderProducts)
    .innerJoin(products, eq(products.id, directOrderProducts.productId))
    .innerJoin(variants, eq(variants.productId, products.id))
    .innerJoin(items, eq(items.id, variants.itemId))
    .innerJoin(entries, eq(entries.id, items.entryId))
    .where(
      and(
        eq(sql`upper(replace(${directOrderProducts.directOrderCode}, ' ', ''))`, code),
        eq(entries.warehouseId, warehouseId),
        eq(entries.entryTypeId, EntryTypeIds.ITEM),
        eq(variants.isDeleted, false),
        eq(products.isDeleted, false),
      ),
    )
    .limit(1);

  if (catalogMatch?.entryId) {
    return catalogMatch.entryId;
  }

  const [catalogItemCodeMatch] = await db
    .select({ entryId: items.entryId })
    .from(directOrderProducts)
    .innerJoin(products, eq(products.id, directOrderProducts.productId))
    .innerJoin(variants, eq(variants.productId, products.id))
    .innerJoin(items, eq(items.id, variants.itemId))
    .innerJoin(entries, eq(entries.id, items.entryId))
    .where(
      and(
        eq(sql`upper(replace(${items.itemCode}, ' ', ''))`, code),
        eq(entries.warehouseId, warehouseId),
        eq(entries.entryTypeId, EntryTypeIds.ITEM),
        eq(variants.isDeleted, false),
        eq(products.isDeleted, false),
      ),
    )
    .limit(1);

  return catalogItemCodeMatch?.entryId ?? null;
}

export const parseStockQuantity = (row: WarehouseRow) => {
  const remaining = Number.parseInt(row.remainingStock, 10);
  if (Number.isFinite(remaining) && remaining > 0) {
    return remaining;
  }
  const quantity = Number.parseInt(row.quantity, 10);
  if (Number.isFinite(quantity) && quantity > 0) {
    return quantity;
  }
  return 1;
};

export async function getDefaultOperatorUserId() {
  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isAdmin, true), eq(users.isDeleted, false)))
    .limit(1);

  if (!adminUser) {
    throw new Error("No admin user found to use as createdBy for bin sync.");
  }

  return adminUser.id;
}

export async function syncWarehouseRowToBin({
  row,
  warehouseId,
  binIndex,
  operatorUserId,
  transfersRepository,
  dryRun,
  syncQuantity,
}: {
  row: WarehouseRow;
  warehouseId: number;
  binIndex: BinIndex;
  operatorUserId: number;
  transfersRepository: WarehouseTransfersRepository;
  dryRun: boolean;
  syncQuantity: boolean;
}) {
  const bin = resolveBinFromIndex(binIndex, row.binLocation, warehouseId);
  if (!bin) {
    return { status: "missing_bin" as const, reference: row.legacyReference };
  }

  const entryId = await resolveEntryIdForWarehouseRow(
    row.legacyReference,
    warehouseId,
  );
  if (!entryId) {
    return { status: "missing_entry" as const, reference: row.legacyReference };
  }

  const quantity = parseStockQuantity(row);

  if (dryRun) {
    return {
      status: "would_assign" as const,
      reference: row.legacyReference,
      entryId,
      binId: bin.id,
      locationCode: bin.locationCode,
      quantity,
    };
  }

  if (syncQuantity) {
    await db
      .update(entries)
      .set({
        quantity,
        updatedAt: new Date().toISOString(),
        updatedBy: operatorUserId,
      })
      .where(eq(entries.id, entryId));
  }

  await transfersRepository.assignEntryToBin(entryId, bin.id, operatorUserId);

  return {
    status: "assigned" as const,
    reference: row.legacyReference,
    entryId,
    binId: bin.id,
    locationCode: bin.locationCode,
    quantity,
  };
}
