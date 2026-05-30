import type {
  GetReversibleEntriesListResponseSchema,
  GetTransferableEntriesListResponseSchema,
  ReceiveTransferRequestSchema,
  ReverseSentEntriesRequestSchema,
  SendTransferableEntriesRequestSchema,
  SendTransferableEntriesResponseSchema,
  UndoReceivedEntriesRequestSchema,
} from "./warehouse-transfers.schema";
import type { NewWarehouseTransfers } from "@/db/models/warehouse-transfers";
import type { CommonQueryParams } from "@/lib/openapi/schemas/query-params-schema";

import { and, eq, inArray, sql } from "drizzle-orm";
import { EntryTypeIds, TransferStatusIds } from "@/constants";
import { NotFoundError, ValidationError } from "@/core/errors";
import db from "@/db";

import { warehouseTransfers } from "@/db/models/warehouse-transfers";
import { EntriesRepository } from "../entries/entries.repository";
import { WarehouseRepository } from "../warehouses/warehouses.repository";
import { WarehouseTransfersRepository } from "./warehouse-transfers.repository";

export class WarehouseTransfersService {
  private readonly transfersRepository: WarehouseTransfersRepository;
  private readonly entriesRepository: EntriesRepository;
  private readonly warehouseRepository: WarehouseRepository;

  constructor() {
    this.transfersRepository = new WarehouseTransfersRepository();
    this.entriesRepository = new EntriesRepository();
    this.warehouseRepository = new WarehouseRepository();
  }

