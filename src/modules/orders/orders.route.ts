import { createRoute } from "@hono/zod-openapi";

import { EntityType } from "@/constants/entities.constants";
import { OperationType } from "@/constants/operations.constants";
import { jwtMiddleware, rolesAndPermissionsMiddleware } from "@/core/middlewares";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import {
  commonErrorResponses,
  jsonContent,
  jsonContentRequired,
} from "@/lib/openapi/helpers";
import { idParams } from "@/lib/openapi/schemas";
import { createSuccessResponseSchema, createSuccessResponseSchemaWithPagination } from "@/lib/openapi/schemas/create-api-response";
import commonQueryParamsSchema from "@/lib/openapi/schemas/query-params-schema";
import { jwtHeaderSchema } from "@/lib/zod-schemas";

import * as schemas from "./orders.schema";
import { updateAvailableQuantityForFulfillmentRequestSchema, updateAvailableQuantityForFulfillmentResponseSchema } from "./orders.schema";

const tags = ["Orders"];

export const getOrdersToFulfill = createRoute({
  path: "/orders/to-fulfill",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ORDERS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  summary: "Get orders to fulfill",
  description: "List orders with pagination, filtering, and sorting",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(schemas.ordersToFulfillSchema),
      "The list of orders to fulfill",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      commonQueryParamsSchema,
    ),
  },
});

export const getOrderDetailsForACustomer = createRoute({
  path: "/orders/details-for-a-customer/{id}",
  method: "get",
  tags,
  middleware: [jwtMiddleware()] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
    params: idParams,
  },
  summary: "Get customer order details",
  description: "Get order details for a specific customer",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(
        schemas.orderDetailsForACustomerToFulfillSchema,
      ),
      "Customer order details",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export const updateAvailableQuantityForFulfillment = createRoute({
  path: "/orders/details-for-a-customer/{id}",
  method: "patch",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ORDERS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(updateAvailableQuantityForFulfillmentRequestSchema, "The available quantity to update"),
  },
  summary: "Update available quantity for a variant",
  description: "Update available quantity for a variant",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(updateAvailableQuantityForFulfillmentResponseSchema),
      "The updated available quantity details",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.CONFLICT,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export type GetOrdersToFulfillRoute = typeof getOrdersToFulfill;
export type GetOrderDetailsForACustomerRoute = typeof getOrderDetailsForACustomer;
export type UpdateAvailableQuantityForFulfillmentRoute = typeof updateAvailableQuantityForFulfillment;
