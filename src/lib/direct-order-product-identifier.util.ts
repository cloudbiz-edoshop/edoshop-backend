import { and, eq, or, sql } from "drizzle-orm";

import db from "@/db";
import { directOrderProducts, products } from "@/db/models";

import { isLegacyExcelDirectOrderCode } from "@/modules/products/direct-order-product-code.util";

export const normalizeProductIdentifierKey = (value: string) =>
  String(value ?? "")
    .trim()
    .replace(/[-\s]/g, "")
    .toUpperCase();

const identifierMatchSql = (column: unknown, key: string) =>
  sql`upper(replace(replace(${column}, '-', ''), ' ', '')) = ${key}`;

/** Match active catalog product by current or legacy Direct Order product ID. */
export async function findDirectOrderProductIdByIdentifier(
  rawCode: string,
): Promise<number | null> {
  const trimmed = rawCode.trim();
  if (!trimmed) return null;

  const looseKey = normalizeProductIdentifierKey(trimmed);

  const [row] = await db
    .select({ productId: directOrderProducts.productId })
    .from(directOrderProducts)
    .innerJoin(products, eq(directOrderProducts.productId, products.id))
    .where(
      and(
        eq(products.isDeleted, false),
        or(
          eq(directOrderProducts.directOrderCode, trimmed),
          eq(directOrderProducts.legacyDirectOrderCode, trimmed),
          identifierMatchSql(directOrderProducts.directOrderCode, looseKey),
          identifierMatchSql(directOrderProducts.legacyDirectOrderCode, looseKey),
        ),
      ),
    )
    .limit(1);

  return row?.productId ?? null;
}

export function shouldStoreLegacyDirectOrderCode(code: string) {
  return isLegacyExcelDirectOrderCode(code);
}
