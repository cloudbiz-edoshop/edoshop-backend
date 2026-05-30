import { z } from "@hono/zod-openapi";
import { TransferStatusIds } from "@/constants";

// Transferable entries response schema
export const getTransferableEntriesListResponseSchema = z.object({
  id: z.number().describe("Entry ID"),
  entryTypeId: z.number().describe("Entry type ID"),
  productCode: z.string().describe("Resolved product code"),
  customerCode: z.string().nullable().describe("Customer code"),
  customerName: z.string().nullable().describe("Customer name"),
  warehouseId: z.number().min(1).describe("Warehouse ID"),
  isSent: z.boolean().describe("Whether the entry is sent"),
  isTransferable: z.boolean().describe("Whether the entry is transferable"),
  transferCode: z.string().nullable().describe("Transfer code"),
  transferId: z.number().nullable().describe("Transfer ID"),
  transferStatusId: z.number().nullable().describe("Transfer status ID"),
});

export type GetTransferableEntriesListResponseSchema = z.infer<
  typeof getTransferableEntriesListResponseSchema
>;

// right side of screen 1
export const sendTransferableEntriesRequestSchema = z.object({
  sourceWarehouseId: z
    .number("Source warehouse ID must be a number")
    .min(1, "Source warehouse ID must be a positive number")
    .describe("ID of the source warehouse"),
  destinationWarehouseId: z
    .number("Destination warehouse ID must be a number")
    .min(1, "Destination warehouse ID must be a positive number")
    .describe("ID of the destination warehouse"),
  productCodes: z
    .array(
      z.string("Product code must be a string"),
      "Product codes must be an array",
    )
    .min(1, "At least one product code must be provided")
    .describe("List of product codes to transfer"),
});

// Create a type from the schema for your Service/Controller
export type SendTransferableEntriesRequestSchema = z.infer<
  typeof sendTransferableEntriesRequestSchema
>;

export const sendTransferableEntriesResponseSchema = z.object({
  id: z.number().describe("Entry ID"),
  entryTypeId: z.number().describe("Entry type ID"),
  productCode: z.string().describe("Resolved product code"),
  customerCode: z.string().nullable().describe("Customer code"),
  customerName: z.string().nullable().describe("Customer name"),
});

export type SendTransferableEntriesResponseSchema = z.infer<
  typeof sendTransferableEntriesResponseSchema
>;

export type TransferableEntriesRequest = z.infer<
  typeof sendTransferableEntriesRequestSchema
>;

export const getReversibleEntriesListResponseSchema = z.object({
  id: z.number().describe("Entry ID"),
  entryTypeId: z.number().describe("Entry type ID"),
  productCode: z.string().describe("Resolved product code"),
  customerCode: z.string().nullable().describe("Customer code"),
  customerName: z.string().nullable().describe("Customer name"),
  isSent: z.boolean().describe("Whether the entry is sent"),
  isTransferable: z.boolean(),
  warehouseId: z.number(),
  transferId: z.number().describe("WarehouseTransfer ID"),
  transferCode: z.string(),
  transferStatusId: z.number().nullable().describe("WarehouseTransfer status ID"),
  binId: z.number().nullable().describe("Assigned bin ID"),
  locationCode: z.string().nullable().describe("Assigned bin location code"),
});
export type GetReversibleEntriesListResponseSchema = z.infer<
  typeof getReversibleEntriesListResponseSchema
>;

export const reverseSentEntriesRequestSchema = z
  .array(
    z.object({
      id: z.number().min(1),
      transferId: z.number().min(1),
      productCode: z.string().trim().min(1),
      warehouseId: z.number().min(1),
    }),
  )
  .min(1);

export type ReverseSentEntriesRequestSchema = z.infer<
  typeof reverseSentEntriesRequestSchema
>;

export const reverseSentEntriesResponseSchema = z.object({
  id: z.number().min(1),
  transferId: z.number().min(1),
  productCode: z.string().trim().min(1),
  warehouseId: z.number().min(1),
  statusId: z.literal(TransferStatusIds.UNDONE),
});

