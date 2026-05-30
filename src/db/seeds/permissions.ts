import type { Database } from "@/db";

import { EntityType, OperationType, RoleType } from "@/constants";

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
    await db.insert(permissionsTable).values(chunk);
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
  ];

  const allowedOperations = [
    OperationType.CREATE.toLowerCase(),
    OperationType.READ.toLowerCase(),
    OperationType.UPDATE.toLowerCase(),
  ];

  for (const [entityName, entityId] of entityIds.entries()) {
    if (systemEntities.includes(entityName as EntityType)) {
      const readOpId = operationIds.get(OperationType.READ.toLowerCase());
      if (readOpId) {
        permissions.push({ roleId, entityId, operationId: readOpId });
      }
      continue;
    }

    for (const operationName of allowedOperations) {
      const operationId = operationIds.get(operationName);
      if (operationId) {
        permissions.push({ roleId, entityId, operationId });
      }
    }
  }

  return permissions;
}

/**
 * Seed permissions for different roles
 * - Admin: All permissions
 * - Manager: Create, Read, Update permissions for most entities but not system entities
 */
export default async function seed(db: Database) {
  const [roleIds, entityIds, operationIds] = await Promise.all([
    getIdsMap(db, rolesTable),
    getIdsMap(db, entitiesTable),
    getIdsMap(db, operationsTable, (name) => name.toLowerCase()),
  ]);

  const permissionsToInsert = [];

  if (roleIds.has(RoleType.MANAGER)) {
    const managerPermissions = getManagerPermissions(
      roleIds.get(RoleType.MANAGER)!,
      entityIds,
      operationIds,
    );
    permissionsToInsert.push(...managerPermissions);
  }

  await insertPermissionsInChunks(db, permissionsToInsert);
}
