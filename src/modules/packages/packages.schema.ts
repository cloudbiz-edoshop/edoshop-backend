import { z } from "zod";
import { packagesSchema } from "@/db/models/packages";
import { shippingLabelsSchema } from "@/db/models/shipping-labels";

// Create package request schema
export const createPackageSchema = z.object({
  customerId: z.number().describe("Customer ID"),
  orderId: z.number().optional().describe("Order ID (optional)"),
  packageWeight: z.number().describe("Package weight"),
  comments: z.string().optional().describe("Comments (optional)"),
});

export type CreatePackageRequest = z.infer<typeof createPackageSchema>;

// Package response schema (matches database model)
export const packageResponseSchema = packagesSchema;

export type PackageResponse = z.infer<typeof packageResponseSchema>;

// Edit package request schema (without packageId as it comes from URL)
export const editPackageSchema = z.object({
  packageWeight: z.number().optional().describe("Package weight"),
  comments: z.string().optional().describe("Comments"),
  address: z.string().optional().describe("Delivery address for the package"),
});

export type EditPackageRequest = z.infer<typeof editPackageSchema>;

// Create shipping label request schema
export const createShippingLabelSchema = z.object({
  packageId: z.coerce.number().min(1).describe("Package ID"),
  note: z.string().optional().describe("Note (optional)"),
});

export type CreateShippingLabelRequest = z.infer<
  typeof createShippingLabelSchema
>;

// Shipping label response schema (matches database model)
export const shippingLabelResponseSchema = shippingLabelsSchema;

export type ShippingLabelResponse = z.infer<typeof shippingLabelResponseSchema>;

// Edit shipping label request schema (without shippingLabelId as it comes from URL)
export const editShippingLabelSchema = z.object({
  weight: z.number().optional().describe("Weight"),
  address: z.string().optional().describe("Address"),
  note: z.string().optional().describe("Note"),
});

export type EditShippingLabelRequest = z.infer<typeof editShippingLabelSchema>;

export const getPackageManagementW1Schema = z.array(
  z.object({
    packageId: z.number(),
    packageCode: z.string(),
    customerCode: z.string(),
    customerId: z.number().nullable(),
    destination: z.string(),
    packagingStatus: z.string(),
    fulfillmentTime: z.string().nullable(),
    packageWeight: z.string(),
    registeredOn: z.string(),
    description: z.string(),
    hasShippingLabel: z.boolean(),
  }),
);

export type PackageManagementW1 = z.infer<typeof getPackageManagementW1Schema>;

export const packageManagementW2Schema = z.array(
  z.object({
    packageId: z.number(),
    packageCode: z.string(),
    binLocation: z.string(),
    customerCode: z.string(),
    customerId: z.number().nullable(),
    destination: z.string(),
    packageWeight: z.string(),
    packagingStatus: z.string(),
    receivedAt: z.string().nullable(),
  }),
);

export type PackageManagementW2 = z.infer<typeof packageManagementW2Schema>;

export const getPackedPackagesThatAreBeingReceivedResponseSchema = z.array(
  z.object({
    packageId: z.number(),
    packageCode: z.string(),
    warehouseId: z.number(),
    binLocation: z.string(),
    destination: z.string(),
    packageWeight: z.string(),
    packageStatus: z.string(),
    receivedAt: z.string().nullable(),
  }),
);

export type GetPackedPackagesThatAreBeingReceivedResponse = z.infer<
  typeof getPackedPackagesThatAreBeingReceivedResponseSchema
>;

export const receivedPackageManagementSchema = z.array(
  z.object({
    packageCode: z.string(),
    packageId: z.number(),
    binLocation: z.string(),
    destination: z.string(),
    packageWeight: z.string(),
    dispatchStatus: z.string(),
    registered: z.string().nullable(),
    fulfillmentTime: z.string().nullable(),
  }),
);

export type ReceivedPackageManagement = z.infer<typeof receivedPackageManagementSchema>;

export const receivedPackageDispatchManagementSchema = z.array(
  z.object({
    packageId: z.number(),
    priorityCode: z.string(),
    customerId: z.number().nullable(),
    orderId: z.number().nullable(),
    packageWeight: z.string(),
    destination: z.string(),
    customerCode: z.string().nullable(),
    priorityDescription: z.string(),
    dispatchStatus: z.string(),
    registered: z.string().nullable(),
    fulfillmentTime: z.string().nullable(),
  }),
);

export type ReceivedPackageDispatchManagement = z.infer<typeof receivedPackageDispatchManagementSchema>;

// Create package with items request schema
export const createPackageWithItemsSchema = z.object({
  customerCode: z.string().trim().min(1).describe("Customer Code"),
  warehouseId: z.number().int().min(1).describe("Warehouse ID"),
  packageWeight: z.number().positive().describe("Package weight in kg"),
  comments: z.string().optional().describe("Package comments/notes"),
  address: z.string().describe("Delivery address for the package"),
  orderItems: z
    .array(
      z.object({
        orderItemId: z.number().min(1).describe("Order item ID"),
        quantityToPack: z.number().min(1).describe("Quantity to pack"),
      }),
    )
    .min(1)
    .describe("Array of order items to pack"),
});

export type CreatePackageWithItemsRequest = z.infer<
  typeof createPackageWithItemsSchema
>;

