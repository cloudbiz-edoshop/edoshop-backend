import type { UpdateWarehouseRequest } from "./warehouses.schema";

import type { NewWarehouse } from "@/db/models/warehouses";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { warehouses } from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for warehouse-related database operations
 */
export class WarehouseRepository {
  /**
   * Find a warehouse by ID
   *
   * @param id - Warehouse ID
   * @returns The warehouse object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.warehouses.findFirst({
      where: eq(warehouses.id, id),
      with: {
        address: {
          with: {
            country: true,
            city: true,
          },
        },
      },
    });

    return result;
  }

  /**
   * List warehouses with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of warehouses and total count
   * @returns {{ data: Warehouse[], total: number, searchableFields: string[] }} - List of warehouses and total count
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
    const searchableFields = ["name"];

    // Prepare where conditions
    const filterCondition = createFilterConditions(warehouses, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      warehouses,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(warehouses.isDeleted, false));
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
    const sortCondition = createSortCondition(warehouses, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(warehouses)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const warehousesData = await tx.query.warehouses.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(warehouses.createdAt)],
        with: {
          address: {
            with: {
              country: true,
              city: true,
            },
          },
        },
      });

      return { data: warehousesData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new warehouse
   *
   * @param tx - Transaction
   * @param warehouseData - Warehouse data
   * @returns The created warehouse object
   */
  async create(tx: TX, warehouseData: NewWarehouse) {
    const [result] = await tx
      .insert(warehouses)
      .values({
        ...warehouseData,
      })
      .returning();
    return result;
  }

  /**
   * Update a warehouse
   *
   * @param tx - Transaction
   * @param id - Warehouse ID to update
   * @param warehouseData - Warehouse data
   * @returns The updated warehouse object
   */
  async update(
    tx: TX,
    id: number,
    warehouseData: UpdateWarehouseRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(warehouses)
      .set({
        ...warehouseData,
        updatedBy: warehouseData.updatedBy,
      })
      .where(eq(warehouses.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete multiple warehouses by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of warehouse IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(warehouses)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(warehouses.id, ids))
      .returning();

    return result.length > 0;
  }
}
