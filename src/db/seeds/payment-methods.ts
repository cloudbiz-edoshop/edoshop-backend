import type { Database } from "@/db";

import { PAYMENT_METHOD_DESCRIPTIONS, PaymentMethod } from "@/constants";

import { paymentMethods as paymentMethodsTable } from "../models";

export default async function seed(db: Database) {
  for (const paymentMethod of Object.values(PaymentMethod)) {
    await db
      .insert(paymentMethodsTable)
      .values({
        name: paymentMethod,
        description: PAYMENT_METHOD_DESCRIPTIONS[paymentMethod],
        countryId: 1,
        createdBy: 1,
        updatedBy: 1,
      })
      .onConflictDoUpdate({
        target: paymentMethodsTable.name,
        set: {
          description: PAYMENT_METHOD_DESCRIPTIONS[paymentMethod],
          isActive: true,
          isDeleted: false,
          updatedBy: 1,
        },
      });
  }
}
