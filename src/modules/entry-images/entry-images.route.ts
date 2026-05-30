import { createRoute, z } from "@hono/zod-openapi";

import { EntityType } from "@/constants/entities.constants";
import { OperationType } from "@/constants/operations.constants";
import { jwtMiddleware } from "@/core/middlewares";
import { rolesAndPermissionsMiddleware } from "@/core/middlewares/roles-and-permissions";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import {
  commonErrorResponses,
  jsonContent,
  jsonContentRequired,
} from "@/lib/openapi/helpers";
import { createSuccessResponseSchema } from "@/lib/openapi/schemas/create-api-response";
import { jwtHeaderSchema } from "@/lib/zod-schemas/common-schemas";

import {
  deleteEntryImagesResponseSchema,
  deleteEntryImagesSchema,
  entryImagesListResponseSchema,
  entryImageUploadResponseSchema,
} from "./entry-images.schema";

const tags = ["Entry Images"];

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

export const listEntryImagesRoute = createRoute({
  path: "/entries/{entryId}/images",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.READ },
    ]),
  ] as const,
  summary: "List images for an entry",
  description: "Get all images associated with a specific entry",
  request: {
    headers: jwtHeaderSchema,
    params: entryIdParam,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(entryImagesListResponseSchema),
      "The list of entry images",
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

export const uploadEntryImagesRoute = createRoute({
  path: "/entries/{entryId}/images",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.UPDATE },
    ]),
  ] as const,
  summary: "Upload images for an entry",
  description: "Upload one or more images for a specific entry (max 2 total)",
  request: {
    headers: jwtHeaderSchema,
    params: entryIdParam,
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
                description: "The image files to upload (max 2 total per entry)",
              }),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(entryImageUploadResponseSchema),
      "Images uploaded successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

export const replaceEntryImagesRoute = createRoute({
  path: "/entries/{entryId}/images/replace",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.UPDATE },
    ]),
  ] as const,
  summary: "Replace images for an entry",
  description: "Replace existing images for a specific entry. Requires matching files and existingFileNames arrays.",
  request: {
    headers: jwtHeaderSchema,
    params: entryIdParam,
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
                description: "The new image files to upload",
              }),
            existingFileNames: z
              .union([z.array(z.string()), z.string()])
              .openapi({
                description: "The names of existing files to replace (must match files array order)",
              }),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(entryImageUploadResponseSchema),
      "Images replaced successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

export const deleteEntryImagesRoute = createRoute({
  path: "/entries/{entryId}/images",
  method: "delete",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.ENTRIES, operation: OperationType.UPDATE },
    ]),
  ] as const,
  summary: "Delete images for an entry",
  description: "Delete one or more images associated with a specific entry",
  request: {
    headers: jwtHeaderSchema,
    params: entryIdParam,
    body: jsonContentRequired(deleteEntryImagesSchema, "Files to delete"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(deleteEntryImagesResponseSchema),
      "Images deleted successfully",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

export type ListEntryImagesRoute = typeof listEntryImagesRoute;
export type UploadEntryImagesRoute = typeof uploadEntryImagesRoute;
export type ReplaceEntryImagesRoute = typeof replaceEntryImagesRoute;
export type DeleteEntryImagesRoute = typeof deleteEntryImagesRoute;
