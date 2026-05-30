import { z } from "@hono/zod-openapi";

import { discountsSchema } from "@/db/models/discounts";

// Base schema
export const baseDiscountSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  discountTypeId: z.number(),
  discountValue: z.number().min(0),
  minimumPurchaseAmount: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  seriesId: z.number(),
});

// Create schema
export const createDiscountRequestSchema = baseDiscountSchema;
export type CreateDiscountRequest = z.infer<typeof createDiscountRequestSchema>;

// Update schema (partial)
export const updateDiscountRequestSchema = baseDiscountSchema.partial();
export type UpdateDiscountRequest = z.infer<typeof updateDiscountRequestSchema>;

// Response schemas
export const createDiscountResponseSchema = discountsSchema;
export type CreateDiscountResponse = z.infer<
  typeof createDiscountResponseSchema
>;

export const getDiscountResponseSchema = discountsSchema;
export type GetDiscountResponse = z.infer<typeof getDiscountResponseSchema>;

export const listDiscountsResponseSchema = z.array(getDiscountResponseSchema);
export type ListDiscountsResponse = z.infer<typeof listDiscountsResponseSchema>;
