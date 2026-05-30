import type { Database } from "@/db";

import { eq } from "drizzle-orm";

import { VARIANTS } from "@/constants/variants.constants";

import { directOrderProducts, dropshippingProducts, variants as variantsTable } from "../models";

const CHUNK_SIZE = 50;

/**
 * Generate variant code based on product type
 * Format: ProductCode_COLOR_SIZE
 * Example: DS_PK_A01_MEN_P1_RED_L or DO_PK_A01_B1_P1_BLUE_M
 */
async function generateVariantCode(
  db: Database,
  productId: number,
  colorName: string,
  sizeName: string,
): Promise<string> {
  // Get product code from either direct_order_products or dropshipping_products
  const directOrderProduct = await db.query.directOrderProducts.findFirst({
    where: eq(directOrderProducts.productId, productId),
  });

  const dropshippingProduct = await db.query.dropshippingProducts.findFirst({
    where: eq(dropshippingProducts.productId, productId),
  });

  let productCode: string | null = null;

  if (directOrderProduct?.directOrderCode) {
    productCode = directOrderProduct.directOrderCode;
  } else if (dropshippingProduct?.dropshippingCode) {
    productCode = dropshippingProduct.dropshippingCode;
  }

  if (!productCode) {
    throw new Error(`Product code not found for product ID ${productId}`);
  }

  // Convert color name to code (first 3 letters, uppercase)
  const colorCode = colorName.substring(0, 3).toUpperCase();

  // Convert size name to code (first 2 letters, uppercase)
  const sizeCode = sizeName.substring(0, 2).toUpperCase();

  // Format: ProductCode_COLOR_SIZE
  return `${productCode}_${colorCode}_${sizeCode}`;
}

export default async function seed(db: Database) {
  // First, get all colors and sizes for lookups
  const allColors = await db.query.colors.findMany();
  const allSizes = await db.query.sizes.findMany();

  const colorMap = new Map(allColors.map((c) => [c.id, c.name]));
  const sizeMap = new Map(allSizes.map((s) => [s.id, s.name]));

  // Generate variant codes and insert variants
  const variantsWithCodes = [];
  for (const variant of VARIANTS) {
    const colorName = colorMap.get(variant.colorId);
    const sizeName = sizeMap.get(variant.sizeId);

    if (!colorName || !sizeName) {
      throw new Error(
        `Color ID ${variant.colorId} or Size ID ${variant.sizeId} not found`,
      );
    }

    const variantCode = await generateVariantCode(
      db,
      variant.productId,
      colorName,
      sizeName,
    );

    variantsWithCodes.push({
      ...variant,
      variantCode,
      isDeleted: false,
      deletedBy: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Insert variants in chunks
  for (let i = 0; i < variantsWithCodes.length; i += CHUNK_SIZE) {
    const chunk = variantsWithCodes.slice(i, i + CHUNK_SIZE);
    await db.insert(variantsTable).values(chunk);
  }
}
