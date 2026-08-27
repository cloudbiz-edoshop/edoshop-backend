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
  createAboutUsRequestSchema,
  createAboutUsResponseSchema,
  getAboutUsResponseSchema,
  listAboutUsResponseSchema,
  aboutUsDefaultsQuerySchema,
  aboutUsDefaultsResponseSchema,
  seedAboutUsDefaultsResponseSchema,
  updateAboutUsRequestSchema,
} from "./about-us.schema";

const tags = ["AboutUs"];

export const list = createRoute({
  path: "/aboutUs",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ABOUT_US, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  summary: "List aboutUs",
  description: "List aboutUs with pagination, filtering, and sorting",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(listAboutUsResponseSchema),
      "The list of aboutUs",
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
  path: "/aboutUs",
  method: "post",
  tags,
  summary: "Create a aboutUs",
  description: "Create a aboutUs",
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(createAboutUsRequestSchema, "Create AboutUs"),
  },
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ABOUT_US, operation: OperationType.CREATE },
    ]),
  ] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        createAboutUsResponseSchema,
        "AboutUs created successfully",
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
  path: "/aboutUs/{id}",
  method: "get",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ABOUT_US, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  summary: "Get a aboutUs by id",
  description: "Get a aboutUs by id",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(getAboutUsResponseSchema),
      "The aboutUs",
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
  path: "/aboutUs/{id}",
  method: "patch",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ABOUT_US, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      updateAboutUsRequestSchema,
      "The aboutUs to update",
    ),
  },
  tags,
  summary: "Update a aboutUs",
  description: "Update a aboutUs",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(createAboutUsResponseSchema),
      "The updated aboutUs",
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
  path: "/aboutUs",
  method: "delete",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ABOUT_US, operation: OperationType.DELETE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      z.object({
        ids: z.array(z.number()),
      }),
      "The aboutUs IDs to remove",
    ),
  },
  tags,
  summary: "Delete multiple aboutUs",
  description: "Delete multiple aboutUs by their IDs",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "AboutUs removed successfully",
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

export const getDefaults = createRoute({
  path: "/aboutUs/defaults",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ABOUT_US, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: aboutUsDefaultsQuerySchema,
  },
  summary: "Get default About Us section templates",
  description:
    "Returns the current storefront static About Us sections as editable templates",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(aboutUsDefaultsResponseSchema),
      "Default About Us section templates",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      aboutUsDefaultsQuerySchema,
    ),
  },
});

export const seedDefaults = createRoute({
  path: "/aboutUs/seed-defaults",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ABOUT_US, operation: OperationType.CREATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
  },
  summary: "Import default About Us sections",
  description:
    "Creates all three default About Us sections when none exist yet",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        seedAboutUsDefaultsResponseSchema,
        "Default About Us sections imported successfully",
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

export type ListRoute = typeof list;
export type GetDefaultsRoute = typeof getDefaults;
export type SeedDefaultsRoute = typeof seedDefaults;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveSelectedRoute = typeof removeSelected;
