import { z } from "@hono/zod-openapi";

import {
  AboutUsImageDisplayStyle,
  AboutUsImagePosition,
} from "@/constants/about-us-image.constants";
import { aboutUsSchema } from "@/db/models/about-us";

export const aboutUsImageSchema = z.object({
  imageUrl: z.string().trim().min(1).max(2048).describe("AboutUs image URL"),
  displayStyle: z
    .enum([
      AboutUsImageDisplayStyle.SINGLE,
      AboutUsImageDisplayStyle.COLLAGE,
      AboutUsImageDisplayStyle.GALLERY,
    ])
    .default(AboutUsImageDisplayStyle.SINGLE)
    .describe("AboutUs image display style"),
  sortOrder: z.coerce.number().int().min(0).default(0).describe("Sort order"),
});

export type AboutUsImageInput = z.infer<typeof aboutUsImageSchema>;

const aboutUsBaseFields = {
  title: z.string().trim().min(1).max(255).describe("AboutUs title"),
  heading: z.string().trim().min(1).max(255).describe("AboutUs heading"),
  text: z.string().trim().min(1).max(255).describe("AboutUs text"),
  primaryButtonText: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .describe("AboutUs primary button text"),
  delay: z.coerce.number().min(1).max(99999999.99).describe("AboutUs delay"),
  date: z.string().trim().min(1).describe("AboutUs date"),
  imagePosition: z
    .enum([AboutUsImagePosition.LEFT, AboutUsImagePosition.RIGHT])
    .default(AboutUsImagePosition.RIGHT)
    .describe("AboutUs image position"),
  images: z
    .array(aboutUsImageSchema)
    .min(1, "At least one image is required")
    .describe("AboutUs images"),
  imageUrl: z.string().trim().optional().describe("Legacy primary image URL"),
};

// Create aboutUs request schema
export const createAboutUsRequestSchema = z.object(aboutUsBaseFields);

export type CreateAboutUsRequest = z.infer<typeof createAboutUsRequestSchema>;

// Create aboutUs response schema
export const createAboutUsResponseSchema = aboutUsSchema;

export type CreateAboutUsResponse = z.infer<typeof createAboutUsResponseSchema>;

// Update aboutUs request schema
export const updateAboutUsRequestSchema = z
  .object({
    ...aboutUsBaseFields,
    images: aboutUsBaseFields.images.optional(),
  })
  .partial();

export type UpdateAboutUsRequest = z.infer<typeof updateAboutUsRequestSchema>;

// Get aboutUs response schema
export const getAboutUsResponseSchema = aboutUsSchema;

export type GetAboutUsResponse = z.infer<typeof getAboutUsResponseSchema>;

// List aboutUs response schema
export const listAboutUsResponseSchema = z.array(getAboutUsResponseSchema);

export type ListAboutUsResponse = z.infer<typeof listAboutUsResponseSchema>;
