/* eslint-disable no-console */
import { and, eq, isNull, sql } from "drizzle-orm";

import { StoreIds } from "@/constants/stores.constants";
import db from "@/db";
import {
  colors,
  designPatterns,
  directOrderProducts,
  dropshippingProducts,
  items,
  materialTypes,
  products,
  sizes,
  variants,
} from "@/db/models";

const DEFAULT_SIZE_NAME = "xs";
const DEFAULT_COLOR_NAME = "blue";
const DEFAULT_MATERIAL_NAME = "Cotton";
const DEFAULT_DESIGN_PATTERN_NAME = "Solid";
const DEFAULT_QUANTITY = 10;
const dryRun = process.argv.includes("--dry-run");

const findByName = async <T extends { id: number; name: string }>(
  table: { findMany: () => Promise<T[]> },
  name: string,
) => {
  const rows = await table.findMany();
  return rows.find((row) => row.name.toLowerCase() === name.toLowerCase()) || null;
};

const getProductsWithoutSizes = async () => {
  const allProducts = await db.query.products.findMany({
    where: eq(products.isDeleted, false),
    with: {
      variants: {
        where: eq(variants.isDeleted, false),
        with: {
          size: true,
        },
      },
      directOrderProduct: true,
      dropshippingProduct: true,
    },
  });

  return allProducts.filter((product) => {
    const sizeLabels = (product.variants || [])
      .map((variant) => variant.size?.name || variant.size?.description || "")
      .map((value) => String(value).trim())
      .filter(Boolean);

    return sizeLabels.length === 0;
  });
};

const ensureDirectOrderProductCode = async (
  product: Awaited<ReturnType<typeof getProductsWithoutSizes>>[number],
) => {
  if (product.directOrderProduct?.directOrderCode) {
    return product.directOrderProduct.directOrderCode;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(directOrderProducts);

  const directOrderCode = `DO_PK_A01_B1_P${Number(count) + 1}`;

  if (dryRun) {
    console.log(`Would create direct_order_products for product ${product.id}: ${directOrderCode}`);
    return directOrderCode;
  }

  await db.insert(directOrderProducts).values({
    productId: product.id,
    seriesId: product.seriesId,
    directOrderCode,
    createdAt: new Date().toISOString(),
    createdBy: 1,
  });

  return directOrderCode;
};

const ensureDropshippingProductCode = async (
  product: Awaited<ReturnType<typeof getProductsWithoutSizes>>[number],
) => {
  if (product.dropshippingProduct?.dropshippingCode) {
    return product.dropshippingProduct.dropshippingCode;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dropshippingProducts);

  const dropshippingCode = `DS_PK_A01_GEN_P${Number(count) + 1}`;

  if (dryRun) {
    console.log(`Would create dropshipping_products for product ${product.id}: ${dropshippingCode}`);
    return dropshippingCode;
  }

  await db.insert(dropshippingProducts).values({
    productId: product.id,
    dropshippingCode,
    totalItems: DEFAULT_QUANTITY,
    createdAt: new Date().toISOString(),
    createdBy: 1,
  });

  return dropshippingCode;
};

const getDirectOrderItemId = async (seriesId: number | null) => {
  const [item] = await db
    .select({ id: items.id })
    .from(items)
    .where(seriesId ? eq(items.seriesId, seriesId) : isNull(items.seriesId))
    .limit(1);

  return item?.id ?? null;
};

const generateVariantCode = async (
  product: Awaited<ReturnType<typeof getProductsWithoutSizes>>[number],
  colorName: string,
  sizeName: string,
) => {
  if (product.storeId === StoreIds.direct) {
    const directOrderCode = await ensureDirectOrderProductCode(product);
    const result = await db.execute(
      sql`SELECT next_direct_order_variant_code(${directOrderCode}, ${colorName}, ${sizeName})`,
    );
    return result[0].next_direct_order_variant_code as string;
  }

  const dropshippingCode = await ensureDropshippingProductCode(product);
  const result = await db.execute(
    sql`SELECT next_dropshipping_variant_code(${dropshippingCode}, ${colorName}, ${sizeName})`,
  );
  return result[0].next_dropshipping_variant_code as string;
};

const xsSize = await findByName(db.query.sizes, DEFAULT_SIZE_NAME);
const defaultColor = await findByName(db.query.colors, DEFAULT_COLOR_NAME);
const defaultMaterial = await findByName(db.query.materialTypes, DEFAULT_MATERIAL_NAME);
const defaultDesignPattern = await findByName(
  db.query.designPatterns,
  DEFAULT_DESIGN_PATTERN_NAME,
);

if (!xsSize) {
  throw new Error(`Size "${DEFAULT_SIZE_NAME}" was not found`);
}
if (!defaultColor) {
  throw new Error(`Color "${DEFAULT_COLOR_NAME}" was not found`);
}
if (!defaultMaterial) {
  throw new Error(`Material "${DEFAULT_MATERIAL_NAME}" was not found`);
}
if (!defaultDesignPattern) {
  throw new Error(`Design pattern "${DEFAULT_DESIGN_PATTERN_NAME}" was not found`);
}

const productsWithoutSizes = await getProductsWithoutSizes();

if (!productsWithoutSizes.length) {
  console.log("All products already have sizes.");
  process.exit(0);
}

for (const product of productsWithoutSizes) {
  const itemId =
    product.storeId === StoreIds.direct
      ? await getDirectOrderItemId(product.seriesId)
      : null;

  if (product.storeId === StoreIds.direct && !itemId) {
    console.warn(`Skipping product ${product.id} (${product.name}): no item found for direct order variant`);
    continue;
  }

  const variantCode = await generateVariantCode(
    product,
    defaultColor.name,
    xsSize.name,
  );

  if (dryRun) {
    console.log(
      `Would create XS variant for product ${product.id} (${product.name}) -> ${variantCode}`,
    );
    continue;
  }

  await db.insert(variants).values({
    productId: product.id,
    variantCode,
    itemId: itemId ?? undefined,
    colorId: defaultColor.id,
    sizeId: xsSize.id,
    materialTypeId: defaultMaterial.id,
    designPatternId: defaultDesignPattern.id,
    quantity: DEFAULT_QUANTITY,
    additionalInfo: {
      type: "default",
      note: "Auto-created XS fallback variant",
    },
    createdBy: 1,
    updatedBy: 1,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log(`Created XS variant for product ${product.id} (${product.name}) -> ${variantCode}`);
}

console.log(`Processed ${productsWithoutSizes.length} product(s) without sizes.`);
