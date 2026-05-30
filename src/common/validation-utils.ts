import { ValidationError } from "@/core/errors";

/**
 * Ensure a value is present (not undefined, null, or empty string)
 *
 * @param value - Value to check
 * @param fieldName - Field name for error message
 * @throws {ValidationError} if value is missing
 */
export function ensurePresent<T>(
  value: T | null | undefined,
  fieldName: string,
): T {
  if (value === undefined || value === null || value === "") {
    throw new ValidationError(`${fieldName} is required`);
  }
  return value;
}

/**
 * Validate a string value against a regular expression
 *
 * @param value - String value to validate
 * @param regex - Regular expression to test against
 * @param fieldName - Field name for error message
 * @throws {ValidationError} if validation fails
 */
export function validateRegex(
  value: string,
  regex: RegExp,
  fieldName: string,
): void {
  if (!regex.test(value)) {
    throw new ValidationError(`${fieldName} has invalid format`);
  }
}

/**
 * Validate string length
 *
 * @param value - String value to validate
 * @param min - Minimum length
 * @param max - Maximum length
 * @param fieldName - Field name for error message
 * @throws {ValidationError} if validation fails
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string,
): void {
  if (value.length < min || value.length > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max} characters`,
    );
  }
}

/**
 * Check if a value is within a numeric range
 *
 * @param value - Numeric value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param fieldName - Field name for error message
 * @throws {ValidationError} if validation fails
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string,
): void {
  if (value < min || value > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
  }
}
