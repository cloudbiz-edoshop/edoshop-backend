import { z } from "@hono/zod-openapi";

import { couponsSchema } from "@/db/models/coupons";

export const couponWinnerInputSchema = z.object({
  userId: z.coerce.number().int().positive(),
  phoneNumber: z.string().trim().min(6).max(32),
  fullName: z.string().trim().min(2).max(255),
});

export const couponFieldsSchema = z.object({
  code: z.string().min(2).max(64),
  discountId: z.coerce.number().int().positive(),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const createCouponRequestSchema = couponFieldsSchema.extend({
  winners: z.array(couponWinnerInputSchema).min(1),
  expiresAt: z.string().datetime(),
});
export type CreateCouponRequest = z.infer<typeof createCouponRequestSchema>;

export const updateCouponRequestSchema = couponFieldsSchema.partial();
export type UpdateCouponRequest = z.infer<typeof updateCouponRequestSchema>;

export const couponWinnerResponseSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  phoneNumber: z.string(),
  fullName: z.string(),
  redeemedAt: z.string().datetime().nullable().optional(),
});

export const couponResponseSchema = couponsSchema.extend({
  discountName: z.string().optional(),
  discountRate: z.number().optional(),
  winners: z.array(couponWinnerResponseSchema).optional(),
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

export const importGoogleQuizRequestSchema = z.object({
  sheetUrl: z.string().trim().min(10),
  minScore: z.coerce.number().optional().nullable(),
});
export type ImportGoogleQuizRequest = z.infer<
  typeof importGoogleQuizRequestSchema
>;

export const importGoogleQuizIssueSchema = z.object({
  row: z.number().int(),
  reason: z.string(),
  phone: z.string().optional(),
  fullName: z.string().optional(),
});

export const importGoogleQuizResponseSchema = z.object({
  winners: z.array(couponWinnerInputSchema),
  issues: z.array(importGoogleQuizIssueSchema),
  detectedColumns: z.object({
    phone: z.string(),
    name: z.string(),
    score: z.string().optional(),
  }),
});
export type ImportGoogleQuizResponse = z.infer<
  typeof importGoogleQuizResponseSchema
>;
