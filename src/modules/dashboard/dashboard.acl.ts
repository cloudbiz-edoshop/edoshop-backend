import { EntityType, OperationType } from "@/constants";
import { rolesAndPermissionsMiddleware } from "@/core/middlewares";

/** Any of these can open the admin dashboard metrics. */
export const dashboardMetricsReadPairs = [
  { entity: EntityType.EWMS_MANAGEMENT, operation: OperationType.READ },
  { entity: EntityType.WAREHOUSE_1, operation: OperationType.READ },
  { entity: EntityType.WAREHOUSE_2, operation: OperationType.READ },
  { entity: EntityType.ENTRIES, operation: OperationType.READ },
  { entity: EntityType.ORDERS, operation: OperationType.READ },
  { entity: EntityType.STORES, operation: OperationType.READ },
  { entity: EntityType.PRODUCTS, operation: OperationType.READ },
  { entity: EntityType.CUSTOMERS, operation: OperationType.READ },
] as const;

export const dashboardMetricsReadMiddleware = rolesAndPermissionsMiddleware(
  [...dashboardMetricsReadPairs],
  "ANY",
);
