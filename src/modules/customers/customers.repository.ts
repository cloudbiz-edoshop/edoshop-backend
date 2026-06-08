import type { NewCustomer } from "@/db/models/customers";

import type { TX } from "@/lib/types";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import db from "@/db";
import { customers, users } from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for customer-related database operations
 */
export class CustomersRepository {
  /**
   * Get Next Customer Code
   * @returns Next Customer code or null if error
   */
  async getNextCustomerCode() {
    const result = await db
      .execute(sql`SELECT next_customer_code()`)
      .catch(() => {
        return null;
      });

    if (!result || result.length === 0) {
      return this.getNextCustomerCodeFromExistingRows();
    }

    return result[0].next_customer_code as string;
  }

  private async getNextCustomerCodeFromExistingRows() {
    const existingCodes = await db
      .select({ customerCode: customers.customerCode })
      .from(customers);

    const sequences = existingCodes
      .map(({ customerCode }) => this.extractCustomerSequence(customerCode))
      .filter((sequence): sequence is string => Boolean(sequence));

    const lastSequence = sequences.sort(
      (a, b) => this.customerSequenceValue(b) - this.customerSequenceValue(a),
    )[0];

    return this.incrementCustomerSequence(lastSequence);
  }

  private extractCustomerSequence(customerCode: string) {
    const sequence = customerCode.split(/[-_]/).pop();
    return sequence && /^[A-Z]{1,2}[0-9]{2}$/.test(sequence)
      ? sequence
      : null;
  }

  private customerSequenceValue(sequence: string) {
    const [, letters, digits] = sequence.match(/^([A-Z]{1,2})([0-9]{2})$/) ?? [];
    if (!letters || !digits) {
      return 0;
    }

    const letterValue = letters
      .split("")
      .reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0);

    return letterValue * 100 + Number(digits);
  }

  private incrementCustomerSequence(sequence?: string) {
    if (!sequence) {
      return "A01";
    }

    const [, letters, digits] = sequence.match(/^([A-Z]{1,2})([0-9]{2})$/) ?? [];
    let number = Number(digits) + 1;
    let nextLetters = letters;

    if (number > 99) {
      nextLetters = this.incrementLetters(letters);
      number = 1;
    }

    return `${nextLetters}${String(number).padStart(2, "0")}`;
  }

  private incrementLetters(letters: string) {
    if (letters.length === 1) {
      return letters === "Z"
        ? "AA"
        : String.fromCharCode(letters.charCodeAt(0) + 1);
    }

    const first = letters.charCodeAt(0);
    const second = letters.charCodeAt(1);

    if (second < 90) {
      return `${letters[0]}${String.fromCharCode(second + 1)}`;
    }

    if (first >= 90) {
      throw new Error("Customer code limit reached (ZZ99)");
    }

    return `${String.fromCharCode(first + 1)}A`;
  }

  /**
   * Find a customer by ID
   *
   * @param id - Customer ID
   * @returns The customer object or null if not found
   */
  async findById(id: number) {
    const result = await db.query.customers.findFirst({
      where: eq(customers.id, id),
      with: {
        user: {
          with: {
            addresses: {
              with: {
                country: true,
              },
            },
          },
          columns: {
            password: false,
          },
        },
      },
    });

    return result;
  }

  /**
   * List customers with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of customers and total count
   * @returns {{ data: Customer[], total: number, searchableFields: string[] }} - The list of customers and metadata
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
    const searchableFields = ["customer_code", "name"];

    // Prepare where conditions
    const filterCondition = createFilterConditions(customers, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      customers,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    // add isDeleted condition in whereCondition
    whereConditions.push(eq(customers.isDeleted, false));
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
    const sortCondition = createSortCondition(customers, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(customers)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const customersData = await tx.query.customers.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(customers.createdAt)],
        with: {
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

      return { data: customersData, total: totalCount, searchableFields };
    });
  }

  /**
   * Create a new customer
   *
   * @param tx - Transaction
   * @param customerData - Customer data
   * @returns The created customer object
   */
  async create(tx: TX, customerData: NewCustomer) {
    const [result] = await tx
      .insert(customers)
      .values({
        ...customerData,
      })
      .returning();
    return result;
  }

  /**
   * Soft delete a customer by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param id - Customer ID to delete
   * @param deletedBy - User ID of the person who deleted this record
   * @returns True if deleted successfully
   */
  async softDelete(tx: TX, id: number, deletedBy: number) {
    const [result] = await tx
      .update(customers)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(eq(customers.id, id))
      .returning();

    return !!result;
  }

  /**
   * Soft delete multiple customers by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of customer IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(customers)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(customers.id, ids))
      .returning();

    return result.length > 0;
  }

  async getAllCustomerCodes(): Promise<string[]> {
    const result = await db
      .select({ code: customers.customerCode })
      .from(customers)
      .where(eq(customers.isDeleted, false));
    return result.map((r) => r.code);
  }

  async getAllCustomerIds(): Promise<number[]> {
    const result = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.isDeleted, false));
    return result.map((r) => r.id);
  }

  async getAllCustomerNames(): Promise<string[]> {
    const result = await db
      .select({ name: users.username })
      .from(customers)
      .leftJoin(users, eq(customers.userId, users.id))
      .where(eq(customers.isDeleted, false));
    return result.map((r) => r.name).filter((name): name is string => !!name);
  }

  /**
   * Find a customer by customer code
   * @param customerCode - Customer code
   * @returns Customer if found, null otherwise
   */
  async findByCustomerCode(customerCode: string) {
    const result = await db.query.customers.findFirst({
      where: eq(customers.customerCode, customerCode),
      with: {
        user: true,
      },
    });
    return result || null;
  }

  /**
   * Find a customer by customer name (username)
   * @param customerName - Customer name (username)
   * @returns Customer if found, null otherwise
   */
  async findByCustomerName(customerName: string) {
    const result = await db
      .select()
      .from(customers)
      .leftJoin(users, eq(customers.userId, users.id))
      .where(
        and(eq(users.username, customerName), eq(customers.isDeleted, false)),
      );

    if (result.length === 0) {
      return null;
    }

    // Return the customer with user data
    return {
      ...result[0].customers,
      user: result[0].users,
    };
  }
}
