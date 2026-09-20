import { z } from "@hono/zod-openapi";

import { discountsSchema } from "@/db/models/discounts";

const discountRateSchema = z.coerce
  .number()
  .min(0, "Discount rate must be a percentage value between 0 and 100")
  .max(100, "Discount rate must be a percentage value between 0 and 100");

export const discountTargetTypes = [
  "all",
  "section",
  "category",
  "products",
  "series",
  "product",
] as const;

export const discountFieldsSchema = z.object({
  targetType: z.enum(discountTargetTypes).default("products"),
  seriesId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  section: z.string().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  productIds: z.array(z.coerce.number().int().positive()).optional(),
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
  retailerOnly: z.boolean().optional().default(false),
  retailerId: z.coerce.number().int().positive().optional(),
});

type DiscountFields = z.infer<typeof discountFieldsSchema>;
type PartialDiscountFields = z.infer<
  ReturnType<typeof discountFieldsSchema.partial>
>;

const refineCreateDiscount = (data: DiscountFields, ctx: z.RefinementCtx) => {
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

  if (data.targetType === "section" && !data.section) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Section is required for section discounts",
      path: ["section"],
    });
  }

  if (data.targetType === "category" && !data.categoryId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Category is required for category discounts",
      path: ["categoryId"],
    });
  }

  if (data.targetType === "products" && !data.productIds?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select at least one product",
      path: ["productIds"],
    });
  }

  if (!data.isPermanent && !data.endsAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Expiration date and time is required",
      path: ["endsAt"],
    });
  }

  if (data.retailerOnly) {
    if (data.targetType !== "all" && data.targetType !== "series") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Retailer discounts apply to all products or a series only",
        path: ["targetType"],
      });
    }

    if (data.discountRate > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Retailer discounts cannot exceed 50%",
        path: ["discountRate"],
      });
    }
  }
};

const refineUpdateDiscount = (
  data: PartialDiscountFields,
  ctx: z.RefinementCtx,
) => {
  if (data.targetType === "series" && data.seriesId === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Series ID is required for series discounts",
      path: ["seriesId"],
    });
  }

  if (data.targetType === "product" && data.productId === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Product is required for product discounts",
      path: ["productId"],
    });
  }

  if (data.isPermanent === false && !data.endsAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Expiration date and time is required",
      path: ["endsAt"],
    });
  }
};

export const baseDiscountSchema = discountFieldsSchema;

export const createDiscountRequestSchema =
  discountFieldsSchema.superRefine(refineCreateDiscount);
export type CreateDiscountRequest = z.infer<typeof createDiscountRequestSchema>;

export const updateDiscountRequestSchema = discountFieldsSchema
  .partial()
  .superRefine(refineUpdateDiscount);
export type UpdateDiscountRequest = z.infer<typeof updateDiscountRequestSchema>;

export const createDiscountResponseSchema = discountsSchema;
export type CreateDiscountResponse = z.infer<
  typeof createDiscountResponseSchema
>;

export const getDiscountResponseSchema = discountsSchema;
export type GetDiscountResponse = z.infer<typeof getDiscountResponseSchema>;

export const listDiscountsResponseSchema = z.array(getDiscountResponseSchema);
export type ListDiscountsResponse = z.infer<typeof listDiscountsResponseSchema>;

export const discountFormOptionsResponseSchema = z.object({
  categories: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    }),
  ),
  products: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    }),
  ),
  series: z.array(
    z.object({
      id: z.number(),
      seriesCode: z.string(),
    }),
  ),
});
export type DiscountFormOptionsResponse = z.infer<
  typeof discountFormOptionsResponseSchema
>;
