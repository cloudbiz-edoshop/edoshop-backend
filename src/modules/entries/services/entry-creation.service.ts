import type { EntriesRepository } from "../entries.repository";

import type { CreateEntriesRequest } from "../entries.schema";
import type { GeneratedCodes } from "./entry-code-generator";
import type { ResolvedEntityIds } from "./entry-data-resolver";
import type { TX } from "@/lib/types";
import { EntryStateIds, EntryTypeIds } from "@/constants";
import {
  ENTRY_TYPE_DESCRIPTIONS,
  EntryTypeIdToEnum,
} from "@/constants/entries/entry-types.constants";
import { AppError } from "@/core/errors";
import { returns } from "@/db/models";
import { bundles } from "@/db/models/bundles";

import { entryProducts } from "@/db/models/entry-products";
import { items } from "@/db/models/items";
import { packages } from "@/db/models/packages";
import { series } from "@/db/models/series";

/**
 * Service responsible for creating entry database records
 */
export class EntryCreationService {
  constructor(private readonly entriesRepository: EntriesRepository) {}

  /**
   * Execute entry creation within a transaction
   */
  async executeEntryCreation(
    tx: TX,
    entryData: CreateEntriesRequest & { createdBy: number },
    resolvedIds: ResolvedEntityIds,
    generatedCodes: GeneratedCodes,
  ) {
    // 1. Create the main entry record
    const entry = await this.createMainEntry(tx, entryData, resolvedIds);

    // 2. Create entry-product relationship if needed
    if (resolvedIds.productId !== undefined) {
      await this.createEntryProductRelation(
        tx,
        entry.id,
        resolvedIds.productId,
        entryData.createdBy,
      );
    }

    // 3. Handle returns (exit early for returns)
    if (entryData.entryStateId === EntryStateIds.RETURNED) {
      await this.handleReturnEntry(tx, entry.id, entryData, resolvedIds);
      return entry;
    }

    // 4. Handle based on entry type (only for non-returns)
    await this.createTypeSpecificRecords(
      tx,
      entry.id,
      entryData,
      resolvedIds,
      generatedCodes,
    );

    return entry;
  }

  /**
   * Create the main entry record
   */
  private async createMainEntry(
    tx: TX,
    entryData: CreateEntriesRequest & { createdBy: number },
    resolvedIds: ResolvedEntityIds,
  ) {
    const entryDataForCreate: any = {
      entryStateId: entryData.entryStateId,
      entryTypeId: entryData.entryTypeId,
      productCode: entryData.productCode,
      quantity: entryData.quantity,
      weight: entryData.weight.toFixed(2),
      date: entryData.date,
      warehouseId: entryData.warehouseId,
      description: entryData.description,
      isOpen: entryData.isOpen,
      createdBy: entryData.createdBy,
      updatedBy: entryData.createdBy,
    };

    // Only add supplierId if it's defined
    if (resolvedIds.supplierId !== undefined) {
      entryDataForCreate.supplierId = resolvedIds.supplierId;
    }

    // Only add customerId if it's defined
    if (resolvedIds.customerId !== undefined) {
      entryDataForCreate.customerId = resolvedIds.customerId;
    }

    return this.entriesRepository.create(tx, entryDataForCreate);
  }

  /**
   * Create entry-product relationship
   */
  private async createEntryProductRelation(
    tx: TX,
    entryId: number,
    productId: number,
    createdBy: number,
  ) {
    await tx.insert(entryProducts).values({
      entryId,
      productId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy,
      updatedBy: createdBy,
    });
  }

  /**
   * Handle return entry creation
   */
  private async handleReturnEntry(
    tx: TX,
    entryId: number,
    entryData: CreateEntriesRequest & { createdBy: number },
    resolvedIds: ResolvedEntityIds,
  ) {
    // Validate that bundles cannot be returned
    if (entryData.entryTypeId === EntryTypeIds.BUNDLE) {
      throw new AppError("Bundles cannot be returned");
    }

    const originalEntryId = await this.findOriginalEntryId(
      tx,
      entryData,
      resolvedIds,
    );

    if (!originalEntryId) {
      throw new AppError(
        `Original ${ENTRY_TYPE_DESCRIPTIONS[EntryTypeIdToEnum[entryData.entryTypeId]]} entry not found for the returned item`,
      );
    }

    // Create the return record
    const returnData: any = {
      entryId,
      originalEntryId,
      entryType:
        ENTRY_TYPE_DESCRIPTIONS[EntryTypeIdToEnum[entryData.entryTypeId]],
      customerId: resolvedIds.customerId!,
      isOpen: entryData.isOpen ?? false,
      createdAt: new Date().toISOString(),
      createdBy: entryData.createdBy,
    };

    // Add orderId for package returns
    if (entryData.entryTypeId === EntryTypeIds.PACKAGE) {
      returnData.orderId = entryData.orderId;
    }

    await tx.insert(returns).values(returnData);
  }

  /**
   * Find the original entry ID for returns
   */
  private async findOriginalEntryId(
    tx: TX,
    entryData: CreateEntriesRequest,
    resolvedIds: ResolvedEntityIds,
  ): Promise<number | undefined> {
    switch (entryData.entryTypeId) {
      case EntryTypeIds.SERIES:
        return this.findOriginalSeriesEntryId(tx, resolvedIds, entryData);

      case EntryTypeIds.ITEM:
        return this.findOriginalItemEntryId(tx, resolvedIds, entryData);

      case EntryTypeIds.PACKAGE:
        return this.findOriginalPackageEntryId(tx, resolvedIds, entryData);

      default:
        return undefined;
    }
  }

