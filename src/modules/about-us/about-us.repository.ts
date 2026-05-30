import type { UpdateAboutUsRequest } from "./about-us.schema";

import type { NewAboutUs } from "@/db/models/about-us";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { aboutUs } from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for aboutUs-related database operations
 */
export class AboutUsRepository {
  /**
   * Find a aboutUs by ID
   *
   * @param id - AboutUs ID
   * @returns The aboutUs object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.aboutUs.findFirst({
      where: eq(aboutUs.id, id),
    });

    return result;
  }

  /**
   * List aboutUs with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of aboutUs and total count
   * @returns {{ data: AboutUs[], total: number, searchableFields: string[] }} - List of aboutUs and total count
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
      "title",
      "heading",
      "text",
      "primary_button_text",
    ];

    // Prepare where conditions
    const filterCondition = createFilterConditions(aboutUs, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      aboutUs,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(aboutUs.isDeleted, false));
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
    const sortCondition = createSortCondition(aboutUs, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(aboutUs)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const aboutUsData = await tx.query.aboutUs.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(aboutUs.createdAt)],
      });

      return { data: aboutUsData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new aboutUs
   *
   * @param tx - Transaction
   * @param aboutUsData - AboutUs data
   * @returns The created aboutUs object
   */
  async create(tx: TX, aboutUsData: NewAboutUs) {
    const [result] = await tx
      .insert(aboutUs)
      .values({
        ...aboutUsData,
      })
      .returning();
    return result;
  }

  /**
   * Update a aboutUs
   *
   * @param tx - Transaction
   * @param id - FAQ ID to update
   * @param aboutUsData - AboutUs data
   * @returns The updated aboutUs object
   */
  async update(
    tx: TX,
    id: number,
    aboutUsData: UpdateAboutUsRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(aboutUs)
      .set({
        ...aboutUsData,
        updatedBy: aboutUsData.updatedBy,
      })
      .where(eq(aboutUs.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete multiple aboutUs by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of aboutUs IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(aboutUs)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(aboutUs.id, ids))
      .returning();

    return result.length > 0;
  }
}
