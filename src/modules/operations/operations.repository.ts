import { and, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { operations } from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for operation-related database operations
 */
export class OperationRepository {
  /**
   * Find an operation by ID
   *
   * @param id - Operation ID
   * @returns Operation if found, null otherwise
   */
  async findById(id: number) {
    const result = await db.query.operations.findFirst({
      where: eq(operations.id, id),
    });

    return result || null;
  }

  /**
   * List operations with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of operations and total count
   * @returns {{ data: Operation[], total: number, searchableFields: string[] }}  - The list of operations and metadata
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
    const filterCondition = createFilterConditions(operations, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      operations,
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
    const sortCondition = createSortCondition(operations, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(operations)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const operationsData = await tx.query.operations.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(operations.createdAt)],
      });

      return { data: operationsData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new operation
   *
   * @param operationData - Operation data
   * @param operationData.name - Operation name
   * @param operationData.description - Operation description
   * @returns Created operation
   * @throws Will throw an error if operation creation fails
   */
  async create(operationData: { name: string; description?: string }) {
    return await db.transaction(async (tx) => {
      const [result] = await tx
        .insert(operations)
        .values(operationData)
        .returning();

      if (!result) {
        throw new Error("Operation could not be created");
      }

      return result;
    });
  }

  /**
   * Update an operation
   *
   * @param id - Operation ID
   * @param operationData - Operation data to update
   * @param operationData.name - Operation name
   * @param operationData.description - Operation description
   * @returns Updated operation
   * @throws Will throw an error if operation update fails
   */
  async update(
    id: number,
    operationData: { name?: string; description?: string },
  ) {
    return await db.transaction(async (tx) => {
      const [result] = await tx
        .update(operations)
        .set(operationData)
        .where(eq(operations.id, id))
        .returning();

      if (!result) {
        throw new Error(`Operation with ID ${id} could not be updated`);
      }

      return result;
    });
  }

  /**
   * Delete an operation
   *
   * @param id - Operation ID
   * @returns Deleted operation ID
   * @throws Will throw an error if operation deletion fails
   */
  async delete(id: number) {
    return await db.transaction(async (tx) => {
      const [result] = await tx
        .delete(operations)
        .where(eq(operations.id, id))
        .returning({ id: operations.id });

      if (!result) {
        throw new Error(`Operation with ID ${id} could not be deleted`);
      }

      return result;
    });
  }
}
