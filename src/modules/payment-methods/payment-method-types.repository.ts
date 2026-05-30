import type { TX } from "@/lib/types";

import { eq } from "drizzle-orm";

import { paymentMethodTypes } from "@/db/models";
/**
 * Repository for payment method-related database operations
 */
export class PaymentMethodTypesRepository {
  /**
   * Associate payment method types  with a payment method
   *
   * @param tx - Transaction
   * @param data - Payment method types data
   * @param data.paymentMethodId - Payment method ID
   * @param data.paymentTypesIds - Payment types IDs
   * @param data.updatedBy - Updated by user ID
   * @param data.createdBy - Created by user ID
   */
  async associatePaymentMethodTypes(
    tx: TX,
    data: {
      paymentMethodId: number;
      paymentTypesIds: number[];
      updatedBy: number;
      createdBy: number;
    },
  ) {
    await tx.insert(paymentMethodTypes).values(
      data.paymentTypesIds.map((id) => ({
        paymentMethodId: data.paymentMethodId,
        paymentTypeId: id,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
      })),
    );
  }

  /**
   * Delete payment method types by payment method ID
   *
   * @param tx - Transaction
   * @param paymentMethodId - Payment method ID
   */
  async deleteByPaymentMethodId(tx: TX, paymentMethodId: number) {
    const [result] = await tx
      .delete(paymentMethodTypes)
      .where(eq(paymentMethodTypes.paymentMethodId, paymentMethodId))
      .returning({ id: paymentMethodTypes.id });

    if (!result) {
      throw new Error(
        `Payment method types with ID ${paymentMethodId} could not be deleted`,
      );
    }

    return result;
  }
}
