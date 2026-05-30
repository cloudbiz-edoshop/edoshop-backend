import { createRoute, z } from "@hono/zod-openapi";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import {
  jsonContent,
  jsonContentRequired,
} from "@/lib/openapi/helpers";
import { createSuccessResponseSchema } from "@/lib/openapi/schemas/create-api-response";

import {
  deleteFilesResponseSchema,
  deleteFilesSchema,
  fileInfoSchema,
  listFilesResponseSchema,
  presignedUrlSchema,
  uploadFilesResponseSchema,
  uploadResponseSchema,
} from "./uploads.schema";

const tags = ["Uploads"];

export const presignedUrlRoute = createRoute({
  method: "post",
  path: "/presigned",
  tags,
  summary: "Get presigned URL for upload",
  description: "Get a presigned URL for uploading a file directly to MinIO. This URL can be used for QR code-based mobile uploads.",
  request: {
    body: jsonContentRequired(presignedUrlSchema, "File details"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(uploadResponseSchema, "Presigned URL generated"),
      "Presigned URL generated",
    ),
  },
});

export type PresignedUrlRoute = typeof presignedUrlRoute;

// Get file info route
export const getFileInfoRoute = createRoute({
  method: "get",
  path: "/info/{fileName}",
  tags,
  summary: "Get file information",
  description: "Get metadata about a file including name, size, and content type",
  request: {
    params: z.object({
      fileName: z.string().min(1).openapi({
        description: "The name/key of the file",
        example: "abc123.jpg",
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(fileInfoSchema, "File info retrieved"),
      "File info retrieved successfully",
    ),
  },
});

export type GetFileInfoRoute = typeof getFileInfoRoute;

// Upload files route (Bulk)
export const uploadFilesRoute = createRoute({
  method: "post",
  path: "/upload",
  tags,
  summary: "Upload multiple files",
  description: "Upload multiple files at once (max 10 files per request)",
  request: {
    body: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: z.object({
            files: z.union([
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
            ]).openapi({
              description: "The files to upload (max 10)",
            }),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(uploadFilesResponseSchema, "Files uploaded successfully"),
      "Files uploaded successfully",
    ),
  },
});

export type UploadFilesRoute = typeof uploadFilesRoute;

// List files route
export const listFilesRoute = createRoute({
  method: "get",
  path: "/list-all",
  tags,
  summary: "List all files in bucket",
  description: "Get a list of all files stored in the bucket with their metadata",
  request: {
    query: z.object({
      prefix: z.string().optional().openapi({
        description: "Filter files by prefix/folder path",
        example: "images/",
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(listFilesResponseSchema, "Files retrieved successfully"),
      "Files list retrieved",
    ),
  },
});

export type ListFilesRoute = typeof listFilesRoute;

// Delete files route (Bulk)
export const deleteFilesRoute = createRoute({
  method: "post",
  path: "/delete",
  tags,
  summary: "Delete multiple files",
  description: "Delete multiple files from storage at once (max 10 files per request)",
  request: {
    body: jsonContentRequired(deleteFilesSchema, "Files to delete"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(deleteFilesResponseSchema, "Batch delete completed"),
      "Batch delete completed",
    ),
  },
});

export type DeleteFilesRoute = typeof deleteFilesRoute;

// Replace files route (Bulk)
export const replaceFilesRoute = createRoute({
  method: "post",
  path: "/replace",
  tags,
  summary: "Replace multiple files",
  description: "Replace multiple files at once. Requires 'files' and 'existingFileNames' arrays with matching indices.",
  request: {
    body: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: z.object({
            files: z.union([
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
            ]).openapi({
              description: "The new files to upload",
            }),
            existingFileNames: z.union([
              z.array(z.string()),
              z.string(),
            ]).openapi({
              description: "The names of existing files to replace (must match files array order)",
            }),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(uploadFilesResponseSchema, "Files replaced successfully"),
      "Files replaced successfully",
    ),
  },
});

export type ReplaceFilesRoute = typeof replaceFilesRoute;
