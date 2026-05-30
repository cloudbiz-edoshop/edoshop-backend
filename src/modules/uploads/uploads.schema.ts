import { z } from "zod";

export const presignedUrlSchema = z.object({
  fileName: z.string().min(1),
});

export type PresignedUrlRequest = z.infer<typeof presignedUrlSchema>;

export const uploadResponseSchema = z.object({
  url: z.url(),
  fileName: z.string(),
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;

// File info response schema
export const fileInfoSchema = z.object({
  fileName: z.string(),
  size: z.number(),
  contentType: z.string().nullable(),
  lastModified: z.string(),
  url: z.string(),
});

export type FileInfo = z.infer<typeof fileInfoSchema>;

// Delete files schema
export const deleteFilesSchema = z.object({
  fileNames: z.array(z.string().min(1)).min(1).max(10).openapi({
    description: "Array of file names/keys to delete",
    example: ["abc123.jpg", "def456.png"],
  }),
});

export type DeleteFilesRequest = z.infer<typeof deleteFilesSchema>;

// Delete files response
export const deleteFilesResponseSchema = z.object({
  deleted: z.array(z.string()),
  failed: z.array(z.object({
    fileName: z.string(),
    error: z.string(),
  })),
});

export type DeleteFilesResponse = z.infer<typeof deleteFilesResponseSchema>;

// Upload files response (for multiple files)
export const uploadFilesResponseSchema = z.object({
  uploads: z.array(uploadResponseSchema),
  failed: z.array(z.object({
    fileName: z.string(),
    error: z.string(),
  })),
});

export type UploadFilesResponse = z.infer<typeof uploadFilesResponseSchema>;

// List files response
export const listFilesResponseSchema = z.object({
  files: z.array(fileInfoSchema),
  totalCount: z.number(),
});

export type ListFilesResponse = z.infer<typeof listFilesResponseSchema>;
