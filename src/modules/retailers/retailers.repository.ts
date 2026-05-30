import type { NewRetailer } from "@/db/models/retailers";

import type { TX } from "@/lib/types";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import db from "@/db";
import { retailers } from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for retailer-related database operations
 */
export class RetailerRepository {
  /**
   * Get Next Retailer Code
   * @returns Next Retailer code or null if error
   */
  async getNextRetailerCode() {
    const result = await db
      .execute(sql`SELECT next_retailer_code()`)
      .catch((err) => {
        throw new Error(`Error in getNextRetailerCode : ${err}`);
      });

    if (!result || result.length === 0) {
      console.error(
        "-------------------No result returned from getNextRetailerCode",
      );
      console.error(result);
      return null;
    }

    return result[0].next_retailer_code as string;
  }

  /**
   * Find a retailer by ID
   *
   * @param id - Retailer ID
   * @returns The retailer object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.retailers.findFirst({
      where: eq(retailers.id, id),
      with: {
        user: {
          with: {
            addresses: {
              with: {
                country: true,
                city: true,
              },
            },
          },
        },
      },
    });

    return result;
  }

  /**
   * List retailers with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of retailers and total count
   * @returns {{ data: Retailer[], total: number, searchableFields: string[] }} - The list of retailers and metadata
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
    const searchableFields = ["retailer_code", "shop_name"];

    // Prepare where conditions
    const filterCondition = createFilterConditions(retailers, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      retailers,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(retailers.isDeleted, false));
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
    const sortCondition = createSortCondition(retailers, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(retailers)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const retailersData = await tx.query.retailers.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(retailers.createdAt)],
        with: {
          user: {
            columns: {
              password: false,
            },
            with: {
              addresses: {
                with: {
                  country: true,
                  city: true,
                },
              },
            },
          },
        },
      });

      return { data: retailersData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new retailer
   *
   * @param tx - Transaction
   * @param retailerData - Retailer data
   * @returns The created retailer object
   */
  async create(tx: TX, retailerData: NewRetailer) {
    const [result] = await tx
      .insert(retailers)
      .values({
        ...retailerData,
      })
      .returning();
    return result;
  }

  /**
   * Update a retailer
   *
   * @param tx - Transaction
   * @param id - Retailer ID
   * @param data - Data to update
   * @returns The updated retailer
   */
  async update(tx: TX, id: number, data: Partial<NewRetailer>) {
    const [result] = await tx
      .update(retailers)
      .set(data)
      .where(eq(retailers.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete many retailers by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of retailer IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(retailers)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(retailers.id, ids))
      .returning();

    return result.length === ids.length;
  }
}
