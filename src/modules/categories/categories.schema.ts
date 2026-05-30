import { z } from "@hono/zod-openapi";

import { categoriesSchema } from "@/db/models/categories";

// Create categories request schema
export const createCategoriesRequestSchema = z.object({
  name: z.string().describe("Categories name"),
  description: z.string().describe("Categories description"),
  parentId: z.number().optional().describe("Categories parent id"),
  level: z.number().describe("Categories level"),
});

export type CreateCategoriesRequest = z.infer<
  typeof createCategoriesRequestSchema
>;

// Create categories response schema
export const createCategoriesResponseSchema = categoriesSchema;

export type CreateCategoriesResponse = z.infer<
  typeof createCategoriesResponseSchema
>;

// Update categories request schema
export const updateCategoriesRequestSchema =
  createCategoriesRequestSchema.partial();

export type UpdateCategoriesRequest = z.infer<
  typeof updateCategoriesRequestSchema
>;

// Get categories response schema
export const getCategoriesResponseSchema = categoriesSchema;

export type GetCategoriesResponse = z.infer<typeof getCategoriesResponseSchema>;

// List categories response schema
export const listCategoriesResponseSchema = z.array(
  getCategoriesResponseSchema,
);

export type ListCategoriesResponse = z.infer<
  typeof listCategoriesResponseSchema
>;
