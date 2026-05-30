import type { UpdateTagsRequest } from "./tags.schema";

import type { NewTags } from "@/db/models/tags";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { tags } from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for tags-related database operations
 */
export class TagsRepository {
  /**
   * Find a tags by ID
   *
   * @param id - Tags ID
   * @returns The tags object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.tags.findFirst({
      where: eq(tags.id, id),
    });

    return result;
  }

  /**
   * List tags with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of tags and total count
   * @returns {{ data: Tags[], total: number, searchableFields: string[] }} - List of tags and total count
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
    const filterCondition = createFilterConditions(tags, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      tags,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(tags.isDeleted, false));
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
    const sortCondition = createSortCondition(tags, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(tags)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const tagsData = await tx.query.tags.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(tags.createdAt)],
      });

      return { data: tagsData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new tags
   *
   * @param tx - Transaction
   * @param tagsData - Tags data
   * @returns The created tags object
   */
  async create(tx: TX, tagsData: NewTags) {
    const [result] = await tx
      .insert(tags)
      .values({
        ...tagsData,
      })
      .returning();
    return result;
  }

  /**
   * Update a tags
   *
   * @param tx - Transaction
   * @param id - FAQ ID to update
   * @param tagsData - Tags data
   * @returns The updated tags object
   */
  async update(
    tx: TX,
    id: number,
    tagsData: UpdateTagsRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(tags)
      .set({
        ...tagsData,
        updatedBy: tagsData.updatedBy,
      })
      .where(eq(tags.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete multiple tags by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of tags IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(tags)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(tags.id, ids))
      .returning();

    return result.length > 0;
  }
}
