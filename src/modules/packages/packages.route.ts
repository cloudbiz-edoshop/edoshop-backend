import { createRoute, z } from "@hono/zod-openapi";
import { jwtMiddleware } from "@/core/middlewares";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import {
  commonErrorResponses,
  jsonContent,
  jsonContentRequired,
} from "@/lib/openapi/helpers";
import {
  createSuccessResponseSchema,
  idParams,
} from "@/lib/openapi/schemas";
import { createSuccessResponseSchemaWithPagination } from "@/lib/openapi/schemas/create-api-response";
import commonQueryParamsSchema from "@/lib/openapi/schemas/query-params-schema";

import { jwtHeaderSchema } from "@/lib/zod-schemas";

import * as schemas from "./packages.schema";

const tags = ["Packages"];

export const createPackage = createRoute({
  path: "/packages",
  method: "post",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Create a package",
  description: "Create a new package for a customer",
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(schemas.createPackageSchema, "Create Package"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        schemas.packageResponseSchema,
        "Package created successfully",
      ),
      "Package created successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      schemas.createPackageSchema,
    ),
  },
});

export const editPackage = createRoute({
  path: "/packages/{id}",
  method: "patch",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Update a package",
  description: "Update package details",
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(schemas.editPackageSchema, "Edit Package"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        schemas.packageResponseSchema,
        "Package updated successfully",
      ),
      "Package updated successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export const createShippingLabel = createRoute({
  path: "/packages/shipping-labels",
  method: "post",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Create a shipping label",
  description: "Create a new shipping label for a package",
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      schemas.createShippingLabelSchema,
      "Create Shipping Label",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        schemas.shippingLabelResponseSchema,
        "Shipping label created successfully",
      ),
      "Shipping label created successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      schemas.createShippingLabelSchema,
    ),
  },
});

export const editShippingLabel = createRoute({
  path: "/packages/shipping-labels/{id}",
  method: "patch",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Update a shipping label",
  description: "Update shipping label details",
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      schemas.editShippingLabelSchema,
      "Edit Shipping Label",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        schemas.shippingLabelResponseSchema,
        "Shipping label updated successfully",
      ),
      "Shipping label updated successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export const getPackageManagementW1 = createRoute({
  path: "/packages/management/w1",
  method: "get",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Get package management for warehouse 1",
  description: "Retrieve all packages for warehouse 1 management with pagination, filtering and sorting",
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(
        schemas.getPackageManagementW1Schema,
      ),
      "Package management W1 retrieved successfully",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.INTERNAL_SERVER_ERROR],
      commonQueryParamsSchema,
    ),
  },
});

export const getPackageManagementW2 = createRoute({
  path: "/packages/management/w2",
  method: "get",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Get package management for warehouse 2",
  description: "Retrieve all packages for warehouse 2 management with pagination, filtering and sorting",
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(
        schemas.packageManagementW2Schema,
      ),
      "Package management W2 retrieved successfully",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.INTERNAL_SERVER_ERROR],
      commonQueryParamsSchema,
    ),
  },
});

export const createPackageWithItems = createRoute({
  path: "/packages/with-items",
  method: "post",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Create package with order items",
  description:
    "Create a package and add multiple order items to it in a single atomic transaction",
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      schemas.createPackageWithItemsSchema,
      "Create Package with Items",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(
        schemas.packageWithItemsResponseSchema,
        "Package with items created successfully",
      ),
      "Package with items created successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.CONFLICT,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      schemas.createPackageWithItemsSchema,
    ),
  },
});

export const printShippingLabel = createRoute({
  path: "/packages/{packageId}/print-label",
  method: "get",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Generate shipping label PDF",
  description: "Generate and download a shipping label PDF for a package",
  request: {
    headers: jwtHeaderSchema,
    params: schemas.printLabelParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Shipping label PDF generated successfully",
      content: {
        "application/pdf": {
          schema: {
            type: "string",
            format: "binary",
          },
        },
      },
    },
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      schemas.printLabelParamsSchema,
    ),
  },
});

export const receiveAPackageFromW1 = createRoute({
  path: "/packages/w2/receive",
  method: "patch",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Receive package from warehouse 1 in 2",
  description: "Receive a package from warehouse 1 in warehouse 2 and update its status accordingly",
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      schemas.receiveAPackageFromW1RequestSchema,
      "Receive Packages",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        schemas.packageResponseSchema,
        "Package received successfully",
      ),
      "Package received successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.CONFLICT,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      schemas.receiveAPackageFromW1RequestSchema,
    ),
  },
});

export const editReceivedPackageFromW1 = createRoute({
  path: "/packages/{id}/edit-received",
  method: "patch",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Edit received package",
  description: "Edit the details of a received package",
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      schemas.editReceivedPackageRequestSchema,
      "Edit Received Package",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        schemas.packageResponseSchema,
        "Received package updated successfully",
      ),
      "Received package updated successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.CONFLICT,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      schemas.editReceivedPackageRequestSchema,
    ),
  },
});

export const getPackedPackagesThatAreBeingReceived = createRoute({
  path: "/packages/w2/receiving",
  method: "get",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Get packed packages that are being received",
  description: "Retrieve all packed packages that are being received with pagination, filtering and sorting",
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(
        schemas.getPackedPackagesThatAreBeingReceivedResponseSchema,
      ),
      "Packed packages that are being received retrieved successfully",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.INTERNAL_SERVER_ERROR],
      commonQueryParamsSchema,
    ),
  },
});

