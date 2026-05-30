import { z } from "@hono/zod-openapi";

import { notificationsSchema } from "@/db/models/notifications";

// Create notifications request schema
export const createNotificationsRequestSchema = z.object({
  title: z
    .string({
      error: "Title must be a string.", // Generic error for type/required issues
    })
    .trim()
    .min(1, { message: "Title cannot be empty." }) // Specific error for min length
    .max(255, { message: "Title cannot exceed 255 characters." }) // Specific error for max length
    .describe("Notifications title"),
  message: z
    .string({
      error: "Message must be a string.",
    })
    .trim()
    .min(1, { message: "Message cannot be empty." })
    .max(255, { message: "Message cannot exceed 255 characters." })
    .describe("Notifications message"),
  notificationTypeId: z
    .number({
      error: "Notification type ID must be a number.",
    })
    .describe("Notifications notification type id"),
  notificationFrequencyId: z
    .number({
      error: "Notification frequency ID must be a number.",
    })
    .describe("Notifications notification frequency id"),
  recipientTypeId: z
    .number({
      error: "Recipient type ID must be a number.",
    })
    .describe("Notifications recipient type id"),
  recipientIds: z
    .array(
      z.number({
        error: "Each recipient ID must be a number.",
      }),
      {
        error: "Recipient IDs must be an array of numbers.",
      },
    )
    .optional()
    .describe("Notifications recipient ids"),
});

export type CreateNotificationsRequest = z.infer<
  typeof createNotificationsRequestSchema
>;

// Create notifications response schema
export const createNotificationsResponseSchema = notificationsSchema;

export type CreateNotificationsResponse = z.infer<
  typeof createNotificationsResponseSchema
>;

// Update notifications request schema
export const updateNotificationsRequestSchema =
  createNotificationsRequestSchema.partial();

export type UpdateNotificationsRequest = z.infer<
  typeof updateNotificationsRequestSchema
>;

// Get notifications response schema
export const getNotificationsResponseSchema = notificationsSchema;

export type GetNotificationsResponse = z.infer<
  typeof getNotificationsResponseSchema
>;

// List notifications response schema
export const listNotificationsResponseSchema = z.array(
  getNotificationsResponseSchema,
);

export type ListNotificationsResponse = z.infer<
  typeof listNotificationsResponseSchema
>;
