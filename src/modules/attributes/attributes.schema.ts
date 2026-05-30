import { z } from "@hono/zod-openapi";

import { attributeTypesSchema } from "@/db/models/attribute-types";
import { selectAttributesSchema } from "@/db/models/attributes";
import { idSchema, nameSchema } from "@/lib/zod-schemas/common-schemas";

// Create attributes request schema
export const createAttributesRequestSchema = z.object({
  name: nameSchema.describe("Attributes name"),
  description: z.string().optional().describe("Attributes description"),
  attributeTypeId: idSchema.describe("Attribute type ID"),
});

export type CreateAttributesRequest = z.infer<
  typeof createAttributesRequestSchema
>;

// Create attributes response schema
export const createAttributesResponseSchema = selectAttributesSchema.extend({
  attributeType: attributeTypesSchema,
});

export type CreateAttributesResponse = z.infer<
  typeof createAttributesResponseSchema
>;

// Update attributes request schema
export const updateAttributesRequestSchema =
  createAttributesRequestSchema.partial();

export type UpdateAttributesRequest = z.infer<
  typeof updateAttributesRequestSchema
>;

// Get attributes response schema
export const getAttributesResponseSchema = selectAttributesSchema.extend({
  attributeType: attributeTypesSchema,
});

export type GetAttributesResponse = z.infer<typeof getAttributesResponseSchema>;

// List attributes response schema
export const listAttributesResponseSchema = z.array(
  getAttributesResponseSchema,
);

export type ListAttributesResponse = z.infer<
  typeof listAttributesResponseSchema
>;
