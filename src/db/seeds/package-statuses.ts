import type { Database } from "@/db";

import { PACKAGE_STATUSES, PACKAGE_STATUSES_DESCRIPTIONS } from "@/constants";

import { packageStatuses as packageStatusesTable } from "../models";

const CHUNK_SIZE = 50;
export default async function seed(db: Database) {
  for (let i = 0; i < Object.values(PACKAGE_STATUSES).length; i += CHUNK_SIZE) {
    const chunk = Object.values(PACKAGE_STATUSES)
      .slice(i, i + CHUNK_SIZE)
      .map((status) => ({
        name: status,
        description: PACKAGE_STATUSES_DESCRIPTIONS[status as PACKAGE_STATUSES],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(packageStatusesTable).values(chunk);
  }
}
