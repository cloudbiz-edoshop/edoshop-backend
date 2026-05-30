import type { Database } from "@/db";

import { Colors, COLORS_DESCRIPTIONS } from "@/constants";

import { colors as colorsTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process entities in chunks
  for (let i = 0; i < Object.values(Colors).length; i += CHUNK_SIZE) {
    const chunk = Object.values(Colors)
      .slice(i, i + CHUNK_SIZE)
      .map((color) => ({
        name: color,
        description: COLORS_DESCRIPTIONS[color],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(colorsTable).values(chunk);
  }
}
