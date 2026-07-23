import type { Database } from "@/db";

import { EntityType, OperationType, RoleType } from "@/constants";
import {
  buildPermissionKeys,
  DELIVERY_ENTITIES,
  DIALOGUE_ENTITIES,
  EWMS_MANAGEMENT_ENTITIES,
  EWMS_W1_ENTITIES,
  EWMS_W2_ENTITIES,
  NOTIFICATION_ENTITIES,
  READ_ONLY_OPERATIONS,
  SETTINGS_ENTITIES,
  STANDARD_CRUD_OPERATIONS,
  STORE_ENTITIES,
  TICKETING_ENTITIES,
  TRACKING_ENTITIES,
} from "@/constants/permissions.constants";

import {
  entities as entitiesTable,
  operations as operationsTable,
  permissions as permissionsTable,
  roles as rolesTable,
} from "../models";

const CHUNK_SIZE = 100;

async function getIdsMap(
  db: Database,
  table: any,
  nameTransform: (name: string) => string = (name) => name,
): Promise<Map<string, number>> {
  const results = await db.select().from(table);
  return new Map(results.map((item) => [nameTransform(item.name), item.id]));
}

async function insertPermissionsInChunks(db: Database, permissions: any[]) {
  for (let i = 0; i < permissions.length; i += CHUNK_SIZE) {
    const chunk = permissions.slice(i, i + CHUNK_SIZE);
    if (chunk.length > 0) {
      await db.insert(permissionsTable).values(chunk);
    }
  }
}

function getManagerPermissions(
  roleId: number,
  entityIds: Map<string, number>,
  operationIds: Map<string, number>,
): any[] {
  const permissions = [];
  const systemEntities = [
    EntityType.ENTITIES,
    EntityType.OPERATIONS,
    EntityType.ROLES,
    EntityType.USERS,
    ...SETTINGS_ENTITIES,
  ];

  const managerEntities = Object.values(EntityType).filter(
    (entity) => !systemEntities.includes(entity),
  );

  const allowedOperations = [
    OperationType.CREATE.toLowerCase(),
    OperationType.READ.toLowerCase(),
    OperationType.UPDATE.toLowerCase(),
  ];

  for (const entityName of managerEntities) {
    for (const operationName of allowedOperations) {
      const entityId = entityIds.get(entityName);
      const operationId = operationIds.get(operationName);
      if (entityId && operationId) {
        permissions.push({ roleId, entityId, operationId });
      }
    }
  }

  for (const entityName of [
    EntityType.ENTITIES,
    EntityType.OPERATIONS,
    EntityType.ROLES,
    EntityType.USERS,
  ]) {
    const entityId = entityIds.get(entityName);
    const readOpId = operationIds.get(OperationType.READ.toLowerCase());
    if (entityId && readOpId) {
      permissions.push({ roleId, entityId, operationId: readOpId });
    }
  }

  for (const entityName of TICKETING_ENTITIES) {
    for (const operationName of STANDARD_CRUD_OPERATIONS) {
      const entityId = entityIds.get(entityName);
      const operationId = operationIds.get(operationName.toLowerCase());
      if (entityId && operationId) {
        permissions.push({ roleId, entityId, operationId });
      }
    }
  }

  return permissions;
}

function getAdminPermissions(
  roleId: number,
  entityIds: Map<string, number>,
  operationIds: Map<string, number>,
) {
  const permissions = [];
  const adminEntities = Object.values(EntityType).filter(
    (entity) => !SETTINGS_ENTITIES.includes(entity),
  );

  for (const entityName of adminEntities) {
    for (const operationName of Object.values(OperationType)) {
      const entityId = entityIds.get(entityName);
      const operationId = operationIds.get(operationName.toLowerCase());
      if (entityId && operationId) {
        permissions.push({ roleId, entityId, operationId });
      }
    }
  }

  for (const operationName of [
    OperationType.CREATE,
    OperationType.READ,
    OperationType.UPDATE,
    OperationType.DELETE,
  ]) {
    const entityId = entityIds.get(EntityType.ROLES);
    const operationId = operationIds.get(operationName.toLowerCase());
    if (entityId && operationId) {
      permissions.push({ roleId, entityId, operationId });
    }
  }

  for (const entityName of [EntityType.ENTITIES, EntityType.OPERATIONS]) {
    const entityId = entityIds.get(entityName);
    const operationId = operationIds.get(OperationType.READ.toLowerCase());
    if (entityId && operationId) {
      permissions.push({ roleId, entityId, operationId });
    }
  }

  return permissions;
}

