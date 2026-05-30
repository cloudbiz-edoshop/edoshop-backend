import { createRoute, z } from "@hono/zod-openapi";
import { EntityType, OperationType } from "@/constants";
import {
  jwtMiddleware,
  rolesAndPermissionsMiddleware,
} from "@/core/middlewares";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import {
  commonErrorResponses,
  jsonContent,
  jsonContentRequired,
} from "@/lib/openapi/helpers";

import { createSuccessResponseSchema, idParams } from "@/lib/openapi/schemas";
import { createSuccessResponseSchemaWithPagination } from "@/lib/openapi/schemas/create-api-response";
import commonQueryParamsSchema from "@/lib/openapi/schemas/query-params-schema";
import { jwtHeaderSchema } from "@/lib/zod-schemas";
import {
  assignEntryToBinRequestSchema,
  assignEntryToBinResponseSchema,
  getAllBinLocationsForWarehouseResponseSchema,
  getAllTransfersForAWarehouseResponseSchema,
  getBinMovementHistoryResponseSchema,

  getPendingReceiptsListResponseSchema,
  getReceivedEntriesListResponseSchema,
  getReversibleEntriesListResponseSchema,
  getStockViewResponseSchema,
  getTransferableEntriesListResponseSchema,
  receiveTransferRequestSchema,
  receiveTransferResponseSchema,
  reverseSentEntriesRequestSchema,
  reverseSentEntriesResponseSchema,
  sendTransferableEntriesRequestSchema,
  sendTransferableEntriesResponseSchema,
  undoReceivedEntriesRequestSchema,
  undoReceivedEntriesResponseSchema,
  updateBinLocationForWarehouseTransfersResponseSchema,
  updateBinLocationsForWarehouseTransfersRequestSchema,
} from "./warehouse-transfers.schema";

const tags = ["Warehouse Transfers"];

/**
 * List transferable entries for a specific warehouse
 */
export const getTransferableEntriesList = createRoute({
  path: "/warehouse-transfers/{id}/transferable-entries",
  method: "get",
  tags,
  summary: "List transferable entries for a specific warehouse",
  description:
    "List transferable entries for a specific warehouse with pagination, filtering, and sorting",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
    params: idParams,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(
        z.array(getTransferableEntriesListResponseSchema),
      ),
      `The list of {id} Transferable entries`,
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      commonQueryParamsSchema,
    ),
  },
});

export type GetTransferableEntriesListRoute = typeof getTransferableEntriesList;

export const sendTransferableEntries = createRoute({
  path: "/warehouse-transfers/transfer-entries",
  method: "post",
  tags,
  summary: "Send transferable entries from source to destination warehouse",
  description:
    "Send transferable entries based on product codes from source warehouse to destination warehouse",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.UPDATE },
      {
        entity: EntityType.WAREHOUSE_TRANSFERS,
        operation: OperationType.CREATE,
      },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      sendTransferableEntriesRequestSchema,
      "Send Selected Transferable Entries based on Product Codes",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        z.array(sendTransferableEntriesResponseSchema),
      ),
      "Transferable entries sent successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      sendTransferableEntriesRequestSchema,
    ),
  },
});

export type SendTransferableEntriesRoute = typeof sendTransferableEntries;

// Get Reversible entries list ROUTE
export const getReversibleEntriesList = createRoute({
  path: "/warehouse-transfers/{id}/reversible-entries",
  method: "get",
  tags,
  summary: "List reversible (sent) entries",
  description:
    "List reversible (sent) entries with pagination, filtering, and sorting",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
    params: idParams,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(
        z.array(getReversibleEntriesListResponseSchema),
      ),
      "The list of reversible (sent) entries",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      commonQueryParamsSchema,
    ),
  },
});

export type GetReversibleEntriesListRoute = typeof getReversibleEntriesList;

