import type { UpdateFaqsRequest } from "./faqs.schema";

import type { NewFaqs } from "@/db/models/faqs";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { faqs } from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for faqs-related database operations
 */
export class FaqsRepository {
  /**
   * Find a faqs by ID
   *
   * @param id - Faqs ID
   * @returns The faqs object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.faqs.findFirst({
      where: eq(faqs.id, id),
    });

    return result;
  }

  /**
   * List faqs with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of faqs and total count
   * @returns {{ data: Faqs[], total: number, searchableFields: string[] }} - List of faqs and total count
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
    const searchableFields = ["question", "answer"];

    // Prepare where conditions
    const filterCondition = createFilterConditions(faqs, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      faqs,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(faqs.isDeleted, false));
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
    const sortCondition = createSortCondition(faqs, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(faqs)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const faqsData = await tx.query.faqs.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(faqs.createdAt)],
      });

      return { data: faqsData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new faqs
   *
   * @param tx - Transaction
   * @param faqsData - Faqs data
   * @returns The created faqs object
   */
  async create(tx: TX, faqsData: NewFaqs) {
    const [result] = await tx
      .insert(faqs)
      .values({
        ...faqsData,
      })
      .returning();
    return result;
  }

  /**
   * Update a faqs
   *
   * @param tx - Transaction
   * @param id - FAQ ID to update
   * @param faqsData - Faqs data
   * @returns The updated faqs object
   */
  async update(
    tx: TX,
    id: number,
    faqsData: UpdateFaqsRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(faqs)
      .set({
        ...faqsData,
        updatedBy: faqsData.updatedBy,
      })
      .where(eq(faqs.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete multiple faqs by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of faqs IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(faqs)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(faqs.id, ids))
      .returning();

    return result.length > 0;
  }
}
