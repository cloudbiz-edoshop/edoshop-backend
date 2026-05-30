import { z } from "@hono/zod-openapi";

import { colorsSchema } from "@/db/models/colors";
import { nameSchema } from "@/lib/zod-schemas/common-schemas";

// Create colors request schema
export const createColorsRequestSchema = z.object({
  name: nameSchema.describe("Colors name"),
  description: z.string().optional().describe("Colors description"),
});

export type CreateColorsRequest = z.infer<typeof createColorsRequestSchema>;

// Create colors response schema
export const createColorsResponseSchema = colorsSchema;

export type CreateColorsResponse = z.infer<typeof createColorsResponseSchema>;

// Update colors request schema
export const updateColorsRequestSchema = createColorsRequestSchema.partial();

export type UpdateColorsRequest = z.infer<typeof updateColorsRequestSchema>;

// Get colors response schema
export const getColorsResponseSchema = colorsSchema;

export type GetColorsResponse = z.infer<typeof getColorsResponseSchema>;

// List colors response schema
export const listColorsResponseSchema = z.array(getColorsResponseSchema);

export type ListColorsResponse = z.infer<typeof listColorsResponseSchema>;