export type ReverseSentEntriesResponseSchema = z.infer<
  typeof reverseSentEntriesResponseSchema
>;

export const getPendingReceiptsListResponseSchema = z.object({
  id: z.number().describe("Entry ID"),
  entryTypeId: z.number().describe("Entry type ID"),
  productCode: z.string().describe("Resolved product code"),
  customerCode: z.string().nullable().describe("Customer code"),
  customerName: z.string().nullable().describe("Customer name"),
  isSent: z.boolean(),
  isTransferable: z.boolean(),
  warehouseId: z.number(),
  transferId: z.number().describe("WarehouseTransfer ID"),
  transferCode: z.string(),
  transferStatusId: z.number().nullable().describe("WarehouseTransfer status ID"),
  binId: z.number().nullable().describe("Assigned bin ID"),
  locationCode: z.string().nullable().describe("Assigned bin location code"),
});

export type GetPendingReceiptsListResponseSchema = z.infer<
  typeof getPendingReceiptsListResponseSchema
>;

export const receiveTransferRequestSchema = z.array(

  z.object({
    id: z.number().min(1),
    transferId: z.number().min(1),
    productCode: z.string().trim().min(1),
    warehouseId: z.number().min(1),
  }),
).min(1);

export type ReceiveTransferRequestSchema = z.infer<
  typeof receiveTransferRequestSchema
>;

export const receiveTransferResponseSchema = z.array(
  z.object({
    id: z.number().describe("Entry ID"),
    statusId: z.number(),
    transferId: z.number().describe("WarehouseTransfer ID"),
    productCode: z.string().describe("Resolved product code"),
    warehouseId: z.number(),
  }),
);

export type ReceiveTransferResponseSchema = z.infer<
  typeof receiveTransferResponseSchema
>;

export const listTransfersResponseSchema = z.object({
  id: z.number().describe("Transfer ID"),
  transferCode: z.string().describe("Unique code for the transfer"),
  sourceWarehouseId: z.number().describe("ID of the source warehouse"),
  destinationWarehouseId: z.number().describe("ID of the destination warehouse"),
  statusId: z.number().describe("Status ID of the transfer"),
  createdAt: z.string().describe("Timestamp when the transfer was created"),
  updatedAt: z.string().describe("Timestamp when the transfer was last updated"),
});

export type ListTransfersResponseSchema = z.infer<
  typeof listTransfersResponseSchema
>;

// right side of screen 2
export const getReceivedEntriesListResponseSchema = z.array(z.object({
  id: z.number().describe("Entry ID"),
  entryTypeId: z.number().describe("Entry type ID"),
  productCode: z.string().describe("Resolved product code"),
  customerCode: z.string().nullable().describe("Customer code"),
  customerName: z.string().nullable().describe("Customer name"),
  isSent: z.boolean(),
  isTransferable: z.boolean(),
  warehouseId: z.number(),
  transferId: z.number().describe("WarehouseTransfer ID"),
  transferCode: z.string(),
  transferStatusId: z.number().nullable().describe("WarehouseTransfer status ID"),
  binId: z.number().nullable().describe("Assigned bin ID"),
  locationCode: z.string().nullable().describe("Assigned bin location code"),
}));

export type GetReceivedEntriesListResponseSchema = z.infer<
  typeof getReceivedEntriesListResponseSchema
>;

export const undoReceivedEntriesRequestSchema = z.array(
  z.object({
    id: z.number().min(1).describe("Entry ID"),
    transferId: z.number().min(1).describe("WarehouseTransfer ID"),
    productCode: z.string().trim().min(1).describe("Resolved product code"),
    warehouseId: z.number().min(1).describe("Warehouse ID"),
  }),
);

export type UndoReceivedEntriesRequestSchema = z.infer<
  typeof undoReceivedEntriesRequestSchema
>;

export const undoReceivedEntriesResponseSchema = z.array(z.object({
  id: z.number().describe("Entry ID"),
  statusId: z.number(),
  transferId: z.number().describe("WarehouseTransfer ID"),
  productCode: z.string().describe("Resolved product code"),
  warehouseId: z.number(),
}));

