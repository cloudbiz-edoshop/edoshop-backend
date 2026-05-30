import * as HttpStatusCodes from "@/lib/http-status-codes";

import { AppError } from "./app-error";

/**
 * Error thrown when a requested resource is not found
 */
export class NotFoundError extends AppError {
  /**
   * Create a new NotFoundError
   *
   * @param message - Error message
   * @param details - Additional error details
   */
  constructor(
    message: string = "Resource not found",
    details?: Record<string, unknown>,
  ) {
    super(message, HttpStatusCodes.NOT_FOUND, "not_found", details);
  }
}
