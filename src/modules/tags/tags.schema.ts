import { z } from "@hono/zod-openapi";

import { tagsSchema } from "@/db/models/tags";

// Create tags request schema
export const createTagsRequestSchema = z.object({
  name: z.string().describe("Tags name"),
  description: z.string().describe("Tags description"),
});

export type CreateTagsRequest = z.infer<typeof createTagsRequestSchema>;

// Create tags response schema
export const createTagsResponseSchema = tagsSchema;

export type CreateTagsResponse = z.infer<typeof createTagsResponseSchema>;

// Update tags request schema
export const updateTagsRequestSchema = createTagsRequestSchema.partial();

export type UpdateTagsRequest = z.infer<typeof updateTagsRequestSchema>;

// Get tags response schema
export const getTagsResponseSchema = tagsSchema;

export type GetTagsResponse = z.infer<typeof getTagsResponseSchema>;

// List tags response schema
export const listTagsResponseSchema = z.array(getTagsResponseSchema);

export type ListTagsResponse = z.infer<typeof listTagsResponseSchema>;
