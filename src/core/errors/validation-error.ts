import * as HttpStatusCodes from "@/lib/http-status-codes";

import { AppError } from "./app-error";

/**
 * Error thrown when request validation fails
 */
export class ValidationError extends AppError {
  /**
   * Create a new ValidationError
   *
   * @param message - Error message
   * @param details - Validation error details
   */
  constructor(
    message: string = "Validation failed",
    details?: Record<string, unknown>,
  ) {
    super(message, HttpStatusCodes.BAD_REQUEST, "validation_error", details);
  }
}