export type UndoReceivedEntriesResponseSchema = z.infer<
  typeof undoReceivedEntriesResponseSchema
>;

export const getAllTransfersForAWarehouseResponseSchema = z.array(
  z.object({
    id: z.number().describe("Transfer ID"),

    transferCode: z.string().describe("Unique transfer code"),
    binId: z.number().nullable().describe("ID of the assigned bin location for the transfer"),
    locationCode: z.string().nullable().describe("Human-readable bin location code"),
    transferDate: z.string().describe("Transfer date (ISO string)"),

    productCode: z.string().describe("Product code"),
    productType: z.string().describe("Product type"),

    sourceWarehouseId: z.number().describe("Source warehouse ID"),
    sourceWarehouseName: z.string().describe("Source warehouse name"),

    destinationWarehouseId: z.number().describe("Destination warehouse ID"),
    destinationWarehouseName: z.string().describe("Destination warehouse name"),

    sourceWarehouse: z.object({
      id: z.number().describe("Source warehouse ID"),
      name: z.string().describe("Source warehouse name"),
    }),

    destinationWarehouse: z.object({
      id: z.number().describe("Destination warehouse ID"),
      name: z.string().describe("Destination warehouse name"),
    }),

    customerCode: z.string().nullable().describe("Customer code"),
    customerName: z.string().nullable().describe("Customer name"),

    statusId: z.number().describe("Transfer status ID"),
    status: z.string().describe("Transfer status"),

    history: z.array(z.string()).describe("Transfer history"),

    createdByEmail: z.string().describe("Email of creator"),
    updatedByEmail: z.string().describe("Email of last updater"),

    createdAt: z.string().describe("Created timestamp"),
    updatedAt: z.string().describe("Updated timestamp"),
  }),
);

export type GetAllTransfersForAWarehouseResponseSchema = z.infer<
  typeof getAllTransfersForAWarehouseResponseSchema
>;

export const getAllBinLocationsForWarehouseResponseSchema = z.array(z.object({
  id: z.number().describe("Bin ID"),
  shelfId: z.number().describe("Shelf ID"),
  rowNumber: z.number().describe("Row number within the shelf"),
  locationCode: z.string().describe("Human-readable bin location code"),
  createdAt: z.string().describe("ISO timestamp when record was created"),
  updatedAt: z.string().describe("ISO timestamp when record was updated"),
  createdBy: z.number().describe("User ID who created the record"),
  updatedBy: z.number().nullable().describe("User ID who last updated the record"),
}));

export type GetAllBinLocationsForWarehouseResponseSchema = z.infer<
  typeof getAllBinLocationsForWarehouseResponseSchema
>;

export const updateBinLocationsForWarehouseTransfersRequestSchema = z.object({
  transferId: z.number().min(1).describe("List of warehouse transfer IDs to update"),
  warehouseId: z.number().min(1).describe("Warehouse ID for which the bin locations are being updated"),

  binLocationId: z.number().min(1).describe("List of new bin location IDs to assign to the transfers"),
});

export type UpdateBinLocationsForWarehouseTransfersRequestSchema = z.infer<
  typeof updateBinLocationsForWarehouseTransfersRequestSchema
>;

export const updateBinLocationForWarehouseTransfersResponseSchema = z.object({
  id: z.number(),
  transferCode: z.string(),
  binId: z.number().nullable(),
  locationCode: z.string().nullable(),
  entryId: z.number(),
  sourceWarehouseId: z.number(),
  destinationWarehouseId: z.number(),
  statusId: z.number(),
  transferDate: z.string(), // ISO date string
  notes: z.string().nullable(),
  createdAt: z.string(), // ISO date string
  updatedAt: z.string(), // ISO date string
  createdBy: z.number(),
  initiatedBy: z.number(),
  approvedBy: z.number().nullable(),
  updatedBy: z.number().nullable(),
  reversedBy: z.number().nullable(),
});

export type UpdateBinLocationForWarehouseTransfersResponseSchema = z.infer<
  typeof updateBinLocationForWarehouseTransfersResponseSchema
>;

