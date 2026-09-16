import { z } from "@hono/zod-openapi";

export const promoBannerResponseSchema = z.object({
  id: z.number(),
  text: z.string(),
  backgroundColor: z.enum(["yellow", "red"]),
  isActive: z.boolean(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  displayDurationHours: z.number().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const createPromoBannerRequestSchema = z.object({
  text: z.string().min(1).max(255),
  backgroundColor: z.enum(["yellow", "red"]).default("yellow"),
  isActive: z.boolean().default(false),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  displayDurationHours: z.number().int().positive().nullable().optional(),
});

export const updatePromoBannerRequestSchema =
  createPromoBannerRequestSchema.partial();

export type CreatePromoBannerRequest = z.infer<
  typeof createPromoBannerRequestSchema
>;
export type UpdatePromoBannerRequest = z.infer<
  typeof updatePromoBannerRequestSchema
>;
