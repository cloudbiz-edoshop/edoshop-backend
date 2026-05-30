import { z } from "@hono/zod-openapi";

const paginationSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export type PaginationSchema = z.infer<typeof paginationSchema>;

export default paginationSchema;
