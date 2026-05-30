import { z } from "@hono/zod-openapi";

import { GroupApprovalStatusIds } from "@/constants/group-approval-statuses.constants";
import { ongoingGroupRequestsSchema } from "@/db/models/ongoing-group-requests";

// Base schema for creating a request
export const baseOngoingGroupRequestSchema = z.object({
  productId: z.number().min(1).describe("Product ID (required)"),
  variantId: z.number().min(1).describe("Variant ID (required)"),
  quantity: z.number().min(1).describe("Quantity requested (required)"),
  approvalStatusId: z.number().optional().describe("Approval status ID"),
  reasonForRejection: z.string().optional().describe("Reason for rejection if applicable"),
});

// Create schema with strict validations
export const createOngoingGroupRequestSchema = baseOngoingGroupRequestSchema
  .refine(
    (data) => {
      // Validate that productId is required and a positive number
      return data.productId && data.productId > 0;
    },
    {
      message: "Product ID is required and must be a positive number",
      path: ["productId"],
    },
  )
  .refine(
    (data) => {
      // Validate that variantId is required and a positive number
      return data.variantId && data.variantId > 0;
    },
    {
      message: "Variant ID is required and must be a positive number",
      path: ["variantId"],
    },
  )
  .refine(
    (data) => {
      // Validate that quantity is required and a positive number
      return data.quantity && data.quantity > 0;
    },
    {
      message: "Quantity is required and must be a positive number",
      path: ["quantity"],
    },
  )

  .refine(
    (data) => {
      // If approvalStatusId is provided, validate it's a valid status
      if (data.approvalStatusId) {
        return Object.values(GroupApprovalStatusIds).includes(data.approvalStatusId as any);
      }
      return true;
    },
    {
      message: "Invalid approval status ID",
      path: ["approvalStatusId"],
    },
  )
  .refine(
    (data) => {
      // If reasonForRejection is provided, it should not be empty
      if (data.reasonForRejection !== undefined) {
        return data.reasonForRejection.trim().length > 0;
      }
      return true;
    },
    {
      message: "Reason for rejection cannot be empty if provided",
      path: ["reasonForRejection"],
    },
  );

export type CreateOngoingGroupRequest = z.infer<typeof createOngoingGroupRequestSchema>;

// Update schema with partial validation but still strict
export const updateOngoingGroupRequestSchema = baseOngoingGroupRequestSchema
  .partial()
  .strict()
  .refine(
    (data) => {
      // If productId is provided, validate it's a positive number
      if (data.productId !== undefined) {
        return data.productId > 0;
      }
      return true;
    },
    {
      message: "Product ID must be a positive number",
      path: ["productId"],
    },
  )
  .refine(
    (data) => {
      // If variantId is provided, validate it's a positive number
      if (data.variantId !== undefined) {
        return data.variantId > 0;
      }
      return true;
    },
    {
      message: "Variant ID must be a positive number",
      path: ["variantId"],
    },
  )
  .refine(
    (data) => {
      // If quantity is provided, validate it's a positive number
      if (data.quantity !== undefined) {
        return data.quantity > 0;
      }
      return true;
    },
    {
      message: "Quantity must be a positive number",
      path: ["quantity"],
    },
  )

  .refine(
    (data) => {
      // If approvalStatusId is provided, validate it's a valid status
      if (data.approvalStatusId !== undefined) {
        return Object.values(GroupApprovalStatusIds).includes(data.approvalStatusId as any);
      }
      return true;
    },
    {
      message: "Invalid approval status ID",
      path: ["approvalStatusId"],
    },
  )
  .refine(
    (data) => {
      // If reasonForRejection is provided, it should not be empty
      if (data.reasonForRejection !== undefined) {
        return data.reasonForRejection.trim().length > 0;
      }
      return true;
    },
    {
      message: "Reason for rejection cannot be empty if provided",
      path: ["reasonForRejection"],
    },
  );

export type UpdateOngoingGroupRequest = z.infer<typeof updateOngoingGroupRequestSchema>;

// Query parameters schema for listing
export const ongoingGroupRequestsQueryParamsSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  filters: z.object({
    productId: z.coerce.number().optional(),
    variantId: z.coerce.number().optional(),
    approvalStatusId: z.coerce.number().optional(),
    requestedBy: z.coerce.number().optional(),
  }).optional(),
});

export type OngoingGroupRequestsQueryParams = z.infer<typeof ongoingGroupRequestsQueryParamsSchema>;

// Response schemas
export const ongoingGroupRequestResponseSchema = ongoingGroupRequestsSchema.extend({
  ongoingGroup: z
    .object({
      id: z.number(),
      productId: z.number(),
      orderedItems: z.number(),
      totalItems: z.number(),
      thresholdToValidate: z.number(),
      statusId: z.number(),
    })
    .nullable()
    .optional(),
  product: z
    .object({
      id: z.number(),
      name: z.string(),
      concurrentReqs: z.number().nullable(),
    })
    .nullable()
    .optional(),
  variant: z
    .object({
      id: z.number(),
      variantCode: z.string().nullable(),
    })
    .nullable()
    .optional(),
  approvalStatus: z
    .object({
      id: z.number(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  requestedBy: z
    .object({
      id: z.number(),
      username: z.string(),
    })
    .nullable()
    .optional(),
  createdBy: z
    .object({
      id: z.number(),
      username: z.string(),
    })
    .nullable()
    .optional(),
  updatedBy: z
    .object({
      id: z.number(),
      username: z.string(),
    })
    .nullable()
    .optional(),
  directOrderProduct: z
    .object({
      id: z.number(),
      productId: z.number(),
      directOrderCode: z.string().nullable(),
    })
    .nullable()
    .optional(),
  dropshippingProduct: z
    .object({
      id: z.number(),
      productId: z.number(),
      dropshippingCode: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

export type OngoingGroupRequestResponse = z.infer<typeof ongoingGroupRequestResponseSchema>;

export const listOngoingGroupRequestsResponseSchema = z.array(ongoingGroupRequestResponseSchema);
export type ListOngoingGroupRequestsResponse = z.infer<typeof listOngoingGroupRequestsResponseSchema>;

export const paginatedOngoingGroupRequestsResponseSchema = z.object({
  data: z.array(ongoingGroupRequestResponseSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});
export type PaginatedOngoingGroupRequestsResponse = z.infer<typeof paginatedOngoingGroupRequestsResponseSchema>;

// PATCH schema: only approval/rejection allowed
export const patchOngoingGroupRequestSchema = z.object({
  approvalStatusId: z.number().describe("Approval status ID"),
  reasonForRejection: z.string().optional().describe("Reason for rejection if applicable"),
}).refine(
  (data) => {
    // If rejecting, reasonForRejection must be provided and not empty
    if (data.approvalStatusId === GroupApprovalStatusIds.REJECTED) {
      return !!data.reasonForRejection && data.reasonForRejection.trim().length > 0;
    }
    return true;
  },
  {
    message: "Reason for rejection is required when rejecting a request",
    path: ["reasonForRejection"],
  },
);
