import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { paymentTypes } from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for payment type-related database operations
 */
export class PaymentTypesRepository {
  /**
   * Find a payment type by ID
   *
   * @param id - Payment type ID
   * @returns Payment type if found, null otherwise
   */
  async findById(id: number) {
    const result = await db.query.paymentTypes.findFirst({
      where: eq(paymentTypes.id, id),
    });

    return result || null;
  }

  /**
   * Find payment types by IDs
   *
   * @param ids - Payment type IDs
   * @returns Payment types if found, null otherwise
   */
  async findByIds(ids: number[]) {
    const result = await db.query.paymentTypes.findMany({
      where: inArray(paymentTypes.id, ids),
    });

    return result || null;
  }

  /**
   * List payment types with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of payment types and total count
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
    const filterCondition = createFilterConditions(paymentTypes, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      paymentTypes,
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

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get pagination params
    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    // Create sort condition
    const sortCondition = createSortCondition(paymentTypes, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(paymentTypes)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const paymentTypesData = await tx.query.paymentTypes.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition
          ? [sortCondition]
          : [desc(paymentTypes.createdAt)],
      });

      return { data: paymentTypesData, total: totalCount };
    });
  }

  /**
   * Create a new payment type
   *
   * @param tx - Transaction object
   * @param paymentTypeData - Payment type data
   * @param paymentTypeData.name - Payment type name
   * @param paymentTypeData.description - Payment type description
   * @param paymentTypeData.createdBy - Payment type created by
   * @param paymentTypeData.updatedBy - Payment type updated by
   * @returns Created payment type
   * @throws Will throw an error if payment type creation fails
   */
  async create(
    tx: TX,
    paymentTypeData: {
      name: string;
      description?: string;
      createdBy: number;
      updatedBy: number;
    },
  ) {
    const [result] = await tx
      .insert(paymentTypes)
      .values(paymentTypeData)
      .returning();

    if (!result) {
      throw new Error("Payment type could not be created");
    }

    return result;
  }

  /**
   * Update a payment type
   *
   * @param tx - Transaction object
   * @param id - Payment type ID
   * @param paymentTypeData - Payment type data to update
   * @param paymentTypeData.name - Payment type name
   * @param paymentTypeData.description - Payment type description
   * @returns Updated payment type
   * @throws Will throw an error if payment type update fails
   */
  async update(
    tx: TX,
    id: number,
    paymentTypeData: {
      name?: string;
      description?: string;
    },
  ) {
    const [result] = await tx
      .update(paymentTypes)
      .set(paymentTypeData)
      .where(eq(paymentTypes.id, id))
      .returning();

    if (!result) {
      throw new Error(`Payment type with ID ${id} could not be updated`);
    }

    return result;
  }

  /**
   * Delete a payment type
   *
   * @param tx - Transaction object
   * @param id - Payment type ID
   * @returns Deleted payment type ID
   * @throws Will throw an error if payment type deletion fails
   */
  async delete(tx: TX, id: number) {
    const [result] = await tx
      .delete(paymentTypes)
      .where(eq(paymentTypes.id, id))
      .returning({ id: paymentTypes.id });

    if (!result) {
      throw new Error(`Payment type with ID ${id} could not be deleted`);
    }

    return result;
  }
}
