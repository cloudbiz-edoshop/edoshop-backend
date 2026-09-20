import { z } from "@hono/zod-openapi";

export const promoBannerCardSchema = z
  .object({
    mediaType: z.enum(["image", "video"]),
    imageUrl: z.string().max(512).optional().default(""),
    videoUrl: z.string().max(512).optional().default(""),
    title: z.string().min(1).max(120),
    subtitle: z.string().max(255).optional().default(""),
    linkUrl: z.string().max(512).optional().default(""),
    ctaLabel: z.string().max(80).optional().default(""),
  })
  .superRefine((card, ctx) => {
    const image = String(card.imageUrl || "").trim();
    const video = String(card.videoUrl || "").trim();

    if (card.mediaType === "image" && !image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Image is required for image cards",
        path: ["imageUrl"],
      });
    }

    if (card.mediaType === "video" && !video) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Video URL is required for video cards",
        path: ["videoUrl"],
      });
    }
  });

export type PromoBannerCardInput = z.infer<typeof promoBannerCardSchema>;

export const promoBannerResponseSchema = z.object({
  id: z.number(),
  name: z.string().nullable().optional(),
  text: z.string(),
  cards: z.array(promoBannerCardSchema),
  backgroundColor: z.enum(["yellow", "red"]),
  isActive: z.boolean(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  displayDurationHours: z.number().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const scheduleFields = {
  isActive: z.boolean().default(false),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  displayDurationHours: z.number().int().positive().nullable().optional(),
};

export const createPromoBannerCardsRequestSchema = z.object({
  name: z.string().min(1).max(255),
  cards: z.array(promoBannerCardSchema).min(1).max(12),
  ...scheduleFields,
});

export const createPromoBannerStripRequestSchema = z.object({
  text: z.string().min(1).max(255),
  backgroundColor: z.enum(["yellow", "red"]).default("yellow"),
  ...scheduleFields,
});

export const createPromoBannerRequestSchema = z.union([
  createPromoBannerCardsRequestSchema,
  createPromoBannerStripRequestSchema,
]);

export const updatePromoBannerCardsRequestSchema =
  createPromoBannerCardsRequestSchema.partial();
export const updatePromoBannerStripRequestSchema =
  createPromoBannerStripRequestSchema.partial();

export const updatePromoBannerRequestSchema = z.union([
  updatePromoBannerCardsRequestSchema,
  updatePromoBannerStripRequestSchema,
]);

export type CreatePromoBannerRequest = z.infer<
  typeof createPromoBannerRequestSchema
>;
export type UpdatePromoBannerRequest = z.infer<
  typeof updatePromoBannerRequestSchema
>;
