import { z } from "@hono/zod-openapi";

import { faqsSchema } from "@/db/models/faqs";

// Create faqs request schema
export const createFaqsRequestSchema = z.object({
  order: z.number().describe("Faqs order"),
  question: z.string().describe("Faqs question"),
  answer: z.string().describe("Faqs answer"),
});

export type CreateFaqsRequest = z.infer<typeof createFaqsRequestSchema>;

// Create faqs response schema
export const createFaqsResponseSchema = faqsSchema;

export type CreateFaqsResponse = z.infer<typeof createFaqsResponseSchema>;

// Update faqs request schema
export const updateFaqsRequestSchema = createFaqsRequestSchema.partial();

export type UpdateFaqsRequest = z.infer<typeof updateFaqsRequestSchema>;

// Get faqs response schema
export const getFaqsResponseSchema = faqsSchema;

export type GetFaqsResponse = z.infer<typeof getFaqsResponseSchema>;

// List faqs response schema
export const listFaqsResponseSchema = z.array(getFaqsResponseSchema);

export type ListFaqsResponse = z.infer<typeof listFaqsResponseSchema>;
