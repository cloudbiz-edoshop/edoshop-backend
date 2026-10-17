import { env } from "@/config";
import {
  buildObservabilityLog,
  classifyRouteCategory,
  severityForHttpStatus,
} from "@/lib/observability";
import { recordClientError } from "@/lib/prometheus-metrics";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import type { AppRouteHandler } from "@/lib/types";

import type { postClientEvent } from "./observability.route";

const truncate = (value: string | undefined, max: number) => {
  if (!value) {
    return undefined;
  }
  return value.length > max ? `${value.slice(0, max)}…` : value;
};

export const postClientEventHandler: AppRouteHandler<
  typeof postClientEvent
> = async (c) => {
  const token = env.OBSERVABILITY_CLIENT_TOKEN;
  if (token) {
    const headerToken = c.req.header("x-observability-token");
    if (headerToken !== token) {
      return c.json(
        { success: false, message: "Unauthorized" },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }
  }

  const body = c.req.valid("json");
  const routeHint = body.apiPath || body.url || "";
  const status = body.statusCode ?? 0;
  const severity =
    body.kind === "js_error" || body.kind === "unhandled_rejection"
      ? "warning"
      : severityForHttpStatus(status || 500);

  const logPayload = buildObservabilityLog({
    eventType: "client_error",
    severity,
    category: classifyRouteCategory(routeHint),
    surface: body.surface,
    clientKind: body.kind,
    httpStatus: body.statusCode,
    apiPath: truncate(body.apiPath, 500),
    route: truncate(body.url, 500),
    message: truncate(body.message, 500),
  });

  recordClientError(body.surface, body.kind);

  c.var.logger.warn(
    {
      ...logPayload,
      clientStack: truncate(body.stack, 2000),
      ip: c.var.ipAddress,
    },
    "Client observability event",
  );

  return c.json(
    { success: true, message: "Accepted" },
    HttpStatusCodes.ACCEPTED,
  );
};
