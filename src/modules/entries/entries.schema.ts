import { number, z } from "zod";

import { bundlesSchema } from "@/db/models/bundles";
import { customerSchema } from "@/db/models/customers";
import { selectEntriesSchema } from "@/db/models/entries";
import { selectEntryProductsSchema } from "@/db/models/entry-products";
import { entryStateSchema } from "@/db/models/entry-states";
import { entryTypeSchema } from "@/db/models/entry-types";
import { itemsSchema } from "@/db/models/items";
import { packagesSchema } from "@/db/models/packages";
import { returnsSchema } from "@/db/models/returns";
import { seriesSchema } from "@/db/models/series";
import { supplierSchema } from "@/db/models/suppliers";
import { selectWarehouseSchema } from "@/db/models/warehouses";
import { filtersSchema } from "@/lib/openapi/schemas";
import { userSchema } from "@/modules/users/users.schema";

export const entryTypesResponseSchema = z.array(entryTypeSchema);

export type EntryTypesResponse = z.infer<typeof entryTypesResponseSchema>;

export const getAllEntryTypesResponseSchema = z.array(z.object({
  id: number(),
  name: z.string(),
  description: z.string().nullable(),
}));

export type GetAllEntryTypesResponse = z.infer<typeof getAllEntryTypesResponseSchema>;

/*
VALIDATION STRATEGY:
Layer 1: Zod Schema - Basic type checking and data validation
Layer 2: Business Logic Validation - Handled in service layer validators
Layer 3: Database Constraints - Handled in database constraints validator

This simplified schema focuses on basic data types and constraints only.
Complex business logic is handled in the service layer for better maintainability.
*/

// Simplified base schema focusing on data types and basic constraints
export const baseEntriesSchema = z.object({
  // Required fields for all entries
  entryStateId: z
    .number()
    .int()
    .min(1, "Entry state ID must be a positive integer"),
  entryTypeId: z
    .number()
    .int()
    .min(1, "Entry type ID must be a positive integer"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  weight: z.number().positive("Weight must be positive").min(0.0001, "Weight must be greater than 0.0001"),
  date: z.iso.date("Date must be a valid ISO 8601 date string"),
  warehouseId: z
    .number()
    .int()
    .min(1, "Warehouse ID must be a positive integer"),
  description: z.string().min(1, "Description is required"),

  // Optional fields based on entry type and state
  supplierCode: z
    .string()
    .min(3, "Supplier code must be at least 3 characters")
    .optional(),
  supplierId: z.number().int().min(1).optional(),
  productCode: z
    .string()
    .min(3, "Product code must be at least 3 characters")
    .optional(),

  // Series-related fields
  bundleCode: z
    .string()
    .min(3, "Bundle code must be at least 3 characters")
    .optional(),
  colorId: z.any().optional(), // Keep as any for backward compatibility

  // Item-related fields
  seriesCode: z
    .string()
    .min(3, "Series code must be at least 3 characters")
    .optional(),
  sizeId: z.number().int().min(1).optional(),

  // Package-related fields
  binLocation: z.string().min(1, "Bin location is required").optional(),
  isOpen: z.boolean().default(false),

  // Return-related fields
  customerCode: z
    .string()
    .min(3, "Customer code must be at least 3 characters")
    .optional(),
  customerName: z.string().min(1, "Customer name is required").optional(),
  itemCode: z
    .string()
    .min(3, "Item code must be at least 3 characters")
    .optional(),
  packageCode: z
    .string()
    .min(3, "Package code must be at least 3 characters")
    .optional(),
  orderId: z.string().min(1, "Order ID is required").optional(),
});

// Create schema - business logic validation will be handled in service layer
export const createEntriesRequestSchema = baseEntriesSchema;

export type CreateEntriesRequest = z.infer<typeof createEntriesRequestSchema>;

// Update schema is partial of the base (no complex business logic refinements)
export const updateEntriesRequestSchema = baseEntriesSchema.partial();

export type UpdateEntriesRequest = z.infer<typeof updateEntriesRequestSchema>;

// Comprehensive response schema that includes all related fields
export const entryResponseSchema = selectEntriesSchema.extend({
  entryType: entryTypeSchema.optional().nullable(),
  entryState: entryStateSchema.optional().nullable(),
  warehouse: selectWarehouseSchema.optional().nullable(),
  supplier: supplierSchema.optional().nullable(),
  customer: customerSchema.optional().nullable(),
  createdByUser: userSchema.optional().nullable(),
  updatedByUser: userSchema.optional().nullable(),
  deletedByUser: userSchema.optional().nullable(),
  bundles: z.array(bundlesSchema).optional(),
  series: z.array(seriesSchema).optional(),
  items: z.array(itemsSchema).optional(),
  packages: z.array(packagesSchema).optional(),
  returnsAsOriginalEntry: z.array(returnsSchema).optional(),
  returnsAsReturnEntry: z.array(returnsSchema).optional(),
  entryProducts: z.array(selectEntryProductsSchema).optional(),
});

export const createEntriesResponseSchema = entryResponseSchema;

export type CreateEntriesResponse = z.infer<typeof createEntriesResponseSchema>;

export type UpdateEntriesDBRequest = Omit<UpdateEntriesRequest, "weight"> & {
  weight?: string; // DB expects weight as string (decimal)
  updatedBy: number;
};

// Specific query parameters for entries with documented filters
export const entriesQueryParamsSchema = z.object({
  search: z
    .string()
    .default("")
    .openapi({
      param: {
        name: "search",
        in: "query",
        required: false,
        description: "Search in description field",
      },
      example: "product description",
    }),
  page: z.coerce
    .number()
    .default(1)
    .openapi({
      param: {
        name: "page",
        in: "query",
        required: false,
      },
      default: 1,
    }),
  limit: z.coerce
    .number()
    .default(10)
    .openapi({
      param: {
        name: "limit",
        in: "query",
        required: false,
      },
      default: 10,
    }),
  sortBy: z
    .enum([
      "id",
      "entryTypeId",
      "entryStateId",
      "quantity",
      "weight",
      "date",
      "warehouseId",
      "description",
      "createdAt",
      "updatedAt",
    ])
    .default("createdAt")
    .openapi({
      param: {
        name: "sortBy",
        in: "query",
        required: false,
        description: "Field to sort by",
      },
      default: "createdAt",
    }),
  sortOrder: z
    .enum(["asc", "desc"])
    .default("desc")
    .openapi({
      param: {
        name: "sortOrder",
        in: "query",
        required: false,
      },
      default: "desc",
    }),
  filters: filtersSchema,
});

export type EntriesQueryParams = z.infer<typeof entriesQueryParamsSchema>;
