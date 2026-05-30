import { z } from "@hono/zod-openapi";

import { testimonialsSchema } from "@/db/models/testimonials";
import { nameSchema } from "@/lib/zod-schemas";

// Create testimonials request schema
export const createTestimonialsRequestSchema = z.object({
  order: z.number().int().min(1).describe("Testimonials order"),
  authorName: nameSchema.describe("Testimonials author name"),
  authorTitle: z.string().trim().min(2).max(20).describe("Testimonials author title"),
  testimonial: z.string().trim().min(10).max(50).describe("Testimonials testimonial"),
  imageUrl: z.string().describe("Testimonials image url"),
});

export type CreateTestimonialsRequest = z.infer<
  typeof createTestimonialsRequestSchema
>;

// Create testimonials response schema
export const createTestimonialsResponseSchema = testimonialsSchema;

export type CreateTestimonialsResponse = z.infer<
  typeof createTestimonialsResponseSchema
>;

// Update testimonials request schema
export const updateTestimonialsRequestSchema =
  createTestimonialsRequestSchema.partial();

export type UpdateTestimonialsRequest = z.infer<
  typeof updateTestimonialsRequestSchema
>;

// Get testimonials response schema
export const getTestimonialsResponseSchema = testimonialsSchema;

export type GetTestimonialsResponse = z.infer<
  typeof getTestimonialsResponseSchema
>;

// List testimonials response schema
export const listTestimonialsResponseSchema = z.array(
  getTestimonialsResponseSchema,
);

export type ListTestimonialsResponse = z.infer<
  typeof listTestimonialsResponseSchema
>;
