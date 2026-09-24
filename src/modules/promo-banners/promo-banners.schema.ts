import { z } from "@hono/zod-openapi";

export const MIN_PROMO_BANNER_CARDS = 6;
export const MAX_PROMO_BANNER_CARDS = 12;

const promoBannerCardFieldsSchema = z.object({
  mediaType: z.enum(["image", "video"]),
  cardFormat: z.enum(["square", "rectangle"]).default("rectangle"),
  imageUrl: z.string().max(512).optional().default(""),
  videoUrl: z.string().max(512).optional().default(""),
  title: z.string().max(120).optional().default(""),
  subtitle: z.string().max(255).optional().default(""),
  linkUrl: z.string().max(512).optional().default(""),
  ctaLabel: z.string().max(80).optional().default(""),
});

const refinePromoBannerCard = (
  card: z.infer<typeof promoBannerCardFieldsSchema>,
  ctx: z.RefinementCtx,
) => {
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
};

export const promoBannerCardSchema =
  promoBannerCardFieldsSchema.superRefine(refinePromoBannerCard);

export type PromoBannerCardInput = z.infer<typeof promoBannerCardSchema>;

const refinePromoCardSet = (
  data: { cards?: PromoBannerCardInput[] },
  ctx: z.RefinementCtx,
  { requireCards = true }: { requireCards?: boolean } = {},
) => {
  const cards = data.cards;
  if (cards === undefined) {
    return;
  }

  if (requireCards && cards.length < MIN_PROMO_BANNER_CARDS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `At least ${MIN_PROMO_BANNER_CARDS} promo cards are required`,
      path: ["cards"],
    });
  }

  if (cards.length > MAX_PROMO_BANNER_CARDS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `At most ${MAX_PROMO_BANNER_CARDS} promo cards are allowed`,
      path: ["cards"],
    });
  }

  const squareCount = cards.filter((card) => card.cardFormat === "square").length;
  if (squareCount % 2 !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Square cards (600×600) must be uploaded in pairs to fill one 5:8 portrait slot",
      path: ["cards"],
    });
  }
};

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

const scheduleFieldsOptional = {
  isActive: z.boolean().optional(),
  scheduleType: z.enum(["permanent", "temporary"]).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  displayDurationHours: z.number().int().positive().nullable().optional(),
};

const refinePromoSchedule = (
  data: {
    scheduleType?: "permanent" | "temporary";
    startsAt?: string | null;
    endsAt?: string | null;
  },
  ctx: z.RefinementCtx,
) => {
  if (data.scheduleType !== "temporary") {
    return;
  }
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
};

const promoBannerCardsFieldsSchema = z.object({
  name: z.string().min(1).max(255),
  cards: z
    .array(promoBannerCardSchema)
    .min(MIN_PROMO_BANNER_CARDS)
    .max(MAX_PROMO_BANNER_CARDS),
  ...scheduleFields,
});

const promoBannerCardsUpdateFieldsSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  cards: z
    .array(promoBannerCardSchema)
    .min(MIN_PROMO_BANNER_CARDS)
    .max(MAX_PROMO_BANNER_CARDS)
    .optional(),
  ...scheduleFieldsOptional,
});

const promoBannerStripFieldsSchema = z.object({
  text: z.string().min(1).max(255),
  backgroundColor: z.enum(["yellow", "red"]).default("yellow"),
  ...scheduleFields,
});

const promoBannerStripUpdateFieldsSchema = z.object({
  text: z.string().min(1).max(255).optional(),
  backgroundColor: z.enum(["yellow", "red"]).optional(),
  ...scheduleFieldsOptional,
});

export const createPromoBannerCardsRequestSchema =
  promoBannerCardsFieldsSchema
    .superRefine((data, ctx) => refinePromoCardSet(data, ctx, { requireCards: true }))
    .superRefine(refinePromoSchedule);

export const createPromoBannerStripRequestSchema =
  promoBannerStripFieldsSchema.superRefine(refinePromoSchedule);

export const createPromoBannerRequestSchema = z.union([
  createPromoBannerCardsRequestSchema,
  createPromoBannerStripRequestSchema,
]);

export const updatePromoBannerCardsRequestSchema =
  promoBannerCardsUpdateFieldsSchema
    .superRefine((data, ctx) =>
      refinePromoCardSet(data, ctx, { requireCards: true }),
    )
    .superRefine(refinePromoSchedule);

export const updatePromoBannerStripRequestSchema =
  promoBannerStripUpdateFieldsSchema.superRefine(refinePromoSchedule);

export const updatePromoBannerRequestSchema = z.union([
  updatePromoBannerCardsRequestSchema,
  updatePromoBannerStripRequestSchema,
]);
