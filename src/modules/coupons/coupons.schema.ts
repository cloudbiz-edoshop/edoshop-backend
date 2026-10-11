import { z } from "@hono/zod-openapi";

import { couponsSchema } from "@/db/models/coupons";

export const couponFieldsSchema = z.object({
  code: z.string().min(2).max(64),
  discountId: z.coerce.number().int().positive(),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const createCouponRequestSchema = couponFieldsSchema;
export type CreateCouponRequest = z.infer<typeof createCouponRequestSchema>;

export const updateCouponRequestSchema = couponFieldsSchema.partial();
export type UpdateCouponRequest = z.infer<typeof updateCouponRequestSchema>;

export const couponResponseSchema = couponsSchema.extend({
  discountName: z.string().optional(),
  discountRate: z.number().optional(),
});

export const listCouponsResponseSchema = z.array(couponResponseSchema);

export const validateCouponRequestSchema = z.object({
  code: z.string().min(1),
  subtotal: z.coerce.number().min(0).optional().default(0),
});

export const validateCouponResponseSchema = z.object({
  valid: z.boolean(),
  code: z.string().optional(),
  label: z.string().optional(),
  discountRate: z.number().optional(),
  discountAmount: z.number().optional(),
  minimumPurchaseAmount: z.number().optional(),
  message: z.string().optional(),
});

export type ValidateCouponResponse = z.infer<typeof validateCouponResponseSchema>;

export const couponDiscountOptionSchema = z.object({
  id: z.number().int(),
  name: z.string().nullable(),
  discountValue: z.number(),
});

export const couponDiscountOptionsResponseSchema = z.array(
  couponDiscountOptionSchema,
);
