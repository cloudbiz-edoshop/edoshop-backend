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
import { jwtHeaderSchema } from "@/lib/zod-schemas";

import {
  createOngoingGroupRequestSchema,
  ongoingGroupRequestResponseSchema,
  ongoingGroupRequestsQueryParamsSchema,
  paginatedOngoingGroupRequestsResponseSchema,
  patchOngoingGroupRequestSchema,
} from "./ongoing-groups.schema";

const tags = ["Ongoing Group Requests"];

export const list = createRoute({
  path: "/ongoing-group-requests",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ONGOING_GROUP_REQUESTS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: ongoingGroupRequestsQueryParamsSchema,
  },
  summary: "List ongoing group requests",
  description: "List ongoing group requests with pagination, filtering, and sorting",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      paginatedOngoingGroupRequestsResponseSchema,
      "List of ongoing group requests",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      ongoingGroupRequestsQueryParamsSchema,
    ),
  },
});

export const create = createRoute({
  path: "/ongoing-group-requests",
  method: "post",
  tags,
  summary: "Create an ongoing group request",
  description: "Create a new ongoing group request for a specific product variant",
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(createOngoingGroupRequestSchema, "Create Ongoing Group Request"),
  },
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ONGOING_GROUP_REQUESTS, operation: OperationType.CREATE },
    ]),
  ] as const,
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(
        ongoingGroupRequestResponseSchema,
        "Ongoing group request created successfully",
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.CONFLICT,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

export const getOne = createRoute({
  path: "/ongoing-group-requests/{id}",
  method: "get",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ONGOING_GROUP_REQUESTS, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  tags,
  summary: "Get ongoing group request by id",
  description: "Get ongoing group request details by ID",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(ongoingGroupRequestResponseSchema),
      "Ongoing group request details",
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
  path: "/ongoing-group-requests/{id}",
  method: "patch",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ONGOING_GROUP_REQUESTS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(patchOngoingGroupRequestSchema, "Approve or reject ongoing group request"),
  },
  tags,
  summary: "Approve or reject an ongoing group request",
  description: "Approve or reject an ongoing group request. Only approvalStatusId and reasonForRejection are allowed.",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(ongoingGroupRequestResponseSchema),
      "Ongoing group request updated successfully",
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

export const remove = createRoute({
  path: "/ongoing-group-requests/{id}",
  method: "delete",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ONGOING_GROUP_REQUESTS, operation: OperationType.DELETE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  tags,
  summary: "Delete an ongoing group request",
  description: "Delete an ongoing group request by ID",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        data: z.null(),
      }),
      "Ongoing group request deleted successfully",
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

export const undo = createRoute({
  path: "/ongoing-group-requests/{id}/undo",
  method: "post",
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ONGOING_GROUP_REQUESTS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  tags,
  summary: "Undo approval or rejection of an ongoing group request",
  description: "Revert an approved or rejected ongoing group request back to pending status",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(ongoingGroupRequestResponseSchema),
      "Ongoing group request status reverted to pending successfully",
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

export const ongoingRequestsByUser = createRoute({
  path: "/ongoing-requests/all",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
  },
  summary: "List all ongoing groups and requests of the current user",
  description: "List all ongoing groups and requests where the current user is creator, approver, rejector, or requester.",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        requests: z.array(ongoingGroupRequestResponseSchema),
      }),
      "List of ongoing groups and requests for the user",
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

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type UndoRoute = typeof undo;
export type OngoingRequestsByUserRoute = typeof ongoingRequestsByUser;
