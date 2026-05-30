import { z } from "@hono/zod-openapi";

import { variantsSchema } from "@/db/models/variants";

// Base variant schema
const baseVariantSchema = z.object({
  productId: z.number().describe("Product ID"),
  itemId: z.number().optional().describe("Item ID"),
  colorId: z.number().describe("Color ID"),
  sizeId: z.number().describe("Size ID"),
  materialTypeId: z.number().describe("Material Type ID"),
  designPatternId: z.number().describe("Design Pattern ID"),
  quantity: z.number().describe("Quantity"),
  additionalInfo: z.string().describe("Additional Info"),
});

// Create variant request schema
export const createVariantRequestSchema = baseVariantSchema
  .refine(
    (data) => {
      // Validate that quantity is a positive number
      return data.quantity >= 0;
    },
    {
      message: "Quantity must be a non-negative number",
      path: ["quantity"],
    },
  )
  .refine(
    (data) => {
      // Validate that materialTypeId, colorId, sizeId, and additionalInfo are always required
      return (
        data.materialTypeId > 0 &&
        data.designPatternId > 0 &&
        data.colorId > 0 &&
        data.sizeId > 0 &&
        data.additionalInfo &&
        data.additionalInfo.trim().length > 0
      );
    },
    {
      message: "Material type ID, color ID, size ID, and additional info are always required",
      path: ["materialTypeId", "colorId", "sizeId", "additionalInfo"],
    },
  );

export type CreateVariantRequest = z.infer<typeof createVariantRequestSchema>;

// Create variant response schema
export const createVariantResponseSchema = variantsSchema;

export type CreateVariantResponse = z.infer<typeof createVariantResponseSchema>;

// Update variant request schema
export const updateVariantRequestSchema = baseVariantSchema.partial();

export type UpdateVariantRequest = z.infer<typeof updateVariantRequestSchema>;

// Get variant response schema
export const getVariantResponseSchema = variantsSchema;

export type GetVariantResponse = z.infer<typeof getVariantResponseSchema>;

// List variants response schema
export const listVariantsResponseSchema = z.array(getVariantResponseSchema);

export type ListVariantsResponse = z.infer<typeof listVariantsResponseSchema>;
