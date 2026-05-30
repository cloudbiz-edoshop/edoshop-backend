import type { UpdateColorsRequest } from "./colors.schema";

import type { NewColors } from "@/db/models/colors";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { colors } from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for colors-related database operations
 */
export class ColorsRepository {
  /**
   * Find a colors by ID
   *
   * @param id - Colors ID
   * @returns The colors object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.colors.findFirst({
      where: eq(colors.id, id),
    });

    return result;
  }

  /**
   * List colors with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of colors and total count
   * @returns {{ data: Colors[], total: number, searchableFields: string[] }} - List of colors and total count
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
    const filterCondition = createFilterConditions(colors, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      colors,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(colors.isDeleted, false));
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
    const sortCondition = createSortCondition(colors, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(colors)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const colorsData = await tx.query.colors.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(colors.createdAt)],
      });

      return { data: colorsData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new colors
   *
   * @param tx - Transaction
   * @param colorsData - Colors data
   * @returns The created colors object
   */
  async create(tx: TX, colorsData: NewColors) {
    const [result] = await tx
      .insert(colors)
      .values({
        ...colorsData,
      })
      .returning();
    return result;
  }

  /**
   * Update a colors
   *
   * @param tx - Transaction
   * @param id - Colors ID to update
   * @param colorsData - Colors data
   * @returns The updated colors object
   */
  async update(
    tx: TX,
    id: number,
    colorsData: UpdateColorsRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(colors)
      .set({
        ...colorsData,
        updatedBy: colorsData.updatedBy,
      })
      .where(eq(colors.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete multiple colors by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of colors IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(colors)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(colors.id, ids))
      .returning();

    return result.length > 0;
  }
}