  private async findOriginalSeriesEntryId(
    tx: TX,
    resolvedIds: ResolvedEntityIds,
    entryData: CreateEntriesRequest,
  ): Promise<number | undefined> {
    if (
      !resolvedIds.seriesId ||
      !entryData.colorId ||
      !resolvedIds.customerId ||
      !entryData.customerName
    ) {
      throw new AppError(
        "Series ID, Color ID, Customer ID, and Customer Name are required for series returns",
      );
    }

    const seriesRecord = await tx.query.series.findFirst({
      where: (series, { eq }) => eq(series.id, resolvedIds.seriesId!),
    });

    return seriesRecord?.entryId;
  }

  private async findOriginalItemEntryId(
    tx: TX,
    resolvedIds: ResolvedEntityIds,
    entryData: CreateEntriesRequest,
  ): Promise<number | undefined> {
    if (
      !resolvedIds.itemId ||
      !entryData.colorId ||
      !entryData.sizeId ||
      !resolvedIds.customerId ||
      !entryData.customerName
    ) {
      throw new AppError(
        "Item ID, Color ID, Size ID, Customer ID, and Customer Name are required for item returns",
      );
    }

    const itemRecord = await tx.query.items.findFirst({
      where: (items, { eq }) => eq(items.id, resolvedIds.itemId!),
    });

    return itemRecord?.entryId;
  }

  private async findOriginalPackageEntryId(
    tx: TX,
    resolvedIds: ResolvedEntityIds,
    entryData: CreateEntriesRequest,
  ): Promise<number | undefined> {
    if (
      !resolvedIds.packageId ||
      !resolvedIds.customerId ||
      !entryData.customerName
    ) {
      throw new AppError(
        "Package ID, Customer ID, and Customer Name are required for package returns",
      );
    }

    const packageRecord = await tx.query.packages.findFirst({
      where: (packages, { eq }) => eq(packages.id, resolvedIds.packageId!),
    });

    return packageRecord?.entryId;
  }

  /**
   * Create type-specific records (bundles, series, items, packages)
   */
  private async createTypeSpecificRecords(
    tx: TX,
    entryId: number,
    entryData: CreateEntriesRequest & { createdBy: number },
    resolvedIds: ResolvedEntityIds,
    generatedCodes: GeneratedCodes,
  ) {
    switch (entryData.entryTypeId) {
      case EntryTypeIds.BUNDLE:
        await this.createBundleRecord(
          tx,
          entryId,
          generatedCodes.bundleCode!,
          entryData.createdBy,
        );
        break;

      case EntryTypeIds.SERIES:
        await this.createSeriesRecord(
          tx,
          entryId,
          resolvedIds,
          generatedCodes,
          entryData,
        );
        break;

      case EntryTypeIds.ITEM:
        await this.createItemRecord(
          tx,
          entryId,
          resolvedIds,
          generatedCodes,
          entryData,
        );
        break;

      case EntryTypeIds.PACKAGE:
        await this.createPackageRecord(
          tx,
          entryId,
          resolvedIds,
          generatedCodes,
          entryData,
        );
        break;

      default:
        throw new AppError(`Unknown entry type ID: ${entryData.entryTypeId}`);
    }
  }

  private async createBundleRecord(
    tx: TX,
    entryId: number,
    bundleCode: string,
    createdBy: number,
  ) {
    await tx.insert(bundles).values({
      entryId,
      bundleCode,
      createdAt: new Date().toISOString(),
      createdBy,
      updatedBy: createdBy,
    });
  }

  private async createSeriesRecord(
    tx: TX,
    entryId: number,
    resolvedIds: ResolvedEntityIds,
    generatedCodes: GeneratedCodes,
    entryData: CreateEntriesRequest & { createdBy: number },
  ) {
    await tx.insert(series).values({
      entryId,
      bundleId: resolvedIds.bundleId!,
      seriesCode: generatedCodes.seriesCode!,
      colorId: entryData.colorId!,
      createdAt: new Date().toISOString(),
      createdBy: entryData.createdBy,
      updatedBy: entryData.createdBy,
    });
  }

  private async createItemRecord(
    tx: TX,
    entryId: number,
    resolvedIds: ResolvedEntityIds,
    generatedCodes: GeneratedCodes,
    entryData: CreateEntriesRequest & { createdBy: number },
  ) {
    await tx.insert(items).values({
      entryId,
      seriesId: resolvedIds.seriesId!,
      itemCode: generatedCodes.itemCode!,
      sizeId: entryData.sizeId!,
      createdAt: new Date().toISOString(),
      createdBy: entryData.createdBy,
      updatedBy: entryData.createdBy,
    });
  }

  private async createPackageRecord(
    tx: TX,
    entryId: number,
    resolvedIds: ResolvedEntityIds,
    generatedCodes: GeneratedCodes,
    entryData: CreateEntriesRequest & { createdBy: number },
  ) {
    await tx.insert(packages).values({
      entryId,
      packageCode: generatedCodes.packageCode!,
      binLocation: entryData.binLocation!,
      packageStatusId: 1,
      createdAt: new Date().toISOString(),
      createdBy: entryData.createdBy,
      updatedBy: entryData.createdBy,
    });
  }
}
