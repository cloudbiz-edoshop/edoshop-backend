import type { Database } from "@/db";

import { PRODUCT_CATEGORIES } from "@/constants/product-categories.constants";

import { productCategories as productCategoriesTable } from "../models/product-categories";

const CHUNK_SIZE = 50;

export default async function seedProductCategories(db: Database) {
  for (let i = 0; i < PRODUCT_CATEGORIES.length; i += CHUNK_SIZE) {
    const chunk = PRODUCT_CATEGORIES.slice(i, i + CHUNK_SIZE).map(
      (category) => ({
        ...category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );

    await db.insert(productCategoriesTable).values(chunk);
  }
}
