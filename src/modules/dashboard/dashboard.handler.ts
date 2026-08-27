import type { GetMetricsRoute } from "./dashboard.route";
import type { AppRouteHandler } from "@/lib/types";

import { successResponse } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";

import { DashboardService } from "./dashboard.service";

const dashboardService = new DashboardService();

export const getMetrics: AppRouteHandler<GetMetricsRoute> = async (c) => {
  const { weeks, from, to } = c.req.valid("query");

  const metrics = await dashboardService.getMetrics({ weeks, from, to });

  return c.json(
    successResponse(metrics, "Dashboard metrics retrieved successfully"),
    HttpStatusCodes.OK,
  );
};
