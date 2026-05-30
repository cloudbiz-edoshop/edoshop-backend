import { z } from "@hono/zod-openapi";

import { StoreIds } from "@/constants/stores.constants";
import { productsSchema } from "@/db/models/products";
import { seriesSchema } from "@/db/models/series";

export const getAllGroupCriteriaTypesResponseSchema = z.array(z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
}));

export type GetAllGroupCriteriaTypesResponse = z.infer<typeof getAllGroupCriteriaTypesResponseSchema>;

// Base schema
export const baseProductSchema = z.object({
  storeId: z.number(),
  seriesId: z.number(),
  name: z.string(),
  price: z.string(),
  shortDescription: z.string().optional(),
  fullDescription: z.string().optional(),
  specifications: z.string().optional(),
  tagIds: z.array(z.number()).optional(),
  categoryIds: z.array(z.number()).optional(),
  concurrentReqs: z.number().min(1),

  // Fields for direct order store
  directOrderCode: z.string().max(50).optional(),

  // Fields for dropshipping store
  dropshippingCode: z.string().max(255).optional(),
  totalItems: z.number().optional(),
  groupCriteriaId: z.number().optional(),
  completionCriteria: z.string().optional(),
});

// Create schema with validations based on storeId
export const createProductRequestSchema = baseProductSchema
  .refine(
    (data) => {
      // Require tags for all products
      return data.tagIds?.length;
    },
    {
      message: "At least one tag is required for all products",
      path: ["tagIds"],
    },
  )
  .refine(
    (data) => {
      // Require categories for all products
      return data.categoryIds?.length;
    },
    {
      message: "At least one category is required for all products",
      path: ["categoryIds"],
    },
  )
  .refine(
    (data) => {
      if (data.storeId === StoreIds.dropshipping) {
        return (
          data.totalItems !== undefined &&
          data.groupCriteriaId !== undefined &&
          data.completionCriteria !== undefined
        );
      }
      return true;
    },
    {
      message:
        "totalItems, groupCriteria, and completionCriteria are required for Dropshipping Store",
      path: [
        "totalItems",
        "groupCriteriaId",
        "completionCriteria",
      ],
    },
  )
  .refine(
    (data) => {
      // Validate that storeId is valid
      return Object.values(StoreIds).includes(data.storeId);
    },
    {
      message: "Invalid store ID",
      path: ["storeId"],
    },
  )
  .refine(
    (data) => {
      // Validate that price is a valid decimal
      const priceNum = Number.parseFloat(data.price);
      return !Number.isNaN(priceNum) && priceNum > 0;
    },
    {
      message: "Price must be a valid positive number",
      path: ["price"],
    },
  )
  .refine(
    (data) => {
      // Validate that concurrentReqs is a positive number
      return data.concurrentReqs >= 1;
    },
    {
      message: "Concurrent requests must be at least 1",
      path: ["concurrentReqs"],
    },
  );

export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;

// Update schema with partial validation but still strict
export const updateProductRequestSchema = baseProductSchema.partial().strict();
export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;

// Response schemas
export const createProductResponseSchema = productsSchema;
export type CreateProductResponse = z.infer<typeof createProductResponseSchema>;

export const getProductResponseSchema = productsSchema;
export type GetProductResponse = z.infer<typeof getProductResponseSchema>;

export const productResponseSchema = productsSchema.extend({
  store: z
    .object({
      id: z.number(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  tags: z
    .array(
      z.object({
        id: z.number().nullable(),
        name: z.string().nullable(),
      }),
    )
    .optional(),
  categories: z
    .array(
      z.object({
        id: z.number(),
        name: z.string().nullable(),
      }),
    )
    .optional(),
  series: seriesSchema.nullable().optional(),
  directOrderCode: z.string().nullable().optional(),
  dropshippingDetails: z
    .object({
      dropshippingCode: z.string().nullable(),
      totalItems: z.number().nullable(),
      groupCriteriaId: z.number().nullable(),
      completionCriteria: z.string().nullable(),
    })
    .nullable()
    .optional(),
  reviews: z
    .array(
      z.object({
        status: z
          .object({
            id: z.number(),
            name: z.string(),
          })
          .optional(),
        createdBy: z.any(),
        updatedBy: z.any(),
      }),
    )
    .optional(),
  variants: z
    .array(
      z.object({
        color: z
          .object({
            id: z.number(),
            name: z.string(),
          })
          .optional(),
        size: z
          .object({
            id: z.number(),
            name: z.string(),
          })
          .optional(),
        materialType: z
          .object({
            id: z.number(),
            name: z.string(),
          })
          .optional(),
        designPattern: z
          .object({
            id: z.number(),
            name: z.string(),
          })
          .optional(),
        createdBy: z.any(),
        updatedBy: z.any(),
      }),
    )
    .optional(),
});

export const listProductsResponseSchema = z.array(productResponseSchema);
export type ListProductsResponse = z.infer<typeof listProductsResponseSchema>;

export const paginatedProductsResponseSchema = z.object({
  data: z.array(productResponseSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
  searchableFields: z.array(z.string()),
});

export const productsQueryParamsSchema = z.object({
  search: z.string().optional().describe("Search term for product fields"),
  page: z.number().min(1, "Page must be a positive number").optional().default(1),
  limit: z.number().min(1, "Limit must be a positive number").max(100, "Limit cannot exceed 100").optional().default(10),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  filters: z
    .string()
    .optional()
    .transform((str, ctx) => {
      if (!str) {
        return undefined;
      }
      try {
        return JSON.parse(str);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid JSON in filters parameter",
        });
        return z.NEVER;
      }
    })
    .describe(
      "JSON string with filter options. Available filters: categoryIds (array), tagIds (array)",
    )
    .openapi({
      example: "{\"storeId\": 1, \"categoryIds\": [1, 2], \"tagIds\": [3, 4]}",
    }),
});
