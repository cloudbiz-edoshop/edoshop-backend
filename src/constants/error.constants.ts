import * as HttpStatusPhrases from "@/lib/http-status-phrases";
import { createMessageObjectSchema } from "@/lib/openapi/schemas";

/**
 * Zod error messages used across the application
 */
export const ZOD_ERROR_MESSAGES = {
  REQUIRED: "Required",
  EXPECTED_NUMBER: "Expected number, received nan",
  NO_UPDATES: "No updates provided",
};

/**
 * Zod error codes used across the application
 */
export const ZOD_ERROR_CODES = {
  INVALID_UPDATES: "invalid_updates",
};

/**
 * Schema for not found responses
 */
export const notFoundSchema = createMessageObjectSchema(
  HttpStatusPhrases.NOT_FOUND,
);
