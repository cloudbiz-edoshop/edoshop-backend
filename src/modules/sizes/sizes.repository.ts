import type { UpdateSizesRequest } from "./sizes.schema";

import type { NewSizes } from "@/db/models/sizes";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { sizes } from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for sizes-related database operations
 */
export class SizesRepository {
  /**
   * Find a sizes by ID
   *
   * @param id - Sizes ID
   * @returns The sizes object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.sizes.findFirst({
      where: eq(sizes.id, id),
    });

    return result;
  }

  /**
   * List sizes with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of sizes and total count
   * @returns {{ data: Sizes[], total: number, searchableFields: string[] }} - List of sizes and total count
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
    const filterCondition = createFilterConditions(sizes, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      sizes,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(sizes.isDeleted, false));
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
    const sortCondition = createSortCondition(sizes, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(sizes)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const sizesData = await tx.query.sizes.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(sizes.createdAt)],
      });

      return { data: sizesData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new sizes
   *
   * @param tx - Transaction
   * @param sizesData - Sizes data
   * @returns The created sizes object
   */
  async create(tx: TX, sizesData: NewSizes) {
    const [result] = await tx
      .insert(sizes)
      .values({
        ...sizesData,
      })
      .returning();
    return result;
  }

  /**
   * Update a size
   *
   * @param tx - Transaction
   * @param id - Size ID to update
   * @param sizesData - Sizes data
   * @returns The updated sizes object
   */
  async update(
    tx: TX,
    id: number,
    sizesData: UpdateSizesRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(sizes)
      .set({
        ...sizesData,
        updatedBy: sizesData.updatedBy,
      })
      .where(eq(sizes.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete multiple sizes by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of sizes IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(sizes)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(sizes.id, ids))
      .returning();

    return result.length > 0;
  }
}