export const reverseSentEntries = createRoute({
  path: "/warehouse-transfers/{warehouseId}/reverse-entries",
  method: "post",
  tags,
  summary: "Reverse entries sent from source warehouse",
  description:
    "Reverse sent warehouse transfer entries based on provided IDs, transfer codes, and product codes",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.UPDATE },
      {
        entity: EntityType.WAREHOUSE_TRANSFERS,
        operation: OperationType.UPDATE,
      },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: z.object({
      warehouseId: z.coerce.number().min(1).openapi({
        param: {
          name: "warehouseId",
          in: "path",
          required: true,
        },
        required: ["warehouseId"],
      }),
    }),
    body: jsonContentRequired(
      reverseSentEntriesRequestSchema,
      "Reverse sent warehouse transfer entries back to source warehouse",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(z.array(reverseSentEntriesResponseSchema)),
      "Transfer entries reversed successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      reverseSentEntriesRequestSchema,
    ),
  },
});

export type ReverseSentEntriesRoute = typeof reverseSentEntries;

// FOR W2 EMPLOYEE
export const getPendingReceiptsList = createRoute({
  path: "/warehouse-transfers/{id}/pending-receipts",
  method: "get",
  tags,
  summary: "List pending incoming warehouse transfers",
  description:
    "List warehouse transfer entries that are sent to the given warehouse but not received",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      {
        entity: EntityType.WAREHOUSE_TRANSFERS,
        operation: OperationType.READ,
      },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
    params: idParams,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(
        z.array(getPendingReceiptsListResponseSchema),
      ),
      "The list of pending incoming transfer entries",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        HttpStatusCodes.NOT_FOUND,

      ],
      commonQueryParamsSchema,
    ),
  },
});

export type GetPendingReceiptsListRoute = typeof getPendingReceiptsList;

export const receiveTransfers = createRoute({
  path: "/warehouse-transfers/{warehouseId}/receive-entries",
  method: "post",
  tags,
  summary: "Receive Transfer of sent entries",
  description:
    "Confirms the physical receipt of products at the destination warehouse and updates official inventory location",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.UPDATE },
      {
        entity: EntityType.WAREHOUSE_TRANSFERS,
        operation: OperationType.UPDATE,
      },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: z.object({
      warehouseId: z.coerce.number().openapi({
        param: {
          name: "warehouseId",
          in: "path",
          required: true,
        },
        required: ["warehouseId"],
      }),
    }),
    body: jsonContentRequired(
      receiveTransferRequestSchema,
      "List of transfer IDs and destination warehouse to confirm receipt",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(receiveTransferResponseSchema),
      "Transfer entries received successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      commonQueryParamsSchema,
    ),
  },
});

export type ReceiveTransfersRoute = typeof receiveTransfers;

export const getReceivedEntriesList = createRoute({
  path: "/warehouse-transfers/{id}/received-entries",
  method: "get",
  tags,
  summary: "List received warehouse transfer entries for a specific warehouse",
  description:
    "List all received warehouse transfer entries for a specific warehouse",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      {
        entity: EntityType.WAREHOUSE_TRANSFERS,
        operation: OperationType.READ,
      },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
    params: idParams,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(getReceivedEntriesListResponseSchema),
      "The list of received warehouse transfer entries",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        HttpStatusCodes.NOT_FOUND,

      ],
      commonQueryParamsSchema,
    ),
  },
});

export type GetReceivedEntriesListRoute = typeof getReceivedEntriesList;

export const undoReceivedEntries = createRoute({
  path: "/warehouse-transfers/{warehouseId}/undo-received-entries",
  method: "post",
  tags,
  summary: "Undo Received entries for a warehouse transfer",
  description:
    "Undoes the receipt of products at the destination warehouse and updates official inventory location",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.WAREHOUSE_TRANSFERS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: z.object({
      warehouseId: z.coerce.number().openapi({
        param: {
          name: "warehouseId",
          in: "path",
          required: true,
        },
        required: ["warehouseId"],
      }),
    }),
    body: jsonContentRequired(
      undoReceivedEntriesRequestSchema,
      "List of transfer IDs to undo receipt",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(undoReceivedEntriesResponseSchema),
      "Transfer entries receipt undone successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      commonQueryParamsSchema,
    ),
  },
});

export type UndoReceivedEntriesRoute = typeof undoReceivedEntries;

