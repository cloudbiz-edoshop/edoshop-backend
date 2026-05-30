import { NotFoundError } from "@/core/errors";
import db from "@/db";

import { PaymentMethodTypesRepository } from "./payment-method-types.repository";
import { PaymentMethodRepository } from "./payment-methods.repository";
import { PaymentTypesRepository } from "./payment-types.repository";

/**
 * Service for payment method management operations
 */
export class PaymentMethodService {
  private readonly paymentMethodRepository: PaymentMethodRepository;
  private readonly paymentTypesRepository: PaymentTypesRepository;
  private readonly paymentMethodTypesRepository: PaymentMethodTypesRepository;
  /**
   * Create a new PaymentMethodService
   */
  constructor() {
    this.paymentMethodRepository = new PaymentMethodRepository();
    this.paymentTypesRepository = new PaymentTypesRepository();
    this.paymentMethodTypesRepository = new PaymentMethodTypesRepository();
  }

  /**
   * List payment methods with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of payment methods and total count
   */
  async listPaymentMethods(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.paymentMethodRepository.list(params);
  }

  /**
   * Get a payment method by ID
   *
   * @param id - Payment method ID
   * @returns Payment method
   * @throws NotFoundError if payment method is not found
   */
  async getPaymentMethod(id: number) {
    const paymentMethod = await this.paymentMethodRepository.findById(id);

    if (!paymentMethod) {
      throw new NotFoundError(`Payment method with ID ${id} not found`);
    }

    return paymentMethod;
  }

  /**
   * Create a new payment method
   *
   * @param data - Payment method data
   * @param data.name - Payment method name
   * @param data.description - Payment method description
   * @param data.countryId - Payment method country ID
   * @param data.createdBy - Payment method created by
   * @param data.updatedBy - Payment method updated by
   * @param data.paymentTypesIds - Payment method types IDs
   * @returns Created payment method
   */
  async createPaymentMethod(data: {
    name: string;
    description?: string;
    countryId: number;
    createdBy: number;
    updatedBy: number;
    paymentTypesIds: number[];
  }) {
    // check if payment method types exist
    const paymentTypes = await this.paymentTypesRepository.findByIds(
      data.paymentTypesIds,
    );
    if (!paymentTypes || paymentTypes.length !== data.paymentTypesIds.length) {
      throw new NotFoundError(
        "Payment types not found or some payment types do not exist",
      );
    }
    // Use a transaction to ensure atomicity between payment method and payment method types creation
    const result = await db.transaction(async (tx) => {
      // Create payment method
      const paymentMethod = await this.paymentMethodRepository.create(tx, data);
      // create payment method types
      await this.paymentMethodTypesRepository.associatePaymentMethodTypes(tx, {
        paymentMethodId: paymentMethod.id,
        paymentTypesIds: data.paymentTypesIds,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
      });
      return { ...paymentMethod, paymentTypes };
    });
    return result;
  }

  /**
   * Update a payment method
   *
   * @param id - Payment method ID
   * @param data - Payment method data to update
   * @param data.name - Payment method name
   * @param data.description - Payment method description
   * @param data.updatedBy - Payment method updated by
   * @param data.paymentTypesIds - Payment method types IDs
   * @returns Updated payment method
   * @throws NotFoundError if payment method is not found
   */
  async updatePaymentMethod(
    id: number,
    data: {
      name?: string;
      description?: string;
      updatedBy: number;
      paymentTypesIds?: number[];
    },
  ) {
    // Check if payment method exists
    const existingPaymentMethod =
      await this.paymentMethodRepository.findById(id);
    if (!existingPaymentMethod) {
      throw new NotFoundError(`Payment method with ID ${id} not found`);
    }
    // check if payment method types exist
    if (data.paymentTypesIds) {
      const paymentTypes = await this.paymentTypesRepository.findByIds(
        data.paymentTypesIds,
      );
      if (
        !paymentTypes ||
        paymentTypes.length !== data.paymentTypesIds.length
      ) {
        throw new NotFoundError(
          "Payment types not found or some payment types do not exist",
        );
      }
    }
    // Use a transaction to ensure atomicity between payment method and payment method types creation
    const result = await db.transaction(async (tx) => {
      // Update payment method
      const paymentMethod = await this.paymentMethodRepository.update(
        tx,
        id,
        data,
      );
      // update payment method types
      if (data.paymentTypesIds) {
        // delete existing payment method types
        await this.paymentMethodTypesRepository.deleteByPaymentMethodId(
          tx,
          paymentMethod.id,
        );
        // create new payment method types
        await this.paymentMethodTypesRepository.associatePaymentMethodTypes(
          tx,
          {
            paymentMethodId: paymentMethod.id,
            paymentTypesIds: data.paymentTypesIds,
            createdBy: data.updatedBy,
            updatedBy: data.updatedBy,
          },
        );
      }
      return paymentMethod;
    });
    if (!result) {
      throw new Error(`Payment method with ID ${id} could not be updated`);
    }
    // fetch updated payment method
    const updatedPaymentMethod =
      await this.paymentMethodRepository.findById(id);
    if (!updatedPaymentMethod) {
      throw new Error(`Payment method with ID ${id} could not be updated`);
    }
    return updatedPaymentMethod;
  }

  /**
   * Delete a payment method
   *
   * @param id - Payment method ID
   * @param deletedBy - Deleted by user ID
   * @returns Deleted payment method ID
   * @throws NotFoundError if payment method is not found
   */
  async deletePaymentMethod(id: number, deletedBy: number) {
    // Check if payment method exists
    const existingPaymentMethod =
      await this.paymentMethodRepository.findById(id);
    if (!existingPaymentMethod) {
      throw new NotFoundError(`Payment method with ID ${id} not found`);
    }

    // Use a transaction to ensure atomicity between payment method and payment method types deletion
    const result = await db.transaction(async (tx) => {
      // Delete payment method types
      // commenting for now due to foreign key constraint - Soft delete is used instead
      // await this.paymentMethodTypesRepository.deleteByPaymentMethodId(tx, id);
      // Delete payment method
      return await this.paymentMethodRepository.softDelete(tx, id, deletedBy);
    });

    return result;
  }

  /**
   * Delete multiple payment methods
   *
   * @param ids - Payment method IDs
   * @param deletedBy - Deleted by user ID
   * @returns Deleted payment methods
   */
  async deletePaymentMethods(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.paymentMethodRepository.softDeleteMany(
        tx,
        ids,
        deletedBy,
      );
    });
    if (result.length === 0) {
      throw new NotFoundError(
        `Payment methods with IDs ${ids.join(", ")} not found`,
      );
    }
    return result;
  }
}
