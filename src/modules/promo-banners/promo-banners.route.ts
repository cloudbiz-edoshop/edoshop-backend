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
  createPromoBannerCardsRequestSchema,
  promoBannerResponseSchema,
  updatePromoBannerCardsRequestSchema,
} from "./promo-banners.schema";

const tags = ["Promo Banners"];

export const list = createRoute({
  path: "/promo-banners",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.PROMOTIONS, operation: OperationType.READ },
    ]),
  ] as const,
  request: { headers: jwtHeaderSchema, query: commonQueryParamsSchema },
  summary: "List promo banners",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(
        z.array(promoBannerResponseSchema),
      ),
      "Promo banners",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      commonQueryParamsSchema,
    ),
  },
});

export const create = createRoute({
  path: "/promo-banners",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.PROMOTIONS, operation: OperationType.CREATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(createPromoBannerCardsRequestSchema, "Promo banner"),
  },
  summary: "Create promo banner",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(promoBannerResponseSchema),
      "Created promo banner",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      z.object({}),
    ),
  },
});

export const getOne = createRoute({
  path: "/promo-banners/{id}",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.PROMOTIONS, operation: OperationType.READ },
    ]),
  ] as const,
  request: { headers: jwtHeaderSchema, params: idParams },
  summary: "Get promo banner",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(promoBannerResponseSchema),
      "Promo banner",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.NOT_FOUND],
      idParams,
    ),
  },
});

export const patch = createRoute({
  path: "/promo-banners/{id}",
  method: "patch",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.PROMOTIONS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(updatePromoBannerCardsRequestSchema, "Promo banner"),
  },
  summary: "Update promo banner",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(promoBannerResponseSchema),
      "Updated promo banner",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.NOT_FOUND],
      idParams,
    ),
  },
});

export const removeSelected = createRoute({
  path: "/promo-banners",
  method: "delete",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.PROMOTIONS, operation: OperationType.DELETE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(z.object({ ids: z.array(z.number()) }), "IDs"),
  },
  summary: "Delete promo banners",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "Deleted" },
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      z.object({}),
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveSelectedRoute = typeof removeSelected;
