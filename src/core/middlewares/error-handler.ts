import type { ErrorHandler, Next } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { AppContext } from "@/lib/types";

import { HTTPException } from "hono/http-exception";

import { appConfig } from "@/config";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/core/errors";
import { errorResponse } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";

/**
 * Handles database constraint violation errors
 *
 * Detects common database constraint errors (like unique constraint violations)
 * and returns user-friendly error messages and appropriate status codes.
 *
 * @param error - The error object to analyze
 * @returns Error details with message and status code if a constraint error is detected, or null otherwise
 */
function handleDbConstraintError(
  error: unknown,
): { message: string; statusCode: number } | null {
  if (error && typeof error === "object" && "detail" in error) {
    const detail = error.detail as string;
    if (detail.includes("already exists") && detail.includes("Key")) {
      const message = detail.replace("Key (", "").replace(")", "");
      return {
        message,
        statusCode: HttpStatusCodes.CONFLICT,
      };
    }
  }
  return null;
}

/**
 * Maps application errors to standardized response objects
 *
 * Converts various error types (ValidationError, UnauthorizedError, etc.)
 * to consistent response objects with appropriate status codes.
 *
 * @param error - The error object to map
 * @returns An object containing the error message and HTTP status code
 */
function mapErrorToResponse(error: unknown): {
  message: string;
  statusCode: number;
} {
  // Handle application errors with specific status codes
  if (error instanceof ValidationError) {
    return { message: error.message, statusCode: HttpStatusCodes.BAD_REQUEST };
  }

  if (error instanceof UnauthorizedError) {
    return { message: error.message, statusCode: HttpStatusCodes.UNAUTHORIZED };
  }

  if (error instanceof ForbiddenError) {
    return { message: error.message, statusCode: HttpStatusCodes.FORBIDDEN };
  }

  if (error instanceof NotFoundError) {
    return { message: error.message, statusCode: HttpStatusCodes.NOT_FOUND };
  }

  if (error instanceof ConflictError) {
    return { message: error.message, statusCode: HttpStatusCodes.CONFLICT };
  }

  if (error instanceof AppError) {
    return { message: error.message, statusCode: error.statusCode };
  }

  // Handle HTTPException specifically
  if (error instanceof HTTPException) {
    return {
      message: error.message,
      statusCode: error.status,
    };
  }

  // Handle other objects with message property
  if (error && typeof error === "object" && "message" in error) {
    const statusCode =
      "status" in error
        ? (error.status as number)
        : HttpStatusCodes.INTERNAL_SERVER_ERROR;

    return { message: error.message as string, statusCode };
  }

  // Get current status or default to internal server error
  const currentStatus =
    error && typeof error === "object" && "status" in error
      ? (error.status as number)
      : HttpStatusCodes.INTERNAL_SERVER_ERROR;

  const statusCode =
    currentStatus !== HttpStatusCodes.OK
      ? currentStatus
      : HttpStatusCodes.INTERNAL_SERVER_ERROR;

  return {
    message: "An unexpected error occurred",
    statusCode,
  };
}

/**
 * Global error handling middleware
 *
 * Catches all errors thrown during request processing, logs them,
 * and converts them to consistent error responses with appropriate status codes.
 * Includes stack traces in development mode.
 *
 * @param c - The application context
 * @param next - The next middleware function
 * @returns JSON error response with appropriate status code
 */
export const errorHandler = async (c: AppContext, next: Next) => {
  try {
    await next();
  } catch (error) {
    const details = error instanceof Error ? error.stack : undefined;
    // Log the error with context
    c.var.logger.error({
      message: "Request failed",
      error: error instanceof Error ? error.message : String(error),
      stack: details,
      path: c.req.path,
      method: c.req.method,
      ip: c.var.ipAddress,
    });

    // Check for DB constraint errors first
    const dbError = handleDbConstraintError(error);
    if (dbError) {
      return c.json(
        errorResponse(
          dbError.statusCode,
          dbError.message,
          appConfig.isDevelopment ? details : undefined,
        ),
        dbError.statusCode as ContentfulStatusCode,
      );
    }

    // Map the error to appropriate response
    const { message, statusCode } = mapErrorToResponse(error);

    return c.json(
      errorResponse(
        statusCode,
        message,
        appConfig.isDevelopment ? details : undefined,
      ),
      statusCode as ContentfulStatusCode,
    );
  }
};

/**
 * Custom error handler for Hono's onError hook
 *
 * This handler re-throws the error to be caught by the errorHandler middleware
 * for consistent error handling across the application.
 *
 * @param _err - The error that occurred
 * @param _c - The application context
 */
export const onError: ErrorHandler = (_err, _c) => {
  // Let errorHandler middleware handle this
  throw _err;
};
