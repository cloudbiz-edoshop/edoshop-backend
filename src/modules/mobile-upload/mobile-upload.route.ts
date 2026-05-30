import { createRoute, z } from "@hono/zod-openapi";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import {
  commonErrorResponses,
  jsonContent,
  jsonContentRequired,
} from "@/lib/openapi/helpers";
import { createSuccessResponseSchema } from "@/lib/openapi/schemas/create-api-response";

import {
  mobileDeleteImagesRequestSchema,
  mobileDeleteImagesResponseSchema,
  mobileImagesListResponseSchema,
  mobileUploadResponseSchema,
} from "./mobile-upload.schema";

const tags = ["Mobile Upload"];

const tokenParam = z.object({
  token: z.string().openapi({
    param: {
      name: "token",
      in: "path",
      required: true,
      description: "The upload token for mobile upload",
    },
    example: "abc123def456",
  }),
});

// Unprotected: Upload images via mobile using a token
export const mobileUploadRoute = createRoute({
  path: "/mobile-upload/{token}",
  method: "post",
  tags,
  summary: "Upload images via mobile",
  description: "Upload images using an upload token. No authentication required. Validates token server-side.",
  request: {
    params: tokenParam,
    body: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: z.object({
            files: z
              .union([
                z.array(
                  z.any().openapi({
                    type: "string",
                    format: "binary",
                  }),
                ),
                z.any().openapi({
                  type: "string",
                  format: "binary",
                }),
              ])
              .openapi({
                description: "The image files to upload",
              }),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(mobileUploadResponseSchema),
      "Images uploaded successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

// Unprotected: List images for an entry using a token
export const mobileListImagesRoute = createRoute({
  path: "/mobile-upload/{token}/images",
  method: "get",
  tags,
  summary: "List images via mobile token",
  description: "Get all images for the entry associated with the upload token. No authentication required.",
  request: {
    params: tokenParam,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(mobileImagesListResponseSchema),
      "Images retrieved successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

export const mobileDeleteImagesRoute = createRoute({
  path: "/mobile-upload/{token}/images",
  method: "delete",
  tags,
  summary: "Delete images via mobile token",
  description:
    "Delete images for the entry associated with the upload token. No authentication required.",
  request: {
    params: tokenParam,
    body: jsonContentRequired(
      mobileDeleteImagesRequestSchema,
      "Files to delete",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(mobileDeleteImagesResponseSchema),
      "Images deleted successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      mobileDeleteImagesRequestSchema,
    ),
  },
});

export type MobileUploadRoute = typeof mobileUploadRoute;
export type MobileListImagesRoute = typeof mobileListImagesRoute;
export type MobileDeleteImagesRoute = typeof mobileDeleteImagesRoute;
