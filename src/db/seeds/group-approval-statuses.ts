import type { Database } from "@/db";

import {
  GROUP_APPROVAL_STATUS_DESCRIPTIONS,
  GroupApprovalStatus,
} from "@/constants/group-approval-statuses.constants";

import { groupApprovalStatuses as groupApprovalStatusesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  const entries = Object.values(GroupApprovalStatus).map((status) => ({
    name: status,
    description: GROUP_APPROVAL_STATUS_DESCRIPTIONS[status],
    createdBy: 1,
    updatedBy: 1,
  }));

  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, i + CHUNK_SIZE);
    await db.insert(groupApprovalStatusesTable).values(chunk);
  }
}
