import { z } from "@hono/zod-openapi";

export const promoBannerCardSchema = z
  .object({
    mediaType: z.enum(["image", "video"]),
    cardFormat: z.enum(["square", "rectangle"]).default("rectangle"),
    imageUrl: z.string().max(512).optional().default(""),
    videoUrl: z.string().max(512).optional().default(""),
    title: z.string().max(120).optional().default(""),
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
        message: "Video is required for video cards",
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
  scheduleType: z.enum(["permanent", "temporary"]).optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  displayDurationHours: z.number().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const scheduleFields = {
  isActive: z.boolean().default(false),
  scheduleType: z.enum(["permanent", "temporary"]).default("permanent"),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  displayDurationHours: z.number().int().positive().nullable().optional(),
};

const withScheduleRefine = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((data, ctx) => {
    if (data.scheduleType !== "temporary") return;
    if (!data.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date/time is required for temporary promos",
        path: ["startsAt"],
      });
    }
    if (!data.endsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date/time is required for temporary promos",
        path: ["endsAt"],
      });
    }
    if (data.startsAt && data.endsAt) {
      const start = new Date(data.startsAt);
      const end = new Date(data.endsAt);
      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End must be after start",
          path: ["endsAt"],
        });
      }
    }
  });

const promoBannerCardsObjectSchema = z.object({
  name: z.string().min(1).max(255),
  cards: z.array(promoBannerCardSchema).min(1).max(12),
  ...scheduleFields,
});

const promoBannerStripObjectSchema = z.object({
  text: z.string().min(1).max(255),
  backgroundColor: z.enum(["yellow", "red"]).default("yellow"),
  ...scheduleFields,
});

export const createPromoBannerCardsRequestSchema = withScheduleRefine(
  promoBannerCardsObjectSchema,
);

export const createPromoBannerStripRequestSchema = withScheduleRefine(
  promoBannerStripObjectSchema,
);

export const createPromoBannerRequestSchema = z.union([
  createPromoBannerCardsRequestSchema,
  createPromoBannerStripRequestSchema,
]);

export const updatePromoBannerCardsRequestSchema = withScheduleRefine(
  promoBannerCardsObjectSchema.partial(),
);
export const updatePromoBannerStripRequestSchema = withScheduleRefine(
  promoBannerStripObjectSchema.partial(),
);

export const updatePromoBannerRequestSchema = z.union([
  updatePromoBannerCardsRequestSchema,
  updatePromoBannerStripRequestSchema,
]);
