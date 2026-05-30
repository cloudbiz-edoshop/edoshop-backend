import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { employees, users } from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";
/**
 * Repository for employee-related database operations
 */
export class EmployeeRepository {
  /**
   * Find an employee by ID
   *
   * @param id - Employee ID
   * @returns Employee if found, null otherwise
   */
  async findById(id: number) {
    const result = await db.query.employees.findFirst({
      where: eq(employees.id, id),
      with: {
        user: {
          columns: {
            password: false,
          },
        },
        role: {
          with: {
            permissions: {
              with: {
                entity: true,
                operation: true,
              },
            },
          },
        },
      },
    });

    return result || null;
  }

  /**
   * Find an employee by email (by looking up the associated user)
   *
   * @param email - User's email
   * @returns Employee if found, null otherwise
   */
  async findByEmail(email: string) {
    const result = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        employee: true,
      },
    });

    return result?.employee || null;
  }

  /**
   * Find an employee by user ID
   *
   * @param userId - User ID
   * @returns Employee if found, null otherwise
   */
  async findByUserId(userId: number) {
    const result = await db.query.employees.findFirst({
      where: eq(employees.userId, userId),
      with: {
        user: {
          columns: {
            password: false,
          },
        },
      },
    });
    return result || null;
  }

  /**
   * List employees with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of employees and total count
   * @returns {{ data: Employee[], total: number, searchableFields: string[] }} - The list of employees and metadata
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
    const searchableFields = ["employee_code"];

    // Prepare where conditions
    const filterCondition = createFilterConditions(employees, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      employees,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(employees.isDeleted, false));

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
    const sortCondition = createSortCondition(employees, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(employees)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const employeesData = await tx.query.employees.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(employees.createdAt)],
        with: {
          user: {
            columns: {
              password: false,
            },
          },
          role: {
            with: {
              permissions: {
                with: {
                  entity: true,
                  operation: true,
                },
              },
            },
          },
        },
      });

      return { data: employeesData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new employee with associated user in a transaction
   *
   * @param tx - Transaction object
   * @param data - Employee data
   * @param data.userId - User ID
   * @param data.roleId - Role ID
   * @param data.roleExpiresAt - Role expiration date
   * @param data.createdBy - User ID of the creator
   * @returns Created employee with user
   * @throws Will throw an error if employee creation fails
   */
  async createWithTransaction(
    tx: TX,
    {
      userId,
      roleId,
      roleExpiresAt,
      createdBy,
    }: {
      userId: number;
      roleId: number;
      roleExpiresAt?: string | null;
      createdBy: number;
    },
  ) {
    // First, create the employee record without the employee code
    const [result] = await tx
      .insert(employees)
      .values({
        userId,
        roleId,
        roleExpiresAt,
        createdBy,
        updatedBy: createdBy,
        // Use a temporary placeholder for employeeCode
        employeeCode: Math.random().toString(),
      })
      .returning();

    if (!result) {
      throw new Error("Employee could not be created");
    }

    // Now update the employee with the proper code format using the ID
    const employeeCode = `EMP-${result.id}`;
    await tx
      .update(employees)
      .set({ employeeCode })
      .where(eq(employees.id, result.id));

    // Fetch the created employee with relations
    const employeeWithRelations = await tx.query.employees.findFirst({
      where: eq(employees.id, result.id),
      with: {
        user: {
          columns: {
            password: false,
          },
        },
        role: true,
      },
    });

    if (!employeeWithRelations) {
      throw new Error("Employee could not be retrieved after creation");
    }

    // Add the employee code to the returned object
    return {
      ...employeeWithRelations,
      employeeCode,
    };
  }

  /**
   * Update an employee with transaction
   *
   * @param tx - Transaction object
   * @param id - Employee ID
   * @param data - Employee data
   * @param data.userId - User ID
   * @param data.updatedBy - Last modified by user ID
   * @param data.roleId - Role ID
   * @param data.isTempRole - Whether the role is temporary
   * @param data.roleExpiresAt - Role expiration date
   * @param data.employeeCode - Employee code
   * @returns Updated employee
   */
  async updateWithTransaction(
    tx: TX,
    id: number,
    data: {
      userId: number;
      updatedBy: number;
      roleId?: number;
      isTempRole?: boolean;
      roleExpiresAt?: string | null;
      employeeCode?: string;
    },
  ) {
    const [result] = await tx
      .update(employees)
      .set(data)
      .where(eq(employees.id, id))
      .returning();

    if (!result) {
      throw new Error("Employee could not be updated");
    }

    const updatedEmployee = await tx.query.employees.findFirst({
      where: eq(employees.id, id),
      with: {
        user: {
          columns: {
            password: false,
          },
        },
        role: {
          with: {
            permissions: {
              with: {
                entity: true,
                operation: true,
              },
            },
          },
        },
      },
    });

    return updatedEmployee;
  }

  /**
   * Soft delete an employee
   *
   * @param tx - Transaction object
   * @param id - Employee ID
   * @param deletedBy - Deleted by user ID
   * @returns Deleted employee
   */
  async softDelete(tx: TX, id: number, deletedBy: number) {
    const [result] = await tx
      .update(employees)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
        isActive: false,
        roleExpiresAt: null,
        roleId: null,
      })
      .where(eq(employees.id, id))
      .returning();

    return result;
  }

  /**
   * Soft delete multiple employees
   *
   * @param tx - Transaction object
   * @param ids - Array of employee IDs
   * @param deletedBy - Deleted by user ID
   * @returns Deleted employees
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(employees)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
        isActive: false,
        roleExpiresAt: null,
        roleId: null,
      })
      .where(inArray(employees.id, ids))
      .returning();

    return result;
  }
}
