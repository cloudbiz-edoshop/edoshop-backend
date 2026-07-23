import { createRoute, z } from "@hono/zod-openapi";

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
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ORDERS, operation: OperationType.READ },
    ]),
  ] as const,
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

export const listDirectOrderTracking = createRoute({
  path: "/orders/direct-tracking",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  summary: "List direct order tracking",
  description: "Returns direct orders with store-leg tracking steps (no bundles).",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(
        z.array(schemas.directOrderTrackingRowSchema),
      ),
      "Direct order tracking list",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      commonQueryParamsSchema,
    ),
  },
});

export const getDirectOrderTracking = createRoute({
  path: "/orders/direct-tracking/{id}",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  summary: "Get direct order tracking detail",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(schemas.directOrderTrackingDetailSchema),
      "Direct order tracking detail",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export const updateDirectOrderTrackingStep = createRoute({
  path: "/orders/direct-tracking/{id}/step",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      schemas.updateDirectOrderTrackingStepRequestSchema,
      "Direct order tracking step update",
    ),
  },
  summary: "Update direct order tracking step",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(schemas.directOrderTrackingDetailSchema),
      "Direct order tracking updated",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export type ListDirectOrderTrackingRoute = typeof listDirectOrderTracking;
export type GetDirectOrderTrackingRoute = typeof getDirectOrderTracking;
export type UpdateDirectOrderTrackingStepRoute = typeof updateDirectOrderTrackingStep;

export const checkoutDirectOrder = createRoute({
  path: "/orders/checkout/direct",
  method: "post",
  tags,
  middleware: [jwtMiddleware()] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      schemas.checkoutDirectOrderRequestSchema,
      "Direct order checkout payload",
    ),
  },
  summary: "Complete direct order checkout",
  description: "Creates an order, records payment, and marks it ready for fulfillment",
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(schemas.checkoutDirectOrderResponseSchema),
      "Direct order checkout completed",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      schemas.checkoutDirectOrderRequestSchema,
    ),
  },
});

export type CheckoutDirectOrderRoute = typeof checkoutDirectOrder;

export const requestPostCheckoutDelivery = createRoute({
  path: "/orders/me/{orderCode}/request-delivery",
  method: "post",
  tags,
  middleware: [jwtMiddleware()] as const,
  request: {
    headers: jwtHeaderSchema,
    params: z.object({
      orderCode: z.string().min(1),
    }),
    body: jsonContentRequired(
      schemas.requestPostCheckoutDeliveryRequestSchema,
      "Post-checkout delivery request",
    ),
  },
  summary: "Request delivery after checkout",
  description: "Allows a customer who selected pickup to switch to delivery and pay the delivery fee",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(schemas.requestPostCheckoutDeliveryResponseSchema),
      "Delivery request created",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({ orderCode: z.string() }),
    ),
  },
});

export type RequestPostCheckoutDeliveryRoute = typeof requestPostCheckoutDelivery;

export const getFulfillmentOptions = createRoute({
  path: "/public/fulfillment-options",
  method: "get",
  tags,
  summary: "Get pickup and delivery options",
  description: "Returns pickup locations and shipping fees for checkout",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        z.object({
          deliveryFee: z.number(),
          pickupFee: z.number(),
          currency: z.string(),
          deliveryOptions: z.array(
            z.object({
              id: z.number(),
              code: z.string(),
              label: z.string(),
              leadTime: z.string(),
              description: z.string(),
              fee: z.number(),
            }),
          ),
          pickupLocations: z.array(
            z.object({
              id: z.number(),
              name: z.string(),
              description: z.string().nullable().optional(),
              address: z.string(),
            }),
          ),
        }),
      ),
      "Fulfillment options",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.INTERNAL_SERVER_ERROR],
      z.object({}),
    ),
  },
});

export const calculateDeliveryFee = createRoute({
  path: "/public/calculate-delivery-fee",
  method: "post",
  tags,
  summary: "Calculate delivery fee from distance and package details",
  description:
    "Returns the shipping fee for a delivery plan based on customer coordinates and package weight/dimensions",
  request: {
    body: jsonContentRequired(
      z.object({
        deliveryPlanId: z.number().int().positive().optional(),
        latitude: z.number(),
        longitude: z.number(),
        weightKg: z.number().nonnegative().optional(),
        lengthCm: z.number().nonnegative().optional(),
        widthCm: z.number().nonnegative().optional(),
        heightCm: z.number().nonnegative().optional(),
      }),
      "Delivery fee calculation input",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        z.object({
          fee: z.number(),
          currency: z.string(),
        }),
        "Calculated delivery fee",
      ),
      "Delivery fee calculation result",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

export const getMyOrders = createRoute({
  path: "/orders/me",
  method: "get",
  tags,
  middleware: [jwtMiddleware()] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema.pick({ page: true, limit: true }).extend({
      cancelled: z
        .enum(["true", "false"])
        .optional()
        .describe("Filter cancelled orders when true, active orders when false"),
      trackable: z
        .enum(["true", "false"])
        .optional()
        .describe("When true, only orders assigned to an active tracking bundle"),
    }),
  },
  summary: "List my orders",
  description: "Returns orders placed by the authenticated customer",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(
        z.array(schemas.customerOrderSummarySchema),
      ),
      "Customer orders",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

export const getMyOrderTracking = createRoute({
  path: "/orders/me/{orderCode}/tracking",
  method: "get",
  tags,
  middleware: [jwtMiddleware()] as const,
  request: {
    headers: jwtHeaderSchema,
    params: z.object({
      orderCode: z.string().min(1),
    }),
  },
  summary: "Track one of my orders",
  description: "Returns tracking details for an order owned by the authenticated customer",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(schemas.customerOrderTrackingSchema),
      "Order tracking",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({ orderCode: z.string() }),
    ),
  },
});

export type GetFulfillmentOptionsRoute = typeof getFulfillmentOptions;
export type CalculateDeliveryFeeRoute = typeof calculateDeliveryFee;
export type GetMyOrdersRoute = typeof getMyOrders;
export type GetMyOrderTrackingRoute = typeof getMyOrderTracking;
