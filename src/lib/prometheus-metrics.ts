import client from "prom-client";

import type { ObservabilityCategory } from "@/lib/observability";

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: "edoshop_",
});

export const httpRequestsTotal = new client.Counter({
  name: "edoshop_http_requests_total",
  help: "Total HTTP requests handled by the API",
  labelNames: ["method", "status"],
  registers: [register],
});

export const permissionDeniedTotal = new client.Counter({
  name: "edoshop_permission_denied_total",
  help: "ACL permission denials",
  labelNames: ["category"],
  registers: [register],
});

export const clientErrorsTotal = new client.Counter({
  name: "edoshop_client_errors_total",
  help: "Errors reported from admin/storefront clients",
  labelNames: ["surface", "kind"],
  registers: [register],
});

export function recordPermissionDenied(category: ObservabilityCategory) {
  permissionDeniedTotal.inc({ category });
}

export function recordClientError(surface: string, kind: string) {
  clientErrorsTotal.inc({ surface, kind });
}

export async function metricsPayload(): Promise<string> {
  return register.metrics();
}
