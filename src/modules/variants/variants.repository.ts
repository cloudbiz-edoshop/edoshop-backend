import type { UpdateVariantRequest } from "./variants.schema";

import type { NewVariants } from "@/db/models/variants";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { variants } from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for variants-related database operations
 */
export class VariantsRepository {
  /**
   * Find a variant by ID
   *
   * @param id - Variant ID
   * @returns The variant object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.variants.findFirst({
      where: and(eq(variants.id, id), eq(variants.isDeleted, false)),
      with: {
        createdBy: true,
        updatedBy: true,
        product: {
          with: {
            directOrderProduct: true,
            dropshippingProduct: true,
          },
        },
        color: true,
        size: true,
        materialType: true,
        designPattern: true,
      },
    });
    return result;
  }

  /**
   * List variants with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @param params.filters.colorIds - Color IDs to filter by
   * @param params.filters.sizeIds - Size IDs to filter by
   * @param params.filters.materialTypeIds - Material type IDs to filter by
   * @param params.filters.designPatternIds - Design pattern IDs to filter by
   * @returns List of variants and total count
   */
  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: {
      colorIds?: number[];
      sizeIds?: number[];
      materialTypeIds?: number[];
      designPatternIds?: number[];
      [key: string]: any;
    };
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;

    const searchableFields = ["additionalInfo"];

    const whereConditions = [];
    whereConditions.push(eq(variants.isDeleted, false));

    // Handle specific filters
    if (filters?.colorIds?.length) {
      whereConditions.push(inArray(variants.colorId, filters.colorIds));
    }

    if (filters?.sizeIds?.length) {
      whereConditions.push(inArray(variants.sizeId, filters.sizeIds));
    }

    if (filters?.materialTypeIds?.length) {
      whereConditions.push(
        inArray(variants.materialTypeId, filters.materialTypeIds),
      );
    }

    if (filters?.designPatternIds?.length) {
      whereConditions.push(
        inArray(variants.designPatternId, filters.designPatternIds),
      );
    }

    // Add other filters
    const otherFilters = { ...filters };
    delete otherFilters.colorIds;
    delete otherFilters.sizeIds;
    delete otherFilters.materialTypeIds;
    delete otherFilters.designPatternIds;

    const filterCondition = createFilterConditions(variants, otherFilters);
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }

    const searchCondition = createSearchCondition(
      searchableFields,
      variants,
      search,
    );
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    const sortCondition = createSortCondition(variants, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(variants)
        .where(whereClause || sql`TRUE`);

      const variantsData = await tx.query.variants.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(variants.createdAt)],
        with: {
          product: true,
          color: true,
          size: true,
          materialType: true,
          designPattern: true,
          createdBy: true,
          updatedBy: true,
        },
      });

      return { data: variantsData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new variant
   *
   * @param tx - Transaction
   * @param variantData - Variant data
   * @returns The created variant object
   */
  async create(tx: TX, variantData: NewVariants) {
    const [result] = await tx
      .insert(variants)
      .values({
        ...variantData,
      })
      .returning();
    return result;
  }

  /**
   * Update a variant
   *
   * @param tx - Transaction
   * @param id - Variant ID to update
   * @param variantData - Variant data
   * @returns The updated variant object
   */
  async update(
    tx: TX,
    id: number,
    variantData: UpdateVariantRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(variants)
      .set({
        ...variantData,
        updatedBy: variantData.updatedBy,
      })
      .where(eq(variants.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete multiple variants by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of variant IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(variants)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(variants.id, ids))
      .returning();

    return result.length > 0;
  }

  /**
   * Get variants by product ID
   *
   * @param productId - Product ID
   * @returns List of variants for the product
   */
  async findByProductId(productId: number) {
    const result = await db.query.variants.findMany({
      where: and(
        eq(variants.productId, productId),
        eq(variants.isDeleted, false),
      ),
      with: {
        product: true,
        color: true,
        size: true,
        materialType: true,
        designPattern: true,
        createdBy: true,
        updatedBy: true,
      },
      orderBy: desc(variants.createdAt),
    });
    return result;
  }
}
