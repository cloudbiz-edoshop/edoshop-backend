import type {
  AssignEntryToBinRoute,
  GetAllBinLocationsForWarehouseRoute,
  GetAllBinsMovementHistoryRoute,
  GetAllTransfersForAWarehouseRoute,

  GetPendingReceiptsListRoute,
  GetReceivedEntriesListRoute,
  GetReversibleEntriesListRoute,
  GetStockViewRoute,
  GetTransferableEntriesListRoute,
  ReceiveTransfersRoute,
  ReverseSentEntriesRoute,
  SendTransferableEntriesRoute,
  UndoReceivedEntriesRoute,
  UnassignEntryFromBinRoute,
  UpdateBinLocationsForWarehouseTransfersRoute,
} from "./warehouse-transfers.route";

import type { GetAllBinLocationsForWarehouseResponseSchema, GetAllTransfersForAWarehouseResponseSchema, GetPendingReceiptsListResponseSchema, GetReceivedEntriesListResponseSchema, GetReversibleEntriesListResponseSchema, GetStockViewResponseSchema, GetTransferableEntriesListResponseSchema, ReceiveTransferResponseSchema, ReverseSentEntriesResponseSchema, SendTransferableEntriesResponseSchema, UndoReceivedEntriesResponseSchema, UpdateBinLocationForWarehouseTransfersResponseSchema } from "./warehouse-transfers.schema";

import type { AppRouteHandler } from "@/lib/types";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";
import { WarehouseTransfersService } from "./warehouse-transfers.service";

const transfersService = new WarehouseTransfersService();

/**
 * List transferable entries for a specific warehouse
 */
export const getTransferableEntriesList: AppRouteHandler<
  GetTransferableEntriesListRoute
> = async (c) => {
  const queryParams = c.req.valid("query");
  const { page, limit } = queryParams;
  const { id } = c.req.valid("param");

  const result = await transfersService.getTransferableEntriesListForAWarehouse(
    id,
    queryParams,
  );

  const entriesList: GetTransferableEntriesListResponseSchema[] = result.data;
  const pagination = createPagination(result.total, page, limit);
  const searchableFields: string[] = result.searchableFields;

  const response = successResponseWithPagination(
    entriesList,
    pagination,
    searchableFields,
    `Transferable entries retrieved successfully for warehouse ${id}`,
  );
  return c.json(response, HttpStatusCodes.OK);
};

/**
 * Send transferable entries from source to destination warehouse
 */
export const sendTransferableEntries: AppRouteHandler<
  SendTransferableEntriesRoute
> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const updatedBy = payload.userId;
  const { productCodes, sourceWarehouseId, destinationWarehouseId } =
    c.req.valid("json");

  const result: SendTransferableEntriesResponseSchema[] = await transfersService.sendTransferableEntries({
    productCodes,
    updatedBy,
    sourceWarehouseId,
    destinationWarehouseId,
  });

  return c.json(
    successResponse(result, "Transferable entries sent successfully"),
    HttpStatusCodes.OK,
  );
};

/**
 * List reversible (sent) entries
 */
export const getReversibleEntriesList: AppRouteHandler<
  GetReversibleEntriesListRoute
> = async (c) => {
  const queryParams = c.req.valid("query");
  const { id } = c.req.valid("param");
  const { page, limit } = queryParams;

  // We call the service method specifically designed for reversible items
  const result = await transfersService.getReversibleEntriesListForAWarehouse(
    id,
    queryParams,
  );

  const entriesList: GetReversibleEntriesListResponseSchema[] = result.data;
  const pagination = createPagination(result.total, page, limit);
  const response = successResponseWithPagination(
    entriesList,
    pagination,
    result.searchableFields,
    "Reversible entries retrieved successfully",
  );

  return c.json(response, HttpStatusCodes.OK);
};

export const reverseSentEntries: AppRouteHandler<
  ReverseSentEntriesRoute
