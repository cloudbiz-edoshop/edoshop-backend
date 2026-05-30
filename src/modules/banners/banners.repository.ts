import type { UpdateBannersRequest } from "./banners.schema";

import type { NewBanners } from "@/db/models/banners";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { banners } from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for banners-related database operations
 */
export class BannersRepository {
  /**
   * Find a banners by ID
   *
   * @param id - Banners ID
   * @returns The banners object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.banners.findFirst({
      where: eq(banners.id, id),
    });

    return result;
  }

  /**
   * List banners with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of banners and total count
   * @returns {{ data: Banners[], total: number, searchableFields: string[] }} - List of banners and total count
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
    const searchableFields = [
      "heading",
      "subtext",
      "primaryButtonText",
      "secondaryButtonText",
    ];

    // Prepare where conditions
    const filterCondition = createFilterConditions(banners, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      banners,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(banners.isDeleted, false));
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
    const sortCondition = createSortCondition(banners, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(banners)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const bannersData = await tx.query.banners.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(banners.createdAt)],
      });

      return { data: bannersData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new banners
   *
   * @param tx - Transaction
   * @param bannersData - Banners data
   * @returns The created banners object
   */
  async create(tx: TX, bannersData: NewBanners) {
    const [result] = await tx
      .insert(banners)
      .values({
        ...bannersData,
      })
      .returning();
    return result;
  }

  /**
   * Update a banners
   *
   * @param tx - Transaction
   * @param id - FAQ ID to update
   * @param bannersData - Banners data
   * @returns The updated banners object
   */
  async update(
    tx: TX,
    id: number,
    bannersData: UpdateBannersRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(banners)
      .set({
        ...bannersData,
        updatedBy: bannersData.updatedBy,
      })
      .where(eq(banners.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete multiple banners by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of banners IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(banners)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(banners.id, ids))
      .returning();

    return result.length > 0;
  }
}
