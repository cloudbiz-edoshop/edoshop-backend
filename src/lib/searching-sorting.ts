import type { SQL } from "drizzle-orm";

import type { PaginationSchema } from "./openapi/schemas/pagination";

import { and, eq, inArray, like, or, sql } from "drizzle-orm";

/**
 * Type representing a Drizzle table object that can be dynamically indexed
 *
 * We use `any` here intentionally because:
 * 1. Drizzle's PgTable types are complex and don't have index signatures
 * 2. We need to dynamically access columns by string keys at runtime
 * 3. Type safety is preserved through runtime checks (key in fields)
 * 4. Drizzle's own functions (eq, like, etc.) handle the actual type validation
 *
 * Alternative approaches like using PgColumn or unknown are too restrictive
 * and cause type errors throughout the codebase.
 */
type ColumnRecord = Record<string, any>;

/**
 * Creates SQL conditions for filtering based on filter parameters
 *
 * Generates SQL conditions for filtering database queries based on provided filter criteria.
 * Handles different data types appropriately (numbers, booleans, arrays, strings, dates).
 *
 * @template T - Type of the fields object, typically database columns
 * @param fields - Object containing database fields/columns
 * @param filters - Key-value pairs of filter criteria
 * @returns SQL condition for filtering, or undefined if no valid filters
 */
export function createFilterConditions<T extends ColumnRecord>(
  fields: T,
  filters?: Record<string, unknown>,
): SQL | undefined {
  if (!filters || Object.keys(filters).length === 0) {
    return undefined;
  }

  const conditions: SQL[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (!(key in fields) || value === undefined || value === null) {
      continue;
    }
    // Handle different types of values appropriately
    if (typeof value === "number" || typeof value === "boolean") {
      // Use exact match for numbers and booleans

      conditions.push(eq(fields[key], value));
    } else if (Array.isArray(value)) {
      // Use IN operator for arrays

      conditions.push(inArray(fields[key], value));
    } else if (typeof value === "string") {
      // Check if the field name suggests it's a date field
      const isDateField = key === "createdAt" || key === "updatedAt";

      // Try to parse as date if it looks like a date field
      if (isDateField && !Number.isNaN(Date.parse(value))) {
        // Keep dates as strings since we're using timestamp with mode: "string"
        conditions.push(eq(fields[key], value));
      } else {
        // Use LIKE for strings
        conditions.push(like(fields[key], `%${value}%`));
      }
    } else if (value instanceof Date) {
      // Use exact match for dates
      conditions.push(eq(fields[key], value));
    }
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Creates SQL conditions for global search across multiple fields
 *
 * Generates a SQL condition for searching text across multiple database fields.
 * Uses LIKE queries with wildcards for partial matching.
 *
 * @template T - Type of the fields object, typically database columns
 * @param searchableFields - Array of field names to search within
 * @param fields - Object containing database fields/columns
 * @param searchTerm - The search term to look for
 * @returns SQL condition for searching, or undefined if no search term or fields
 */
export function createSearchCondition<T extends ColumnRecord>(
  searchableFields: string[],
  fields: T,
  searchTerm?: string,
): SQL | undefined {
  if (!searchTerm || searchableFields.length === 0) {
    return undefined;
  }

  const searchConditions = searchableFields
    .filter((field) => field in fields)
    .map((field) => like(fields[field], `%${searchTerm}%`));

  return searchConditions.length > 0 ? or(...searchConditions) : undefined;
}

/**
 * Creates SQL condition for sorting query results
 *
 * Generates a SQL sort condition based on the specified field and direction.
 *
 * @template T - Type of the fields object, typically database columns
 * @param fields - Object containing database fields/columns
 * @param sortBy - Field name to sort by
 * @param sortOrder - Sort direction, either "asc" (ascending) or "desc" (descending)
 * @returns SQL condition for sorting, or undefined if sortBy is invalid
 */
export function createSortCondition<T extends ColumnRecord>(
  fields: T,
  sortBy?: string,
  sortOrder: "asc" | "desc" = "desc",
): SQL | undefined {
  if (!sortBy || !(sortBy in fields)) {
    return undefined;
  }

  return sortOrder === "asc"
    ? sql`${fields[sortBy]} asc`
    : sql`${fields[sortBy]} desc`;
}

/**
 * Calculates pagination parameters for database queries
 *
 * Converts page number and limit into SQL LIMIT and OFFSET values.
 *
 * @param page - Current page number (1-based)
 * @param limit - Number of items per page
 * @returns Object with limit and offset values for SQL queries
 */
export function getPaginationValues(page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit;
  return { limit, offset };
}

/**
 * Creates a pagination metadata object
 *
 * Builds a standardized pagination object with total count, current page,
 * total pages, and navigation flags.
 *
 * @param total - Total number of items across all pages
 * @param page - Current page number (1-based)
 * @param limit - Number of items per page
 * @returns Pagination metadata object
 */
export function createPagination(total: number, page: number, limit: number) {
  const pagination: PaginationSchema = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPreviousPage: page > 1,
  };

  return pagination;
}
