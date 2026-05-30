import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { suppliers, users } from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for supplier-related database operations
 */
export class SupplierRepository {
  /**
   * Find a supplier by ID
   *
   * @param id - Supplier ID
   * @returns Supplier if found, null otherwise
   */
  async findById(id: number) {
    const result = await db.query.suppliers.findFirst({
      where: eq(suppliers.id, id),
      with: {
        user: {
          columns: {
            password: false,
          },
          with: {
            addresses: true,
          },
        },
      },
    });

    return result || null;
  }

  /**
   * Find a supplier by email (by looking up the associated user)
   *
   * @param email - User's email
   * @returns Supplier if found, null otherwise
   */
  async findByEmail(email: string) {
    const result = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        supplier: true,
      },
    });

    return result?.supplier || null;
  }

  /**
   * Find a supplier by user ID
   *
   * @param userId - User ID
   * @returns Supplier if found, null otherwise
   */
  async findByUserId(userId: number) {
    const result = await db.query.suppliers.findFirst({
      where: eq(suppliers.userId, userId),
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
   * Find a supplier by supplierCode
   * @param supplierCode - Supplier code
   * @returns Supplier if found, null otherwise
   */
  async findBySupplierCode(supplierCode: string) {
    const result = await db.query.suppliers.findFirst({
      where: eq(suppliers.supplierCode, supplierCode),
    });
    return result || null;
  }

  /**
   * List suppliers with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of suppliers and total count
   * @returns {{ data: Supplier[], total: number, searchableFields: string[] }}   - The list of suppliers and metadata
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
    const searchableFields = ["supplier_code", "store_name"];

    // Prepare where conditions
    const filterCondition = createFilterConditions(suppliers, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      suppliers,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(suppliers.isDeleted, false));
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
    const sortCondition = createSortCondition(suppliers, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(suppliers)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const suppliersData = await tx.query.suppliers.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(suppliers.createdAt)],
        with: {
          entryType: true,
          paymentMethod: true,
          user: {
            columns: {
              password: false,
            },
            with: {
              addresses: {
                with: {
                  country: true,
                },
              },
            },
          },
        },
      });

      return { data: suppliersData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new supplier with associated user in a transaction
   *
   * @param tx - Transaction object
   * @param data - Supplier data
   * @param data.userId - User ID
   * @param data.storeName - Store name
   * @param data.entryTypeId - Entry type ID
   * @param data.paymentMethodId - Payment method ID
   * @param data.bankAccountName - Bank account name
   * @param data.bankAccountNumber - Bank account number
   * @param data.supplierCode - Supplier code
   * @param data.createdBy - User ID of the creator
   * @returns Created supplier with user
   * @throws Will throw an error if supplier creation fails
   */
  async create(
    tx: TX,
    {
      userId,
      storeName,
      entryTypeId,
      paymentMethodId,
      bankAccountName,
      bankAccountNumber,
      supplierCode,
      createdBy,
    }: {
      userId: number;
      storeName: string;
      entryTypeId?: number;
      paymentMethodId?: number;
      bankAccountName?: string;
      bankAccountNumber?: string;
      supplierCode: string;
      createdBy: number;
    },
  ) {
    // Create the supplier record
    const [result] = await tx
      .insert(suppliers)
      .values({
        userId,
        storeName,
        supplierCode,
        entryTypeId,
        paymentMethodId,
        bankAccountName,
        bankAccountNumber,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    if (!result) {
      throw new Error("Supplier could not be created");
    }

    // Fetch the created supplier with relations
    const supplierWithRelations = await tx.query.suppliers.findFirst({
      where: eq(suppliers.id, result.id),
      with: {
        user: {
          columns: {
            password: false,
          },
        },
      },
    });

    if (!supplierWithRelations) {
      throw new Error("Supplier could not be retrieved after creation");
    }

    return supplierWithRelations;
  }

  /**
   * Update a supplier with transaction
   *
   * @param tx - Transaction object
   * @param id - Supplier ID
   * @param data - Supplier data to update
   * @param data.updatedBy - User ID of the updater
   * @param data.storeName - Store name
   * @param data.entryTypeId - Entry type ID
   * @param data.paymentMethodId - Payment method ID
   * @param data.bankAccountName - Bank account name
   * @param data.bankAccountNumber - Bank account number
   * @param data.supplierCode - Supplier code
   * @returns Updated supplier with user
   * @throws Will throw an error if supplier update fails
   */
  async update(
    tx: TX,
    id: number,
    data: {
      updatedBy: number;
      storeName?: string;
      entryTypeId?: number;
      paymentMethodId?: number;
      bankAccountName?: string;
      bankAccountNumber?: string;
      supplierCode?: string;
    },
  ) {
    const { updatedBy, ...updateData } = data;

    // Prepare update data
    const updateValues: Record<string, any> = {
      ...updateData,
      updatedBy,
      updatedAt: new Date().toISOString(),
    };

    // Update supplier
    const [result] = await tx
      .update(suppliers)
      .set(updateValues)
      .where(eq(suppliers.id, id))
      .returning();

    if (!result) {
      throw new Error("Failed to update supplier");
    }

    // Fetch the updated supplier with relations
    const updatedSupplier = await tx.query.suppliers.findFirst({
      where: eq(suppliers.id, id),
      with: {
        user: {
          columns: {
            password: false,
          },
        },
      },
    });

    if (!updatedSupplier) {
      throw new Error("Supplier could not be retrieved after update");
    }

    return updatedSupplier;
  }

  /**
   * Soft delete a supplier
   *
   * @param tx - Transaction object
   * @param id - Supplier ID
   * @param deletedBy - User ID of the person who deleted this record
   * @returns True if deleted successfully
   */
  async softDelete(tx: TX, id: number, deletedBy: number) {
    const [result] = await tx
      .update(suppliers)
      .set({
        deletedBy,
        deletedAt: new Date().toISOString(),
        isDeleted: true,
      })
      .where(eq(suppliers.id, id))
      .returning();

    return !!result;
  }

  /**
   * Soft delete multiple suppliers
   *
   * @param tx - Transaction object
   * @param ids - Array of supplier IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const [result] = await tx
      .update(suppliers)
      .set({
        deletedBy,
        deletedAt: new Date().toISOString(),
        isDeleted: true,
      })
      .where(inArray(suppliers.id, ids))
      .returning();

    return !!result;
  }

  /**
   * Get Next Supplier Code
   * @returns Next supplier code or null if error
   */
  async getNextSupplierCode() {
    const result = await db
      .execute(sql`SELECT next_supplier_code()`)
      .catch((err) => {
        throw new Error(`Error in getNextSupplierCode : ${err}`);
      });

    if (!result || result.length === 0) {
      console.error(
        "-------------------No result returned from getNextSupplierCode",
      );
      console.error(result);
      return null;
    }

    return result[0].next_supplier_code as string;
  }

  async getAllSupplierCodes(): Promise<string[]> {
    const result = await db
      .select({ code: suppliers.supplierCode })
      .from(suppliers)
      .where(eq(suppliers.isDeleted, false));
    return result.map((r) => r.code);
  }

  async getAllSupplierIds(): Promise<number[]> {
    const result = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.isDeleted, false));
    return result.map((r) => r.id);
  }
}
