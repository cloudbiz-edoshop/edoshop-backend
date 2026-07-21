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
  assignOrdersToBundleRequestSchema,
  createKiloBillRequestSchema,
  createTrackingBundleRequestSchema,
  kiloBillSchema,
  searchOrderForBundleSchema,
  trackingBundleDetailSchema,
  trackingBundleSchema,
  trackedOrderRowSchema,
  trackedOrderDetailSchema,
  updateTrackedOrderStepRequestSchema,
  trackingStepSchema,
  updateBundleStepRequestSchema,
  updateTrackingBundleRequestSchema,
} from "./tracking-bundles.schema";

const tags = ["Tracking Bundles"];

export const listSteps = createRoute({
  path: "/tracking-bundles/steps",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.READ },
    ]),
  ] as const,
  request: { headers: jwtHeaderSchema },
  summary: "List tracking steps",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(z.array(trackingStepSchema)),
      "Tracking steps",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      z.object({}),
    ),
  },
});

export const list = createRoute({
  path: "/tracking-bundles",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  summary: "List tracking bundles",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(z.array(trackingBundleSchema)),
      "Tracking bundles",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      commonQueryParamsSchema,
    ),
  },
});

export const listTrackedOrders = createRoute({
  path: "/tracking-bundles/tracked-orders",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  summary: "List tracked customer orders",
  description: "Returns customer orders linked to supplier bundles with bundle and order-leg tracking steps.",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(z.array(trackedOrderRowSchema)),
      "Tracked orders",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      commonQueryParamsSchema,
    ),
  },
});

export const getTrackedOrder = createRoute({
  path: "/tracking-bundles/tracked-orders/{orderId}",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: z.object({
      orderId: z.coerce.number().openapi({
        param: { name: "orderId", in: "path", required: true },
      }),
    }),
  },
  summary: "Get tracked dropshipping order detail",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(trackedOrderDetailSchema),
      "Tracked order detail",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.NOT_FOUND],
      z.object({ orderId: z.coerce.number() }),
    ),
  },
});

export const updateTrackedOrderStep = createRoute({
  path: "/tracking-bundles/tracked-orders/{orderId}/step",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: z.object({
      orderId: z.coerce.number().openapi({
        param: { name: "orderId", in: "path", required: true },
      }),
    }),
    body: jsonContentRequired(updateTrackedOrderStepRequestSchema, "Update tracked order step"),
  },
  summary: "Update dropshipping order-leg tracking step",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(trackedOrderDetailSchema),
      "Tracked order updated",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.NOT_FOUND, HttpStatusCodes.BAD_REQUEST],
      z.object({ orderId: z.coerce.number() }),
    ),
  },
});

export const create = createRoute({
  path: "/tracking-bundles",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.CREATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(createTrackingBundleRequestSchema, "Create bundle"),
  },
  summary: "Create tracking bundle",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(trackingBundleDetailSchema),
      "Created bundle",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.BAD_REQUEST],
      z.object({}),
    ),
  },
});

export const getOne = createRoute({
  path: "/tracking-bundles/{id}",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  summary: "Get tracking bundle detail",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(trackingBundleDetailSchema),
      "Bundle detail",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.NOT_FOUND],
      idParams,
    ),
  },
});

export const patch = createRoute({
  path: "/tracking-bundles/{id}",
  method: "patch",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(updateTrackingBundleRequestSchema, "Update bundle"),
  },
  summary: "Update tracking bundle",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(trackingBundleDetailSchema),
      "Updated bundle",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.NOT_FOUND],
      idParams,
    ),
  },
});

export const searchOrder = createRoute({
  path: "/tracking-bundles/search-order",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: z.object({
      orderCode: z.string().min(1),
    }),
  },
  summary: "Search order for bundle assignment",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(searchOrderForBundleSchema),
      "Order search result",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.NOT_FOUND],
      z.object({ orderCode: z.string() }),
    ),
  },
});

export const assignOrders = createRoute({
  path: "/tracking-bundles/{id}/orders",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(assignOrdersToBundleRequestSchema, "Assign orders"),
  },
  summary: "Assign orders to bundle",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(z.object({
        bundle: trackingBundleDetailSchema,
        assigned: z.array(z.any()),
        missing: z.array(z.string()),
      })),
      "Assigned orders",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.BAD_REQUEST],
      idParams,
    ),
  },
});

export const removeOrder = createRoute({
  path: "/tracking-bundles/{id}/orders/{orderId}",
  method: "delete",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams.extend({ orderId: z.coerce.number() }),
  },
  summary: "Remove order from bundle",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(trackingBundleDetailSchema),
      "Order removed",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.NOT_FOUND],
      idParams,
    ),
  },
});

export const updateStep = createRoute({
  path: "/tracking-bundles/{id}/step",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(updateBundleStepRequestSchema, "Update step"),
  },
  summary: "Update bundle tracking step",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(trackingBundleDetailSchema),
      "Step updated",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.BAD_REQUEST],
      idParams,
    ),
  },
});

export const undoLastStep = createRoute({
  path: "/tracking-bundles/{id}/step",
  method: "delete",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
  },
  summary: "Undo the last manual bundle tracking step",
  description: "Removes the most recent manual tracking step (steps 4-6) and reverts the bundle to the previous step.",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(trackingBundleDetailSchema),
      "Last step undone",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.BAD_REQUEST],
      idParams,
    ),
  },
});

export const createKiloBill = createRoute({
  path: "/tracking-bundles/{id}/kilo-bills",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TRACKING, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(createKiloBillRequestSchema, "Create kilo bill"),
  },
  summary: "Create kilo bill for an order in a tracked bundle",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(kiloBillSchema),
      "Kilo bill created",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.BAD_REQUEST],
      idParams,
    ),
  },
});

export type ListStepsRoute = typeof listSteps;
export type ListRoute = typeof list;
export type ListTrackedOrdersRoute = typeof listTrackedOrders;
export type GetTrackedOrderRoute = typeof getTrackedOrder;
export type UpdateTrackedOrderStepRoute = typeof updateTrackedOrderStep;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type SearchOrderRoute = typeof searchOrder;
export type AssignOrdersRoute = typeof assignOrders;
export type RemoveOrderRoute = typeof removeOrder;
export type UpdateStepRoute = typeof updateStep;
export type UndoLastStepRoute = typeof undoLastStep;
export type CreateKiloBillRoute = typeof createKiloBill;
