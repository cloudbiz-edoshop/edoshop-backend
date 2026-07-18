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
  createDeliveryPlanRequestSchema,
  deliveryPlanResponseSchema,
  listDeliveryPlansResponseSchema,
  updateDeliveryPlanRequestSchema,
} from "./delivery-plans.schema";

const tags = ["Delivery Plans"];

export const list = createRoute({
  path: "/delivery-plans",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.DELIVERY_PLANS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  summary: "List delivery plans",
  description: "List delivery plans with pagination, filtering, and sorting",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(listDeliveryPlansResponseSchema),
      "List of delivery plans",
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

export const create = createRoute({
  path: "/delivery-plans",
  method: "post",
  tags,
  summary: "Create a delivery plan",
  description: "Create a delivery plan",
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      createDeliveryPlanRequestSchema,
      "Create Delivery Plan",
    ),
  },
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.DELIVERY_PLANS, operation: OperationType.CREATE },
    ]),
  ] as const,
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(
        deliveryPlanResponseSchema,
        "Delivery plan created successfully",
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.CONFLICT,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

export const getOne = createRoute({
  path: "/delivery-plans/:id",
  method: "get",
  tags,
  summary: "Get a delivery plan",
  description: "Get a delivery plan by ID",
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.DELIVERY_PLANS, operation: OperationType.READ },
    ]),
  ] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        deliveryPlanResponseSchema,
        "Delivery plan details",
      ),
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

export const update = createRoute({
  path: "/delivery-plans/:id",
  method: "patch",
  tags,
  summary: "Update a delivery plan",
  description: "Update a delivery plan by ID",
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      updateDeliveryPlanRequestSchema,
      "Update Delivery Plan",
    ),
  },
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.DELIVERY_PLANS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        deliveryPlanResponseSchema,
        "Delivery plan updated successfully",
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.CONFLICT,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export const remove = createRoute({
  path: "/delivery-plans/:id",
  method: "delete",
  tags,
  summary: "Delete a delivery plan",
  description: "Delete a delivery plan by ID",
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.DELIVERY_PLANS, operation: OperationType.DELETE },
    ]),
  ] as const,
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Delivery plan deleted successfully",
    },
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

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof update;
export type RemoveRoute = typeof remove;
