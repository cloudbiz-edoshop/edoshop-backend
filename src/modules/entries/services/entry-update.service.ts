import type { UpdateEntriesRequest } from "../entries.schema";

import type { TX } from "@/lib/types";

import { eq } from "drizzle-orm";
import { EntryTypeIds } from "@/constants";
import { AppError } from "@/core/errors";

import { bundles, items, packages, series } from "@/db/models";

// Type definitions for update data objects
interface SeriesUpdateData {
  updatedAt: string;
  updatedBy: number;
  colorId?: number | null;
}

interface ItemUpdateData {
  updatedAt: string;
  updatedBy: number;
  sizeId?: number | null;
}

interface PackageUpdateData {
  updatedAt: string;
  updatedBy: number;
  binLocation?: string | null;
}

/**
 * Service responsible for updating entry-specific records (bundles, series, items, packages)
 */
export class EntryUpdateService {
  /**
   * Update type-specific records based on entry type
   */
  async updateTypeSpecificRecords(
    tx: TX,
    entryId: number,
    entryTypeId: number,
    updateData: UpdateEntriesRequest & { updatedBy: number },
  ): Promise<void> {
    switch (entryTypeId) {
      case EntryTypeIds.BUNDLE:
        await this.updateBundleRecord(tx, entryId, updateData.updatedBy);
        break;

      case EntryTypeIds.SERIES:
        await this.updateSeriesRecord(tx, entryId, updateData);
        break;

      case EntryTypeIds.ITEM:
        await this.updateItemRecord(tx, entryId, updateData);
        break;

      case EntryTypeIds.PACKAGE:
        await this.updatePackageRecord(tx, entryId, updateData);
        break;

      default:
        throw new AppError(`Unknown entry type ID: ${entryTypeId}`);
    }
  }

  /**
   * Update bundle record
   * Bundles only have bundleCode which is unique and typically shouldn't be updated
   */
  private async updateBundleRecord(
    tx: TX,
    entryId: number,
    updatedBy: number,
  ): Promise<void> {
    // Find the bundle by entryId
    const bundleRecord = await tx.query.bundles.findFirst({
      where: eq(bundles.entryId, entryId),
    });

    if (!bundleRecord) {
      throw new AppError(`Bundle not found for entry ID: ${entryId}`);
    }

    // Bundles don't have many updatable fields besides timestamps
    await tx
      .update(bundles)
      .set({
        updatedAt: new Date().toISOString(),
        updatedBy,
      })
      .where(eq(bundles.id, bundleRecord.id));
  }

  /**
   * Update series record
   * Series can have colorId updated
   */
  private async updateSeriesRecord(
    tx: TX,
    entryId: number,
    updateData: UpdateEntriesRequest & { updatedBy: number },
  ): Promise<void> {
    // Find the series by entryId
    const seriesRecord = await tx.query.series.findFirst({
      where: eq(series.entryId, entryId),
    });

    if (!seriesRecord) {
      throw new AppError(`Series not found for entry ID: ${entryId}`);
    }

    // Build update object with only provided fields
    const seriesUpdateData: SeriesUpdateData = {
      updatedAt: new Date().toISOString(),
      updatedBy: updateData.updatedBy,
    };

    // Update colorId if provided
    if (updateData.colorId !== undefined) {
      seriesUpdateData.colorId = updateData.colorId;
    }

    await tx
      .update(series)
      .set(seriesUpdateData)
      .where(eq(series.id, seriesRecord.id));
  }

  /**
   * Update item record
   * Items can have sizeId updated
   */
  private async updateItemRecord(
    tx: TX,
    entryId: number,
    updateData: UpdateEntriesRequest & { updatedBy: number },
  ): Promise<void> {
    // Find the item by entryId
    const itemRecord = await tx.query.items.findFirst({
      where: eq(items.entryId, entryId),
    });

    if (!itemRecord) {
      throw new AppError(`Item not found for entry ID: ${entryId}`);
    }

    // Build update object with only provided fields
    const itemUpdateData: ItemUpdateData = {
      updatedAt: new Date().toISOString(),
      updatedBy: updateData.updatedBy,
    };

    // Update sizeId if provided
    if (updateData.sizeId !== undefined) {
      itemUpdateData.sizeId = updateData.sizeId;
    }

    await tx
      .update(items)
      .set(itemUpdateData)
      .where(eq(items.id, itemRecord.id));
  }

  /**
   * Update package record
   * Packages can have binLocation, customerId, and packageStatusId updated
   */
  private async updatePackageRecord(
    tx: TX,
    entryId: number,
    updateData: UpdateEntriesRequest & { updatedBy: number },
  ): Promise<void> {
    // Find the package by entryId
    const packageRecord = await tx.query.packages.findFirst({
      where: eq(packages.entryId, entryId),
    });

    if (!packageRecord) {
      throw new AppError(`Package not found for entry ID: ${entryId}`);
    }

    // Build update object with only provided fields
    const packageUpdateData: PackageUpdateData = {
      updatedAt: new Date().toISOString(),
      updatedBy: updateData.updatedBy,
    };

    // Update binLocation if provided
    if (updateData.binLocation !== undefined) {
      packageUpdateData.binLocation = updateData.binLocation;
    }

    await tx
      .update(packages)
      .set(packageUpdateData)
      .where(eq(packages.id, packageRecord.id));
  }
}
