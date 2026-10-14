import { EntityType, OperationType } from "@/constants";
import { rolesAndPermissionsMiddleware } from "@/core/middlewares/roles-and-permissions";

/** New product entries — explicit Entries ACL or warehouse operator write on W1/W2. */
export const entryCreateMiddleware = rolesAndPermissionsMiddleware(
  [
    { entity: EntityType.ENTRIES, operation: OperationType.CREATE },
    { entity: EntityType.WAREHOUSE_1, operation: OperationType.CREATE },
    { entity: EntityType.WAREHOUSE_1, operation: OperationType.UPDATE },
    { entity: EntityType.WAREHOUSE_2, operation: OperationType.CREATE },
    { entity: EntityType.WAREHOUSE_2, operation: OperationType.UPDATE },
  ],
  "ANY",
);

export const entryUpdateMiddleware = rolesAndPermissionsMiddleware(
  [
    { entity: EntityType.ENTRIES, operation: OperationType.UPDATE },
    { entity: EntityType.WAREHOUSE_1, operation: OperationType.UPDATE },
    { entity: EntityType.WAREHOUSE_2, operation: OperationType.UPDATE },
    { entity: EntityType.SUPPLIERS, operation: OperationType.UPDATE },
  ],
  "ANY",
);
