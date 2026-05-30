import { z } from "zod";

// Generate token request (no body needed - entryId comes from path)

// Generate token response
export const uploadTokenResponseSchema = z.object({
  token: z.string(),
  entryId: z.number(),
  expiresAt: z.string(),
});

export type UploadTokenResponse = z.infer<typeof uploadTokenResponseSchema>;

// Validate token response
export const validateTokenResponseSchema = z.object({
  valid: z.boolean(),
  entryId: z.number().optional(),
  maxImages: z.number().optional(),
  remainingImages: z.number().optional(),
  expiresAt: z.string().optional(),
});

export type ValidateTokenResponse = z.infer<typeof validateTokenResponseSchema>;
