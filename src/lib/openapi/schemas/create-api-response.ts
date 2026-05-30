import type { ZodSchema } from "@/lib/types";

import { z } from "@hono/zod-openapi";

import paginationSchema from "@/lib/openapi/schemas/pagination";
/**
 * Creates a standardized API success response schema
 * @param schema The schema for the data property
 * @param message The message to show in the response
 * @param example Optional example data to show in the OpenAPI docs
 */
export const createSuccessResponseSchema = <T extends ZodSchema>(
  schema: T,
  message: string = "Success",
  example?: z.infer<T>,
) => {
  return z
    .object({
      success: z.boolean().openapi({ example: true }).default(true),
      message: z.string().openapi({ example: message }),
      data: schema.openapi({
        example: example ?? undefined,
      }),
      meta: z
        .looseObject({
          pagination: paginationSchema.optional(),
        })
        .optional(),
    })
    .describe(message);
};

/**
 * Creates a standardized API success response schema
 * @param schema The schema for the data property
 * @param message The message to show in the response
 * @param example Optional example data to show in the OpenAPI docs
 */
export const createSuccessResponseSchemaWithPagination = <T extends ZodSchema>(
  schema: T,
  message: string = "Success",
  example?: z.infer<T>,
) => {
  return z
    .object({
      success: z.boolean().openapi({ example: true }).default(true),
      message: z.string().openapi({ example: message }),
      data: schema.openapi({
        example: example ?? undefined,
      }),
      meta: z
        .looseObject({
          pagination: paginationSchema,
          searchableFields: z
            .array(z.string())
            .optional()
            .openapi({
              example: ["field1", "field2"],
            }),
        }),
    })
    .describe(message);
};

/**
 * Creates a standardized API error response schema
 */
export const createErrorResponseSchema = (
  code: number = 500,
  message: string = "Internal server error",
  details?: unknown,
) => {
  return z
    .object({
      success: z.boolean().openapi({ example: false }).default(false),
      message: z.string().openapi({ example: message }),
      error: z.object({
        code: z.number().openapi({ example: code }),
        message: z.string().openapi({ example: message }),
        details: z.any().optional().openapi({ example: details }),
      }),
    })
    .describe(message);
};

/**
 * Creates a standardized validation error response schema
 */
export const createValidationErrorSchema = <T extends ZodSchema>(
  schema: T,
  message: string = "Validation error",
) => {
  const { error } = schema.safeParse(undefined);

  return z
    .object({
      success: z.boolean().openapi({ example: false }).default(false),
      message: z.string().openapi({ example: message }),
      error: z.object({
        code: z.number().openapi({ example: 422 }),
        message: z.string().openapi({ example: message }),
        details: z
          .object({
            issues: z.array(
              z.object({
                code: z.string(),
                path: z.array(z.union([z.string(), z.number()])),
                message: z.string().optional(),
              }),
            ),
            name: z.string(),
          })
          .openapi({
            example: error,
          }),
      }),
    })
    .describe(message);
};

/**
 * Creates a standardized API not found response schema
 */
export const createNotFoundSchema = (exampleMessage: string = "Not Found") => {
  return z
    .object({
      success: z.boolean().openapi({ example: false }).default(false),
      error: z.object({
        code: z.number().openapi({ example: 404 }),
        message: z.string().openapi({ example: exampleMessage }),
      }),
    })
    .describe(exampleMessage);
};
