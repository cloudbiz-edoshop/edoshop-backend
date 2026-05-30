import { z } from "zod";

export const createReviewSchema = z.object({
  productId: z.number(),
  review: z.string().min(1).max(1000),
  rating: z.number().min(0).max(5).default(0).describe("Rating from 0 to 5 stars"),
  statusId: z.number(),
  itemsReceived: z.number().optional(),
  itemsRejected: z.number().optional(),
});

export type CreateReviewRequest = z.infer<typeof createReviewSchema>;

export const updateReviewStatusSchema = z.object({
  statusId: z.number(),
});

export type UpdateReviewStatusRequest = z.infer<
  typeof updateReviewStatusSchema
>;
