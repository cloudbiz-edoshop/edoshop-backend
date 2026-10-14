import type { MiddlewareHandler } from "hono";

import { EntityType, OperationType } from "@/constants";

import type { AclMiddlewareHandler, Permission } from "./roles-and-permissions";

import { rolesAndPermissionsMiddleware } from "./roles-and-permissions";

const WAREHOUSE_ENTITY_BY_ID: Record<string, EntityType> = {
  1: EntityType.WAREHOUSE_1,
  2: EntityType.WAREHOUSE_2,
};

/**
 * Transfer endpoints act on the warehouse given in the URL (`id` / `warehouseId`)
 * or in the body (`sourceWarehouseId`). Allowed with the transfer permission, or
 * with the matching warehouse permission only (W2 staff cannot act on W1).
 */
export const warehouseTransferAcl = (
  transferOperations: OperationType | OperationType[],
  warehouseOperation: OperationType,
  source: "param" | "body" = "param",
): AclMiddlewareHandler => {
  const transferPermissions: Permission[] = [transferOperations].flat().map((operation) => ({
    entity: EntityType.WAREHOUSE_TRANSFERS,
    operation,
  }));

  const handler: MiddlewareHandler = async (c, next) => {
    let warehouseId: unknown;
    if (source === "body") {
      const body = await c.req.json().catch(() => ({}));
      warehouseId = (body as { sourceWarehouseId?: unknown }).sourceWarehouseId;
    } else {
      warehouseId = c.req.param("id") ?? c.req.param("warehouseId");
    }
    const warehouseEntity = WAREHOUSE_ENTITY_BY_ID[String(warehouseId)];
    const permissions = warehouseEntity
      ? [...transferPermissions, { entity: warehouseEntity, operation: warehouseOperation }]
      : transferPermissions;
    return rolesAndPermissionsMiddleware(permissions, "ANY")(c, next);
  };

  return Object.assign(handler, {
    acl: {
      permissions: [
        ...transferPermissions,
        ...Object.values(WAREHOUSE_ENTITY_BY_ID).map((entity) => ({
          entity,
          operation: warehouseOperation,
        })),
      ],
      checkType: "ANY" as const,
      warehouseScoped: true,
    },
  });
};
