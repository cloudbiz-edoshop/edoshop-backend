import type { CreateEntriesRequest } from "../../entries.schema";
import { EntryStateIds } from "@/constants";

import { AppError } from "@/core/errors";

import { BaseEntryValidator } from "./base.validator";

/**
 * Validator for Series entries
 */
export class SeriesValidator extends BaseEntryValidator {
  validateFieldRequirements(data: CreateEntriesRequest): void {
    if (data.entryStateId === EntryStateIds.NEW) {
      this.validateNewSeries(data);
    } else if (data.entryStateId === EntryStateIds.RETURNED) {
      this.validateReturnedSeries(data);
    }
  }

  validateBusinessRules(data: CreateEntriesRequest): void {
    if (data.bundleCode && data.supplierCode) {
      this.validateBundleCodeFormat(data.bundleCode, data.supplierCode);
    }
  }

  private validateNewSeries(data: CreateEntriesRequest): void {
    // Required fields for new series
    const requiredFields: Array<keyof CreateEntriesRequest> = [
      "supplierCode",
      "bundleCode",
      "colorId",
    ];

    this.validateRequiredFields(
      data,
      requiredFields,
      `Series entries require: ${requiredFields.join(", ")}`,
    );
  }

  private validateReturnedSeries(data: CreateEntriesRequest): void {
    // Required fields for returned series
    const requiredFields: Array<keyof CreateEntriesRequest> = [
      "seriesCode",
      "colorId",
    ];

    this.validateRequiredFields(
      data,
      requiredFields,
      `Returned series entries require: ${requiredFields.join(", ")}`,
    );

    // Either customerCode or customerName is required
    this.validateEitherField(
      data,
      "customerCode",
      "customerName",
      "Returned series entries require: customerCode or customerName",
    );
  }

  private validateBundleCodeFormat(
    bundleCode: string,
    supplierCode: string,
  ): void {
    const expectedPrefix = `${supplierCode}_B`;
    if (!bundleCode.startsWith(expectedPrefix)) {
      throw new AppError(
        `Bundle code ${bundleCode} must start with supplier code followed by '_B' (expected: ${expectedPrefix})`,
      );
    }
  }
}
