import { z } from "@hono/zod-openapi";

import { termsSchema } from "@/db/models/terms";

const termsContactSchema = z.object({
  website: z.string().optional(),
  email: z.string().optional(),
  phones: z.array(z.string()).optional(),
});

const termsSubsectionSchema = z.object({
  title: z.string().trim().min(1),
  body: z.array(z.string().trim().min(1)).min(1),
});

const termsSectionSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1),
  body: z.array(z.string().trim().min(1)).min(1),
  subsections: z.array(termsSubsectionSchema).optional(),
});

const termsContentFields = {
  languageCode: z
    .enum(["en", "fr"])
    .describe("Terms language code"),
  title: z.string().trim().min(1).max(255).describe("Terms title"),
  effectiveDate: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe("Terms effective date label"),
  version: z.string().trim().min(1).max(50).describe("Terms version"),
  acceptanceLabel: z
    .string()
    .trim()
    .min(1)
    .describe("Signup acceptance checkbox label"),
  contact: termsContactSchema.describe("Terms contact details"),
  sections: z
    .array(termsSectionSchema)
    .min(1, "At least one section is required")
    .describe("Terms sections"),
};

export const createTermsRequestSchema = z.object(termsContentFields);
export type CreateTermsRequest = z.infer<typeof createTermsRequestSchema>;

export const updateTermsRequestSchema = createTermsRequestSchema.partial();
export type UpdateTermsRequest = z.infer<typeof updateTermsRequestSchema>;

export const createTermsResponseSchema = termsSchema;
export type CreateTermsResponse = z.infer<typeof createTermsResponseSchema>;

export const getTermsResponseSchema = termsSchema;
export type GetTermsResponse = z.infer<typeof getTermsResponseSchema>;

export const listTermsResponseSchema = z.array(getTermsResponseSchema);
export type ListTermsResponse = z.infer<typeof listTermsResponseSchema>;

export const termsLanguageQuerySchema = z.object({
  languageCode: z.enum(["en", "fr"]).default("en"),
});

export const publicTermsResponseSchema = z.object({
  languageCode: z.enum(["en", "fr"]),
  title: z.string(),
  effectiveDate: z.string(),
  version: z.string(),
  acceptanceLabel: z.string(),
  contact: termsContactSchema,
  sections: z.array(termsSectionSchema),
  meta: z.object({
    title: z.string(),
    effectiveDate: z.string(),
    version: z.string(),
    contact: termsContactSchema,
  }),
});

export type PublicTermsResponse = z.infer<typeof publicTermsResponseSchema>;