> = async (c) => {
  const { warehouseId } = c.req.valid("param");
  const body = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const updatedBy = payload.userId;

  // call service with product codes array directly
  const result = await transfersService.reverseSentEntries(warehouseId, body, updatedBy);

  const reversedEntriesList: ReverseSentEntriesResponseSchema[] = result;

  // return success response
  return c.json(
    successResponse(reversedEntriesList, "Transferable entries reversed successfully"),
    HttpStatusCodes.OK,
  );
};

export const getPendingReceiptsList: AppRouteHandler<
  GetPendingReceiptsListRoute
> = async (c) => {
  const queryParams = c.req.valid("query");
  const { id } = c.req.valid("param");
  const { page, limit } = queryParams;

  // Service handles the validation of warehouse existence and the complex JOIN logic
  const result = await transfersService.getPendingReceiptsListForAWarehouse(
    queryParams,
    id,
  );

  const pendingReceiptsList: GetPendingReceiptsListResponseSchema[] = result.data;

  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination(
      pendingReceiptsList,
      pagination,
      result.searchableFields,
      "Pending incoming transfers retrieved successfully",
    ),
    HttpStatusCodes.OK,
  );
};

export const receiveTransfers: AppRouteHandler<ReceiveTransfersRoute> = async (
  c,
) => {
  const payload = c.get("accessTokenPayload");
  const updatedBy = payload.userId;

  // warehouseId of current warehouse
  const { warehouseId } = c.req.valid("param");

  // Extract productCodes and destinationWarehouseId from the validated JSON body
  const body = c.req.valid("json");

  const result = await transfersService.receiveTransfers(warehouseId, body, updatedBy);

  const receivedEntriesList: ReceiveTransferResponseSchema = result;

  return c.json(
    successResponse(
      receivedEntriesList,
      "Transfer entries received and inventory updated successfully",
    ),
    HttpStatusCodes.OK,
  );
};

// right side of screen 21
export const getReceivedEntriesList: AppRouteHandler<
  GetReceivedEntriesListRoute
> = async (c) => {
  const queryParams = c.req.valid("query");
  const { id } = c.req.valid("param");
  const { page, limit } = queryParams;

  const result = await transfersService.getReceivedEntriesListForAWarehouse(
    id,
    queryParams,
  );

  const entriesList: GetReceivedEntriesListResponseSchema = result.data;
  const pagination = createPagination(result.total, page, limit);
  const response = successResponseWithPagination(
    entriesList,
    pagination,
    result.searchableFields,
    "Received entries retrieved successfully",
  );

  return c.json(response, HttpStatusCodes.OK);
};

export const undoReceivedEntries: AppRouteHandler<
  UndoReceivedEntriesRoute
> = async (c) => {
  const { warehouseId } = c.req.valid("param");
  const body = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const updatedBy = payload.userId;

  // call service with product codes array directly
  const result = await transfersService.undoReceivedEntries(warehouseId, body, updatedBy);

  const un: UndoReceivedEntriesResponseSchema = result;

  // return success response
  return c.json(
    successResponse(un, "Transferable entries undone successfully"),
    HttpStatusCodes.OK,
  );
};

export const getAllTransfersForAWarehouse: AppRouteHandler<
  GetAllTransfersForAWarehouseRoute
> = async (c) => {
  const queryParams = c.req.valid("query");
  const { id } = c.req.valid("param");

  const { page, limit } = queryParams;

  const result = await transfersService.getAllTransfersForAWarehouse(id, queryParams);

  const transfersList: GetAllTransfersForAWarehouseResponseSchema = result.data;
  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination(
      transfersList,
      pagination,
      result.searchableFields,
      `Warehouse transfers retrieved successfully for warehouse ${id}`,
    ),
    HttpStatusCodes.OK,
  );
};

export const getAllBinLocationsForWarehouse: AppRouteHandler<
  GetAllBinLocationsForWarehouseRoute
