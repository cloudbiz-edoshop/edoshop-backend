import { z } from "@hono/zod-openapi";

import { userSchema } from "../users/users.schema";

export const adminAccessLogItemSchema = z.object({
  id: z.number(),
  userId: z.number().nullable().optional(),
  loginIdentifier: z.string().nullable().optional(),
  authMethod: z.string(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  success: z.boolean(),
  failureReason: z.string().nullable().optional(),
  createdAt: z.string(),
  user: userSchema
    .pick({
      id: true,
      fullName: true,
      username: true,
      email: true,
    })
    .nullable()
    .optional(),
});

export const listAdminAccessLogsResponseSchema = z.array(
  adminAccessLogItemSchema,
);

export type ListAdminAccessLogsResponse = z.infer<
  typeof listAdminAccessLogsResponseSchema
>;
