import type { CreateEntriesRequest } from "../../entries.schema";

/**
 * Base interface for all entry type validators
 */
export interface IEntryValidator {
  /**
   * Validate field requirements for the specific entry type and state
   */
  validateFieldRequirements: (
    data: CreateEntriesRequest,
  ) => Promise<void> | void;

  /**
   * Validate business rules for the specific entry type and state
   */
  validateBusinessRules?: (data: CreateEntriesRequest) => Promise<void> | void;
}

/**
 * Abstract base class for entry validators
 */
export abstract class BaseEntryValidator implements IEntryValidator {
  abstract validateFieldRequirements(
    data: CreateEntriesRequest,
  ): Promise<void> | void;

  /**
   * Helper method to validate required fields
   */
  protected validateRequiredFields(
    data: CreateEntriesRequest,
    requiredFields: Array<keyof CreateEntriesRequest>,
    errorMessage?: string,
  ): void {
    const missingFields = requiredFields.filter(
      (field) => data[field] === undefined || data[field] === null,
    );

    if (missingFields.length > 0) {
      const message =
        errorMessage || `Missing required fields: ${missingFields.join(", ")}`;
      throw new Error(message);
    }
  }

  /**
   * Helper method to validate either/or fields
   */
  protected validateEitherField(
    data: CreateEntriesRequest,
    field1: keyof CreateEntriesRequest,
    field2: keyof CreateEntriesRequest,
    errorMessage?: string,
  ): void {
    if (!data[field1] && !data[field2]) {
      const message =
        errorMessage ||
        `Either ${String(field1)} or ${String(field2)} is required`;
      throw new Error(message);
    }
  }
}
