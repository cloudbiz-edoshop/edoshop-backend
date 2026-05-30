import type { UpdateTestimonialsRequest } from "./testimonials.schema";

import type { NewTestimonials } from "@/db/models/testimonials";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { testimonials } from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for testimonials-related database operations
 */
export class TestimonialsRepository {
  /**
   * Find a testimonials by ID
   *
   * @param id - Testimonials ID
   * @returns The testimonials object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.testimonials.findFirst({
      where: eq(testimonials.id, id),
    });

    return result;
  }

  /**
   * List testimonials with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of testimonials and total count
   * @returns {{ data: Testimonials[], total: number, searchableFields: string[] }} - List of testimonials and total count
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
    const searchableFields = ["authorName", "authorTitle", "testimonial"];

    // Prepare where conditions
    const filterCondition = createFilterConditions(testimonials, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      testimonials,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(testimonials.isDeleted, false));
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
    const sortCondition = createSortCondition(testimonials, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(testimonials)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const testimonialsData = await tx.query.testimonials.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition
          ? [sortCondition]
          : [desc(testimonials.createdAt)],
      });

      return { data: testimonialsData, total: totalCount, searchableFields };
    });
  }

  /**
   * Find a testimonials by order
   *
   * @param order - Testimonials order
   * @returns The testimonials object or null if not found
   */
  async findByOrder(order: number) {
    return await db.query.testimonials.findFirst({
      where: eq(testimonials.order, order),
    });
  }

  /**
   * Create a new testimonials
   *
   * @param tx - Transaction
   * @param testimonialsData - Testimonials data
   * @returns The created testimonials object
   */
  async create(tx: TX, testimonialsData: NewTestimonials) {
    const [result] = await tx
      .insert(testimonials)
      .values({
        ...testimonialsData,
      })
      .returning();
    return result;
  }

  /**
   * Update a testimonials
   *
   * @param tx - Transaction
   * @param id - FAQ ID to update
   * @param testimonialsData - Testimonials data
   * @returns The updated testimonials object
   */
  async update(
    tx: TX,
    id: number,
    testimonialsData: UpdateTestimonialsRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(testimonials)
      .set({
        ...testimonialsData,
        updatedBy: testimonialsData.updatedBy,
      })
      .where(eq(testimonials.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete multiple testimonials by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of testimonials IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(testimonials)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(testimonials.id, ids))
      .returning();

    return result.length > 0;
  }
}
