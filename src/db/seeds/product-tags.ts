// db/seeds/seedProductTags.ts

import type { Database } from "@/db";

import { PRODUCT_TAGS } from "@/constants/product-tags.constants";

import { productTags as productTagsTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seedProductTags(db: Database) {
  for (let i = 0; i < PRODUCT_TAGS.length; i += CHUNK_SIZE) {
    const chunk = PRODUCT_TAGS.slice(i, i + CHUNK_SIZE).map((tag) => ({
      ...tag,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await db.insert(productTagsTable).values(chunk);
  }
}
