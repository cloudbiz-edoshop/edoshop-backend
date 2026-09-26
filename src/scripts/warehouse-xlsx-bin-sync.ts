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
import {
  normalizeLegacyReference,
  normalizeProductReferenceKey,
} from "./warehouse-import-utils";
import type { BinResolver } from "./warehouse-xlsx-bin-location.util";

export type { BinResolver } from "./warehouse-xlsx-bin-location.util";
export {
  compactBinLocationKey,
  createBinResolver,
} from "./warehouse-xlsx-bin-location.util";

const productCodeMatchSql = (column: unknown, key: string) =>
  sql`upper(replace(replace(${column}, '-', ''), ' ', '')) = ${key}`;

export async function resolveEntryIdForWarehouseRow(
  legacyReference: string,
  warehouseId: number,
): Promise<number | null> {
  const code = normalizeLegacyReference(legacyReference);
  const looseKey = normalizeProductReferenceKey(legacyReference);
  if (!code) return null;

  const entryFilters = (extra?: ReturnType<typeof sql>) =>
    and(
      eq(entries.warehouseId, warehouseId),
      eq(entries.entryTypeId, EntryTypeIds.ITEM),
      extra,
    );

  const [itemMatch] = await db
    .select({ entryId: items.entryId })
    .from(items)
    .innerJoin(entries, eq(entries.id, items.entryId))
    .where(
      entryFilters(
        sql`(${productCodeMatchSql(items.itemCode, code)} OR ${productCodeMatchSql(items.itemCode, looseKey)})`,
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
        sql`(${productCodeMatchSql(directOrderProducts.directOrderCode, code)} OR ${productCodeMatchSql(directOrderProducts.directOrderCode, looseKey)})`,
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
        sql`(${productCodeMatchSql(items.itemCode, code)} OR ${productCodeMatchSql(items.itemCode, looseKey)})`,
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
  binResolver,
  operatorUserId,
  transfersRepository,
  dryRun,
  syncQuantity,
}: {
  row: WarehouseRow;
  warehouseId: number;
  binResolver: BinResolver;
  operatorUserId: number;
  transfersRepository: WarehouseTransfersRepository;
  dryRun: boolean;
  syncQuantity: boolean;
}) {
  const bin = binResolver.resolve(row.binLocation, warehouseId);
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
