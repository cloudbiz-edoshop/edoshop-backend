import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { OperationType } from "@/constants";
import { operations } from "@/db/models";
import { idSchema } from "@/lib/zod-schemas";

// Base operation schema
export const operationSchema = createSelectSchema(operations);

// Operation type from schema
export type Operation = z.infer<typeof operationSchema>;

// Schema for creating a new operation
export const createOperationSchema = z.object({
  name: z.string().min(1, "Name is required").describe("Operation name"),
  type: z.nativeEnum(OperationType).describe("Type of operation"),
  description: z
    .string()
    .nullable()
    .optional()
    .describe("Operation description"),
});

// Create operation request type
export type CreateOperationRequest = z.infer<typeof createOperationSchema>;

// Create operation response schema
export const createOperationResponseSchema = z.object({
  operation: operationSchema.describe("Created operation information"),
});

// Create operation response type
export type CreateOperationResponse = z.infer<
  typeof createOperationResponseSchema
>;

// Schema for updating an operation
export const updateOperationSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .optional()
    .describe("Operation name"),
  type: z.nativeEnum(OperationType).optional().describe("Type of operation"),
  description: z
    .string()
    .nullable()
    .optional()
    .describe("Operation description"),
});

// Update operation request type
export type UpdateOperationRequest = z.infer<typeof updateOperationSchema>;

// Update operation response schema
export const updateOperationResponseSchema = z.object({
  operation: operationSchema.describe("Updated operation information"),
});

// Update operation response type
export type UpdateOperationResponse = z.infer<
  typeof updateOperationResponseSchema
>;

// Delete operation response schema
export const deleteOperationResponseSchema = z.object({
  id: idSchema.describe("ID of the deleted operation"),
});

// Delete operation response type
export type DeleteOperationResponse = z.infer<
  typeof deleteOperationResponseSchema
>;

// Get operation response schema
export const getOperationResponseSchema = z.object({
  operation: operationSchema.describe("Operation information"),
});

// Get operation response type
export type GetOperationResponse = z.infer<typeof getOperationResponseSchema>;

// List operations response schema
export const listOperationsResponseSchema = z.object({
  operations: z.array(operationSchema).describe("List of operations"),
  pagination: z.object({
    total: z.number().describe("Total number of operations"),
    page: z.number().describe("Current page number"),
    limit: z.number().describe("Number of items per page"),
    totalPages: z.number().describe("Total number of pages"),
    hasNextPage: z.boolean().describe("Whether there is a next page"),
    hasPreviousPage: z.boolean().describe("Whether there is a previous page"),
  }),
});

// List operations response type
export type ListOperationsResponse = z.infer<
  typeof listOperationsResponseSchema
>;
