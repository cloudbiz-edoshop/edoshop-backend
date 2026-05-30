import type { Database } from "@/db";

import { PAYMENT_METHOD_DESCRIPTIONS, PaymentMethod } from "@/constants";

import { paymentMethods as paymentMethodsTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process entities in chunks
  for (let i = 0; i < Object.values(PaymentMethod).length; i += CHUNK_SIZE) {
    const chunk = Object.values(PaymentMethod)
      .slice(i, i + CHUNK_SIZE)
      .map((paymentMethod) => ({
        name: paymentMethod,
        description: PAYMENT_METHOD_DESCRIPTIONS[paymentMethod],
        countryId: 1,
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(paymentMethodsTable).values(chunk);
  }
}
