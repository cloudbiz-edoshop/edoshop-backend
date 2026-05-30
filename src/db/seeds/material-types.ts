import type { Database } from "@/db";

import { MATERIAL_TYPES } from "@/constants/material-types.constants";
import { materialTypes as materialTypesTable } from "@/db/models/material-types";

const CHUNK_SIZE = 50;

export default async function materialTypesSeed(db: Database) {
  for (let i = 0; i < MATERIAL_TYPES.length; i += CHUNK_SIZE) {
    const chunk = MATERIAL_TYPES.slice(i, i + CHUNK_SIZE).map((type) => ({
      name: type.name,
      description: type.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: type.createdBy,
      updatedBy: type.updatedBy,
    }));

    await db.insert(materialTypesTable).values(chunk);
  }
}
