import type { CreateEntriesRequest } from "../../entries.schema";
import { EntryStateIds } from "@/constants";

import { AppError } from "@/core/errors";

import { BaseEntryValidator } from "./base.validator";

/**
 * Validator for Bundle entries
 */
export class BundleValidator extends BaseEntryValidator {
  validateFieldRequirements(data: CreateEntriesRequest): void {
    if (data.entryStateId === EntryStateIds.NEW) {
      this.validateNewBundle(data);
    } else {
      throw new AppError("Bundle entries cannot be returned");
    }
  }

  private validateNewBundle(data: CreateEntriesRequest): void {
    // Required fields for new bundle
    const requiredFields: Array<keyof CreateEntriesRequest> = ["supplierCode"];

    this.validateRequiredFields(
      data,
      requiredFields,
      "Bundle entries require: supplierCode",
    );
  }
}
