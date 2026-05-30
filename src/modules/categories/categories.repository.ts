import type { UpdateCategoriesRequest } from "./categories.schema";

import type { NewCategories } from "@/db/models/categories";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { categories } from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for categories-related database operations
 */
export class CategoriesRepository {
  /**
   * Find a categories by ID
   *
   * @param id - Categories ID
   * @returns The categories object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.categories.findFirst({
      where: eq(categories.id, id),
      with: {
        parent: {
          with: {
            parent: true,
          },
        },
      },
    });
    return result;
  }

  /**
   * List categories with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of categories and total count
   * @returns {{ data: Categories[], total: number, searchableFields: string[] }} - List of categories and total count
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
    const filterCondition = createFilterConditions(categories, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      categories,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(categories.isDeleted, false));
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
    const sortCondition = createSortCondition(categories, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(categories)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const categoriesData = await tx.query.categories.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(categories.createdAt)],
        with: {
          parent: {
            with: {
              parent: true,
            },
          },
        },
      });

      return { data: categoriesData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new categories
   *
   * @param tx - Transaction
   * @param categoriesData - Categories data
   * @returns The created categories object
   */
  async create(tx: TX, categoriesData: NewCategories) {
    const [result] = await tx
      .insert(categories)
      .values({
        ...categoriesData,
      })
      .returning();
    return result;
  }

  /**
   * Update a categories
   *
   * @param tx - Transaction
   * @param id - FAQ ID to update
   * @param categoriesData - Categories data
   * @returns The updated categories object
   */
  async update(
    tx: TX,
    id: number,
    categoriesData: UpdateCategoriesRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(categories)
      .set({
        ...categoriesData,
        updatedBy: categoriesData.updatedBy,
      })
      .where(eq(categories.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete multiple categories by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of categories IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(categories)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(categories.id, ids))
      .returning();

    return result.length > 0;
  }
}