export const getAllTransfersForAWarehouse = createRoute({
  path: "/warehouse-transfers/{id}",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.WAREHOUSE_TRANSFERS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
    params: idParams,
  },
  summary: "List warehouse transfers",
  description:
    "List warehouse transfers with pagination, filtering, and sorting",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(getAllTransfersForAWarehouseResponseSchema),
      "The list of warehouse transfers",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        HttpStatusCodes.NOT_FOUND,
      ],
      commonQueryParamsSchema,
    ),
  },
});

export type GetAllTransfersForAWarehouseRoute = typeof getAllTransfersForAWarehouse;

export const getAllBinLocationsForWarehouse = createRoute({
  path: "/warehouse-transfers/{id}/available-bin-locations",
  method: "get",
  tags,
  summary: "List available bin locations for a warehouse",
  description:
    "List all available bin locations for a given warehouse",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.WAREHOUSE_TRANSFERS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
    params: idParams,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(getAllBinLocationsForWarehouseResponseSchema),
      "The list of all bin locations",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        HttpStatusCodes.NOT_FOUND,
      ],
      commonQueryParamsSchema,
    ),
  },
});

export type GetAllBinLocationsForWarehouseRoute = typeof getAllBinLocationsForWarehouse;

export const updateBinLocationsForWarehouseTransfers = createRoute({
  path: "/warehouse-transfers/update-bin-locations",
  method: "patch",
  tags,
  summary: "Update bin locations for warehouse transfer entries",
  description:
    "Update bin locations for  warehouse transfer entry based on provided entry ID and new bin location ID",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.UPDATE },
      {
        entity: EntityType.WAREHOUSE_TRANSFERS,
        operation: OperationType.UPDATE,
      },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      updateBinLocationsForWarehouseTransfersRequestSchema,
      "List of warehouse transfer entry IDs and new bin location IDs to update",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(updateBinLocationForWarehouseTransfersResponseSchema),
      "Bin locations updated successfully for the specified entries",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      updateBinLocationsForWarehouseTransfersRequestSchema,
    ),
  },
});

export type UpdateBinLocationsForWarehouseTransfersRoute = typeof updateBinLocationsForWarehouseTransfers;

export const assignEntryToBin = createRoute({
  path: "/warehouse-store/assign-entry-bin",
  method: "patch",
  tags,
  summary: "Assign a warehouse entry to a bin",
  description:
    "Assign a Warehouse 1 series or item entry to a bin location for store management",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      assignEntryToBinRequestSchema,
      "Entry and bin assignment details",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(assignEntryToBinResponseSchema),
      "Entry assigned to bin successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      assignEntryToBinRequestSchema,
    ),
  },
});

export type AssignEntryToBinRoute = typeof assignEntryToBin;

/**
 * GET Bin Movement History
 * Lists what entries were entered or removed across all bins for a warehouse
 */
export const getAllBinsMovementHistory = createRoute({
  path: "/warehouses/{id}/bin-movements",
  method: "get",
  tags,
  summary: "Get detailed bin PICK and PLACE history",
  description:
     "Fetches movement history for all bins in a warehouse, indicating if items were PICKED or PLACED.",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.READ },
      { entity: EntityType.WAREHOUSE_TRANSFERS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    query: commonQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(
        getBinMovementHistoryResponseSchema,
      ),
      "Bins movement history retrieved successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        HttpStatusCodes.BAD_REQUEST,
      ],
      commonQueryParamsSchema,
    ),
  },
});

export type GetAllBinsMovementHistoryRoute = typeof getAllBinsMovementHistory;

export const getStockView = createRoute({
  path: "/warehouses/{id}/stock-view",
  method: "get",
  tags,
  summary: "Get stock view for a warehouse",
  description:
    "Returns a view of the current stock levels for all entries in a specific warehouse.",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.READ },
      { entity: EntityType.WAREHOUSE_TRANSFERS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    query: commonQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(getStockViewResponseSchema),
      "Stock view retrieved successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      commonQueryParamsSchema,
    ),
  },
});

export type GetStockViewRoute = typeof getStockView;
