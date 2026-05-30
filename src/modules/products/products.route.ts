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
import commonQueryParamsSchema from "@/lib/openapi/schemas/query-params-schema";
import { jwtHeaderSchema } from "@/lib/zod-schemas";

import {
  createProductRequestSchema,
  createProductResponseSchema,
  getAllGroupCriteriaTypesResponseSchema,
  getProductResponseSchema,
  paginatedProductsResponseSchema,
  productsQueryParamsSchema,
  updateProductRequestSchema,
} from "./products.schema";

const tags = ["Products"];

export const getAllGroupCriteriaTypes = createRoute({
  path: "/products/group-criteria-types",
  method: "get",
  summary: "Get all group criteria types",
  description: "List all group criteria types",
  tags,
  request: {},
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(getAllGroupCriteriaTypesResponseSchema),
      "List of all group criteria types",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.INTERNAL_SERVER_ERROR],
      z.object({}),
    ),
  },
});

export const list = createRoute({
  path: "/products",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.PRODUCTS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: productsQueryParamsSchema,
  },
  summary: "List products",
  description: "List products with pagination, filtering, and sorting",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      paginatedProductsResponseSchema,
      "List of products",
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
  path: "/products",
  method: "post",
  tags,
  summary: "Create a product",
  description: "Create a product",
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(createProductRequestSchema, "Create Product"),
  },
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.PRODUCTS, operation: OperationType.CREATE },
    ]),
  ] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        createProductResponseSchema,
        "Product created successfully",
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

export const getOne = createRoute({
  path: "/products/{id}",
  method: "get",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.PRODUCTS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  tags,
  summary: "Get product by id",
  description: "Get product by id",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(getProductResponseSchema),
      "Product details",
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
  path: "/products/{id}",
  method: "patch",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.PRODUCTS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(updateProductRequestSchema, "Update product"),
  },
  tags,
  summary: "Update a product",
  description: "Update a product",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(createProductResponseSchema),
      "Product updated successfully",
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

export const removeSelected = createRoute({
  path: "/products",
  method: "delete",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.PRODUCTS, operation: OperationType.DELETE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      z.object({ ids: z.array(z.number()) }),
      "The product IDs to remove",
    ),
  },
  tags,
  summary: "Delete multiple products",
  description: "Delete multiple products by their IDs",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Products removed successfully",
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

export const getAllProductCodes = createRoute({
  path: "/products/codes",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.PRODUCTS, operation: OperationType.READ },
    ]),
  ] as const,
  summary: "Get all product codes",
  description: "Returns all product codes.",
  request: { headers: jwtHeaderSchema },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ codes: z.array(z.string()) }),
      "All product codes",
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

export const getAllProductIds = createRoute({
  path: "/products/ids",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.PRODUCTS, operation: OperationType.READ },
    ]),
  ] as const,
  summary: "Get all product IDs",
  description: "Returns all product IDs.",
  request: { headers: jwtHeaderSchema },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ ids: z.array(z.number()) }),
      "All product IDs",
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

export type GetAllGroupCriteriaTypesRoute = typeof getAllGroupCriteriaTypes;
export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveSelectedRoute = typeof removeSelected;
export type GetAllProductCodesRoute = typeof getAllProductCodes;
export type GetAllProductIdsRoute = typeof getAllProductIds;
