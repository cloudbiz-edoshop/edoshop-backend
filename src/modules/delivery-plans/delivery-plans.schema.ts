import { z } from "@hono/zod-openapi";

import { deliveryPlansSchema } from "@/db/models/delivery-plans";

export const deliveryPlanRequestSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(50)
    .regex(
      /^[a-z0-9_-]+$/,
      "Code must use lowercase letters, numbers, underscores, or hyphens",
    ),
  label: z.string().trim().min(1, "Label is required").max(255),
  leadTime: z.string().trim().min(1, "Lead time is required").max(255),
  description: z.string().trim().min(1, "Description is required"),
  fee: z.coerce.number().int().min(0, "Fee must be zero or greater"),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const createDeliveryPlanRequestSchema = deliveryPlanRequestSchema;
export type CreateDeliveryPlanRequest = z.infer<
  typeof createDeliveryPlanRequestSchema
>;

export const updateDeliveryPlanRequestSchema =
  deliveryPlanRequestSchema.partial();
export type UpdateDeliveryPlanRequest = z.infer<
  typeof updateDeliveryPlanRequestSchema
>;

export const deliveryPlanResponseSchema = deliveryPlansSchema;
export type DeliveryPlanResponse = z.infer<typeof deliveryPlanResponseSchema>;

export const listDeliveryPlansResponseSchema = z.array(deliveryPlanResponseSchema);
export type ListDeliveryPlansResponse = z.infer<
  typeof listDeliveryPlansResponseSchema
>;

export const publicDeliveryPlanSchema = z.object({
  id: z.number(),
  code: z.string(),
  label: z.string(),
  leadTime: z.string(),
  description: z.string(),
  fee: z.number(),
});

export type PublicDeliveryPlan = z.infer<typeof publicDeliveryPlanSchema>;

export const deliveryFeeRuleResponseSchema = z.object({
  id: z.number(),
  deliveryPlanId: z.number(),
  minDistanceKm: z.number(),
  maxDistanceKm: z.number().nullable().optional(),
  minWeightKg: z.number(),
  maxWeightKg: z.number().nullable().optional(),
  maxLengthCm: z.number().nullable().optional(),
  maxWidthCm: z.number().nullable().optional(),
  maxHeightCm: z.number().nullable().optional(),
  fee: z.number().int().min(0),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const createDeliveryFeeRuleRequestSchema = z.object({
  minDistanceKm: z.coerce.number().min(0),
  maxDistanceKm: z.coerce.number().min(0).nullable().optional(),
  minWeightKg: z.coerce.number().min(0),
  maxWeightKg: z.coerce.number().min(0).nullable().optional(),
  maxLengthCm: z.coerce.number().int().min(0).nullable().optional(),
  maxWidthCm: z.coerce.number().int().min(0).nullable().optional(),
  maxHeightCm: z.coerce.number().int().min(0).nullable().optional(),
  fee: z.coerce.number().int().min(0),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateDeliveryFeeRuleRequestSchema =
  createDeliveryFeeRuleRequestSchema.partial();

export const listDeliveryFeeRulesResponseSchema = z.array(
  deliveryFeeRuleResponseSchema,
);

export type DeliveryFeeRuleResponse = z.infer<typeof deliveryFeeRuleResponseSchema>;
export type CreateDeliveryFeeRuleRequest = z.infer<
  typeof createDeliveryFeeRuleRequestSchema
>;
export type UpdateDeliveryFeeRuleRequest = z.infer<
  typeof updateDeliveryFeeRuleRequestSchema
>;
