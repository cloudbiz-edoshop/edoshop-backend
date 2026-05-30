import { z } from "@hono/zod-openapi";

import { aboutUsSchema } from "@/db/models/about-us";

// Create aboutUs request schema
export const createAboutUsRequestSchema = z.object({
  title: z.string().trim().min(1).max(255).describe("AboutUs title"),
  heading: z.string().trim().min(1).max(255).describe("AboutUs heading"),
  text: z.string().trim().min(1).max(255).describe("AboutUs text"),
  primaryButtonText: z.string().trim().min(1).max(255).describe("AboutUs primary button text"),
  delay: z.coerce.number().min(1).max(99999999.99).describe("AboutUs delay"),
  date: z.string().trim().min(1).describe("AboutUs date"),
  imageUrl: z.string().trim().describe("AboutUs image URL"),
});

export type CreateAboutUsRequest = z.infer<typeof createAboutUsRequestSchema>;

// Create aboutUs response schema
export const createAboutUsResponseSchema = aboutUsSchema;

export type CreateAboutUsResponse = z.infer<typeof createAboutUsResponseSchema>;

// Update aboutUs request schema
export const updateAboutUsRequestSchema = createAboutUsRequestSchema.partial();

export type UpdateAboutUsRequest = z.infer<typeof updateAboutUsRequestSchema>;

// Get aboutUs response schema
export const getAboutUsResponseSchema = aboutUsSchema;

export type GetAboutUsResponse = z.infer<typeof getAboutUsResponseSchema>;

// List aboutUs response schema
export const listAboutUsResponseSchema = z.array(getAboutUsResponseSchema);

export type ListAboutUsResponse = z.infer<typeof listAboutUsResponseSchema>;
