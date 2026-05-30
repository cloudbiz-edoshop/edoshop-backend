import { z } from "zod";

import { selectEntryImageSchema } from "@/db/models/entry-images";

// Response schema for a single entry image
export const entryImageResponseSchema = selectEntryImageSchema;

export type EntryImageResponse = z.infer<typeof entryImageResponseSchema>;

// Response schema for listing entry images
export const entryImagesListResponseSchema = z.object({
  files: z.array(
    z.object({
      id: z.number(),
      url: z.string(),
      fileName: z.string(),
    }),
  ),
  maxImages: z.number(),
});

export type EntryImagesListResponse = z.infer<typeof entryImagesListResponseSchema>;

// Upload response schema
export const entryImageUploadResponseSchema = z.object({
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

export type EntryImageUploadResponse = z.infer<typeof entryImageUploadResponseSchema>;

// Delete request schema
export const deleteEntryImagesSchema = z.object({
  fileNames: z.array(z.string().min(1)).min(1).max(10).openapi({
    description: "Array of file names to delete",
    example: ["image1.jpg", "image2.png"],
  }),
});

export type DeleteEntryImagesRequest = z.infer<typeof deleteEntryImagesSchema>;

// Delete response schema
export const deleteEntryImagesResponseSchema = z.object({
  deleted: z.array(z.string()),
  failed: z.array(
    z.object({
      fileName: z.string(),
      error: z.string(),
    }),
  ),
});

export type DeleteEntryImagesResponse = z.infer<typeof deleteEntryImagesResponseSchema>;

// Replace response uses same as upload response
export const replaceEntryImagesResponseSchema = entryImageUploadResponseSchema;

export type ReplaceEntryImagesResponse = z.infer<typeof replaceEntryImagesResponseSchema>;
