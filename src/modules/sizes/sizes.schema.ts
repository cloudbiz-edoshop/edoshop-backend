import { z } from "@hono/zod-openapi";

import { sizesSchema } from "@/db/models/sizes";
import { nameSchema } from "@/lib/zod-schemas/common-schemas";

// Create sizes request schema
export const createSizesRequestSchema = z.object({
  name: nameSchema.describe("Sizes name"),
  description: z.string().optional().describe("Sizes description"),
});

export type CreateSizesRequest = z.infer<typeof createSizesRequestSchema>;

// Create sizes response schema
export const createSizesResponseSchema = sizesSchema;

export type CreateSizesResponse = z.infer<typeof createSizesResponseSchema>;

// Update sizes request schema
export const updateSizesRequestSchema = createSizesRequestSchema.partial();

export type UpdateSizesRequest = z.infer<typeof updateSizesRequestSchema>;

// Get sizes response schema
export const getSizesResponseSchema = sizesSchema;

export type GetSizesResponse = z.infer<typeof getSizesResponseSchema>;

// List sizes response schema
export const listSizesResponseSchema = z.array(getSizesResponseSchema);

export type ListSizesResponse = z.infer<typeof listSizesResponseSchema>;
