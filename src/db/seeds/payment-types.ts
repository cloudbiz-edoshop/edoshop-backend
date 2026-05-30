import type { Database } from "@/db";

import { PAYMENT_TYPE_DESCRIPTIONS, PaymentType } from "@/constants";

import { paymentTypes as paymentTypesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process entities in chunks
  for (let i = 0; i < Object.values(PaymentType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(PaymentType)
      .slice(i, i + CHUNK_SIZE)
      .map((paymentType) => ({
        name: paymentType,
        description: PAYMENT_TYPE_DESCRIPTIONS[paymentType],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(paymentTypesTable).values(chunk);
  }
}
