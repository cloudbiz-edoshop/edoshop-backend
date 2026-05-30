import type { Database } from "@/db";

import {
  GROUP_CRITERIA_TYPE_DESCRIPTIONS,
  GroupCriteriaType,
} from "@/constants/group-criteria-types.constant";

import { groupCriteriaTypes as groupCriteriaTypesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process group criteria types in chunks
  for (let i = 0; i < Object.values(GroupCriteriaType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(GroupCriteriaType)
      .slice(i, i + CHUNK_SIZE)
      .map((type) => ({
        name: type,
        description: GROUP_CRITERIA_TYPE_DESCRIPTIONS[type],
        createdBy: 1,
        updatedBy: 1,
      }));

    await db.insert(groupCriteriaTypesTable).values(chunk).onConflictDoNothing();
  }
}
