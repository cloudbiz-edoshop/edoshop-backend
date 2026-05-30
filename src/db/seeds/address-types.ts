import type { Database } from "@/db";

import { ADDRESS_TYPE_DESCRIPTIONS, AddressType } from "@/constants";

import { addressTypes as addressTypesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process entities in chunks
  for (let i = 0; i < Object.values(AddressType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(AddressType)
      .slice(i, i + CHUNK_SIZE)
      .map((addressType) => ({
        name: addressType,
        description: ADDRESS_TYPE_DESCRIPTIONS[addressType],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(addressTypesTable).values(chunk);
  }
}
