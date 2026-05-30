import { z } from "zod";

// Mobile upload response (same structure as entry images upload)
export const mobileUploadResponseSchema = z.object({
  uploads: z.array(
    z.object({
      id: z.number(),
      url: z.string(),
      fileName: z.string(),
    }),
  ),
  failed: z.array(
    z.object({
      fileName: z.string(),
      error: z.string(),
    }),
  ),
});

export type MobileUploadResponse = z.infer<typeof mobileUploadResponseSchema>;

// Mobile images list response
export const mobileImagesListResponseSchema = z.object({
  files: z.array(
    z.object({
      id: z.number(),
      url: z.string(),
      fileName: z.string(),
    }),
  ),
  maxImages: z.number(),
});

export type MobileImagesListResponse = z.infer<typeof mobileImagesListResponseSchema>;

export const mobileDeleteImagesRequestSchema = z.object({
  fileNames: z.array(z.string().min(1)).min(1).max(10),
});

export const mobileDeleteImagesResponseSchema = z.object({
  deleted: z.array(z.string()),
  failed: z.array(
    z.object({
      fileName: z.string(),
      error: z.string(),
    }),
  ),
});

export type MobileDeleteImagesRequest = z.infer<
  typeof mobileDeleteImagesRequestSchema
>;
export type MobileDeleteImagesResponse = z.infer<
  typeof mobileDeleteImagesResponseSchema
>;
