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
  couponResponseSchema,
  createCouponRequestSchema,
  listCouponsResponseSchema,
  updateCouponRequestSchema,
  validateCouponRequestSchema,
  validateCouponResponseSchema,
} from "./coupons.schema";

const tags = ["Coupons"];

export const validatePublic = createRoute({
  path: "/public/coupons/validate",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(validateCouponRequestSchema, "Validate coupon"),
  },
  summary: "Validate a checkout coupon code",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(validateCouponResponseSchema),
      "Coupon validation result",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNPROCESSABLE_ENTITY, HttpStatusCodes.INTERNAL_SERVER_ERROR],
      validateCouponRequestSchema,
    ),
  },
});

export const list = createRoute({
  path: "/coupons",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.DISCOUNTS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  summary: "List coupon codes",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(listCouponsResponseSchema),
      "List of coupons",
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

export const create = createRoute({
  path: "/coupons",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.DISCOUNTS, operation: OperationType.CREATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(createCouponRequestSchema, "Create coupon"),
  },
  summary: "Create a coupon code",
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(couponResponseSchema),
      "Coupon created",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

export const getOne = createRoute({
  path: "/coupons/:id",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.DISCOUNTS, operation: OperationType.READ },
    ]),
  ] as const,
  request: { headers: jwtHeaderSchema, params: idParams },
  summary: "Get coupon by ID",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(couponResponseSchema),
      "Coupon details",
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
  path: "/coupons/:id",
  method: "patch",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.DISCOUNTS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(updateCouponRequestSchema, "Update coupon"),
  },
  summary: "Update coupon",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(couponResponseSchema),
      "Coupon updated",
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

export const remove = createRoute({
  path: "/coupons/:id",
  method: "delete",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.DISCOUNTS, operation: OperationType.DELETE },
    ]),
  ] as const,
  request: { headers: jwtHeaderSchema, params: idParams },
  summary: "Delete coupon",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "Coupon deleted" },
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

export type ValidatePublicRoute = typeof validatePublic;
export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof update;
export type RemoveRoute = typeof remove;
