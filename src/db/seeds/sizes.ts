import type { Database } from "@/db";

import { Sizes, SIZES_DESCRIPTIONS } from "@/constants";

import { sizes as sizesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process entities in chunks
  for (let i = 0; i < Object.values(Sizes).length; i += CHUNK_SIZE) {
    const chunk = Object.values(Sizes)
      .slice(i, i + CHUNK_SIZE)
      .map((size) => ({
        name: size,
        description: SIZES_DESCRIPTIONS[size],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(sizesTable).values(chunk);
  }
}
