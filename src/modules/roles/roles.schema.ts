import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { roles } from "@/db/models";
import { descriptionSchema, idSchema, nameSchema } from "@/lib/zod-schemas";

import { entitySchema } from "../entities/entities.schema";
import { operationSchema } from "../operations/operations.schema";

// Base role schema
export const roleSchema = createSelectSchema(roles);

// Role type from schema
export type Role = z.infer<typeof roleSchema>;

// Define permission schema to be used in role creation
const permissionItemSchema = z.object({
  entityId: z.number().int().positive(),
  operationId: z.number().int().positive(),
});

// Schema for creating a new role
export const createRoleRequestSchema = z.object({
  name: nameSchema.describe("Role name"),
  description: descriptionSchema.describe("Role description"),
  permissions: z
    .array(permissionItemSchema)
    .optional()
    .describe("Array of permission Items"),
});

// Create role request type
export type CreateRoleRequest = z.infer<typeof createRoleRequestSchema>;

// Create role response schema
export const createRoleResponseSchema = roleSchema.extend({
  permissions: z
    .array(z.string())
    .describe("Permissions")
    .openapi({ example: ["entity:create", "entity:update"] }),
});

// Create role response type
export type CreateRoleResponse = z.infer<typeof createRoleResponseSchema>;

// updateRoleRequestSchema
export const updateRoleRequestSchema = createRoleRequestSchema;
export type UpdateRoleRequest = z.infer<typeof updateRoleRequestSchema>;

// updateRoleResponseSchema
export const updateRoleResponseSchema = createRoleResponseSchema;
export type UpdateRoleResponse = z.infer<typeof updateRoleResponseSchema>;

// Delete role response schema
export const deleteRoleResponseSchema = z.object({
  id: idSchema.describe("ID of the deleted role"),
});

// Delete role response type
export type DeleteRoleResponse = z.infer<typeof deleteRoleResponseSchema>;

// Get role response schema
export const getRoleResponseSchema = createRoleResponseSchema.extend({
  processedPermissions: z.array(z.string()),
  permissions: z.array(
    permissionItemSchema.extend({
      entity: entitySchema,
      operation: operationSchema,
    }),
  ),
});

// Get role response type
export type GetRoleResponse = z.infer<typeof getRoleResponseSchema>;

// List roles response schema
export const listRolesResponseSchema = z.array(getRoleResponseSchema);

// List roles response type
export type ListRolesResponse = z.infer<typeof listRolesResponseSchema>;
