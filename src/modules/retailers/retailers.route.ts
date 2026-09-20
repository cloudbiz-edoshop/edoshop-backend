import { createRoute, z } from "@hono/zod-openapi";

import { EntityType, OperationType } from "@/constants";
import { rolesAndPermissionsMiddleware } from "@/core/middlewares";
import { jwtMiddleware } from "@/core/middlewares/jwt";
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
  becomeRetailerRequestSchema,
  createRetailerRequestSchema,
  createRetailerResponseSchema,
  currentRetailerResponseSchema,
  getRetailerResponseSchema,
  listRetailersResponseSchema,
  retailerCreateDiscountRequestSchema,
  updateRetailerRequestSchema,
} from "./retailers.schema";
import { createDiscountResponseSchema } from "@/modules/discounts/discounts.schema";

const tags = ["Retailers"];

export const list = createRoute({
  path: "/retailers",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.RETAILERS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  summary: "List retailers",
  description: "List retailers with pagination, filtering, and sorting",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(listRetailersResponseSchema),
      "The list of retailers",
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
  path: "/retailers",
  method: "post",
  tags,
  summary: "Create a retailer",
  description: "Create a retailer",
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(createRetailerRequestSchema, "Create Retailer"),
  },
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.RETAILERS, operation: OperationType.CREATE },
    ]),
  ] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        createRetailerResponseSchema,
        "Retailer created successfully",
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

export const becomeRetailer = createRoute({
  path: "/retailers/become",
  method: "post",
  tags,
  summary: "Become a retailer",
  description: "Create a retailer request for the authenticated storefront customer",
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(becomeRetailerRequestSchema, "Become Retailer"),
  },
  middleware: [jwtMiddleware()] as const,
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(
        createRetailerResponseSchema,
        "Retailer request submitted successfully",
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      becomeRetailerRequestSchema,
    ),
  },
});

export const getCurrentRetailer = createRoute({
  path: "/retailers/me",
  method: "get",
  tags,
  summary: "Get current retailer request",
  description: "Get retailer status for the authenticated storefront customer",
  request: {
    headers: jwtHeaderSchema,
  },
  middleware: [jwtMiddleware()] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        currentRetailerResponseSchema,
        "Current retailer request",
      ),
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.INTERNAL_SERVER_ERROR],
      z.object({}),
    ),
  },
});

export const getOne = createRoute({
  path: "/retailers/{id}",
  method: "get",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.RETAILERS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  summary: "Get a retailer by id",
  description: "Get a retailer by id",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(getRetailerResponseSchema),
      "The retailer",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export const patch = createRoute({
  path: "/retailers/{id}",
  method: "patch",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.RETAILERS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      updateRetailerRequestSchema,
      "The retailer to update",
    ),
  },
  tags,
  summary: "Update a retailer",
  description: "Update a retailer",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(createRetailerResponseSchema),
      "The updated retailer",
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

export const removeMany = createRoute({
  path: "/retailers",
  method: "delete",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.RETAILERS, operation: OperationType.DELETE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      z.object({
        ids: z.array(z.number()),
      }),
      "The retailer IDs to remove",
    ),
  },
  tags,
  summary: "Delete multiple retailers",
  description: "Delete multiple retailers by their IDs",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Retailers removed successfully",
    },
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

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type BecomeRetailerRoute = typeof becomeRetailer;
export type GetCurrentRetailerRoute = typeof getCurrentRetailer;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveManyRoute = typeof removeMany;

export const listMyDiscountSeriesOptions = createRoute({
  path: "/retailers/me/discounts/series-options",
  method: "get",
  tags,
  summary: "Series list for retailer discount form",
  request: { headers: jwtHeaderSchema },
  middleware: [jwtMiddleware()] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        z.object({
          series: z.array(
            z.object({
              id: z.number(),
              seriesCode: z.string(),
            }),
          ),
        }),
      ),
      "Series options",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.NOT_FOUND],
      z.object({}),
    ),
  },
});

export const listMyDiscounts = createRoute({
  path: "/retailers/me/discounts",
  method: "get",
  tags,
  summary: "List current retailer discounts",
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  middleware: [jwtMiddleware()] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(
        z.array(createDiscountResponseSchema),
        "Retailer discounts",
      ),
      "Retailer discounts",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.NOT_FOUND],
      commonQueryParamsSchema,
    ),
  },
});

export const createMyDiscount = createRoute({
  path: "/retailers/me/discounts",
  method: "post",
  tags,
  summary: "Create a retailer-only discount",
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      retailerCreateDiscountRequestSchema,
      "Retailer discount",
    ),
  },
  middleware: [jwtMiddleware()] as const,
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(
        createDiscountResponseSchema,
        "Discount created",
      ),
      "Discount created",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
      ],
      retailerCreateDiscountRequestSchema,
    ),
  },
});

export const deleteMyDiscount = createRoute({
  path: "/retailers/me/discounts/{id}",
  method: "delete",
  tags,
  summary: "Delete a retailer-owned discount",
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  middleware: [jwtMiddleware()] as const,
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Discount deleted",
    },
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.NOT_FOUND],
      idParams,
    ),
  },
});

export type ListMyDiscountSeriesOptionsRoute = typeof listMyDiscountSeriesOptions;
export type ListMyDiscountsRoute = typeof listMyDiscounts;
export type CreateMyDiscountRoute = typeof createMyDiscount;
export type DeleteMyDiscountRoute = typeof deleteMyDiscount;