> = async (c) => {
  const queryParams = c.req.valid("query");
  const { id } = c.req.valid("param");
  const { page, limit } = queryParams;

  const result = await transfersService.getAllBinLocationsForWarehouse(id, queryParams);

  const binsList: GetAllBinLocationsForWarehouseResponseSchema = result.data;
  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination(
      binsList,
      pagination,
      result.searchableFields,
      `Available bin locations retrieved successfully for warehouse ${id}`,
    ),
    HttpStatusCodes.OK,
  );
};

/**
 * Update bin locations for specific warehouse transfers
 */
export const updateBinLocationsForWarehouseTransfers: AppRouteHandler<
  UpdateBinLocationsForWarehouseTransfersRoute
> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const updatedBy = payload.userId;

  // This expects an object containing transferIds and the target binId
  const body = c.req.valid("json");
  const { transferId, warehouseId, binLocationId } = body;

  const result = await transfersService.updateBinLocationsForWarehouseTransfers(transferId, binLocationId, warehouseId, updatedBy);

  const updatedEntries: UpdateBinLocationForWarehouseTransfersResponseSchema = result;

  return c.json(
    successResponse(
      updatedEntries,
      "Bin locations updated successfully for the specified warehouse transfers",
    ),
    HttpStatusCodes.OK,
  );
};

export const assignEntryToBin: AppRouteHandler<AssignEntryToBinRoute> = async (
  c,
) => {
  const payload = c.get("accessTokenPayload");
  const { entryId, warehouseId, binLocationId } = c.req.valid("json");

  const result = await transfersService.assignEntryToBin(
    entryId,
    binLocationId,
    warehouseId,
    payload.userId,
  );

  return c.json(
    successResponse(result, "Entry assigned to bin successfully"),
    HttpStatusCodes.OK,
  );
};

export const unassignEntryFromBin: AppRouteHandler<UnassignEntryFromBinRoute> = async (
  c,
) => {
  const payload = c.get("accessTokenPayload");
  const { entryId, warehouseId } = c.req.valid("json");

  const result = await transfersService.unassignEntryFromBin(
    entryId,
    warehouseId,
    payload.userId,
  );

  return c.json(
    successResponse(result, "Entry unassigned from bin successfully"),
    HttpStatusCodes.OK,
  );
};

/**
 * Handler to fetch detailed entry/removal history for all bins in a warehouse
 */
export const getAllBinsMovementHistory: AppRouteHandler<
  GetAllBinsMovementHistoryRoute
> = async (c) => {
  const { id } = c.req.valid("param"); // warehouseId
  const queryParams = c.req.valid("query");
  const { page, limit } = queryParams;

  const result = await transfersService.getAllBinsMovementHistory(
    id,
    queryParams,
  );

  const data = {
    items: result.data,
    totalEntrances: result.totalEntrances,
    totalExits: result.totalExits,
    totalMovements: result.totalMovements,
  };

  const pagination = createPagination(result.totalMovements, page, limit);

  return c.json(
    successResponseWithPagination(
      data,
      pagination,
      result.searchableFields,
      `Bin movement history retrieved successfully for warehouse ${id}`,
    ),
    HttpStatusCodes.OK,
  );
};

export const getStockView: AppRouteHandler<
  GetStockViewRoute
> = async (c) => {
  const { id } = c.req.valid("param"); // warehouseId
  const queryParams = c.req.valid("query");
  const { page, limit } = queryParams;

  const result = await transfersService.getStockView(id, queryParams);

  const data: GetStockViewResponseSchema = {
    items: result.data,
    totalProducts: result.totalProducts,
    sufficientStock: result.sufficientStock,
    lowStock: result.lowStock,
  };

  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination(
      data,
      pagination,
      result.searchableFields,
      `Stock view retrieved successfully for warehouse ${id}`,
    ),
    HttpStatusCodes.OK,
  );
};
