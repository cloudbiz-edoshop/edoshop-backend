import { z } from "zod";

import {
  TrackingBundleStatus,
  TrackingBundleStoreType,
} from "@/constants/tracking-steps.constants";
import { commonStringSchema } from "@/lib/zod-schemas";

export const trackingStepSchema = z.object({
  id: z.number(),
  stepOrder: z.number(),
  code: z.string(),
  label: z.string(),
  leg: z.string(),
  description: z.string().nullable().optional(),
});

export const trackingBundleOrderSchema = z.object({
  id: z.number(),
  orderId: z.number(),
  orderItemId: z.number().optional(),
  orderCode: z.string(),
  customerId: z.number().optional(),
  customerName: z.string().optional(),
  productName: z.string().optional(),
  variantCode: z.string().optional(),
  quantity: z.number().optional(),
  totalAmount: z.string().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
});

export const trackingBundleHistorySchema = z.object({
  id: z.number(),
  stepId: z.number(),
  stepLabel: z.string(),
  notes: z.string().nullable().optional(),
  attachmentUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedByName: z.string().nullable().optional(),
});

export const trackingBundleSchema = z.object({
  id: z.number(),
  trackingBundleId: z.number().nullable().optional(),
  sourceBundleId: z.number().nullable().optional(),
  bundleCode: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  supplierId: z.number().nullable().optional(),
  supplierName: z.string().nullable().optional(),
  supplierCode: z.string().nullable().optional(),
  storeType: z.string(),
  status: z.string(),
  currentStepId: z.number(),
  currentStepLabel: z.string().optional(),
  orderCount: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
});

export const trackingBundleDetailSchema = trackingBundleSchema.extend({
  currentStep: trackingStepSchema.optional(),
  orders: z.array(trackingBundleOrderSchema).optional(),
  history: z.array(trackingBundleHistorySchema).optional(),
});

export const createTrackingBundleRequestSchema = z.object({
  bundleCode: commonStringSchema.min(2).max(100),
  name: commonStringSchema.min(2).max(255),
  description: z.string().max(2000).optional(),
  storeType: z.enum([
    TrackingBundleStoreType.DIRECT_ORDER,
    TrackingBundleStoreType.GROUPAGE,
    TrackingBundleStoreType.DROPSHIPPING,
  ]),
  status: z
    .enum([
      TrackingBundleStatus.ACTIVE,
      TrackingBundleStatus.CLOSED,
      TrackingBundleStatus.CANCELLED,
    ])
    .optional(),
});

export const updateTrackingBundleRequestSchema = createTrackingBundleRequestSchema
  .partial()
  .extend({
    currentStepId: z.number().min(1).optional(),
  });

export const assignOrdersToBundleRequestSchema = z.object({
  orderCodes: z.array(commonStringSchema).min(1),
});

export const updateBundleStepRequestSchema = z.object({
  stepId: z.number().min(1),
  notes: z.string().max(2000).optional(),
  attachmentUrl: z.string().url().optional().or(z.literal("")),
});

export const createKiloBillRequestSchema = z.object({
  orderId: z.number().min(1),
  totalKg: z.number().positive(),
  pricePerKg: z.number().positive(),
  notes: z.string().max(2000).optional(),
});

export const kiloBillSchema = z.object({
  id: z.number(),
  trackingBundleId: z.number(),
  orderId: z.number(),
  totalKg: z.string(),
  pricePerKg: z.string(),
  amount: z.string(),
  notes: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.string(),
});

export const searchOrderForBundleSchema = z.object({
  orderCode: z.string(),
  orderId: z.number(),
  customerId: z.number(),
  totalAmount: z.string(),
  status: z.string(),
  orderType: z.string().optional(),
  alreadyAssigned: z.boolean(),
  assignedBundleCode: z.string().nullable().optional(),
});

export type CreateTrackingBundleRequest = z.infer<typeof createTrackingBundleRequestSchema>;
export type UpdateTrackingBundleRequest = z.infer<typeof updateTrackingBundleRequestSchema>;
export type AssignOrdersToBundleRequest = z.infer<typeof assignOrdersToBundleRequestSchema>;
export type UpdateBundleStepRequest = z.infer<typeof updateBundleStepRequestSchema>;
export type CreateKiloBillRequest = z.infer<typeof createKiloBillRequestSchema>;
