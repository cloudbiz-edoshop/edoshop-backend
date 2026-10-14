import { EntityType, OperationType } from "@/constants";
import { ticketingPageReadAclPairs } from "@/constants/ticketing-pages.constants";
import { rolesAndPermissionsMiddleware } from "@/core/middlewares";

/** Staff who need W1/W2 names on forms (tickets, transfers) without full EWMS management. */
export const warehouseListReadPairs = [
  { entity: EntityType.WAREHOUSES, operation: OperationType.READ },
  { entity: EntityType.EWMS_MANAGEMENT, operation: OperationType.READ },
  { entity: EntityType.WAREHOUSE_1, operation: OperationType.READ },
  { entity: EntityType.WAREHOUSE_2, operation: OperationType.READ },
  ...ticketingPageReadAclPairs(),
  { entity: EntityType.TICKETING, operation: OperationType.READ },
  { entity: EntityType.TICKETING, operation: OperationType.CREATE },
  { entity: EntityType.ENTRIES, operation: OperationType.READ },
  { entity: EntityType.ENTRIES, operation: OperationType.CREATE },
  { entity: EntityType.ENTRIES, operation: OperationType.UPDATE },
] as const;

export const warehouseListReadMiddleware = rolesAndPermissionsMiddleware(
  [...warehouseListReadPairs],
  "ANY",
);
