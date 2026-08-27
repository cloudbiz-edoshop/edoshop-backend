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
  createTermsRequestSchema,
  createTermsResponseSchema,
  getTermsResponseSchema,
  listTermsResponseSchema,
  publicTermsResponseSchema,
  termsLanguageQuerySchema,
  updateTermsRequestSchema,
} from "./terms.schema";

const tags = ["Terms"];

export const list = createRoute({
  path: "/terms",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TERMS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  summary: "List terms documents",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(listTermsResponseSchema),
      "The list of terms documents",
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

export const getDefaults = createRoute({
  path: "/terms/defaults",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TERMS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: termsLanguageQuerySchema,
  },
  summary: "Get default terms content for a language",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(createTermsRequestSchema),
      "Default terms content",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      termsLanguageQuerySchema,
    ),
  },
});

export const create = createRoute({
  path: "/terms",
  method: "post",
  tags,
  summary: "Create terms document",
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(createTermsRequestSchema, "Create Terms"),
  },
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TERMS, operation: OperationType.CREATE },
    ]),
  ] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        createTermsResponseSchema,
        "Terms created successfully",
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
  path: "/terms/{id}",
  method: "get",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TERMS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  summary: "Get terms document by id",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(getTermsResponseSchema),
      "The terms document",
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
  path: "/terms/{id}",
  method: "patch",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TERMS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(updateTermsRequestSchema, "The terms to update"),
  },
  tags,
  summary: "Update terms document",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(createTermsResponseSchema),
      "The updated terms document",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
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

export const removeSelected = createRoute({
  path: "/terms",
  method: "delete",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TERMS, operation: OperationType.DELETE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      z.object({
        ids: z.array(z.number()),
      }),
      "The terms IDs to remove",
    ),
  },
  tags,
  summary: "Delete multiple terms documents",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Terms removed successfully",
    },
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

export const getPublic = createRoute({
  path: "/public/terms",
  method: "get",
  tags: ["Public Storefront"],
  request: {
    query: termsLanguageQuerySchema,
  },
  summary: "Get public terms and conditions",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(publicTermsResponseSchema),
      "Public terms and conditions",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNPROCESSABLE_ENTITY, HttpStatusCodes.INTERNAL_SERVER_ERROR],
      termsLanguageQuerySchema,
    ),
  },
});

export type ListRoute = typeof list;
export type GetDefaultsRoute = typeof getDefaults;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveSelectedRoute = typeof removeSelected;
export type GetPublicRoute = typeof getPublic;
