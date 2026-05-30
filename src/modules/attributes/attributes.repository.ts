import type { UpdateAttributesRequest } from "./attributes.schema";

import type { NewAttributes } from "@/db/models/attributes";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { attributes } from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for attributes-related database operations
 */
export class AttributesRepository {
  /**
   * Find a attributes by ID
   *
   * @param id - Attributes ID
   * @returns The attributes object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.attributes.findFirst({
      where: eq(attributes.id, id),
      with: {
        attributeType: true,
      },
    });

    return result;
  }

  /**
   * List attributes with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of attributes and total count
   * @returns {{ data: Attribute[], total: number, searchableFields: string[] }} - List of attributes and total count
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
    const searchableFields = ["name", "attribute_type_id", "description"];

    // Prepare where conditions
    const filterCondition = createFilterConditions(attributes, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      attributes,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(attributes.isDeleted, false));
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
    const sortCondition = createSortCondition(attributes, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(attributes)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const attributesData = await tx.query.attributes.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(attributes.createdAt)],
        with: {
          attributeType: true,
        },
      });

      return { data: attributesData, total: totalCount, searchableFields };
    });
  }

  async getTypes() {
    const result = await db.query.attributeTypes.findMany();
    return result;
  }

  /**
   * Create a new attributes
   *
   * @param tx - Transaction
   * @param attributesData - Attribute_values data
   * @returns The created attributes object
   */
  async create(tx: TX, attributesData: NewAttributes) {
    const [result] = await tx
      .insert(attributes)
      .values({
        ...attributesData,
      })
      .returning();
    return result;
  }

  /**
   * Update an attribute
   *
   * @param tx - Transaction
   * @param id - Attribute ID to update
   * @param attributesData - Attributes data
   * @returns The updated attributes object
   */
  async update(
    tx: TX,
    id: number,
    attributesData: UpdateAttributesRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(attributes)
      .set({
        ...attributesData,
        updatedBy: attributesData.updatedBy,
      })
      .where(eq(attributes.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete multiple attributes by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of attributes IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(attributes)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(attributes.id, ids))
      .returning();

    return result.length > 0;
  }
}