function getRolePermissionsFromTemplate(
  roleName: RoleType,
  roleId: number,
  entityIds: Map<string, number>,
  operationIds: Map<string, number>,
) {
  let templateKeys: string[] = [];

  switch (roleName) {
    case RoleType.SUPER_ADMIN:
      templateKeys = buildPermissionKeys(
        Object.values(EntityType),
        Object.values(OperationType),
      );
      break;
    case RoleType.ADMIN:
      return getAdminPermissions(roleId, entityIds, operationIds);
    case RoleType.MANAGER:
      return getManagerPermissions(roleId, entityIds, operationIds);
    case RoleType.AUDITOR:
      templateKeys = buildPermissionKeys(
        [...STORE_ENTITIES, ...EWMS_W1_ENTITIES, ...EWMS_W2_ENTITIES],
        READ_ONLY_OPERATIONS,
      );
      break;
    case RoleType.W1_TECH:
      templateKeys = buildPermissionKeys(
        [...STORE_ENTITIES, ...EWMS_W1_ENTITIES, ...TICKETING_ENTITIES],
        STANDARD_CRUD_OPERATIONS,
      );
      break;
    case RoleType.W2_TECH:
      templateKeys = buildPermissionKeys(
        [...STORE_ENTITIES, ...EWMS_W2_ENTITIES, ...TICKETING_ENTITIES],
        STANDARD_CRUD_OPERATIONS,
      );
      break;
    case RoleType.CUSTOMER_SERVICE:
      templateKeys = buildPermissionKeys(
        [...DIALOGUE_ENTITIES, ...NOTIFICATION_ENTITIES, ...TRACKING_ENTITIES],
        STANDARD_CRUD_OPERATIONS,
      );
      break;
    case RoleType.WAREHOUSE_SUPERVISOR:
      templateKeys = buildPermissionKeys(
        [
          ...STORE_ENTITIES,
          ...EWMS_W1_ENTITIES,
          ...EWMS_W2_ENTITIES,
          ...EWMS_MANAGEMENT_ENTITIES,
          ...DELIVERY_ENTITIES,
          ...TICKETING_ENTITIES,
        ],
        STANDARD_CRUD_OPERATIONS,
      );
      break;
    case RoleType.DIGITAL_MARKETER:
      templateKeys = buildPermissionKeys(
        [...STORE_ENTITIES, ...TICKETING_ENTITIES],
        STANDARD_CRUD_OPERATIONS,
      );
      break;
    default:
      return [];
  }

  return templateKeys
    .map((permissionKey) => {
      const [entityName, operationName] = permissionKey.split(":");
      const entityId = entityIds.get(entityName);
      const operationId = operationIds.get(operationName.toLowerCase());
      if (!entityId || !operationId) {
        return null;
      }
      return { roleId, entityId, operationId };
    })
    .filter(Boolean);
}

export default async function seed(db: Database) {
  const [roleIds, entityIds, operationIds] = await Promise.all([
    getIdsMap(db, rolesTable),
    getIdsMap(db, entitiesTable),
    getIdsMap(db, operationsTable, (name) => name.toLowerCase()),
  ]);

  const permissionsToInsert = [];

  for (const roleName of [
    RoleType.SUPER_ADMIN,
    RoleType.ADMIN,
    RoleType.MANAGER,
    RoleType.AUDITOR,
    RoleType.W1_TECH,
    RoleType.W2_TECH,
    RoleType.CUSTOMER_SERVICE,
    RoleType.WAREHOUSE_SUPERVISOR,
    RoleType.DIGITAL_MARKETER,
  ]) {
    if (!roleIds.has(roleName)) {
      continue;
    }

    permissionsToInsert.push(
      ...getRolePermissionsFromTemplate(
        roleName,
        roleIds.get(roleName)!,
        entityIds,
        operationIds,
      ),
    );
  }

  await insertPermissionsInChunks(db, permissionsToInsert);
}

export { getRolePermissionsFromTemplate };
