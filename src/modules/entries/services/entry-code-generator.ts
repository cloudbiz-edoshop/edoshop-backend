import type { CreateEntriesRequest } from "../entries.schema";

import type { ResolvedEntityIds } from "./entry-data-resolver";
import { eq, sql } from "drizzle-orm";
import { EntryStateIds, EntryTypeIds } from "@/constants";
import { AppError } from "@/core/errors";
import { db } from "@/db";

import { bundles } from "@/db/models/bundles";
import { series } from "@/db/models/series";

export interface GeneratedCodes {
  bundleCode?: string;
  seriesCode?: string;
  itemCode?: string;
  packageCode?: string;
}

/**
 * Service responsible for generating entity codes
 */
export class EntryCodeGenerator {
  /**
   * Generate bundle code based on supplier code using database function
   * Pattern: {supplierCode}_B{serialNumber}
   * Example: PK_A01_B1
   */
  private async generateBundleCode(supplierCode: string): Promise<string> {
    const result = await db.execute(
      sql`SELECT next_bundle_code(${supplierCode})`,
    );
    return result[0].next_bundle_code as string;
  }

  /**
   * Generate series code based on bundle code using database function
   * Pattern: {bundleCode}_S{serialNumber}
   * Example: PK_A01_B1_S1
   */
  private async generateSeriesCode(bundleCode: string): Promise<string> {
    const result = await db.execute(
      sql`SELECT next_series_code(${bundleCode})`,
    );
    return result[0].next_series_code as string;
  }

  /**
   * Generate item code based on series code using database function
   * Pattern: {seriesCode}_I{serialNumber}
   * Example: PK_A01_B1_S1_I1
   */
  private async generateItemCode(seriesCode: string): Promise<string> {
    const result = await db.execute(sql`SELECT next_item_code(${seriesCode})`);
    return result[0].next_item_code as string;
  }

  /**
   * Generate package code using database function
   * Pattern: PKG_01, PKG_02, PKG_03, etc.
   * Example: PKG_01
   */
  private async generatePackageCode(): Promise<string> {
    const result = await db.execute(sql`SELECT next_package_code()`);
    return result[0].next_package_code as string;
  }

  /**
   * Generate required codes based on entry type and state
   * Skip code generation for returns - they don't need new codes
   */
  async generateRequiredCodes(
    entryData: CreateEntriesRequest,
    resolvedIds: ResolvedEntityIds,
  ): Promise<GeneratedCodes> {
    // Skip code generation for returns
    if (entryData.entryStateId === EntryStateIds.RETURNED) {
      return {};
    }

    const codes: GeneratedCodes = {};

    switch (entryData.entryTypeId) {
      case EntryTypeIds.BUNDLE:
        codes.bundleCode = await this.generateBundleCode(entryData.supplierCode!);
        break;

      case EntryTypeIds.SERIES:
        codes.seriesCode = await this.generateSeriesCodeForEntry(resolvedIds.bundleId!);
        break;

      case EntryTypeIds.ITEM:
        codes.itemCode = await this.generateItemCodeForEntry(resolvedIds.seriesId!);
        break;

      case EntryTypeIds.PACKAGE:
        codes.packageCode = await this.generatePackageCode();
        break;

      default:
        throw new AppError(`Unknown entry type ID: ${entryData.entryTypeId}`);
    }

    return codes;
  }

  /**
   * Generate series code for entry by looking up bundle code
   */
  private async generateSeriesCodeForEntry(bundleId: number): Promise<string> {
    const bundleRecord = await db.query.bundles.findFirst({
      where: eq(bundles.id, bundleId),
    });

    if (!bundleRecord) {
      throw new AppError(`Bundle with ID ${bundleId} not found`);
    }

    return this.generateSeriesCode(bundleRecord.bundleCode);
  }

  /**
   * Generate item code for entry by looking up series code
   */
  private async generateItemCodeForEntry(seriesId: number): Promise<string> {
    const seriesRecord = await db.query.series.findFirst({
      where: eq(series.id, seriesId),
    });

    if (!seriesRecord) {
      throw new AppError(`Series with ID ${seriesId} not found`);
    }

    return this.generateItemCode(seriesRecord.seriesCode);
  }
}
