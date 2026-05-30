import * as HttpStatusCodes from "@/lib/http-status-codes";

import { AppError } from "./app-error";

/**
 * Error thrown when user is not authenticated
 */
export class UnauthorizedError extends AppError {
  /**
   * Create a new UnauthorizedError
   *
   * @param message - Error message
   * @param details - Additional error details
   */
  constructor(
    message: string = "Authentication required",
    details?: Record<string, unknown>,
  ) {
    super(message, HttpStatusCodes.UNAUTHORIZED, "unauthorized", details);
  }
}
