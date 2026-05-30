import type { Database } from "@/db";

import {
  REVIEW_STATUS_DESCRIPTIONS,
  ReviewStatus,
} from "@/constants/review-statuses.constants";

import { reviewStatuses as reviewStatusesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  const entries = Object.values(ReviewStatus).map((status) => ({
    name: status,
    description: REVIEW_STATUS_DESCRIPTIONS[status],
    createdBy: 1,
    updatedBy: 1,
  }));

  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, i + CHUNK_SIZE);
    await db.insert(reviewStatusesTable).values(chunk);
  }
}
