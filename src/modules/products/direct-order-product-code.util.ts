import { and, eq, sql } from "drizzle-orm";

import { AppError } from "@/core/errors/app-error";
import db from "@/db";
import { items, products, variants } from "@/db/models";

import {
  findDirectOrderProductIdByIdentifier,
  normalizeProductIdentifierKey,
} from "@/lib/direct-order-product-identifier.util";

/** Legacy warehouse spreadsheet references — not valid for new storefront products. */
export const LEGACY_EXCEL_DIRECT_ORDER_CODE = /^DO-[A-Z]{2}-B\d+-[A-Z0-9]+$/i;

export function isLegacyExcelDirectOrderCode(code: string) {
  return LEGACY_EXCEL_DIRECT_ORDER_CODE.test(code.trim());
}

const itemCodeLooseMatchSql = (column: unknown, looseKey: string) =>
  sql`upper(replace(replace(${column}, '-', ''), ' ', '')) = ${looseKey}`;

/**
 * Resolve a warehouse Item row for a Direct Order product ID (spreadsheet label or EWMS code).
 */
export async function findWarehouseItemForDirectOrderCode(code: string) {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const exact = await db.query.items.findFirst({
    where: eq(items.itemCode, trimmed),
  });
  if (exact) return exact;

  const looseKey = normalizeProductIdentifierKey(trimmed);
  const [loose] = await db
    .select()
    .from(items)
    .where(itemCodeLooseMatchSql(items.itemCode, looseKey))
    .limit(1);
  if (loose) return loose;

  const catalogProductId = await findDirectOrderProductIdByIdentifier(trimmed);
  if (!catalogProductId) return null;

  const [linkedItem] = await db
    .select({ item: items })
    .from(variants)
    .innerJoin(items, eq(items.id, variants.itemId))
    .where(
      and(
        eq(variants.productId, catalogProductId),
        eq(variants.isDeleted, false),
      ),
    )
    .limit(1);

  return linkedItem?.item ?? null;
}

/**
 * Direct Order products must link to an existing EWMS Item code
 * (bundle → series → item hierarchy), not ad-hoc or spreadsheet IDs.
 */
export async function assertValidDirectOrderProductCode(code: string) {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new AppError("Direct Order Product ID is required");
  }

  const item = await findWarehouseItemForDirectOrderCode(trimmed);

  if (!item) {
    const existingCatalogProductId =
      await findDirectOrderProductIdByIdentifier(trimmed);
    if (existingCatalogProductId) {
      const catalogProduct = await db.query.products.findFirst({
        where: and(
          eq(products.id, existingCatalogProductId),
          eq(products.isDeleted, false),
        ),
        columns: { name: true },
      });
      if (catalogProduct) {
        throw new AppError(
          `Product ID "${trimmed}" is already on the catalog (${catalogProduct.name}). Open Product Management and edit that product instead of creating a new one.`,
        );
      }
    }

    if (isLegacyExcelDirectOrderCode(trimmed)) {
      throw new AppError(
        "No EWMS warehouse item exists for this label ID. Create the Item under EWMS → Warehouse entry (Warehouse 1) using this code, or use the EWMS item code from EWMS if it differs from the label.",
      );
    }
    throw new AppError(
      `No warehouse item exists with code "${trimmed}". Create the Item entry in EWMS first, then use that ID here.`,
    );
  }
}
