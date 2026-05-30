import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { paymentMethods } from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";
/**
 * Repository for payment method-related database operations
 */
export class PaymentMethodRepository {
  /**
   * Find a payment method by ID
   *
   * @param id - Payment method ID
   * @returns Payment method if found, null otherwise
   */
  async findById(id: number) {
    const result = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.id, id),
      with: {
        paymentMethodTypes: {
          with: {
            paymentType: true,
          },
        },
      },
    });
    if (!result) {
      return null;
    }
    return {
      ...result,
      paymentTypes: result.paymentMethodTypes.map((pmt) => pmt.paymentType),
      paymentMethodTypes: undefined,
    };
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
   * @returns {{ data: PaymentMethod[], total: number, searchableFields: string[] }} - The list of payment methods and metadata
   * @throws {Error} If there is an error during the database operation
   */
  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;

    // Define searchable fields for global search
    const searchableFields = ["name", "description"];

    // Prepare where conditions
    const filterCondition = createFilterConditions(paymentMethods, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      paymentMethods,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }
    whereConditions.push(eq(paymentMethods.isDeleted, false));
    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get pagination params
    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    // Create sort condition
    const sortCondition = createSortCondition(
      paymentMethods,
      sortBy,
      sortOrder,
    );

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(paymentMethods)
        .where(whereClause);

      // Fetch data with filtering, pagination and sorting
      const paymentMethodsData = await tx.query.paymentMethods.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition
          ? [sortCondition]
          : [desc(paymentMethods.createdAt)],
        with: {
          paymentMethodTypes: {
            with: {
              paymentType: true,
            },
          },
        },
      });

      // Transform the data to include payment types directly
      const transformedData = paymentMethodsData.map((method) => {
        return {
          ...method,
          paymentTypes: method.paymentMethodTypes.map((pmt) => pmt.paymentType),
          paymentMethodTypes: undefined,
        };
      });

      return { data: transformedData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new payment method
   *
   * @param tx - Transaction object
   * @param paymentMethodData - Payment method data
   * @param paymentMethodData.name - Payment method name
   * @param paymentMethodData.description - Payment method description
   * @param paymentMethodData.countryId - Payment method country ID
   * @param paymentMethodData.createdBy - Payment method created by
   * @param paymentMethodData.updatedBy - Payment method updated by
   * @returns Created payment method
   * @throws Will throw an error if payment method creation fails
   */
  async create(
    tx: TX,
    paymentMethodData: {
      name: string;
      description?: string;
      countryId: number;
      createdBy: number;
      updatedBy: number;
    },
  ) {
    const [result] = await tx
      .insert(paymentMethods)
      .values(paymentMethodData)
      .returning();

    if (!result) {
      throw new Error("Payment method could not be created");
    }

    return result;
  }

  /**
   * Update a payment method
   *
   * @param tx - Transaction object
   * @param id - Payment method ID
   * @param paymentMethodData - Payment method data to update
   * @param paymentMethodData.name - Payment method name
   * @param paymentMethodData.description - Payment method description
   * @param paymentMethodData.countryId - Payment method country ID
   * @param paymentMethodData.updatedBy - Payment method updated by
   * @returns Updated payment method
   * @throws Will throw an error if payment method update fails
   */
  async update(
    tx: TX,
    id: number,
    paymentMethodData: {
      name?: string;
      description?: string;
      countryId?: number;
      updatedBy: number;
    },
  ) {
    const [result] = await tx
      .update(paymentMethods)
      .set(paymentMethodData)
      .where(eq(paymentMethods.id, id))
      .returning();

    if (!result) {
      throw new Error(`Payment method with ID ${id} could not be updated`);
    }

    return result;
  }

  /**
   * Delete a payment method
   *
   * @param tx - Transaction object
   * @param id - Payment method ID
   * @param deletedBy - Deleted by user ID
   * @returns Deleted payment method ID
   * @throws Will throw an error if payment method deletion fails
   */
  async softDelete(tx: TX, id: number, deletedBy: number) {
    const [result] = await tx
      .update(paymentMethods)
      .set({
        isDeleted: true,
        isActive: false,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(eq(paymentMethods.id, id))
      .returning({ id: paymentMethods.id });

    if (!result) {
      throw new Error(`Payment method with ID ${id} could not be deleted`);
    }

    return result;
  }

  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(paymentMethods)
      .set({
        isDeleted: true,
        isActive: false,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(paymentMethods.id, ids))
      .returning({ id: paymentMethods.id });

    if (result.length === 0) {
      throw new Error(
        `Payment methods with IDs ${ids.join(", ")} could not be deleted`,
      );
    }

    return result;
  }
}
