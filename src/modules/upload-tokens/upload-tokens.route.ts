import { createRoute, z } from "@hono/zod-openapi";

import { EntityType } from "@/constants/entities.constants";
import { OperationType } from "@/constants/operations.constants";
import { jwtMiddleware } from "@/core/middlewares";
import { rolesAndPermissionsMiddleware } from "@/core/middlewares/roles-and-permissions";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import {
  commonErrorResponses,
  jsonContent,
} from "@/lib/openapi/helpers";
import { createSuccessResponseSchema } from "@/lib/openapi/schemas/create-api-response";
import { jwtHeaderSchema } from "@/lib/zod-schemas/common-schemas";

import {
  uploadTokenResponseSchema,
  validateTokenResponseSchema,
} from "./upload-tokens.schema";

const tags = ["Upload Tokens"];

const entryIdParam = z.object({
  entryId: z.string().openapi({
    param: {
      name: "entryId",
      in: "path",
      required: true,
      description: "The ID of the entry",
    },
    example: "1",
  }),
});

const tokenParam = z.object({
  token: z.string().openapi({
    param: {
      name: "token",
      in: "path",
      required: true,
      description: "The upload token",
    },
    example: "abc123def456",
  }),
});

// JWT-protected: Generate upload token for an entry
export const generateUploadTokenRoute = createRoute({
  path: "/entries/{entryId}/upload-token",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.UPDATE },
    ]),
  ] as const,
  summary: "Generate an upload token for an entry",
  description: "Generates a temporary upload token that can be used for QR code-based mobile uploads. Token expires in 30 minutes.",
  request: {
    headers: jwtHeaderSchema,
    params: entryIdParam,
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(uploadTokenResponseSchema),
      "Upload token generated",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

// Unprotected: Validate upload token
export const validateUploadTokenRoute = createRoute({
  path: "/upload-token/{token}/validate",
  method: "get",
  tags,
  summary: "Validate an upload token",
  description: "Validates an upload token and returns entry information. No authentication required.",
  request: {
    params: tokenParam,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(validateTokenResponseSchema),
      "Token validation result",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.INTERNAL_SERVER_ERROR],
      z.object({}),
    ),
  },
});

export type GenerateUploadTokenRoute = typeof generateUploadTokenRoute;
export type ValidateUploadTokenRoute = typeof validateUploadTokenRoute;