export const listShippingLabels = createRoute({
  path: "/packages/shipping-labels",
  method: "get",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Get all shipping labels",
  description: "Retrieve all shipping labels with pagination, filtering and sorting",
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(
        schemas.shippingLabelResponseSchema.array(),
      ),
      "Shipping labels retrieved successfully",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.INTERNAL_SERVER_ERROR],
      commonQueryParamsSchema,
    ),
  },
});

export const receivedPackageDispatchManagement = createRoute({
  path: "/packages/dispatch",
  method: "get",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Get packages ready for dispatch",
  description: "Retrieve all packages that are ready to be dispatched",
  request: {
    headers: jwtHeaderSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        schemas.receivedPackageDispatchManagementSchema,
        "Packages ready for dispatch retrieved successfully",
      ),
      "Packages ready for dispatch retrieved successfully",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.INTERNAL_SERVER_ERROR],
      jwtHeaderSchema,
    ),
  },
});

export const getShippingPriorityCodes = createRoute({
  path: "/packages/shipping-priority-codes",
  method: "get",
  tags,
  summary: "Get all shipping priority codes",
  description: "Retrieve all available shipping priority codes",
  request: {},
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        schemas.getShippingPriorityCodesResponseSchema,
        "Shipping priority codes retrieved successfully",
      ),
      "Shipping priority codes retrieved successfully",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.INTERNAL_SERVER_ERROR],
      z.object({}),
    ),
  },
});

export const getShippingTypes = createRoute({
  path: "/packages/shipping-types",
  method: "get",
  tags,
  summary: "Get all shipping types",
  description: "Retrieve all available shipping types",
  request: {},
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        schemas.getShippingTypesResponseSchema,
        "Shipping types retrieved successfully",
      ),
      "Shipping types retrieved successfully",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.INTERNAL_SERVER_ERROR],
      z.object({}),
    ),
  },
});

export const getAllPackageStatuses = createRoute({
  path: "/packages/statuses",
  method: "get",
  tags,
  summary: "Get all package statuses",
  description: "Retrieve all available package statuses",
  request: {
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        schemas.getAllPackageStatusesResponseSchema,
        "Package statuses retrieved successfully",
      ),
      "Package statuses retrieved successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

export const updateReceivedPackageStatus = createRoute({
  path: "/packages/{id}/dispatch",
  method: "patch",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Update dispatched package status",
  description: "Update the status of a dispatched package",
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      schemas.updateReceivedPackageStatusRequestSchema,
      "Update Received Package Status",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        schemas.updateReceivedPackagesResponseSchema,
        "Package status updated successfully",
      ),
      "Package status updated successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.CONFLICT,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      schemas.updateReceivedPackageStatusRequestSchema,
    ),
  },
});

export const dispatchPackages = createRoute({
  path: "/packages/dispatch",
  method: "post",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Dispatch package",
  description: "Dispatch a package",
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      schemas.dispatchPackagesRequestSchema,
      "Dispatch Packages",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        schemas.dispatchPackagesResponseSchema,
        "Packages dispatched successfully",
      ),
      "Packages dispatched successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.CONFLICT,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      schemas.dispatchPackagesRequestSchema,
    ),
  },
});

export const getPackageInfoForShippingLabel = createRoute({
  path: "/packages/{id}/shipping-info",
  method: "get",
  tags,
  middleware: [jwtMiddleware()] as const,
  summary: "Get package info for shipping label",
  description: "Retrieve package information needed for creating a shipping label",
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        schemas.getPackageInfoForShippingLabelResponseSchema,
        "Package info retrieved successfully",
      ),
      "Package info retrieved successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.CONFLICT,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

export type CreatePackageRoute = typeof createPackage;
export type EditPackageRoute = typeof editPackage;
export type CreateShippingLabelRoute = typeof createShippingLabel;
export type EditShippingLabelRoute = typeof editShippingLabel;
export type GetPackageManagementW1Route = typeof getPackageManagementW1;
export type GetPackageManagementW2Route = typeof getPackageManagementW2;
export type GetPackageInfoForShippingLabelRoute = typeof getPackageInfoForShippingLabel;
export type CreatePackageWithItemsRoute = typeof createPackageWithItems;
export type PrintShippingLabelRoute = typeof printShippingLabel;
export type ListShippingLabelsRoute = typeof listShippingLabels;
export type ReceiveAPackagesFromW1Route = typeof receiveAPackageFromW1;
export type EditReceivedPackageFromW1Route = typeof editReceivedPackageFromW1;
export type GetPackedPackagesThatAreBeingReceived = typeof getPackedPackagesThatAreBeingReceived;
export type UpdateReceivedPackageStatusRoute = typeof updateReceivedPackageStatus;
export type ReceivedPackageDispatchManagementRoute = typeof receivedPackageDispatchManagement;
export type DispatchPackagesRoute = typeof dispatchPackages;
export type GetAllPackageStatusesRoute = typeof getAllPackageStatuses;
export type GetShippingTypesRoute = typeof getShippingTypes;
export type GetShippingPriorityCodesRoute = typeof getShippingPriorityCodes;
