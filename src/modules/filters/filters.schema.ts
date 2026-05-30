import { z } from "@hono/zod-openapi";

import { filtersSchema } from "@/db/models/filters";
import { descriptionSchema, nameSchema } from "@/lib/zod-schemas";
// Create filters request schema
export const createFiltersRequestSchema = z.object({
  name: nameSchema.describe("Filters name"),
  description: descriptionSchema.describe("Filters description"),
});

export type CreateFiltersRequest = z.infer<typeof createFiltersRequestSchema>;

// Create filters response schema
export const createFiltersResponseSchema = filtersSchema;

export type CreateFiltersResponse = z.infer<typeof createFiltersResponseSchema>;

// Update filters request schema
export const updateFiltersRequestSchema = createFiltersRequestSchema.partial();

export type UpdateFiltersRequest = z.infer<typeof updateFiltersRequestSchema>;

// Get filters response schema
export const getFiltersResponseSchema = filtersSchema;

export type GetFiltersResponse = z.infer<typeof getFiltersResponseSchema>;

// List filters response schema
export const listFiltersResponseSchema = z.array(getFiltersResponseSchema);

export type ListFiltersResponse = z.infer<typeof listFiltersResponseSchema>;
