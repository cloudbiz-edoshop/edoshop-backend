import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import { EntityType, OperationType } from "@/constants";
import {
  jwtMiddleware,
  rolesAndPermissionsMiddleware,
} from "@/core/middlewares";
import { reviewsSchema } from "@/db/models/reviews";
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

import { createReviewSchema, updateReviewStatusSchema } from "./reviews.schema";

const tags = ["Reviews"];

export const listAll = createRoute({
  method: "get",
  path: "/reviews",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.REVIEWS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    query: commonQueryParamsSchema,
    headers: jwtHeaderSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(z.array(reviewsSchema)),
      "List of reviews",
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

export const list = createRoute({
  method: "get",
  path: "/product/:productId/reviews",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.REVIEWS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    params: z.object({
      productId: z.string(),
    }),
    headers: jwtHeaderSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        z.object({
          reviews: z.array(reviewsSchema),
          averageRating: z.number(),
          totalReviews: z.number(),
        }),
      ),
      "List of reviews for the product",
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

export const getOne = createRoute({
  method: "get",
  path: "/reviews/:id",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.REVIEWS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    params: idParams,
    headers: jwtHeaderSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(reviewsSchema),
      "Review details",
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

export const create = createRoute({
  method: "post",
  path: "/reviews",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.REVIEWS, operation: OperationType.CREATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(createReviewSchema, "Create Review"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(reviewsSchema),
      "Review created successfully",
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

export const updateStatus = createRoute({
  method: "patch",
  path: "/reviews/:id/status",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.REVIEWS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    params: idParams,
    headers: jwtHeaderSchema,
    body: jsonContentRequired(updateReviewStatusSchema, "Update Review Status"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(reviewsSchema),
      "Review status updated successfully",
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
  method: "delete",
  path: "/reviews/:id",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.REVIEWS, operation: OperationType.DELETE },
    ]),
  ] as const,
  request: {
    params: idParams,
    headers: jwtHeaderSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Review deleted successfully",
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

export type ListAllRoute = typeof listAll;
export type ListRoute = typeof list;
export type GetOneRoute = typeof getOne;
export type CreateRoute = typeof create;
export type UpdateStatusRoute = typeof updateStatus;
export type RemoveRoute = typeof remove;
