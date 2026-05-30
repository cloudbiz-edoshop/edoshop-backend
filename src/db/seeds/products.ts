import type { Database } from "@/db";

import { ProductStoreType } from "@/constants/product-store-types.constants";
import { PRODUCTS } from "@/constants/products.constants";

import { directOrderProducts, dropshippingProducts, products as productsTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seedProducts(db: Database) {
  // Insert products
  const productResults = [];
  for (let i = 0; i < PRODUCTS.length; i += CHUNK_SIZE) {
    const chunk = PRODUCTS.slice(i, i + CHUNK_SIZE).map((product) => {
      const { productType, directOrderCode, dropshippingCode, totalItems, groupCriteriaId, completionCriteria, ...productData } = product;
      return {
        ...productData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const inserted = await db.insert(productsTable).values(chunk).returning();
    productResults.push(...inserted);
  }

  // Create direct_order_products and dropshipping_products records
  for (let i = 0; i < PRODUCTS.length; i++) {
    const productConfig = PRODUCTS[i];
    const product = productResults[i];

    if (!product)
      continue;

    if (productConfig.productType === ProductStoreType.DIRECT_ORDER && productConfig.directOrderCode) {
      await db.insert(directOrderProducts).values({
        productId: product.id,
        seriesId: product.seriesId,
        directOrderCode: productConfig.directOrderCode,
        createdAt: new Date().toISOString(),
        createdBy: productConfig.createdBy,
      });
    } else if (productConfig.productType === ProductStoreType.DROPSHIPPING && productConfig.dropshippingCode) {
      await db.insert(dropshippingProducts).values({
        productId: product.id,
        dropshippingCode: productConfig.dropshippingCode,
        totalItems: productConfig.totalItems || null,
        groupCriteriaId: productConfig.groupCriteriaId || null,
        completionCriteria: productConfig.completionCriteria || null,
        createdAt: new Date().toISOString(),
        createdBy: productConfig.createdBy,
      });
    }
  }
}
