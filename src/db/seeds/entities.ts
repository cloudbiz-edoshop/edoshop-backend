import type { Database } from "@/db";

import { ENTITY_DESCRIPTIONS, EntityType } from "@/constants";

import { entities as entitiesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process entities in chunks
  for (let i = 0; i < Object.values(EntityType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(EntityType)
      .slice(i, i + CHUNK_SIZE)
      .map((entityType) => ({
        name: entityType,
        description: ENTITY_DESCRIPTIONS[entityType],
      }));
    await db.insert(entitiesTable).values(chunk);
  }
}
