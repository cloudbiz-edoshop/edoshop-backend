import type { PaginationSchema } from "./openapi/schemas/pagination";

// Success and error response shapes (v4-aligned):
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta?: {
    pagination?: PaginationSchema;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: {
    code: number;
    message: string;
    details?: unknown;
  };
  meta?: {
    pagination?: PaginationSchema;
    [key: string]: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Extended API response that always includes pagination metadata
 *
 * @template T - The type of data returned in the response
 */
export interface ApiSuccessResponseWithPagination<T = unknown>
  extends ApiSuccessResponse<T> {
  meta: {
    pagination: PaginationSchema;
    searchableFields?: string[];
    [key: string]: unknown;
  };
}

/**
 * Creates a success response
 *
 * @template T - The type of data returned in the response
 * @param data - The data payload to include in the response
 * @param message - Optional success message (defaults to "Success")
 * @param meta - Optional metadata to include in the response
 * @returns A formatted API success response object
 */
export function successResponse<T>(
  data: T,
  message: string = "Success",
  meta?: ApiResponse["meta"],
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta,
    message,
  };
}

/**
 * Creates a success response with pagination metadata
 *
 * @template T - The type of data returned in the response
 * @param data - The data payload to include in the response
 * @param pagination - Pagination metadata (current page, total items, etc.)
 * @param searchableFields - Searchable fields for the pagination
 * @param message - Optional success message (defaults to "Success")
 * @returns A formatted API success response with pagination metadata
 */
export function successResponseWithPagination<T>(
  data: T,
  pagination: PaginationSchema,
  searchableFields: string[],
  message: string = "Success",
): ApiSuccessResponseWithPagination<T> {
  return {
    success: true,
    data,
    message,
    meta: {
      pagination,
      searchableFields,
    },
  };
}

/**
 * Creates an error response
 *
 * @param code - The HTTP status code for the error
 * @param message - The error message
 * @param details - Optional additional error details
 * @returns A formatted API error response object
 */
export function errorResponse(
  code: number,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    success: false,
    message,
    error: {
      code,
      message,
      details,
    },
  };
}
