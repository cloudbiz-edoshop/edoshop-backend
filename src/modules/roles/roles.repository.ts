import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { employees, permissions, roles } from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for role-related database operations
 */
export class RoleRepository {
  /**
   * Find a role by ID
   *
   * @param id - Role ID
   * @returns Role if found, null otherwise
   */
  async findById(id: number) {
    const result = await db.query.roles.findFirst({
      where: eq(roles.id, id),
      with: {
        permissions: {
          with: {
            entity: true,
            operation: true,
          },
        },
      },
    });

    return result || null;
  }

  /**
   * Find a role by name
   *
   * @param name - Role name
   * @returns Role if found, null otherwise
   */
  async findByName(name: string) {
    const result = await db.query.roles.findFirst({
      where: eq(roles.name, name),
    });

    return result || null;
  }

  /**
   * List roles with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of roles and total count
   * @returns {{ data: Role[], total: number, searchableFields: string[] }} - The list of roles and metadata
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
    const filterCondition = createFilterConditions(roles, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      roles,
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
    const sortCondition = createSortCondition(roles, sortBy, sortOrder);

    // Use transaction for consistent view of the data
    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(roles)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const rolesData = await tx.query.roles.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(roles.createdAt)],
        with: {
          permissions: {
            with: {
              entity: true,
              operation: true,
            },
          },
        },
      });

      return { data: rolesData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new role with permissions
   *
   * @param roleData - Role data
   * @param roleData.name - Role name
   * @param roleData.description - Role description
   * @param roleData.createdBy - User ID of the creator
   * @param permissionsList - List of permissions with entityId and operationId
   * @returns Created role with permissions
   * @throws Will throw an error if role creation fails
   */
  async create(
    roleData: {
      name: string;
      description?: string;
      createdBy: number;
    },
    permissionsList?: { entityId: number; operationId: number }[],
  ) {
    const updatedBy = roleData.createdBy;

    return await db.transaction(async (tx) => {
      // Create the role first
      const [insertedRole] = await tx
        .insert(roles)
        .values({ ...roleData, updatedBy })
        .returning();

      // If permissions are provided, create them
      if (permissionsList?.length) {
        // Optional: Validate permissions before insertion
        const validPermissions = permissionsList.filter(
          (item) => item.entityId && item.operationId,
        );

        if (validPermissions.length > 0) {
          await tx.insert(permissions).values(
            validPermissions.map((item) => ({
              roleId: insertedRole.id,
              entityId: item.entityId,
              operationId: item.operationId,
            })),
          );
        }
      }

      // Fetch the role with its permissions to return
      const roleWithPermissions = await tx.query.roles.findFirst({
        where: eq(roles.id, insertedRole.id),
        with: {
          permissions: {
            with: {
              entity: true,
              operation: true,
            },
          },
        },
      });

      if (!roleWithPermissions) {
        throw new Error("Role could not be retrieved after creation");
      }

      return roleWithPermissions;
    });
  }

  /**
   * Update a role with permissions
   *
   * @param roleData - Role data to update
   * @param roleData.id - Role ID
   * @param roleData.name - Role name
   * @param roleData.description - Role description
   * @param roleData.updatedBy - User ID of the last modifier
   * @param permissionsList - List of permissions with entityId and operationId
   * @returns Updated role with permissions
   */
  async update(
    roleData: {
      id: number;
      name?: string;
      description?: string;
      updatedBy: number;
    },
    permissionsList?: { entityId: number; operationId: number }[],
  ) {
    return await db.transaction(async (tx) => {
      // Update the role first if there's any data to update
      if (Object.keys(roleData).length > 0) {
        const updatedAt = new Date().toISOString();
        await tx
          .update(roles)
          .set({ ...roleData, updatedAt })
          .where(eq(roles.id, roleData.id));
      }

      // If permissions are provided, delete existing and create new ones
      if (permissionsList) {
        // Delete existing permissions
        await tx.delete(permissions).where(eq(permissions.roleId, roleData.id));

        // Create new permissions if there are any
        if (permissionsList.length > 0) {
          await tx.insert(permissions).values(
            permissionsList.map((item) => ({
              roleId: roleData.id,
              entityId: item.entityId,
              operationId: item.operationId,
            })),
          );
        }
      }

      // Fetch the updated role with its permissions
      return await tx.query.roles.findFirst({
        where: eq(roles.id, roleData.id),
        with: {
          permissions: {
            with: {
              entity: true,
              operation: true,
            },
          },
        },
      });
    });
  }

  /**
   * Soft delete multiple roles
   *
   * @param tx - Database transaction
   * @param ids - Array of role IDs
   * @param deletedBy - ID of the user performing the deletion
   * @returns Deleted roles
   */
  async deleteMany(tx: TX, ids: number[], deletedBy: number) {
    return await tx.transaction(async (tx) => {
      // First, delete associated permissions
      await tx.delete(permissions).where(inArray(permissions.roleId, ids));

      // Now update the roleId to null in the employees table
      await tx
        .update(employees)
        .set({
          roleId: null,
          updatedAt: new Date().toISOString(),
          updatedBy: deletedBy,
        })
        .where(inArray(employees.roleId, ids));

      // Then, delete the roles
      const result = await tx
        .delete(roles)
        .where(inArray(roles.id, ids))
        .returning();

      return result;
    });
  }
}
