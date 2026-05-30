import { z } from "zod";

// Accepts JSON strings for filters param.
export const filtersSchema = z

  .string()
  .optional()
  .transform((str, ctx) => {
    if (!str) {
      return undefined;
    }

    try {
      // Use JSON.parse for standard JSON parsing
      return JSON.parse(str);
    } catch (e) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid JSON in filters parameter",
      });
      console.error(e);
      return z.NEVER;
    }
  })
  .openapi({
    param: {
      name: "filters",
      in: "query",
      required: false,
      description: "JSON string with additional filter options",
    },
    default: "{}",
  });
