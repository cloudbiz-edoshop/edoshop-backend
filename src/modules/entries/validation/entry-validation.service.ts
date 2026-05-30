import type { CreateEntriesRequest } from "../entries.schema";
import type { IEntryValidator } from "./validators/base.validator";

import { EntryStateIds, EntryTypeIds } from "@/constants";
import { AppError } from "@/core/errors";

import { BundleValidator } from "./validators/bundle.validator";
import { DatabaseConstraintsValidator } from "./validators/database-constraints.validator";
import { ItemValidator } from "./validators/item.validator";
import { PackageValidator } from "./validators/package.validator";
import { SeriesValidator } from "./validators/series.validator";

/**
 * Main validation service that orchestrates all validation layers
 */
export class EntryValidationService {
  private readonly databaseValidator: DatabaseConstraintsValidator;
  private readonly validators: Map<string, IEntryValidator>;

  constructor() {
    this.databaseValidator = new DatabaseConstraintsValidator();
    this.validators = new Map<string, IEntryValidator>();

    // Initialize validators
    this.validators.set(`${EntryTypeIds.BUNDLE}_${EntryStateIds.NEW}`, new BundleValidator());
    this.validators.set(`${EntryTypeIds.SERIES}_${EntryStateIds.NEW}`, new SeriesValidator());
    this.validators.set(`${EntryTypeIds.SERIES}_${EntryStateIds.RETURNED}`, new SeriesValidator());
    this.validators.set(`${EntryTypeIds.ITEM}_${EntryStateIds.NEW}`, new ItemValidator());
    this.validators.set(`${EntryTypeIds.ITEM}_${EntryStateIds.RETURNED}`, new ItemValidator());
    this.validators.set(`${EntryTypeIds.PACKAGE}_${EntryStateIds.NEW}`, new PackageValidator());
    this.validators.set(`${EntryTypeIds.PACKAGE}_${EntryStateIds.RETURNED}`, new PackageValidator());
  }

  /**
   * Main validation method that runs all validation layers
   */
  async validate(data: CreateEntriesRequest): Promise<void> {
    // Layer 1: Field Requirements Validation
    await this.validateFieldRequirements(data);

    // Layer 2: Database Constraints Validation
    await this.validateDatabaseConstraints(data);

    // Layer 3: Business Rules Validation
    await this.validateBusinessRules(data);
  }

  /**
   * Validate field requirements based on entry type and state
   */
  private async validateFieldRequirements(
    data: CreateEntriesRequest,
  ): Promise<void> {
    // Check if bundle returns are allowed
    if (
      data.entryTypeId === EntryTypeIds.BUNDLE &&
      data.entryStateId === EntryStateIds.RETURNED
    ) {
      throw new AppError("Bundle entries cannot be returned");
    }

    const validatorKey = `${data.entryTypeId}_${data.entryStateId}`;
    const validator = this.validators.get(validatorKey);

    if (!validator) {
      throw new AppError(
        `No validator found for entry type ${data.entryTypeId} and state ${data.entryStateId}`,
      );
    }

    await validator.validateFieldRequirements(data);
  }

  /**
   * Validate database constraints (entity existence)
   */
  private async validateDatabaseConstraints(
    data: CreateEntriesRequest,
  ): Promise<void> {
    await this.databaseValidator.validate(data);
  }

  /**
   * Validate business rules and cross-field validation
   */
  private async validateBusinessRules(
    data: CreateEntriesRequest,
  ): Promise<void> {
    const validatorKey = `${data.entryTypeId}_${data.entryStateId}`;
    const validator = this.validators.get(validatorKey);

    if (validator?.validateBusinessRules) {
      await validator.validateBusinessRules(data);
    }
  }
}
