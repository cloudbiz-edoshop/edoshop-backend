import type { MiddlewareHandler } from "hono";

import { createRoute } from "@hono/zod-openapi";
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
import { z } from "@hono/zod-openapi";

import {
  addGroupPackageMembersRequestSchema,
  createGroupPackageRequestSchema,
  dispatchGroupPackageRequestSchema,
  dispatchGroupPackageResponseSchema,
  dispatchReadyGroupSchema,
  groupPackageResponseSchema,
} from "./group-packages.schema";

const tags = ["Group Packages"];

const acl = (
  entity: EntityType,
  operation: OperationType,
): [MiddlewareHandler, MiddlewareHandler] => [
  jwtMiddleware(),
  rolesAndPermissionsMiddleware([{ entity, operation }]),
];

export const listGroupPackages = createRoute({
  path: "/group-packages",
  method: "get",
  tags,
  middleware: acl(EntityType.WAREHOUSE_2, OperationType.READ),
  summary: "List group packages",
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(
        z.array(groupPackageResponseSchema),
        "Group packages fetched successfully",
      ),
      "Group packages fetched successfully",
    ),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.INTERNAL_SERVER_ERROR], groupPackageResponseSchema),
  },
});

export const getGroupPackage = createRoute({
  path: "/group-packages/{id}",
  method: "get",
  tags,
  middleware: acl(EntityType.WAREHOUSE_2, OperationType.READ),
  summary: "Get group package details",
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(groupPackageResponseSchema, "Group package fetched successfully"),
      "Group package fetched successfully",
    ),
    ...commonErrorResponses([HttpStatusCodes.NOT_FOUND, HttpStatusCodes.UNAUTHORIZED], groupPackageResponseSchema),
  },
});

export const createGroupPackage = createRoute({
  path: "/group-packages",
  method: "post",
  tags,
  middleware: acl(EntityType.WAREHOUSE_2, OperationType.CREATE),
  summary: "Create a group package",
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(createGroupPackageRequestSchema, "Create group package"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(groupPackageResponseSchema, "Group package created successfully"),
      "Group package created successfully",
    ),
    ...commonErrorResponses([HttpStatusCodes.BAD_REQUEST, HttpStatusCodes.UNAUTHORIZED], createGroupPackageRequestSchema),
  },
});

export const addGroupPackageMembers = createRoute({
  path: "/group-packages/{id}/members",
  method: "post",
  tags,
  middleware: acl(EntityType.WAREHOUSE_2, OperationType.UPDATE),
  summary: "Add packages or nested groups to a group package",
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(addGroupPackageMembersRequestSchema, "Add group members"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(groupPackageResponseSchema, "Group members added successfully"),
      "Group members added successfully",
    ),
    ...commonErrorResponses([HttpStatusCodes.BAD_REQUEST, HttpStatusCodes.NOT_FOUND, HttpStatusCodes.UNAUTHORIZED], groupPackageResponseSchema),
  },
});

export const removeGroupPackageMember = createRoute({
  path: "/group-packages/{id}/members/{memberId}",
  method: "delete",
  tags,
  middleware: acl(EntityType.WAREHOUSE_2, OperationType.UPDATE),
  summary: "Remove a package or nested group from a group package",
  request: {
    headers: jwtHeaderSchema,
    params: idParams.extend({ memberId: z.coerce.number().int().positive() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(groupPackageResponseSchema, "Group member removed successfully"),
      "Group member removed successfully",
    ),
    ...commonErrorResponses([HttpStatusCodes.BAD_REQUEST, HttpStatusCodes.NOT_FOUND, HttpStatusCodes.UNAUTHORIZED], groupPackageResponseSchema),
  },
});

export const listAvailablePackages = createRoute({
  path: "/group-packages/available/packages",
  method: "get",
  tags,
  middleware: acl(EntityType.WAREHOUSE_2, OperationType.READ),
  summary: "List packages available for grouping",
  request: {
    headers: jwtHeaderSchema,
    query: z.object({
      destinationArea: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        z.array(z.object({
          id: z.number(),
          packageCode: z.string(),
          customerCode: z.string(),
          destination: z.string(),
          packageWeight: z.string(),
          binLocation: z.string(),
          receivedAt: z.string().nullable(),
        })),
        "Available packages fetched successfully",
      ),
      "Available packages fetched successfully",
    ),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED], groupPackageResponseSchema),
  },
});

export const listAvailableGroups = createRoute({
  path: "/group-packages/available/groups",
  method: "get",
  tags,
  middleware: acl(EntityType.WAREHOUSE_2, OperationType.READ),
  summary: "List group packages available for nesting",
  request: {
    headers: jwtHeaderSchema,
    query: z.object({
      destinationArea: z.string().optional(),
      excludeGroupId: z.coerce.number().int().positive().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        z.array(z.object({
          id: z.number(),
          groupPackageCode: z.string(),
          destinationArea: z.string(),
          status: z.string(),
        })),
        "Available group packages fetched successfully",
      ),
      "Available group packages fetched successfully",
    ),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED], groupPackageResponseSchema),
  },
});

export const printGroupPackageLabel = createRoute({
  path: "/group-packages/{id}/print-label",
  method: "get",
  tags,
  middleware: acl(EntityType.WAREHOUSE_2, OperationType.UPDATE),
  summary: "Generate group package label PDF",
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Group package label PDF generated successfully",
      content: {
        "application/pdf": {
          schema: {
            type: "string",
            format: "binary",
          },
        },
      },
    },
    ...commonErrorResponses([HttpStatusCodes.NOT_FOUND, HttpStatusCodes.UNAUTHORIZED], groupPackageResponseSchema),
  },
});

export const listDispatchReadyGroups = createRoute({
  path: "/group-packages/dispatch-ready",
  method: "get",
  tags,
  middleware: acl(EntityType.WAREHOUSE_2, OperationType.READ),
  summary: "List group packages ready for dispatch",
  request: {
    headers: jwtHeaderSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        z.array(dispatchReadyGroupSchema),
        "Dispatch-ready group packages fetched successfully",
      ),
      "Dispatch-ready group packages fetched successfully",
    ),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED], groupPackageResponseSchema),
  },
});

export const dispatchGroupPackage = createRoute({
  path: "/group-packages/{id}/dispatch",
  method: "post",
  tags,
  middleware: acl(EntityType.WAREHOUSE_2, OperationType.UPDATE),
  summary: "Dispatch a group package and all member packages",
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(dispatchGroupPackageRequestSchema, "Dispatch group package"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        dispatchGroupPackageResponseSchema,
        "Group package dispatched successfully",
      ),
      "Group package dispatched successfully",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.BAD_REQUEST, HttpStatusCodes.NOT_FOUND, HttpStatusCodes.UNAUTHORIZED],
      groupPackageResponseSchema,
    ),
  },
});

export type ListGroupPackagesRoute = typeof listGroupPackages;
export type GetGroupPackageRoute = typeof getGroupPackage;
export type CreateGroupPackageRoute = typeof createGroupPackage;
export type AddGroupPackageMembersRoute = typeof addGroupPackageMembers;
export type RemoveGroupPackageMemberRoute = typeof removeGroupPackageMember;
export type ListAvailablePackagesRoute = typeof listAvailablePackages;
export type ListAvailableGroupsRoute = typeof listAvailableGroups;
export type PrintGroupPackageLabelRoute = typeof printGroupPackageLabel;
export type ListDispatchReadyGroupsRoute = typeof listDispatchReadyGroups;
export type DispatchGroupPackageRoute = typeof dispatchGroupPackage;
