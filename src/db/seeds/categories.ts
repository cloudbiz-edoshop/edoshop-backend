import type { Database } from "@/db";

import { CATEGORIES } from "@/constants/categories.constants";

import { categories as categoriesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seedCategories(db: Database) {
  for (let i = 0; i < CATEGORIES.length; i += CHUNK_SIZE) {
    const chunk = CATEGORIES.slice(i, i + CHUNK_SIZE).map((category) => ({
      ...category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await db.insert(categoriesTable).values(chunk);
  }
}
