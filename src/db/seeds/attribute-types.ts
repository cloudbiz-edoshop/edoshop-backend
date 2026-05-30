import type { Database } from "@/db";

import { ATTRIBUTE_TYPE_DESCRIPTIONS, AttributeType } from "@/constants";

import { attributeTypes as attributeTypesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process entities in chunks
  for (let i = 0; i < Object.values(AttributeType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(AttributeType)
      .slice(i, i + CHUNK_SIZE)
      .map((attributeType) => ({
        name: attributeType,
        description: ATTRIBUTE_TYPE_DESCRIPTIONS[attributeType],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(attributeTypesTable).values(chunk);
  }
}
