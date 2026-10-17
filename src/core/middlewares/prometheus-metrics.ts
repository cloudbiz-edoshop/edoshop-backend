import type { MiddlewareHandler } from "hono";

import { httpRequestsTotal } from "@/lib/prometheus-metrics";

export const prometheusMetricsMiddleware: MiddlewareHandler = async (c, next) => {
  await next();
  const status = c.res.status.toString();
  httpRequestsTotal.inc({ method: c.req.method, status });
};
