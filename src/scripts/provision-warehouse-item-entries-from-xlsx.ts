/* eslint-disable no-console */
import "dotenv/config";

import { and, eq, sql } from "drizzle-orm";

import { EntryStateIds, EntryTypeIds } from "@/constants";
import { WarehouseIds } from "@/constants/warehouses.constants";
import db from "@/db";
import {
  directOrderProducts,
  entries,
  entryProducts,
  items,
  products,
  variants,
} from "@/db/models";

import { resolveWarehouseDatabaseUrl } from "./warehouse-db-url";
import {
  loadWorkbookRowsByReference,
  normalizeLegacyReference,
  normalizeProductReferenceKey,
} from "./warehouse-import-utils";
import {
  getDefaultOperatorUserId,
  parseStockQuantity,
  resolveEntryIdForWarehouseRow,
} from "./warehouse-xlsx-bin-sync";
import {
  assertWarehouseXlsxExists,
  resolveWarehouseXlsxPath,
} from "./warehouse-xlsx-path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const warehouseArg = args.find((arg) => arg.startsWith("--warehouse-id="));
const warehouseId = warehouseArg
  ? Number(warehouseArg.split("=")[1])
  : WarehouseIds.WAREHOUSE_1;

const xlsxPath = resolveWarehouseXlsxPath(args);
assertWarehouseXlsxExists(xlsxPath);
process.env.DATABASE_URL = resolveWarehouseDatabaseUrl(args);

const findDirectOrderProduct = async (legacyReference: string) => {
  const code = normalizeLegacyReference(legacyReference);
  const looseKey = normalizeProductReferenceKey(legacyReference);

  const [row] = await db
    .select({
      id: directOrderProducts.id,
      productId: directOrderProducts.productId,
      directOrderCode: directOrderProducts.directOrderCode,
      seriesId: directOrderProducts.seriesId,
    })
    .from(directOrderProducts)
    .innerJoin(products, eq(products.id, directOrderProducts.productId))
    .where(
      and(
        eq(products.isDeleted, false),
        sql`(upper(replace(replace(${directOrderProducts.directOrderCode}, '-', ''), ' ', '')) = ${looseKey} OR upper(replace(${directOrderProducts.directOrderCode}, ' ', '')) = ${code})`,
      ),
    )
    .limit(1);

  return row ?? null;
};

async function main() {
  console.log(`Reading workbook: ${xlsxPath}`);
  console.log(`Warehouse ID: ${warehouseId}`);

  const rowsByReference = loadWorkbookRowsByReference(xlsxPath);
  const rows = [...rowsByReference.values()];
  console.log(`Unique spreadsheet products: ${rows.length}`);

  const operatorUserId = dryRun ? 0 : await getDefaultOperatorUserId();
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  let created = 0;
  let linkedVariants = 0;
  let skippedExisting = 0;
  let skippedNoCatalog = 0;
  let skippedHasItem = 0;

  for (const row of rows) {
    const itemCode = normalizeLegacyReference(row.legacyReference);
    if (!itemCode) continue;

    const existingEntryId = await resolveEntryIdForWarehouseRow(
      row.legacyReference,
      warehouseId,
    );
    if (existingEntryId) {
      skippedHasItem++;
      continue;
    }

    const catalog = await findDirectOrderProduct(row.legacyReference);
    if (!catalog?.productId) {
      skippedNoCatalog++;
      continue;
    }

    const [existingItem] = await db
      .select({ id: items.id, entryId: items.entryId })
      .from(items)
      .where(sql`upper(replace(${items.itemCode}, ' ', '')) = ${itemCode}`)
      .limit(1);

    if (existingItem?.entryId) {
      skippedExisting++;
      if (!dryRun) {
        await db
          .update(variants)
          .set({
            itemId: existingItem.id,
            updatedAt: now,
            updatedBy: operatorUserId,
          })
          .where(
            and(
              eq(variants.productId, catalog.productId),
              eq(variants.isDeleted, false),
            ),
          );
      }
      continue;
    }

    const quantity = parseStockQuantity(row);
    const description = `Warehouse stock import (${itemCode})`;

    if (dryRun) {
      console.log(`Would create item entry ${itemCode} qty ${quantity}`);
      created++;
      continue;
    }

    const [entry] = await db
      .insert(entries)
      .values({
        entryTypeId: EntryTypeIds.ITEM,
        entryStateId: EntryStateIds.NEW,
        quantity,
        weight: "0.00",
        date: today,
        warehouseId,
        description,
        createdAt: now,
        updatedAt: now,
        createdBy: operatorUserId,
        updatedBy: operatorUserId,
        isDeleted: false,
      })
      .returning({ id: entries.id });

    const [item] = await db
      .insert(items)
      .values({
        entryId: entry.id,
        seriesId: catalog.seriesId ?? null,
        itemCode: catalog.directOrderCode ?? itemCode,
        createdAt: now,
        updatedAt: now,
        createdBy: operatorUserId,
        updatedBy: operatorUserId,
      })
      .returning({ id: items.id });

    await db.insert(entryProducts).values({
      entryId: entry.id,
      productId: catalog.productId,
      createdAt: now,
      updatedAt: now,
      createdBy: operatorUserId,
      updatedBy: operatorUserId,
    });

    const updated = await db
      .update(variants)
      .set({
        itemId: item.id,
        updatedAt: now,
        updatedBy: operatorUserId,
      })
      .where(
        and(
          eq(variants.productId, catalog.productId),
          eq(variants.isDeleted, false),
        ),
      )
      .returning({ id: variants.id });

    linkedVariants += updated.length;
    created++;
    console.log(`Created item entry ${item.itemCode} (entry ${entry.id})`);
  }

  console.log("\n=== Item entry provision summary ===");
  console.log(`Created: ${created}`);
  console.log(`Already linked: ${skippedHasItem}`);
  console.log(`Reused existing item row: ${skippedExisting}`);
  console.log(`No catalog match: ${skippedNoCatalog}`);
  console.log(`Variants linked: ${linkedVariants}`);
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
