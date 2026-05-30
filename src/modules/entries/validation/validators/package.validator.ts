import type { CreateEntriesRequest } from "../../entries.schema";

import { EntryStateIds } from "@/constants";

import { BaseEntryValidator } from "./base.validator";

/**
 * Validator for Package entries
 */
export class PackageValidator extends BaseEntryValidator {
  validateFieldRequirements(data: CreateEntriesRequest): void {
    if (data.entryStateId === EntryStateIds.NEW) {
      this.validateNewPackage(data);
    } else if (data.entryStateId === EntryStateIds.RETURNED) {
      this.validateReturnedPackage(data);
    }
  }

  private validateNewPackage(data: CreateEntriesRequest): void {
    // Required fields for new package
    const requiredFields: Array<keyof CreateEntriesRequest> = [
      "supplierCode",
      "colorId",
      "sizeId",
      "customerCode",
      "customerName",
      "itemCode",
      "binLocation",
    ];

    this.validateRequiredFields(
      data,
      requiredFields,
      `Package entries require: ${requiredFields.join(", ")}`,
    );
  }

  private validateReturnedPackage(data: CreateEntriesRequest): void {
    // Required fields for returned package
    const requiredFields: Array<keyof CreateEntriesRequest> = [
      "packageCode",
      "orderId",
    ];

    this.validateRequiredFields(
      data,
      requiredFields,
      `Returned package entries require: ${requiredFields.join(", ")}`,
    );

    // Either customerCode or customerName is required
    this.validateEitherField(
      data,
      "customerCode",
      "customerName",
      "Returned package entries require: customerCode or customerName",
    );
  }
}
