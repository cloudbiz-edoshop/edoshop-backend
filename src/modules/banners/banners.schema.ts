import { z } from "@hono/zod-openapi";

import { bannersSchema } from "@/db/models/banners";

// Create banners request schema
export const createBannersRequestSchema = z.object({
  heading: z.string().min(1).max(255).describe("Banners heading"),
  headingFontColor: z
    .string()
    .min(1)
    .max(255)
    .describe("Banners heading font color"),
  headingFontSize: z
    .string()
    .min(1)
    .max(255)
    .describe("Banners heading font size"),
  headingFontWeight: z
    .string()
    .min(1)
    .max(255)
    .describe("Banners heading font weight"),
  subtext: z.string().min(1).max(255).describe("Banners subtext"),
  subtextFontColor: z
    .string()
    .min(1)
    .max(255)
    .describe("Banners subtext font color"),
  subtextFontSize: z
    .string()
    .min(1)
    .max(255)
    .describe("Banners subtext font size"),
  subtextFontWeight: z
    .string()
    .min(1)
    .max(255)
    .describe("Banners subtext font weight"),
  primaryButtonText: z
    .string()
    .min(1)
    .max(255)
    .describe("Banners primary button text"),
  secondaryButtonText: z
    .string()
    .min(1)
    .max(255)
    .describe("Banners secondary button text"),
  delay: z.string().min(1).max(255).describe("Banners delay"),
  date: z.string().min(1).max(255).describe("Banners date"),
  imageUrl: z.string().max(255).describe("Banners image url"),
});

export type CreateBannersRequest = z.infer<typeof createBannersRequestSchema>;

// Create banners response schema
export const createBannersResponseSchema = bannersSchema;

export type CreateBannersResponse = z.infer<typeof createBannersResponseSchema>;

// Update banners request schema
export const updateBannersRequestSchema = createBannersRequestSchema.partial();

export type UpdateBannersRequest = z.infer<typeof updateBannersRequestSchema>;

// Get banners response schema
export const getBannersResponseSchema = bannersSchema;

export type GetBannersResponse = z.infer<typeof getBannersResponseSchema>;

// List banners response schema
export const listBannersResponseSchema = z.array(getBannersResponseSchema);

export type ListBannersResponse = z.infer<typeof listBannersResponseSchema>;