// Package with items response schema
export const packageWithItemsResponseSchema = z.object({
  package: packagesSchema,
  packageItems: z.array(
    z.object({
      id: z.number(),
      packageId: z.number(),
      orderItemId: z.number(),
      quantityPacked: z.number(),
      version: z.number(),
      createdAt: z.string(),
    }),
  ),
  affectedOrders: z.array(
    z.object({
      orderId: z.number(),
      orderCode: z.string(),
      fulfillmentStatusId: z.number(),
      fulfillmentStatus: z.string(),
    }),
  ),
});

export type PackageWithItemsResponse = z.infer<
  typeof packageWithItemsResponseSchema
>;

// Print label request schema (packageId in params)
export const printLabelParamsSchema = z.object({
  packageId: z.coerce.number().min(1).describe("Package ID"),
});

export type PrintLabelParams = z.infer<typeof printLabelParamsSchema>;

export const receiveAPackageFromW1RequestSchema = z.object({
  packageId: z.coerce.number().int().min(1).describe("Package ID to receive"),
  packageWeightAtReceived: z.number().positive().describe("Package weight at time of receipt"),
  binLocationAtReceived: z.string().describe("Bin location at time of receipt"),
  packageDestinationAtReceived: z.string().trim().min(1).describe("Package destination at time of receipt"),
  receivedAt: z.iso.datetime().describe("Date and time when the package was received (ISO 8601)"),
});

export type ReceiveAPackageFromW1Request = z.infer<typeof receiveAPackageFromW1RequestSchema>;

export const editReceivedPackageRequestSchema = z.object({
  binLocationAtReceived: z.string().optional().describe("Updated bin location at time of receipt"),
  packageDestinationAtReceived: z.string().optional().describe("Updated package destination at time of receipt"),
});

export type EditReceivedPackageRequest = z.infer<
  typeof editReceivedPackageRequestSchema
>;

export const updateReceivedPackageStatusRequestSchema = z.object({
  status: z.number().min(1).describe("New status ID for the received package"),
});

export type UpdateReceivedPackageStatusRequest = z.infer<
  typeof updateReceivedPackageStatusRequestSchema
>;

export const updateReceivedPackagesResponseSchema = z.object({
  packageId: z.number(),
  status: z.string(),
});

export type UpdateReceivedPackagesResponse = z.infer<
  typeof updateReceivedPackagesResponseSchema
>;

export const dispatchPackagesRequestSchema = z.object({
  driverId: z.number().min(1).describe("Driver ID for dispatching packages"),
  driverName: z.string().describe("Driver name for dispatching packages"),
  packageId: z.coerce.number().min(1).describe("Package ID to dispatch"),
  packageDestination: z.string().describe("Package destination for dispatch"),
  additionalNotes: z.string().optional().describe("Additional notes for dispatching the package"),
  deliverToDriver: z.string().optional().describe("Date and time when the package is delivered to the driver (ISO 8601)"),
});

export type DispatchPackagesRequest = z.infer<typeof dispatchPackagesRequestSchema>;

export const dispatchPackagesResponseSchema = z.object({
  packageId: z.number(),
  driverId: z.number(),
  driverName: z.string(),
  packageDestination: z.string(),
  additionalNotes: z.string().nullable(),
  dispatchTime: z.string(),
});

export type DispatchPackagesResponse = z.infer<
  typeof dispatchPackagesResponseSchema
>;

export const getAllPackageStatusesResponseSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
  }),
);

export type GetAllPackageStatusesResponse = z.infer<
  typeof getAllPackageStatusesResponseSchema
>;

export const getShippingPriorityCodesResponseSchema = z.array(
  z.object({
    id: z.number(),
    code: z.string(),
    description: z.string().nullable(),
  }),
);

export type GetShippingPriorityCodesResponse = z.infer<typeof getShippingPriorityCodesResponseSchema>;

export const getShippingTypesResponseSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
  }),
);

export type GetShippingTypesResponse = z.infer<typeof getShippingTypesResponseSchema>;

export const getPackageInfoForShippingLabelResponseSchema = z.object({
  packageCode: z.string().trim().nullable().optional(),
  hasShippingLabel: z.boolean(),
  shippingLabelId: z.number().nullable(),
  shippingType: z.object({
    id: z.number().optional(),
    name: z.string().trim().nullable().optional(),
    description: z.string().trim().nullable().optional(),
  }).nullable().optional(),
  shippingPriorityCode: z.object({
    id: z.number().optional(),
    code: z.string().trim().nullable().optional(),
    description: z.string().trim().nullable().optional(),
  }).nullable().optional(),
  weight: z.union([z.string().trim(), z.number()]).nullable(),
  fullName: z.string().trim().nullable(),
  address: z.string().trim().nullable(),
  city: z.union([
    z.string().trim(),
    z.object({
      id: z.number().optional(),
      name: z.string().trim().nullable().optional(),
    }),
  ]).nullable(),
  country: z.union([
    z.string().trim(),
    z.object({
      id: z.number().optional(),
      name: z.string().trim().nullable().optional(),
    }),
  ]).nullable(),
  additionalNotes: z.string().trim().nullable(),
});

export type GetPackageInfoForShippingLabelResponse = z.infer<
  typeof getPackageInfoForShippingLabelResponseSchema
>;
