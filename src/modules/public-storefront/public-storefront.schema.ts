import { z } from "@hono/zod-openapi";

export const publicBannerSchema = z.object({
  id: z.number(),
  heading: z.string().nullable().optional(),
  headingFontColor: z.string().nullable().optional(),
  headingFontSize: z.string().nullable().optional(),
  headingFontWeight: z.string().nullable().optional(),
  subtext: z.string().nullable().optional(),
  subtextFontColor: z.string().nullable().optional(),
  subtextFontSize: z.string().nullable().optional(),
  subtextFontWeight: z.string().nullable().optional(),
  primaryButtonText: z.string().nullable().optional(),
  secondaryButtonText: z.string().nullable().optional(),
  delay: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

export const publicFaqSchema = z.object({
  id: z.number(),
  order: z.number().nullable().optional(),
  storeId: z.number().nullable().optional(),
  question: z.string(),
  answer: z.string(),
});

export const publicFilterSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

export const publicCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  parentId: z.number().nullable().optional(),
  level: z.number(),
});

export const publicNewArrivalProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.union([z.string(), z.number()]),
  imageUrl: z.string().nullable().optional(),
  imageUrls: z.array(z.string()).optional(),
  shortDescription: z.string().nullable().optional(),
  fullDescription: z.string().nullable().optional(),
  specifications: z.string().nullable().optional(),
  totalItems: z.number().nullable().optional(),
  storeId: z.number().nullable().optional(),
  seriesId: z.number().nullable().optional(),
  productOrigin: z.string().nullable().optional(),
  directOrderCode: z.string().nullable().optional(),
  categoryIds: z.array(z.number()).optional(),
  categories: z
    .array(
      z.object({
        id: z.number(),
        name: z.string().nullable().optional(),
      }),
    )
    .optional(),
  isNewArrival: z.boolean(),
  newArrivalId: z.number().optional(),
  newArrivalStartDate: z.string().optional(),
  newArrivalEndDate: z.string().optional(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  variants: z
    .array(
      z.object({
        id: z.number(),
        variantCode: z.string().nullable().optional(),
        quantity: z.number().nullable().optional(),
        color: z.string().nullable().optional(),
        size: z.string().nullable().optional(),
        images: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  dropshippingDetails: z
    .object({
      dropshippingCode: z.string().nullable().optional(),
      totalItems: z.number().nullable().optional(),
      groupCriteriaId: z.number().nullable().optional(),
      completionCriteria: z.union([z.string(), z.number()]).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const publicProductSchema = publicNewArrivalProductSchema
  .omit({
    isNewArrival: true,
    newArrivalId: true,
    newArrivalStartDate: true,
    newArrivalEndDate: true,
  })
  .extend({
    isNewArrival: z.boolean().optional(),
  });

export const publicDiscountSchema = z.object({
  id: z.number(),
  seriesId: z.number(),
  discountRate: z.union([z.string(), z.number()]),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  discountValue: z.union([z.string(), z.number()]).nullable().optional(),
});

export const publicReviewSchema = z.object({
  id: z.number(),
  productId: z.number(),
  rating: z.number(),
  review: z.string(),
  reviewDate: z.string(),
  statusId: z.number().nullable().optional(),
  customerName: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

export const publicCustomerSchema = z.object({
  id: z.number(),
  customerCode: z.string(),
  isActive: z.boolean(),
});

export const publicRetailerSchema = z.object({
  id: z.number(),
  retailerCode: z.string(),
  shopName: z.string(),
  status: z.boolean(),
});

export const publicPaymentMethodSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  gateway: z.enum(["mtn", "orange", "cash", "stripe", "paypal", "western_union", "money_gram"]),
  isMobileTransfer: z.boolean(),
  isStripe: z.boolean().optional(),
  isPayPal: z.boolean().optional(),
});

export const subscribeNewsletterRequestSchema = z.object({
  email: z.string().email(),
});

export const subscribeNewsletterResponseSchema = z.object({
  subscribed: z.boolean(),
  email: z.string().email(),
});

export const publicCreateReviewRequestSchema = z.object({
  productId: z.number().int().positive(),
  fullName: z.string().trim().min(1).max(120),
  email: z.string().email(),
  review: z.string().trim().min(1).max(900),
  rating: z.number().min(1).max(5),
});

export const publicCreateReviewResponseSchema = z.object({
  submitted: z.boolean(),
  message: z.string(),
});
