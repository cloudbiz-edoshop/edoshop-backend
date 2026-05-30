import * as HttpStatusCodes from "@/lib/http-status-codes";

import { AppError } from "./app-error";

/**
 * Error thrown when user lacks permission for an action
 */
export class ForbiddenError extends AppError {
  /**
   * Create a new ForbiddenError
   *
   * @param message - Error message
   * @param details - Additional error details
   */
  constructor(
    message: string = "Access forbidden",
    details?: Record<string, unknown>,
  ) {
    super(message, HttpStatusCodes.FORBIDDEN, "forbidden", details);
  }
}
