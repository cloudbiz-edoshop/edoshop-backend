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
import { idParams } from "@/lib/openapi/schemas";

import { createSuccessResponseSchema, createSuccessResponseSchemaWithPagination } from "@/lib/openapi/schemas/create-api-response";
import commonQueryParamsSchema from "@/lib/openapi/schemas/query-params-schema";
import { jwtHeaderSchema } from "@/lib/zod-schemas";
import { createBinsRequestSchema, createBinsResponseSchema, createRayonsRequestSchema, createShelvesForRayonResponseSchema, createShelvesForRayonsRequestSchema, getAllShelvesForRayonResponseSchema, getRayonsForWarehouseResponseSchema, getRayonsStatsForAWarehouseResponseSchema, updateBinsRequestSchema, updateBinsResponseSchema, updateRayonRequestSchema, updateRayonResponseSchema, updateShelvesRequestSchema, updateShelvesResponseSchema } from "./rayons.schema";

const tags = ["Rayons"];

export const getRayonsStatsForAWarehouse = createRoute({
  path: "/rayons/stats/{warehouseId}",
  method: "get",
  tags,
  summary: "List rayons with stats for a warehouse",
  description:
    "List all rayons with their shelves and bins for a given warehouse",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.WAREHOUSE_TRANSFERS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
    params: z.object({
      warehouseId: z.coerce.number().openapi({
        param: {
          name: "warehouseId",
          in: "path",
          required: true,
        },
        required: ["warehouseId"],
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(getRayonsStatsForAWarehouseResponseSchema),
      "The list of rayons with stats for the warehouse",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        HttpStatusCodes.NOT_FOUND,
      ],
      commonQueryParamsSchema,
    ),
  },
});

export type GetRayonsStatsForAWarehouseRoute = typeof getRayonsStatsForAWarehouse;

export const getRayonsForWarehouse = createRoute({
  path: "/rayons/{warehouseId}",
  method: "get",
  tags,
  summary: "List rayons for a warehouse",
  description:
    "List all rayons for a given warehouse",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.WAREHOUSE_TRANSFERS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
    params: z.object({
      warehouseId: z.coerce.number().openapi({
        param: {
          name: "warehouseId",
          in: "path",
          required: true,
        },
        required: ["warehouseId"],
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(getRayonsForWarehouseResponseSchema),
      "The list of rayons for the warehouse",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        HttpStatusCodes.NOT_FOUND,
      ],
      commonQueryParamsSchema,
    ),
  },
});

export type GetRayonsForWarehouseRoute = typeof getRayonsForWarehouse;

export const createRayonsForWarehouse = createRoute({
  path: "/rayons/{warehouseId}",
  method: "post",
  tags,
  summary: "Create rayons for a warehouse",
  description:
    "Create all rayons for a given warehouse",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.WAREHOUSE_TRANSFERS, operation: OperationType.CREATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: z.object({
      warehouseId: z.coerce.number().openapi({
        param: {
          name: "warehouseId",
          in: "path",
          required: true,
        },
        required: ["warehouseId"],
      }),
    }),
    body: jsonContentRequired(
      createRayonsRequestSchema,
      "The rayons to create",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(getRayonsForWarehouseResponseSchema),
      "The list of created rayons for the warehouse",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        HttpStatusCodes.NOT_FOUND,
      ],
      createRayonsRequestSchema,
    ),
  },
});
export type CreateRayonsForWarehouseRoute = typeof createRayonsForWarehouse;

export const createShelvesForRayon = createRoute({
  path: "/rayons/shelves",
  method: "post",
  tags,
  summary: "Create shelves for a rayon",
  description:
    "Create shelves for a given rayon",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.WAREHOUSE_TRANSFERS, operation: OperationType.CREATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      createShelvesForRayonsRequestSchema,
      "The shelves to create",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(createShelvesForRayonResponseSchema),
      "The created shelf for the rayon",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        HttpStatusCodes.NOT_FOUND,
      ],
      createShelvesForRayonsRequestSchema,
    ),
  },
});
export type CreateShelvesForRayonRoute = typeof createShelvesForRayon;

export const createBinsForShelf = createRoute({
  path: "/rayons/bins",
  method: "post",
  tags,
  summary: "Create bins for a shelf",
  description:
    "Create bins for a given shelf",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.WAREHOUSE_TRANSFERS, operation: OperationType.CREATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      createBinsRequestSchema,
      "The bins to create",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(createBinsResponseSchema),
      "The created bin for the shelf",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        HttpStatusCodes.NOT_FOUND,
      ],
      createBinsRequestSchema,
    ),
  },
});
export type CreateBinsForShelfRoute = typeof createBinsForShelf;

export const getAllShelvesForRayon = createRoute({
  path: "/rayons/{id}/shelves",
  method: "get",
  tags,
  summary: "Get all shelves for a rayon",
  description:
    "Get all shelves for a given rayon",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.WAREHOUSE_TRANSFERS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    query: commonQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(getAllShelvesForRayonResponseSchema),
      "The list of shelves for the rayon",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        HttpStatusCodes.NOT_FOUND,
      ],
      commonQueryParamsSchema,
    ),
  },
});
export type GetAllShelvesForRayonRoute = typeof getAllShelvesForRayon;

export const updateRayonForWarehouse = createRoute({
  path: "/rayons/{id}",
  method: "put",
  tags,
  summary: "Update a rayon for a warehouse",
  description:
    "Update a rayon for a given warehouse",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.WAREHOUSE_TRANSFERS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      updateRayonRequestSchema,
      "The updated rayon data",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(updateRayonResponseSchema),
      "The updated rayon",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        HttpStatusCodes.NOT_FOUND,
      ],
      updateRayonRequestSchema,
    ),
  },
});
export type UpdateRayonForWarehouseRoute = typeof updateRayonForWarehouse;

export const updateShelvesForRayon = createRoute({
  path: "/rayons/shelves/{id}",
  method: "patch",
  tags,
  summary: "Update shelves for a rayon",
  description:
    "Update shelves for a given rayon",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.WAREHOUSE_TRANSFERS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      updateShelvesRequestSchema,
      "The updated shelves data",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(updateShelvesResponseSchema),
      "The updated shelves",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        HttpStatusCodes.NOT_FOUND,
      ],
      updateShelvesRequestSchema,
    ),
  },
});
export type UpdateShelvesForRayonRoute = typeof updateShelvesForRayon;

export const updateBinsForShelf = createRoute({
  path: "/rayons/bins/{id}",
  method: "patch",
  tags,
  summary: "Update bins for a shelf",
  description:
    "Update bins for a given shelf",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.WAREHOUSE_TRANSFERS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      updateBinsRequestSchema,
      "The updated bins data",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(updateBinsResponseSchema),
      "The updated bins",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        HttpStatusCodes.NOT_FOUND,
      ],
      updateBinsRequestSchema,
    ),
  },
});
export type UpdateBinsForShelfRoute = typeof updateBinsForShelf;
