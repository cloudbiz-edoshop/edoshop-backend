/**
 * Base error class for application errors
 * Extends Error with additional properties
 */
export class AppError extends Error {
  /**
   * HTTP status code
   */
  statusCode: number;

  /**
   * Error code for identifying error type
   */
  code: string;

  /**
   * Additional details about the error
   */
  details?: Record<string, unknown>;

  /**
   * Original error if this is a wrapped error
   */
  originalError?: Error;

  /**
   * Create a new AppError
   *
   * @param message - Error message
   * @param statusCode - HTTP status code
   * @param code - Error code
   * @param details - Additional error details
   * @param originalError - Original error if this wraps another error
   */
  constructor(
    message: string,
    statusCode = 500,
    code = "internal_server_error",
    details?: Record<string, unknown>,
    originalError?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.originalError = originalError;

    // Ensures proper stack trace in V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
