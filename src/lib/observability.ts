export type ObservabilityEventType =
  | "api_error"
  | "permission_denied"
  | "client_error";

export type ObservabilitySeverity = "critical" | "warning" | "info";

export type ObservabilityCategory =
  | "permission"
  | "ticketing"
  | "payment"
  | "generic";

export type ObservabilitySurface = "admin" | "storefront" | "api";

export type ObservabilityPayload = {
  service: "edoshop-api";
  eventType: ObservabilityEventType;
  severity: ObservabilitySeverity;
  category: ObservabilityCategory;
  surface?: ObservabilitySurface;
  httpMethod?: string;
  route?: string;
  httpStatus?: number;
  message?: string;
  requiredPermissions?: unknown;
  checkType?: string;
  employeeId?: string;
  roleId?: string;
  clientKind?: string;
  apiPath?: string;
};

const SERVICE = "edoshop-api" as const;

export function classifyRouteCategory(path: string): ObservabilityCategory {
  const normalized = path.toLowerCase();

  if (
    normalized.includes("warehouse-ticket") ||
    normalized.includes("warehouse_ticket")
  ) {
    return "ticketing";
  }

  if (
    normalized.includes("payment") ||
    normalized.includes("campay") ||
    normalized.includes("stripe") ||
    normalized.includes("pension")
  ) {
    return "payment";
  }

  if (
    normalized.includes("/roles") ||
    normalized.includes("/employees") ||
    normalized.includes("permission")
  ) {
    return "permission";
  }

  return "generic";
}

export function severityForHttpStatus(status: number): ObservabilitySeverity {
  if (status >= 500) {
    return "critical";
  }
  if (status === 403 || status === 401) {
    return "warning";
  }
  return "info";
}

export function buildObservabilityLog(
  partial: Omit<ObservabilityPayload, "service">,
): { observability: ObservabilityPayload } {
  return {
    observability: {
      service: SERVICE,
      ...partial,
    },
  };
}
