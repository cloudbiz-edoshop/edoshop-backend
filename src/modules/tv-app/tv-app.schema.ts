import { z } from "@hono/zod-openapi";

export const tvMediaTypeSchema = z.enum(["image", "video"]);
export const tvCatalogModeSchema = z.enum(["all", "selected"]);

export const tvSettingsResponseSchema = z.object({
  id: z.number(),
  magazineVersion: z.number(),
  invitationTitle: z.string(),
  iosUrl: z.string().nullable().optional(),
  androidUrl: z.string().nullable().optional(),
  fallbackUrl: z.string().nullable().optional(),
  qrTargetUrl: z.string().nullable().optional(),
  catalogMode: tvCatalogModeSchema,
  includeBanners: z.boolean(),
  updatedAt: z.string(),
});

export const updateTvSettingsRequestSchema = z.object({
  invitationTitle: z.string().min(1).optional(),
  iosUrl: z.string().url().nullable().optional(),
  androidUrl: z.string().url().nullable().optional(),
  fallbackUrl: z.string().url().nullable().optional(),
  qrTargetUrl: z.string().url().nullable().optional(),
  catalogMode: tvCatalogModeSchema.optional(),
  includeBanners: z.boolean().optional(),
});

export const tvAdResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  mediaType: tvMediaTypeSchema,
  mediaUrl: z.string(),
  isActive: z.boolean(),
  displayOrder: z.number(),
  displayDurationMs: z.number(),
  isPermanent: z.boolean(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createTvAdRequestSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  mediaType: tvMediaTypeSchema.default("image"),
  mediaUrl: z.string().url(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  displayDurationMs: z.number().int().positive().default(8000),
  isPermanent: z.boolean().default(false),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
});

export const updateTvAdRequestSchema = createTvAdRequestSchema.partial();

export const tvDeviceResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  deviceKey: z.string(),
  isActive: z.boolean(),
  lastSeenAt: z.string().nullable().optional(),
  registeredAt: z.string(),
  revokedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const createTvDeviceRequestSchema = z.object({
  name: z.string().min(1),
  deviceKey: z.string().min(3).max(128).optional(),
});

export const createTvDeviceResponseSchema = tvDeviceResponseSchema.extend({
  deviceSecret: z.string(),
});

export const updateTvDeviceRequestSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const tvCatalogSelectionSchema = z.object({
  id: z.number(),
  productId: z.number(),
  displayOrder: z.number(),
  isActive: z.boolean(),
  productName: z.string().optional(),
  storeId: z.number().nullable().optional(),
});

export const updateTvCatalogRequestSchema = z.object({
  catalogMode: tvCatalogModeSchema,
  productIds: z.array(z.number().int().positive()).default([]),
});

export const tvAuthTokenRequestSchema = z.object({
  deviceKey: z.string().min(1),
  deviceSecret: z.string().min(1),
});

export const tvAuthRefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export const tvAuthTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.literal("Bearer"),
});

export const tvMagazineVersionResponseSchema = z.object({
  magazineVersion: z.number(),
  generatedAt: z.string(),
});

export const tvHowItWorksVideoSchema = z.object({
  id: z.string(),
  url: z.string(),
  posterUrl: z.string().nullable().optional(),
  language: z.string(),
  keepOriginalAudio: z.literal(true),
});

export type TvSettingsResponse = z.infer<typeof tvSettingsResponseSchema>;
export type TvAdResponse = z.infer<typeof tvAdResponseSchema>;
export type TvDeviceResponse = z.infer<typeof tvDeviceResponseSchema>;
export type UpdateTvSettingsRequest = z.infer<typeof updateTvSettingsRequestSchema>;
export type CreateTvAdRequest = z.infer<typeof createTvAdRequestSchema>;
export type UpdateTvAdRequest = z.infer<typeof updateTvAdRequestSchema>;
export type CreateTvDeviceRequest = z.infer<typeof createTvDeviceRequestSchema>;
export type UpdateTvDeviceRequest = z.infer<typeof updateTvDeviceRequestSchema>;
export type UpdateTvCatalogRequest = z.infer<typeof updateTvCatalogRequestSchema>;