export const assignEntryToBinRequestSchema = z.object({
  entryId: z.number().min(1).describe("Entry ID to assign to a bin"),
  warehouseId: z.number().min(1).describe("Warehouse ID that owns the entry and bin"),
  binLocationId: z.number().min(1).describe("Bin location ID to assign"),
});

export type AssignEntryToBinRequestSchema = z.infer<
  typeof assignEntryToBinRequestSchema
>;

export const assignEntryToBinResponseSchema = z.object({
  entryId: z.number(),
  binId: z.number(),
  locationCode: z.string(),
  quantity: z.number(),
  updatedAt: z.string(),
});

export type AssignEntryToBinResponseSchema = z.infer<
  typeof assignEntryToBinResponseSchema
>;

/**
 * Enum for Bin movement direction
 */
export const binMovementTypeEnum = z.enum(["PLACE", "PICK"]);

/**
 * Response schema for detailed bin movement history
 */

const binMovementItemSchema = z.object({
  id: z.number().describe("Storage record ID"),
  binId: z.number().describe("ID of the bin"),
  locationCode: z.string().describe("Human-readable bin location code (e.g., A-1-01)"),
  entryId: z.number().describe("Related entry ID"),
  quantity: z.number().int().min(0).describe("The amount moved"),
  action: binMovementTypeEnum.describe("Direction of movement: PLACE or PICK"),
  productCode: z.string().describe("Resolved product code from bundles/series/items/packages"),
  productType: z.string().describe("The type name of the product"),
  warehouseName: z.string().describe("Name of the warehouse where the bin resides"),
  createdAt: z.string().describe("Timestamp of the movement"),
  operatorName: z.string().describe("Full name of the user who performed the action"),
});

export const getBinMovementHistoryResponseSchema = z.object({
  items: z.array(binMovementItemSchema).describe("List of bin movements"),
  totalEntrances: z.number().int().min(0).describe("Total number of PLACE movements"),
  totalExits: z.number().int().min(0).describe("Total number of PICK movements"),
  totalMovements: z.number().int().min(0).describe("Total number of all movements"),
});

export type GetBinMovementHistoryResponseSchema = z.infer<
  typeof getBinMovementHistoryResponseSchema
>;

const stockViewItemSchema = z.object({
  id: z.number().describe("Storage record ID"),
  binId: z.number().describe("ID of the bin"),
  locationCode: z
    .string()
    .describe("Human-readable bin location code (e.g., A-1-01)"),
  entryId: z.number().describe("Related entry ID"),
  quantity: z.number().int().min(0).describe("The amount moved"),
  stockStatus: z
    .string()
    .describe("Stock status based on quantity (e.g., Good, Moderate, Low, Rupture)"),
  action: binMovementTypeEnum
    .describe("Direction of movement: PLACE or PICK"),
  packageId: z
    .number()
    .nullable()
    .describe("Package ID when the stock row belongs to a package entry"),
  customerId: z
    .number()
    .nullable()
    .describe("Customer ID associated with the stock row"),
  customerCode: z
    .string()
    .nullable()
    .describe("Customer code associated with the stock row"),
  customerName: z
    .string()
    .nullable()
    .describe("Customer name associated with the stock row"),
  productCode: z
    .string()
    .describe("Resolved product code from bundles/series/items/packages"),
  productType: z
    .string()
    .describe("The type name of the product"),
  warehouseName: z
    .string()
    .describe("Name of the warehouse where the bin resides"),
  createdAt: z
    .string()
    .describe("Timestamp of the movement"),
  operatorName: z
    .string()
    .describe("Full name of the user who performed the action"),
});

export const getStockViewResponseSchema = z.object({
  items: z.array(stockViewItemSchema).describe("List of stock items"),
  totalProducts: z.number().int().min(0).describe("Total number of products in warehouse"),
  sufficientStock: z.number().int().min(0).describe("Number of products with sufficient stock"),
  lowStock: z.number().int().min(0).describe("Number of products with low stock"),
});

export type GetStockViewResponseSchema = z.infer<
  typeof getStockViewResponseSchema
>;
