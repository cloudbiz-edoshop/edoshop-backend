import { z } from "zod";

import { filtersSchema } from "./filters";

// Common query parameters that apply to all endpoints
const commonQueryParamsSchema = z.object({
  search: z
    .string()
    .default("")
    .openapi({
      param: {
        name: "search",
        in: "query",
        required: false,
      },
      example: "nabeel",
    }),
  page: z.coerce
    .number()
    .default(1)
    .openapi({
      param: {
        name: "page",
        in: "query",
        required: false,
      },
      default: 1,
    }),
  limit: z.coerce
    .number()
    .default(10)
    .openapi({
      param: {
        name: "limit",
        in: "query",
        required: false,
      },
      default: 10,
    }),
  sortBy: z
    .string()
    .default("createdAt")
    .openapi({
      param: {
        name: "sortBy",
        in: "query",
        required: false,
      },
      default: "createdAt",
    }),
  sortOrder: z
    .enum(["asc", "desc"])
    .default("desc")
    .openapi({
      param: {
        name: "sortOrder",
        in: "query",
        required: false,
      },
      default: "desc",
    }),
  filters: filtersSchema,
});
export interface CommonQueryParams {
  search?: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, any>;
};

export default commonQueryParamsSchema;
