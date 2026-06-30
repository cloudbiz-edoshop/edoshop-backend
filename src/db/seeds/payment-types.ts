import type { Database } from "@/db";

import { PAYMENT_TYPE_DESCRIPTIONS, PaymentType } from "@/constants";

import { paymentTypes as paymentTypesTable } from "../models";

export default async function seed(db: Database) {
  for (const paymentType of Object.values(PaymentType)) {
    await db
      .insert(paymentTypesTable)
      .values({
        name: paymentType,
        description: PAYMENT_TYPE_DESCRIPTIONS[paymentType],
        createdBy: 1,
        updatedBy: 1,
      })
      .onConflictDoUpdate({
        target: paymentTypesTable.name,
        set: {
          description: PAYMENT_TYPE_DESCRIPTIONS[paymentType],
          updatedBy: 1,
        },
      });
  }
}
