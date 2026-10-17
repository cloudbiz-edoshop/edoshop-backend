import { z } from "@hono/zod-openapi";

export const clientEventRequestSchema = z
  .object({
    surface: z.enum(["admin", "storefront"]),
    kind: z.enum(["js_error", "api_error", "unhandled_rejection"]),
    message: z.string().min(1).max(2000),
    url: z.string().max(2000).optional(),
    apiPath: z.string().max(500).optional(),
    statusCode: z.number().int().min(100).max(599).optional(),
    stack: z.string().max(4000).optional(),
  })
  .openapi("ClientObservabilityEvent");
