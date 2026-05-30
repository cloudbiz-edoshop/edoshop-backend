import type { Database } from "@/db";

import { PaymentMethod, PaymentType } from "@/constants";

import {
  paymentMethods as paymentMethodsTable,
  paymentMethodTypes as paymentMethodTypesTable,
  paymentTypes as paymentTypesTable,
} from "../models";

const CHUNK_SIZE = 100;

export default async function seed(db: Database) {
  // First, get all payment methods from the database to have their IDs
  const dbPaymentMethods = await db.select().from(paymentMethodsTable);

  // Then, get all payment types from the database to have their IDs
  const dbPaymentTypes = await db.select().from(paymentTypesTable);

  // Create a map of payment method names to their IDs for easier lookup
  const paymentMethodMap = new Map(
    dbPaymentMethods.map((method) => [method.name, method.id]),
  );

  // Create a map of payment type names to their IDs for easier lookup
  const paymentTypeMap = new Map(
    dbPaymentTypes.map((type) => [type.name, type.id]),
  );

  // Create the relationships - each payment method will have all payment types
  const relationships = [];

  for (const methodName of Object.values(PaymentMethod)) {
    const methodId = paymentMethodMap.get(methodName);

    if (!methodId) {
      console.warn(`Payment method "${methodName}" not found in the database`);
      continue;
    }

    for (const typeName of Object.values(PaymentType)) {
      const typeId = paymentTypeMap.get(typeName);

      if (!typeId) {
        console.warn(`Payment type "${typeName}" not found in the database`);
        continue;
      }

      relationships.push({
        paymentMethodId: methodId,
        paymentTypeId: typeId,
        isActive: true,
        createdBy: 1,
        updatedBy: 1,
      });
    }
  }

  // Insert relationships in chunks to avoid potential database limitations
  for (let i = 0; i < relationships.length; i += CHUNK_SIZE) {
    const chunk = relationships.slice(i, i + CHUNK_SIZE);

    // Using try-catch to handle potential duplicate entries
    try {
      await db.insert(paymentMethodTypesTable).values(chunk);
    } catch (error) {
      console.error(
        `Error inserting payment method types batch ${i}/${relationships.length}:`,
        error,
      );

      // If batch insert fails, try inserting one by one
      for (const relationship of chunk) {
        try {
          await db.insert(paymentMethodTypesTable).values(relationship);
        } catch (individualError) {
          console.warn(
            `Could not insert relationship between method ID ${relationship.paymentMethodId} and type ID ${relationship.paymentTypeId}:`,
            individualError,
          );
        }
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log(
    `Successfully seeded ${relationships.length} payment method type relationships`,
  );
}
