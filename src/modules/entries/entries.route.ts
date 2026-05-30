import { createRoute, z } from "@hono/zod-openapi";

import { EntityType } from "@/constants/entities.constants";
import { OperationType } from "@/constants/operations.constants";
import { jwtMiddleware } from "@/core/middlewares";
import { rolesAndPermissionsMiddleware } from "@/core/middlewares/roles-and-permissions";
import { entryStateSchema } from "@/db/models/entry-states";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import {
  commonErrorResponses,
  jsonContent,
  jsonContentRequired,
} from "@/lib/openapi/helpers";
import { idParams } from "@/lib/openapi/schemas";
import {
  createSuccessResponseSchema,
  createSuccessResponseSchemaWithPagination,
} from "@/lib/openapi/schemas/create-api-response";
import { jwtHeaderSchema } from "@/lib/zod-schemas/common-schemas";

import {
  createEntriesRequestSchema,
  entriesQueryParamsSchema,
  entryResponseSchema,
  getAllEntryTypesResponseSchema,
  updateEntriesRequestSchema,
} from "./entries.schema";

const tags = ["Entries"];

export const getAllEntryTypes = createRoute({
  path: "/entries/entry-types",
  method: "get",
  summary: "List all entry types",
  description: "List all entry types",
  tags,
  request: {},
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(getAllEntryTypesResponseSchema),
      "The list of all entry types",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.INTERNAL_SERVER_ERROR],
      z.object({}),
    ),
  },
});

export const createEntryRoute = createRoute({
  path: "/entries",
  method: "post",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.CREATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      createEntriesRequestSchema,
      "The entry to create",
    ),
  },
  tags,
  summary: "Create an entry",
  description: "Create an entry",
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(entryResponseSchema),
      "The created entry",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.CONFLICT,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      createEntriesRequestSchema,
    ),
  },
});

export const updateEntryRoute = createRoute({
  path: "/entries/:id",
  method: "patch",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.UPDATE },
    ]),
  ] as const,
  summary: "Update an entry",
  description: "Update an existing entry",
  tags,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(updateEntriesRequestSchema, "Update product"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(entryResponseSchema),
      "Entry updated successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      updateEntriesRequestSchema,
    ),
  },
});

export const deleteEntryRoute = createRoute({
  path: "/entries",
  method: "delete",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.DELETE },
    ]),
  ] as const,
  summary: "Delete an entry",
  description: "Delete an entry by ID",
  tags,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      z.object({ ids: z.array(z.number()) }),
      "The product IDs to remove",
    ),
  },

  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Products removed successfully",
    },
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

export const list = createRoute({
  path: "/entries",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: entriesQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(z.array(entryResponseSchema)),
      "The list of entries",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      entriesQueryParamsSchema,
    ),
  },
});

export const getEntriesByType = createRoute({
  path: "/entries/type/:entryTypeId",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: z.object({
      entryTypeId: z.string(),
    }),
    query: entriesQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(z.array(entryResponseSchema)),
      "User entries by type",
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

export const getAllEntryStatesRoute = createRoute({
  path: "/entries/entry-states",
  method: "get",
  summary: "List all entry states",
  description: "List all entry states",
  tags: ["Entries"],
  request: {},
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(entryStateSchema),
      "The list of all entry states",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.INTERNAL_SERVER_ERROR],
      z.object({}),
    ),
  },
});

export const getAllBundleIds = createRoute({
  path: "/entries/bundles/ids",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.READ },
    ]),
  ] as const,
  summary: "Get all bundle IDs",
  description: "Returns all bundle IDs.",
  request: { headers: jwtHeaderSchema },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        ids: z.array(
          z.object({
            id: z.number(),
            bundleCode: z.string(),
          }),
        ),
      }),
      "All bundle IDs",
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

export const getAllSeriesIds = createRoute({
  path: "/entries/series/ids",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.READ },
    ]),
  ] as const,
  summary: "Get all series IDs",
  description: "Returns all series IDs.",
  request: { headers: jwtHeaderSchema },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        ids: z.array(
          z.object({
            id: z.number(),
            seriesCode: z.string(),
          }),
        ),
      }),
      "All series IDs",
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

export const getAllItemIds = createRoute({
  path: "/entries/items/ids",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.READ },
    ]),
  ] as const,
  summary: "Get all item IDs",
  description: "Returns all item IDs.",
  request: { headers: jwtHeaderSchema },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        ids: z.array(
          z.object({
            id: z.number(),
            itemCode: z.string(),
          }),
        ),
      }),
      "All item IDs",
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

export const getAllPackageIds = createRoute({
  path: "/entries/packages/ids",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.READ },
    ]),
  ] as const,
  summary: "Get all Package IDs",
  description: "Returns all Package IDs.",
  request: { headers: jwtHeaderSchema },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        ids: z.array(
          z.object({
            id: z.number(),
            packageCode: z.string(),
          }),
        ),
      }),
      "All Package IDs",
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

export type GetAllEntryTypesRoute = typeof getAllEntryTypes;
export type CreateEntryRoute = typeof createEntryRoute;
export type UpdateEntryRoute = typeof updateEntryRoute;
export type DeleteEntryRoute = typeof deleteEntryRoute;
export type ListRoute = typeof list;
export type GetEntriesByTypeRoute = typeof getEntriesByType;
export type GetAllEntryStatesRoute = typeof getAllEntryStatesRoute;
export type GetAllBundleIdsRoute = typeof getAllBundleIds;
export type GetAllSeriesIdsRoute = typeof getAllSeriesIds;
export type GetAllItemIdsRoute = typeof getAllItemIds;
export type GetAllPackageIdsRoute = typeof getAllPackageIds;
