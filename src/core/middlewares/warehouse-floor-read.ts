import { EntityType, OperationType } from "@/constants";
import { rolesAndPermissionsMiddleware } from "@/core/middlewares/roles-and-permissions";

/** Floor plan, stock view, and bin movements for W1/W2 operators (not only EWMS management). */
export const warehouseFloorReadMiddleware = rolesAndPermissionsMiddleware(
  [
    { entity: EntityType.EWMS_MANAGEMENT, operation: OperationType.READ },
    { entity: EntityType.WAREHOUSE_1, operation: OperationType.READ },
    { entity: EntityType.WAREHOUSE_2, operation: OperationType.READ },
  ],
  "ANY",
);
