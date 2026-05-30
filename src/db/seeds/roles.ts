import type { Database } from "@/db";

import { ROLE_DESCRIPTIONS, RoleType } from "@/constants";

import { roles as rolesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process entities in chunks
  for (let i = 0; i < Object.values(RoleType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(RoleType)
      .slice(i, i + CHUNK_SIZE)
      .map((roleType) => ({
        name: roleType,
        description: ROLE_DESCRIPTIONS[roleType],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(rolesTable).values(chunk);
  }
}
