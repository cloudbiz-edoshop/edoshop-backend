import * as HttpStatusCodes from "@/lib/http-status-codes";

import { AppError } from "./app-error";

/**
 * Error thrown when a resource already exists
 */
export class ConflictError extends AppError {
  /**
   * Create a new ConflictError
   *
   * @param message - Error message
   * @param details - Conflict error details
   */
  constructor(message: string = "Conflict", details?: Record<string, unknown>) {
    super(message, HttpStatusCodes.CONFLICT, "conflict_error", details);
  }
}
