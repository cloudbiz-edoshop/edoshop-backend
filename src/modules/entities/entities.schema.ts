import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { EntityType } from "@/constants";
import { entities } from "@/db/models";
import { idSchema } from "@/lib/zod-schemas";

// Base entity schema
export const entitySchema = createSelectSchema(entities);

// Entity type from schema
export type Entity = z.infer<typeof entitySchema>;

// Schema for creating a new entity
export const createEntitySchema = z.object({
  name: z.string().min(1, "Name is required").describe("Entity name"),
  type: z.nativeEnum(EntityType).describe("Type of entity"),
  description: z.string().nullable().optional().describe("Entity description"),
});

// Create entity request type
export type CreateEntityRequest = z.infer<typeof createEntitySchema>;

// Create entity response schema
export const createEntityResponseSchema = z.object({
  entity: entitySchema.describe("Created entity information"),
});

// Create entity response type
export type CreateEntityResponse = z.infer<typeof createEntityResponseSchema>;

// Schema for updating an entity
export const updateEntitySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .optional()
    .describe("Entity name"),
  type: z.nativeEnum(EntityType).optional().describe("Type of entity"),
  description: z.string().nullable().optional().describe("Entity description"),
});

// Update entity request type
export type UpdateEntityRequest = z.infer<typeof updateEntitySchema>;

// Update entity response schema
export const updateEntityResponseSchema = z.object({
  entity: entitySchema.describe("Updated entity information"),
});

// Update entity response type
export type UpdateEntityResponse = z.infer<typeof updateEntityResponseSchema>;

// Delete entity response schema
export const deleteEntityResponseSchema = z.object({
  id: idSchema.describe("ID of the deleted entity"),
});

// Delete entity response type
export type DeleteEntityResponse = z.infer<typeof deleteEntityResponseSchema>;

// Get entity response schema
export const getEntityResponseSchema = z.object({
  entity: entitySchema.describe("Entity information"),
});

// Get entity response type
export type GetEntityResponse = z.infer<typeof getEntityResponseSchema>;

// List entities response schema
export const listEntitiesResponseSchema = z.array(entitySchema);

// List entities response type
export type ListEntitiesResponse = z.infer<typeof listEntitiesResponseSchema>;
