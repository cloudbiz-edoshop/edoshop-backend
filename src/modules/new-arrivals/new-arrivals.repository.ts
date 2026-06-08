import type { TX } from "@/lib/types";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import db from "@/db";
import { newArrivals, productNewArrivals, products } from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for new arrivals-related database operations
 */
export class NewArrivalsRepository {
  /**
   * Find a new arrival by ID
   *
   * @param id - New arrival ID
   * @param tx - Optional transaction object
   * @returns The new arrival object or null if not found
   */
  async findById(id: number, tx?: TX) {
    const queryBuilder = tx ?? db;

    const result = await queryBuilder.query.newArrivals.findFirst({
      where: eq(newArrivals.id, id),
      with: {
        createdBy: true,
        updatedBy: true,
      },
    });

    return result;
  }

  /**
   * List new arrivals with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of new arrivals and total count
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

    const searchableFields: string[] = []; // No searchable fields for new arrivals

    const whereConditions = [];

    const filterCondition = createFilterConditions(newArrivals, filters);
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }

    const searchCondition = createSearchCondition(
      searchableFields,
      newArrivals,
      search,
    );
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    const sortCondition = createSortCondition(newArrivals, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(newArrivals)
        .where(whereClause || sql`TRUE`);

      const newArrivalsData = await tx.query.newArrivals.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition
          ? [sortCondition]
          : [desc(newArrivals.createdAt)],
        with: {
          createdBy: true,
          updatedBy: true,
        },
      });

      return { data: newArrivalsData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new arrival
   *
   * @param tx - Transaction
   * @param newArrivalData - New arrival data
   * @returns The created new arrival object
   */
  async create(
    tx: TX,
    newArrivalData: {
      startDate: string;
      endDate: string;
      createdBy: number;
      updatedBy: number;
    },
  ) {
    const [result] = await tx
      .insert(newArrivals)
      .values({
        ...newArrivalData,
      })
      .returning();
    return result;
  }

  /**
   * Update a new arrival
   *
   * @param tx - Transaction
   * @param id - New arrival ID to update
   * @param newArrivalData - New arrival data
   * @returns The updated new arrival object
   */
  async update(
    tx: TX,
    id: number,
    newArrivalData: Partial<{
      startDate: string;
      endDate: string;
      updatedBy: number;
    }> & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(newArrivals)
      .set({
        ...newArrivalData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(newArrivals.id, id))
      .returning();
    return result;
  }

  /**
   * Delete a new arrival
   *
   * @param tx - Transaction object
   * @param id - New arrival ID to delete
   * @returns True if deletion was successful
   */
  async delete(tx: TX, id: number) {
    const result = await tx
      .delete(newArrivals)
      .where(eq(newArrivals.id, id))
      .returning();

    return result.length > 0;
  }

  /**
   * Add products to new arrivals
   *
   * @param tx - Transaction
   * @param newArrivalId - New arrival ID
   * @param productIds - Array of product IDs
   * @param createdBy - User ID who created the associations
   */
  async addProductsToNewArrivals(
    tx: TX,
    newArrivalId: number,
    productIds: number[],
    createdBy: number,
  ) {
    const productNewArrivalData = productIds.map((productId) => ({
      productId,
      newArrivalId,
      createdAt: new Date().toISOString(),
      createdBy,
    }));

    await tx.insert(productNewArrivals).values(productNewArrivalData);
  }

  /**
   * Remove products from new arrivals
   *
   * @param tx - Transaction
   * @param newArrivalId - New arrival ID
   * @param productIds - Array of product IDs
   * @param updatedBy - User ID who updated the associations
   * @returns True if removal was successful
   */
  async removeProductsFromNewArrivals(
    tx: TX,
    newArrivalId: number,
    productIds: number[],
    updatedBy: number,
  ) {
    const now = new Date().toISOString();
    // Check which products are actually linked and active
    const existing = await tx.query.productNewArrivals.findMany({
      where: and(
        eq(productNewArrivals.newArrivalId, newArrivalId),
        inArray(productNewArrivals.productId, productIds),
        isNull(productNewArrivals.removedAt),
      ),
    });
    if (existing.length === 0) {
      return false;
    }
    const existingIds = existing.map((row) => row.productId);
    const result = await tx
      .update(productNewArrivals)
      .set({ removedAt: now, updatedBy })
      .where(
        and(
          eq(productNewArrivals.newArrivalId, newArrivalId),
          inArray(productNewArrivals.productId, existingIds),
          isNull(productNewArrivals.removedAt),
        ),
      )
      .returning();
    return result.length > 0;
  }

  /**
   * Get only products that are marked as new arrivals
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of products marked as new arrivals and total count
   */
  async getOnlyNewArrivalProducts(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;

    const searchableFields = ["name", "shortDescription", "fullDescription"];

    const whereConditions = [];
    whereConditions.push(eq(products.isDeleted, false));

    const filterCondition = createFilterConditions(products, filters);
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }

    const searchCondition = createSearchCondition(
      searchableFields,
      products,
      search,
    );
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    const sortCondition = createSortCondition(products, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Get products that are marked as new arrivals
      const newArrivalProductIds = await tx
        .select({ productId: productNewArrivals.productId })
        .from(productNewArrivals)
        .leftJoin(
          newArrivals,
          eq(productNewArrivals.newArrivalId, newArrivals.id),
        )
        .where(isNull(productNewArrivals.removedAt));

      const productIds = newArrivalProductIds.map((p) => p.productId);

      if (productIds.length === 0) {
        return { data: [], total: 0, searchableFields };
      }

      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(products)
        .where(and(whereClause || sql`TRUE`, inArray(products.id, productIds)));

      const productsData = await tx.query.products.findMany({
        where: and(whereClause || sql`TRUE`, inArray(products.id, productIds)),
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(products.createdAt)],
        with: {
          store: true,
          series: true,
        },
      });

      const productsWithNewArrivalsInfo = await Promise.all(
        productsData.map(async (product) => {
          // Get new arrival info
          const newArrivalInfo = await tx
            .select({
              newArrivalId: productNewArrivals.newArrivalId,
              startDate: newArrivals.startDate,
              endDate: newArrivals.endDate,
            })
            .from(productNewArrivals)
            .leftJoin(
              newArrivals,
              eq(productNewArrivals.newArrivalId, newArrivals.id),
            )
            .where(
              and(
                eq(productNewArrivals.productId, product.id),
                isNull(productNewArrivals.removedAt),
              ),
            )
            .limit(1);

          const newArrivalData = newArrivalInfo[0];

          return {
            ...product,
            newArrivalId: newArrivalData?.newArrivalId || undefined,
            isNewArrival: true,
            newArrivalStartDate: newArrivalData?.startDate || undefined,
            newArrivalEndDate: newArrivalData?.endDate || undefined,
          };
        }),
      );

      return {
        data: productsWithNewArrivalsInfo,
        total: totalCount,
        searchableFields,
      };
    });
  }
}
