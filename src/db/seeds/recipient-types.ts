import type { Database } from "@/db";

import { RECIPIENT_TYPE_DESCRIPTIONS, RecipientType } from "@/constants";

import { recipientTypes as recipientTypesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process entities in chunks
  for (let i = 0; i < Object.values(RecipientType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(RecipientType)
      .slice(i, i + CHUNK_SIZE)
      .map((recipientType) => ({
        name: recipientType,
        description: RECIPIENT_TYPE_DESCRIPTIONS[recipientType],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(recipientTypesTable).values(chunk);
  }
}
