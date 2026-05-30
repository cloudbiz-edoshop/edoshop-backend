import type { Database } from "@/db";

import {
  TRANSFER_STATUS_DESCRIPTIONS,
  TransferStatus,
} from "@/constants/transfer-statuses.constants";

import { transferStatuses as transferStatusesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  const statuses = Object.values(TransferStatus).map((status) => ({
    name: status,
    description: TRANSFER_STATUS_DESCRIPTIONS[status],
    createdBy: 1,
    updatedBy: 1,
  }));

  for (let i = 0; i < statuses.length; i += CHUNK_SIZE) {
    const chunk = statuses.slice(i, i + CHUNK_SIZE);
    await db.insert(transferStatusesTable).values(chunk);
  }
}
