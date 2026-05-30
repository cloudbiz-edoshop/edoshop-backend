import { z } from "@hono/zod-openapi";

import { addressesSchema } from "@/db/models/addresses";
import { selectCitiesSchema } from "@/db/models/cities";
import { selectCountriesSchema } from "@/db/models/countries";
import { selectWarehouseSchema } from "@/db/models/warehouses";
import {
  idSchema,
  nameSchema,
  streetAddressSchema,
} from "@/lib/zod-schemas/common-schemas";

// Create warehouse request schema
export const createWarehouseRequestSchema = z.object({
  name: nameSchema.describe("Warehouse name"),
  description: z.string().optional().describe("Warehouse description"),
  address: streetAddressSchema.describe("Warehouse address"),
  countryId: idSchema.describe("Country ID"),
  cityId: idSchema.describe("City ID"),
  postalCode: z.string().min(1).max(20).describe("Postal code"),
});

export type CreateWarehouseRequest = z.infer<
  typeof createWarehouseRequestSchema
>;

// Create warehouse response schema
export const createWarehouseResponseSchema = selectWarehouseSchema.extend({
  address: addressesSchema.extend({
    country: selectCountriesSchema,
    city: selectCitiesSchema.optional(),
  }),
});

export type CreateWarehouseResponse = z.infer<
  typeof createWarehouseResponseSchema
>;

// Update warehouse request schema
export const updateWarehouseRequestSchema =
  createWarehouseRequestSchema.partial();

export type UpdateWarehouseRequest = z.infer<
  typeof updateWarehouseRequestSchema
>;

// Get warehouse response schema
export const getWarehouseResponseSchema = selectWarehouseSchema.extend({
  address: addressesSchema.extend({
    country: selectCountriesSchema.nullable(),
    city: selectCitiesSchema.nullable(),
  }),
});

export type GetWarehouseResponse = z.infer<typeof getWarehouseResponseSchema>;

// List warehouses response schema
export const listWarehousesResponseSchema = z.array(getWarehouseResponseSchema);

export type ListWarehousesResponse = z.infer<
  typeof listWarehousesResponseSchema
>;
