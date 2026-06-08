import { z } from "@hono/zod-openapi";

import { discountsSchema } from "@/db/models/discounts";

// Base schema
export const baseDiscountSchema = z.object({
  seriesId: z.coerce.number().int().positive(),
  discountRate: z.coerce
    .number()
    .min(0, "Discount rate must be a percentage value between 0 and 100")
    .max(100, "Discount rate must be a percentage value between 0 and 100"),
  name: z.string().optional(),
  description: z.string().optional(),
  discountTypeId: z.coerce.number().int().positive().optional(),
  minimumPurchaseAmount: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  discountValue: z.coerce.number().min(0).optional(),
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
