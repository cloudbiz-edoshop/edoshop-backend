import { createRoute } from "@hono/zod-openapi";

import { EntityType, OperationType } from "@/constants";
import {
  jwtMiddleware,
  rolesAndPermissionsMiddleware,
} from "@/core/middlewares";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { commonErrorResponses, jsonContent } from "@/lib/openapi/helpers";
import { createSuccessResponseSchema } from "@/lib/openapi/schemas/create-api-response";
import { jwtHeaderSchema } from "@/lib/zod-schemas";

import {
  dashboardMetricsQuerySchema,
  dashboardMetricsResponseSchema,
} from "./dashboard.schema";

const tags = ["Dashboard"];

export const getMetrics = createRoute({
  path: "/dashboard/metrics",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware(
      [
        { entity: EntityType.EWMS_MANAGEMENT, operation: OperationType.READ },
        { entity: EntityType.ENTRIES, operation: OperationType.READ },
        { entity: EntityType.ORDERS, operation: OperationType.READ },
      ],
      "ANY",
    ),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    query: dashboardMetricsQuerySchema,
  },
  summary: "Get admin dashboard performance metrics",
  description:
    "Returns summary KPIs and weekly trends for warehouse entries, orders, and completed packages",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(dashboardMetricsResponseSchema),
      "Dashboard metrics",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      dashboardMetricsQuerySchema,
    ),
  },
});

export type GetMetricsRoute = typeof getMetrics;
