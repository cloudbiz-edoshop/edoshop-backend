import type { Database } from "@/db";

import { ENTRY_TYPE_DESCRIPTIONS, EntryType, EntryTypeIds } from "@/constants";

import { entryTypes as entryTypesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process entities in chunks
  for (let i = 0; i < Object.values(EntryType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(EntryType)
      .slice(i, i + CHUNK_SIZE)
      .map((entryType) => ({
        id: EntryTypeIds[entryType],
        name: entryType.toLowerCase(),
        description: ENTRY_TYPE_DESCRIPTIONS[entryType],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(entryTypesTable).values(chunk);
  }
}
