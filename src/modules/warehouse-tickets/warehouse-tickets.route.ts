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
  confirmTakeoutRequestSchema,
  confirmWarehouseTicketRequestSchema,
  confirmReturnRequestSchema,
  createWarehouseTicketRequestSchema,
  initiateReturnRequestSchema,
  listWarehouseTicketEntryOptionsSchema,
  listWarehouseTicketsResponseSchema,
  prepareWarehouseTicketRequestSchema,
  returnWarehouseTicketRequestSchema,
  ticketActionCommentSchema,
  updateWarehouseTicketRequestSchema,
  updateWarehouseTicketSettingsSchema,
  warehouseTicketResponseSchema,
  warehouseTicketSettingsSchema,
} from "./warehouse-tickets.schema";

const tags = ["Warehouse Tickets"];

export const list = createRoute({
  path: "/warehouse-tickets",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  summary: "List warehouse tickets",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(listWarehouseTicketsResponseSchema),
      "List of warehouse tickets",
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
  path: "/warehouse-tickets",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.CREATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      createWarehouseTicketRequestSchema,
      "Create warehouse ticket",
    ),
  },
  summary: "Create warehouse ticket",
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(
        warehouseTicketResponseSchema,
        "Warehouse ticket created",
      ),
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
  path: "/warehouse-tickets/:id",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  summary: "Get warehouse ticket",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(warehouseTicketResponseSchema),
      "Warehouse ticket details",
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
  path: "/warehouse-tickets/:id",
  method: "patch",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      updateWarehouseTicketRequestSchema,
      "Update warehouse ticket",
    ),
  },
  summary: "Update warehouse ticket",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        warehouseTicketResponseSchema,
        "Warehouse ticket updated",
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export const remove = createRoute({
  path: "/warehouse-tickets/:id",
  method: "delete",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.DELETE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  summary: "Delete warehouse ticket",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Warehouse ticket deleted",
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

export const approve = createRoute({
  path: "/warehouse-tickets/:id/approve",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKET_APPROVER, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  summary: "Approve warehouse ticket",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        warehouseTicketResponseSchema,
        "Warehouse ticket approved",
      ),
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

export const pause = createRoute({
  path: "/warehouse-tickets/:id/pause",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(ticketActionCommentSchema, "Pause comment"),
  },
  summary: "Pause warehouse ticket",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        warehouseTicketResponseSchema,
        "Warehouse ticket paused",
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export const reject = createRoute({
  path: "/warehouse-tickets/:id/reject",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(ticketActionCommentSchema, "Reject comment"),
  },
  summary: "Reject warehouse ticket",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        warehouseTicketResponseSchema,
        "Warehouse ticket rejected",
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export const resume = createRoute({
  path: "/warehouse-tickets/:id/resume",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKET_APPROVER, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  summary: "Resume paused warehouse ticket",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        warehouseTicketResponseSchema,
        "Warehouse ticket resumed",
      ),
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

export const prepare = createRoute({
  path: "/warehouse-tickets/:id/prepare",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      prepareWarehouseTicketRequestSchema,
      "Ticket preparation",
    ),
  },
  summary: "Treat and prepare warehouse ticket items",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        warehouseTicketResponseSchema,
        "Warehouse ticket prepared",
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export const confirmTakeout = createRoute({
  path: "/warehouse-tickets/:id/confirm-takeout",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      confirmTakeoutRequestSchema,
      "Confirm takeout",
    ),
  },
  summary: "Confirm requester takeout after pickup",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        warehouseTicketResponseSchema,
        "Takeout confirmed",
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export const initiateReturn = createRoute({
  path: "/warehouse-tickets/:id/initiate-return",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      initiateReturnRequestSchema,
      "Initiate return",
    ),
  },
  summary: "Requester initiates product return",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        warehouseTicketResponseSchema,
        "Return initiated",
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export const confirmReturn = createRoute({
  path: "/warehouse-tickets/:id/confirm-return",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      confirmReturnRequestSchema,
      "Confirm return",
    ),
  },
  summary: "Warehouse confirms product return",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        warehouseTicketResponseSchema,
        "Return confirmed",
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export const confirm = createRoute({
  path: "/warehouse-tickets/:id/confirm",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      confirmWarehouseTicketRequestSchema,
      "Transfer confirmation",
    ),
  },
  summary: "Confirm warehouse ticket after EWMS transfer",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        warehouseTicketResponseSchema,
        "Warehouse ticket confirmed",
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export const complete = createRoute({
  path: "/warehouse-tickets/:id/complete",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  summary: "Mark warehouse ticket as collected",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        warehouseTicketResponseSchema,
        "Warehouse ticket completed",
      ),
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

export const getSettings = createRoute({
  path: "/warehouse-tickets/settings",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
  },
  summary: "Get warehouse ticket borrow limits",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(warehouseTicketSettingsSchema),
      "Warehouse ticket settings",
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

export const updateSettings = createRoute({
  path: "/warehouse-tickets/settings",
  method: "patch",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKET_BORROW_LIMITS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      updateWarehouseTicketSettingsSchema,
      "Update warehouse ticket settings",
    ),
  },
  summary: "Update warehouse ticket borrow limits",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(warehouseTicketSettingsSchema),
      "Warehouse ticket settings updated",
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

export const searchEntryOptions = createRoute({
  path: "/warehouse-tickets/entry-options",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.CREATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: z.object({
      warehouseId: z.coerce.number().int().positive(),
      search: z.string().optional(),
      limit: z.coerce.number().int().positive().max(50).optional(),
    }),
  },
  summary: "Search EWMS products for warehouse ticket form",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(listWarehouseTicketEntryOptionsSchema),
      "Warehouse ticket entry options",
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

export const returnTicket = createRoute({
  path: "/warehouse-tickets/:id/return",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TICKETING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(
      returnWarehouseTicketRequestSchema,
      "Return borrowed products",
    ),
  },
  summary: "Return borrowed products to EWMS",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        warehouseTicketResponseSchema,
        "Warehouse ticket return recorded",
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      idParams,
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof update;
export type RemoveRoute = typeof remove;
export type ApproveRoute = typeof approve;
export type PauseRoute = typeof pause;
export type RejectRoute = typeof reject;
export type ResumeRoute = typeof resume;
export type ConfirmRoute = typeof confirm;
export type PrepareRoute = typeof prepare;
export type ConfirmTakeoutRoute = typeof confirmTakeout;
export type InitiateReturnRoute = typeof initiateReturn;
export type ConfirmReturnRoute = typeof confirmReturn;
export type CompleteRoute = typeof complete;
export type GetSettingsRoute = typeof getSettings;
export type UpdateSettingsRoute = typeof updateSettings;
export type SearchEntryOptionsRoute = typeof searchEntryOptions;
export type ReturnTicketRoute = typeof returnTicket;
