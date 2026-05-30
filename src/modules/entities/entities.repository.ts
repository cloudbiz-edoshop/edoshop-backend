import { and, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { entities } from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for entity-related database operations
 */
export class EntityRepository {
  /**
   * Find an entity by ID
   *
   * @param id - Entity ID
   * @returns Entity if found, null otherwise
   */
  async findById(id: number) {
    const result = await db.query.entities.findFirst({
      where: eq(entities.id, id),
    });

    return result || null;
  }

  /**
   * List entities with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of entities and total count
   * @returns {{ data: Entity[], total: number, searchableFields: string[] }} - The list of entities and metadata
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
    const searchableFields = ["name", "description"];

    // Prepare where conditions
    const filterCondition = createFilterConditions(entities, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      entities,
      search,
    );

    // Combine conditions
    const whereConditions = [];
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
    const sortCondition = createSortCondition(entities, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(entities)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const entitiesData = await tx.query.entities.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(entities.createdAt)],
      });

      return { data: entitiesData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new entity
   *
   * @param entityData - Entity data
   * @param entityData.name - Entity name
   * @param entityData.description - Entity description
   * @returns Created entity
   * @throws Will throw an error if entity creation fails
   */
  async create(entityData: { name: string; description?: string }) {
    return await db.transaction(async (tx) => {
      const [result] = await tx.insert(entities).values(entityData).returning();

      if (!result) {
        throw new Error("Entity could not be created");
      }

      return result;
    });
  }

  /**
   * Update an entity
   *
   * @param id - Entity ID
   * @param entityData - Entity data to update
   * @param entityData.name - Entity name
   * @param entityData.description - Entity description
   * @returns Updated entity
   * @throws Will throw an error if entity update fails
   */
  async update(
    id: number,
    entityData: { name?: string; description?: string },
  ) {
    return await db.transaction(async (tx) => {
      const [result] = await tx
        .update(entities)
        .set(entityData)
        .where(eq(entities.id, id))
        .returning();

      if (!result) {
        throw new Error(`Entity with ID ${id} could not be updated`);
      }

      return result;
    });
  }

  /**
   * Delete an entity
   *
   * @param id - Entity ID
   * @returns Deleted entity ID
   * @throws Will throw an error if entity deletion fails
   */
  async delete(id: number) {
    return await db.transaction(async (tx) => {
      const [result] = await tx
        .delete(entities)
        .where(eq(entities.id, id))
        .returning({ id: entities.id });

      if (!result) {
        throw new Error(`Entity with ID ${id} could not be deleted`);
      }

      return result;
    });
  }
}