  /**
   * List transferable entries for a specific warehouse
   */
  async getTransferableEntriesListForAWarehouse(
    warehouseId: number,
    params: CommonQueryParams,
  ) {
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found, with id: ${warehouseId}`);
    }

    const filters = {
      ...params.filters,
      isTransferable: true,
      isSent: false,
      warehouseId,
    };

    const result = await this.entriesRepository.getTransferRelatedEntriesList({
      ...params,
      filters,
    });

    const uniqueEntries = Array.from(
      new Map(result.data.map((item) => [item.id, item])).values(),
    );
    const data: GetTransferableEntriesListResponseSchema[] = uniqueEntries;

    const response = { ...result, data };
    return response;
  }

  async sendTransferableEntries(
    data: SendTransferableEntriesRequestSchema & { updatedBy: number },
  ): Promise<SendTransferableEntriesResponseSchema[]> {
    const {
      sourceWarehouseId,
      destinationWarehouseId,
      productCodes,
      updatedBy,
    } = data;
    const params: CommonQueryParams = {
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
      sortBy: "createdAt",
      sortOrder: "desc" as "asc" | "desc",
      filters: { isTransferable: true }, // Only consider entries that are marked as transferable
    };

    // Check if the warehouse IDs are the same
    if (sourceWarehouseId === destinationWarehouseId) {
      throw new ValidationError(
        "Source and destination warehouse IDs cannot be the same",
      );
    }

    // Check if the warehouse IDs exist in the database
    const sourceWarehouse =
      await this.warehouseRepository.findById(sourceWarehouseId);
    if (!sourceWarehouse) {
      throw new NotFoundError(
        `Source warehouse with ID ${sourceWarehouseId} not found`,
      );
    }

    const destinationWarehouse = await this.warehouseRepository.findById(
      destinationWarehouseId,
    );
    if (!destinationWarehouse) {
      throw new NotFoundError(
        `Destination warehouse with ID ${destinationWarehouseId} not found`,
      );
    }

    // Fetch transferable entries based on product codes
    const transferableEntries =
      await this.entriesRepository.getTransferRelatedEntriesList(params);

    const filteredEntries = transferableEntries.data.filter((entry) =>
      productCodes.includes(entry.productCode),
    );
    // if filteredEntries is empty, throw error
    if (filteredEntries.length === 0) {
      throw new NotFoundError(
        "No transferable entries found for the given codes",
      );
    }
    // check if the sourceWarehouseId matches req sourceWarehouseId
    filteredEntries.forEach((entry) => {
      if (entry.warehouseId !== sourceWarehouseId) {
        throw new ValidationError(
          `Source Warehouse ID for ${entry.productCode} is invalid`,
        );
      }
    });
    // If any of the provided product codes are not found in the transferable entries, throw an error indicating which codes are invalid
    const invalidCodes = productCodes.filter(
      (code) =>
        !transferableEntries.data.some((entry) => entry.productCode === code),
    );
    if (invalidCodes.length > 0) {
      throw new ValidationError(
        `The following product codes are invalid or not transferable: ${invalidCodes.join(
          ", ",
        )}`,
      );
    }

    // 1. Extract the IDs from the filtered entries
    const entryIds = filteredEntries.map((entry) => entry.id);
    const randomUUIDs = filteredEntries.map(() => crypto.randomUUID()); // Generate a random UUID

    const rowsForWarehouseTransfer: NewWarehouseTransfers[] = entryIds.map(
      (entryId, index) => ({
        entryId,
        sourceWarehouseId,
        destinationWarehouseId,
        statusId: TransferStatusIds.SENT,
        transferCode: randomUUIDs[index].split("-")[0].toUpperCase(), // Use first segment of UUID as transfer code
        notes: "Transferred via W1 Transferable Entries",
        initiatedBy: updatedBy,
        createdBy: updatedBy,
        updatedBy,
      }),
    );
    const existingTransfers =
      await this.transfersRepository.getWarehouseTransfersByEntryIdsWhichAreSent(
        entryIds,
      );

    if (existingTransfers.length > 0) {
      const alreadyTransferredEntryIds = existingTransfers.map(
        (t) => t.entryId,
      );

      throw new ValidationError(
        `Transfers already exist for entry IDs: ${alreadyTransferredEntryIds.join(
          ", ",
        )}`,
      );
    }

    return await db.transaction(async (tx) => {
      // Mark entries as sent in the entries table
      await this.entriesRepository.markEntriesAsSent(tx, entryIds, updatedBy);

      const insertedRows =
        await this.transfersRepository.createWarehouseTransferRows(
          tx,
          rowsForWarehouseTransfer,
        );

      const insertedIds = insertedRows.map((row) => row.id);

      // update random wt code to post insert logic
      await tx
        .update(warehouseTransfers)
        .set({ transferCode: sql`CONCAT('WT-', ${warehouseTransfers.id})` }) // Constructing WT-1, WT-2, etc.
        .where(inArray(warehouseTransfers.id, insertedIds));

      const result: SendTransferableEntriesResponseSchema[] =
        filteredEntries.map((entry) => ({
          ...entry,
          isTransferable: false,
          isSent: true,
        }));
      return result;
    });
  }

  async getReversibleEntriesListForAWarehouse(
    warehouseId: number,
    params: CommonQueryParams,
  ) {
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found, with id: ${warehouseId}`);
    }

    const filters = {
      ...params.filters,
      isSent: true,
      statusId: TransferStatusIds.SENT,
      warehouseId,
    };

    const result = await this.entriesRepository.getReversibleEntriesList({
      ...params,
      filters,
    });

    const data: GetReversibleEntriesListResponseSchema[] = result.data;
    const response = { ...result, data };
    return response;
  }

  async getUndoAbleEntriesListForAWarehouse(
    warehouseId: number,
    params: CommonQueryParams,
  ) {
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found, with id: ${warehouseId}`);
    }

    const filters = {
      ...params.filters,
      statusId: TransferStatusIds.RECEIVED,
      warehouseId,
    };

    const result = await this.entriesRepository.getReversibleEntriesList({
      ...params,
      filters,
    });

    const data: GetReversibleEntriesListResponseSchema[] = result.data;
    const response = { ...result, data };
    return response;
  }

  makeKeyForIds = ({
    id,
    transferId,
    productCode,
    warehouseId,
  }: {
    id: number;
    transferId: number;
    productCode: string;
    warehouseId: number;
  }) => `${id}|${transferId}|${productCode}|${warehouseId}`;

  private getMissingKeys(expectedKeys: Set<string>, receivedKeys: Set<string>) {
    const missing: string[] = [];

    for (const key of receivedKeys) {
      if (!expectedKeys.has(key)) {
        missing.push(key);
      }
    }

    return missing;
  }

  async reverseSentEntries(
    warehouseId: number,
    data: ReverseSentEntriesRequestSchema,
    updatedBy: number,
  ) {
    const params: CommonQueryParams = {
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
      sortBy: "createdAt",
      sortOrder: "desc" as "asc" | "desc",
    };

    // 1. Fetch all currently reversible entries for this warehouse to validate
    const reversibleList = await this.getReversibleEntriesListForAWarehouse(
      warehouseId,
      params,
    );

    const dbSet = new Set(reversibleList.data.map(this.makeKeyForIds));
    const reqSet = new Set(data.map(this.makeKeyForIds));
    const missingKeys = this.getMissingKeys(dbSet, reqSet);
    if (missingKeys.length > 0) {
      throw new ValidationError(
        `Invalid Combo passed: ${missingKeys.join(", ")}. Valid combos are: ${reversibleList.data
          .map(this.makeKeyForIds)
          .join(", ")}`,
      );
    }

    const entryIds = data.map((item) => item.id);

    const transferIds = data.map((item) => item.transferId);
    // all set, start tx
    const updatedTransfers = await db.transaction(async (tx) => {
      // Mark entries as sent in the entries table
      await this.entriesRepository.markEntriesAsUnsent(tx, entryIds, updatedBy);

      // update random wt code to post insert logic
      await tx
        .update(warehouseTransfers)
        .set({ statusId: TransferStatusIds.UNDONE, updatedAt: new Date().toISOString(), updatedBy, reversedBy: updatedBy }) // Constructing WT-1, WT-2, etc.
        .where(inArray(warehouseTransfers.id, transferIds));

      const result = data.map((item) => {
        return {
          ...item,
          statusId: TransferStatusIds.UNDONE,
        };
      });
      return result;
    });
    return updatedTransfers;
  }

  /**
   * List pending incoming transfer entries for a warehouse (W2 - Incoming)
   * This retrieves transfers sent from another warehouse that haven't been received yet.
   */
  async getPendingReceiptsListForAWarehouse(
    params: CommonQueryParams,
    warehouseId: number,
  ) {
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found, with id: ${warehouseId}`);
    }

    const filters = {
      ...params.filters,
      isSent: true,
      statusId: TransferStatusIds.SENT,
      destinationWarehouseId: warehouseId,
    };

    // using same reversible repository function
    const result = await this.entriesRepository.getReversibleEntriesList({
      ...params,
      filters,
    });

    // Deduplicate based on entry ID
    const uniqueData = Array.from(
      new Map(result.data.map((item) => [item.id, item])).values(),
    );

    return { ...result, data: uniqueData };
  }

  async receiveTransfers(
    warehouseId: number,
    data: ReceiveTransferRequestSchema,
    updatedBy: number,
  ) {
    const params: CommonQueryParams = {
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
      sortBy: "createdAt",
      sortOrder: "desc" as "asc" | "desc",
    };

    // 1. Fetch all currently Receivable entries for this warehouse to validate
    const receivableList = await this.getPendingReceiptsListForAWarehouse(
      params,
      warehouseId,
    );

    const dbSet = new Set(receivableList.data.map(this.makeKeyForIds));
    const reqSet = new Set(data.map(this.makeKeyForIds));
    const missingKeys = this.getMissingKeys(dbSet, reqSet);
    if (missingKeys.length > 0) {
      throw new ValidationError(
        `Invalid Combo passed: ${missingKeys.join(", ")}. Valid combos are: ${receivableList.data
          .map(this.makeKeyForIds)
          .join(", ")}`,
      );
    }

    const entryIds = data.map((item) => item.id);

    const transferIds = data.map((item) => item.transferId);

    const receivedTransfers = await db.transaction(async (tx) => {
      await this.entriesRepository.markEntriesAsReceived(
        tx,
        entryIds,
        updatedBy,
        warehouseId,
      );

      const timestamp = new Date().toISOString();

      // update random wt code to post insert logic
      await tx
        .update(warehouseTransfers)
        .set({ statusId: TransferStatusIds.RECEIVED, receivedAt: timestamp, updatedAt: timestamp, updatedBy }) // Constructing WT-1, WT-2, etc.
        .where(inArray(warehouseTransfers.id, transferIds));

      const result = data.map((item) => {
        return {
          ...item,
          statusId: TransferStatusIds.RECEIVED,
        };
      });
      return result;
    });
    return receivedTransfers;
  }

  async getReceivedEntriesListForAWarehouse(
    warehouseId: number,
    params: CommonQueryParams,
  ) {
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found, with id: ${warehouseId}`);
    }

    const filters = {
      ...params.filters,
      statusId: [
        TransferStatusIds.RECEIVED,
        TransferStatusIds.BIN_LOCATION_ASSIGNED,
      ],
      warehouseId,
    };

    // using same reversible repository function
    const result = await this.entriesRepository.getReversibleEntriesList({
      ...params,
      filters,
    });

    return result;
  }

  async undoReceivedEntries(
    warehouseId: number,
    data: UndoReceivedEntriesRequestSchema,
    updatedBy: number,
  ) {
    const params: CommonQueryParams = {
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
      sortBy: "createdAt",
      sortOrder: "desc" as "asc" | "desc",
      filters: {
        statusId: TransferStatusIds.RECEIVED,
      },
    };

    // 1. Fetch all currently UndoAbleReceived entries for this warehouse to validate
    const reversibleList = await this.getUndoAbleEntriesListForAWarehouse(
      warehouseId,
      params,
    );

    const dbSet = new Set(reversibleList.data.map(this.makeKeyForIds));
    const reqSet = new Set(data.map(this.makeKeyForIds));
    const missingKeys = this.getMissingKeys(dbSet, reqSet);
    if (missingKeys.length > 0) {
      throw new ValidationError(
        `Invalid Combo passed: ${missingKeys.join(", ")}. Valid combos are: ${reversibleList.data
          .map(this.makeKeyForIds)
          .join(", ")}`,
      );
    }

    const entryIds = data.map((item) => item.id);

    const transferIds = data.map((item) => item.transferId);
    // all set, start tx
    const undoneTransfers = await db.transaction(async (tx) => {
      // Mark entries as sent in the entries table
      await this.entriesRepository.markEntriesAsSent(tx, entryIds, updatedBy);

      // update random wt code to post insert logic
      await tx
        .update(warehouseTransfers)
        .set({ statusId: TransferStatusIds.SENT, updatedAt: new Date().toISOString(), updatedBy }) // Constructing WT-1, WT-2, etc.
        .where(inArray(warehouseTransfers.id, transferIds));

      const result = data.map((item) => {
        return {
          ...item,
          statusId: TransferStatusIds.SENT,
        };
      });
      return result;
    });
    return undoneTransfers;
  }

  async getAllTransfersForAWarehouse(warehouseId: number, params: CommonQueryParams) {
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found, with id: ${warehouseId}`);
    }

    const modifiedParams = {
      ...params,
      filters: {
        ...params.filters,
        warehouseId,
        statusId: [
          TransferStatusIds.RECEIVED,
          TransferStatusIds.BIN_LOCATION_ASSIGNED,
        ],
      },
    };

    const result = await this.transfersRepository.getAllTransfersForAWarehouse(warehouseId, modifiedParams);

    return result;
  }

  async getAllBinLocationsForWarehouse(
    warehouseId: number,
    params: CommonQueryParams,
  ) {
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found, with id: ${warehouseId}`);
    }

    const result = await this.transfersRepository.getAllBinLocationsForWarehouse(warehouseId, params);
    return result;
  }

  // transfers.service.ts

  async updateBinLocationsForWarehouseTransfers(transferId: number, binId: number, warehouseId: number, userId: number) {
    const transfersResult = await this.transfersRepository.getAllTransfersForAWarehouse(warehouseId, {
      page: 1,
      limit: 1,
      filters: { id: transferId },
      sortBy: "createdAt",
      sortOrder: "desc" as "asc" | "desc",
    });

    const transferIdFor = transfersResult.data[0];
    if (!transferIdFor) {
      throw new NotFoundError(`Transfer with ID ${transferId} not found in warehouse ${warehouseId}`);
    }

    if (
      transferIdFor.statusId !== TransferStatusIds.RECEIVED
      && transferIdFor.statusId !== TransferStatusIds.BIN_LOCATION_ASSIGNED
    ) {
      throw new ValidationError(
        `Only received or already-assigned transfers can be assigned a bin location. Current status: ${transferIdFor.statusId}`,
      );
    }
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found, with id: ${warehouseId}`);
    }

    const getAllBinsResult = await this.transfersRepository.getAllBinLocationsForWarehouse(warehouseId, {
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
      filters: {},
      sortBy: "createdAt",
      sortOrder: "asc",
    });

    const binIds = getAllBinsResult.data.map(bin => bin.id);
    if (!binIds.includes(binId)) {
      throw new ValidationError(`Bin ID ${binId} is not available in warehouse ${warehouseId}`);
    }

    // 1. Verify the transfer exists and belongs to the specified warehouse
    const [transfer] = await db
      .select()
      .from(warehouseTransfers)
      .where(
        and(
          eq(warehouseTransfers.id, transferId),
          eq(warehouseTransfers.destinationWarehouseId, warehouseId),
        ),
      )
      .limit(1);

    if (!transfer) {
      throw new NotFoundError(`Transfer with ID ${transferId} not found for warehouse ${warehouseId}`);
    }

    const result = await this.transfersRepository.updateTransferBin(
      transferId,
      binId,
      userId,

    );

    if (!result) {
      throw new NotFoundError(`Failed to update bin location for transfer ID ${transferId} in warehouse ${warehouseId}`);
    }

    return result;
  }

  async assignEntryToBin(entryId: number, binId: number, warehouseId: number, userId: number) {
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found, with id: ${warehouseId}`);
    }

    const entry = await this.entriesRepository.findById(entryId);
    if (!entry) {
      throw new NotFoundError(`Entry with ID ${entryId} not found`);
    }

    if (entry.warehouseId !== warehouseId) {
      throw new ValidationError(`Entry ${entryId} does not belong to warehouse ${warehouseId}`);
    }

    if (![EntryTypeIds.SERIES, EntryTypeIds.ITEM].includes(entry.entryTypeId)) {
      throw new ValidationError("Only series and item entries can be assigned from store management");
    }

    const binsResult = await this.transfersRepository.getAllBinLocationsForWarehouse(warehouseId, {
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
      filters: {},
      sortBy: "createdAt",
      sortOrder: "asc",
    });

    const binIds = binsResult.data.map(bin => bin.id);
    if (!binIds.includes(binId)) {
      throw new ValidationError(`Bin ID ${binId} is not available in warehouse ${warehouseId}`);
    }

    const result = await this.transfersRepository.assignEntryToBin(
      entryId,
      binId,
      userId,
    );

    if (!result) {
      throw new NotFoundError(`Failed to assign entry ${entryId} to bin ${binId}`);
    }

    return result;
  }

  async getRayonsStatsForAWarehouse(warehouseId: number) {
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found, with id: ${warehouseId}`);
    }

    const rayons = await this.transfersRepository.getRayonsStatsForAWarehouse(warehouseId);

    const result = rayons.map((rayon) => ({
      ...rayon,
      shelves: rayon.shelves.map((shelf) => ({
        ...shelf,
        bins: shelf.bins.map((bin) => ({
          ...bin,
          totalItems: bin.storageItems.length,
          totalQuantity: bin.storageItems.reduce((sum, item) => sum + item.quantity, 0),
        })),
      })),
    }));

    return result;
  }

  /**
   * Retrieves a global list of all bin movements (entries and removals)
   * across all bins, typically used for a warehouse audit log.
   */
  async getAllBinsMovementHistory(
    warehouseId: number,
    params: CommonQueryParams,
  ) {
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found with id: ${warehouseId}`);
    }

    const result = await this.transfersRepository.getAllBinsMovementHistory(
      warehouseId,
      params,
    );

    return {
      ...result,
      data: result.data,
      totalEntrances: result.totalEntrances,
      totalExits: result.totalExits,
      totalMovements: result.totalEntrances + result.totalExits,
    };
  }

  async getStockView(warehouseId: number, params: CommonQueryParams) {
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found with id: ${warehouseId}`);
    }

    const stockView = await this.transfersRepository.getStockView(warehouseId, params);

    const GOOD_STOCK_THRESHOLD = 20;
    const MODERATE_STOCK_THRESHOLD = 8;
    const LOW_STOCK_THRESHOLD = 1;

    function getStockStatus(stock: number) {
      if (stock >= GOOD_STOCK_THRESHOLD)
        return "Good";
      if (stock >= MODERATE_STOCK_THRESHOLD)
        return "Moderate";
      if (stock >= LOW_STOCK_THRESHOLD)
        return "Low";
      return "Rupture";
    }

    // Format the paginated data with stock status
    const formattedData = stockView.data.map((stock) => {
      const quantity = stock.quantity ?? 0;
      const status = getStockStatus(quantity);

      return {
        ...stock,
        stockStatus: status,
      };
    });

    // Use overall statistics from repository (not calculated from paginated data)
    return {
      data: formattedData,
      total: stockView.total,
      totalProducts: stockView.overallTotalProducts,
      sufficientStock: stockView.overallSufficientStock,
      lowStock: stockView.overallLowStock,
      searchableFields: stockView.searchableFields,
    };
  }
}
