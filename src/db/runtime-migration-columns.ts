import { sql } from "drizzle-orm";

import db from "@/db";

export type AuditColumns = {
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
};

export type PermissionColumns = {
  roleId: string;
  entityId: string;
  operationId: string;
  createdAt: string;
  updatedAt: string;
};

async function loadTableColumns(tableName: string): Promise<Set<string>> {
  const result = await db.execute<{ column_name: string }>(
    sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${tableName}`,
  );
  return new Set(result.map((row) => row.column_name));
}

function pickColumn(columns: Set<string>, snake: string, camel: string): string {
  if (columns.has(snake)) {
    return snake;
  }
  if (columns.has(camel)) {
    return camel;
  }
  return snake;
}

export function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export async function resolveAuditColumns(tableName: string): Promise<AuditColumns> {
  const columns = await loadTableColumns(tableName);
  return {
    createdBy: pickColumn(columns, "created_by", "createdBy"),
    updatedBy: pickColumn(columns, "updated_by", "updatedBy"),
    updatedAt: pickColumn(columns, "updated_at", "updatedAt"),
  };
}

export async function resolvePermissionColumns(
  tableName: string,
): Promise<PermissionColumns> {
  const columns = await loadTableColumns(tableName);
  return {
    roleId: pickColumn(columns, "role_id", "roleId"),
    entityId: pickColumn(columns, "entity_id", "entityId"),
    operationId: pickColumn(columns, "operation_id", "operationId"),
    createdAt: pickColumn(columns, "created_at", "createdAt"),
    updatedAt: pickColumn(columns, "updated_at", "updatedAt"),
  };
}

const PERM_TOKENS: Array<[string, keyof PermissionColumns]> = [
  ["roleId", "roleId"],
  ["entityId", "entityId"],
  ["operationId", "operationId"],
  ["createdAt", "createdAt"],
  ["updatedAt", "updatedAt"],
];

export function applyPermissionColumnNames(
  query: string,
  columns: PermissionColumns,
): string {
  let output = query;
  for (const [token, key] of PERM_TOKENS) {
    output = output.replaceAll(`"${token}"`, quoteIdent(columns[key]));
  }
  return output;
}
