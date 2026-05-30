import type { UpdateFiltersRequest } from "./filters.schema";

import type { NewFilters } from "@/db/models/filters";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { filters } from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for filters-related database operations
 */
export class FiltersRepository {
  /**
   * Find a filters by ID
   *
   * @param id - Filters ID
   * @returns The filters object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.filters.findFirst({
      where: eq(filters.id, id),
    });

    return result;
  }

  /**
   * List filters with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of filters and total count
   * @returns {{ data: Filters[], total: number, searchableFields: string[] }} - List of filters and total count
   */
  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    const {
      search,
      page,
      limit,
      sortBy,
      sortOrder,
      filters: _filters,
    } = params;

    // Define searchable fields for global search
    const searchableFields = ["name", "description"];

    // Prepare where conditions
    const filterCondition = createFilterConditions(filters, _filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      filters,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(filters.isDeleted, false));
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
    const sortCondition = createSortCondition(filters, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(filters)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const filtersData = await tx.query.filters.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(filters.createdAt)],
      });

      return { data: filtersData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new filters
   *
   * @param tx - Transaction
   * @param filtersData - Filters data
   * @returns The created filters object
   */
  async create(tx: TX, filtersData: NewFilters) {
    const [result] = await tx
      .insert(filters)
      .values({
        ...filtersData,
      })
      .returning();
    return result;
  }

  /**
   * Update a filter
   *
   * @param tx - Transaction
   * @param id - Filter ID to update
   * @param filtersData - Filters data
   * @returns The updated filters object
   */
  async update(
    tx: TX,
    id: number,
    filtersData: UpdateFiltersRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(filters)
      .set({
        ...filtersData,
        updatedBy: filtersData.updatedBy,
      })
      .where(eq(filters.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete multiple filters by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of filters IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(filters)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(filters.id, ids))
      .returning();

    return result.length > 0;
  }
}
