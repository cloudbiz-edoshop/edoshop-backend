import { z } from "@hono/zod-openapi";

import { discountsSchema } from "@/db/models/discounts";

const discountRateSchema = z.coerce
  .number()
  .min(0, "Discount rate must be a percentage value between 0 and 100")
  .max(100, "Discount rate must be a percentage value between 0 and 100");

export const baseDiscountSchema = z
  .object({
    targetType: z.enum(["series", "product"]).default("series"),
    seriesId: z.coerce.number().int().positive().optional(),
    productId: z.coerce.number().int().positive().optional(),
    discountRate: discountRateSchema,
    name: z.string().optional(),
    description: z.string().optional(),
    discountTypeId: z.coerce.number().int().positive().optional(),
    minimumPurchaseAmount: z.coerce.number().min(0).optional(),
    isActive: z.boolean().optional(),
    isPermanent: z.boolean().optional().default(true),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    discountValue: z.coerce.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.targetType === "series" && !data.seriesId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Series ID is required for series discounts",
        path: ["seriesId"],
      });
    }

    if (data.targetType === "product" && !data.productId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Product is required for product discounts",
        path: ["productId"],
      });
    }

    if (!data.isPermanent && !data.endsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiration date and time is required",
        path: ["endsAt"],
      });
    }
  });

export const createDiscountRequestSchema = baseDiscountSchema;
export type CreateDiscountRequest = z.infer<typeof createDiscountRequestSchema>;

export const updateDiscountRequestSchema = baseDiscountSchema.partial();
export type UpdateDiscountRequest = z.infer<typeof updateDiscountRequestSchema>;

export const createDiscountResponseSchema = discountsSchema;
export type CreateDiscountResponse = z.infer<
  typeof createDiscountResponseSchema
>;

export const getDiscountResponseSchema = discountsSchema;
export type GetDiscountResponse = z.infer<typeof getDiscountResponseSchema>;

export const listDiscountsResponseSchema = z.array(getDiscountResponseSchema);
export type ListDiscountsResponse = z.infer<typeof listDiscountsResponseSchema>;
