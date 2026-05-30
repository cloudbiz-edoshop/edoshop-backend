import type { CreateEntriesRequest } from "../../entries.schema";
import { EntryStateIds } from "@/constants";

import { AppError } from "@/core/errors";

import { BaseEntryValidator } from "./base.validator";

/**
 * Validator for Item entries
 */
export class ItemValidator extends BaseEntryValidator {
  validateFieldRequirements(data: CreateEntriesRequest): void {
    if (data.entryStateId === EntryStateIds.NEW) {
      this.validateNewItem(data);
    } else if (data.entryStateId === EntryStateIds.RETURNED) {
      this.validateReturnedItem(data);
    }
  }

  validateBusinessRules(data: CreateEntriesRequest): void {
    if (data.itemCode && data.seriesCode) {
      this.validateItemCodeFormat(data.itemCode, data.seriesCode);
    }

    if (data.bundleCode && data.seriesCode) {
      this.validateSeriesCodeBundleFormat(data.seriesCode, data.bundleCode);
    }
  }

  private validateNewItem(data: CreateEntriesRequest): void {
    // Required fields for new item
    const requiredFields: Array<keyof CreateEntriesRequest> = [
      "supplierCode",
      "bundleCode",
      "seriesCode",
      "sizeId",
      "colorId",
    ];

    this.validateRequiredFields(
      data,
      requiredFields,
      `Item entries require: ${requiredFields.join(", ")}`,
    );
  }

  private validateReturnedItem(data: CreateEntriesRequest): void {
    // Required fields for returned item
    const requiredFields: Array<keyof CreateEntriesRequest> = [
      "itemCode",
      "colorId",
      "sizeId",
    ];

    this.validateRequiredFields(
      data,
      requiredFields,
      `Returned item entries require: ${requiredFields.join(", ")}`,
    );

    // Either customerCode or customerName is required
    this.validateEitherField(
      data,
      "customerCode",
      "customerName",
      "Returned item entries require: customerCode or customerName",
    );
  }

  private validateItemCodeFormat(itemCode: string, seriesCode: string): void {
    if (!itemCode.startsWith(seriesCode)) {
      throw new AppError(
        `Item code ${itemCode} does not start with series code ${seriesCode}. ` +
        "Item codes must start with their series code.",
      );
    }
  }

  private validateSeriesCodeBundleFormat(
    seriesCode: string,
    bundleCode: string,
  ): void {
    if (!seriesCode.startsWith(bundleCode)) {
      throw new AppError(
        `Series code ${seriesCode} does not start with bundle code ${bundleCode}. ` +
        "Series codes must start with their bundle code.",
      );
    }
  }
}
