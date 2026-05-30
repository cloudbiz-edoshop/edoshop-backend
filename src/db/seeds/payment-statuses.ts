import type { Database } from "@/db";

import {
  PAYMENT_STATUSES,
  PAYMENT_STATUSES_DESCRIPTIONS,
} from "@/constants/payment-statuses.constants";

import { paymentStatuses as paymentStatusesTable } from "../models/payment-statuses";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < Object.values(PAYMENT_STATUSES).length; i += CHUNK_SIZE) {
    const chunk = Object.values(PAYMENT_STATUSES)
      .slice(i, i + CHUNK_SIZE)
      .map((status) => ({
        name: status,
        description: PAYMENT_STATUSES_DESCRIPTIONS[status],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(paymentStatusesTable).values(chunk);
  }
}
