import { z } from "@hono/zod-openapi";

import { addressesSchema } from "@/db/models/addresses";
import { selectCountriesSchema } from "@/db/models/countries";
import {
  emailSchema,
  idSchema,
  nameSchema,
  phoneSchema,
  streetAddressSchema,
} from "@/lib/zod-schemas/common-schemas";
import { userSchema } from "@/modules/users/users.schema";

// Schema for creating a retailer
export const createRetailerRequestSchema = z.object({
  fullName: nameSchema.describe("Retailer full name"),
  phone: phoneSchema.describe("Retailer phone number"),
  email: emailSchema.describe("Retailer email"),
  countryId: idSchema.describe("Country ID"),
  cityId: idSchema.describe("City ID"),
  address: streetAddressSchema.describe("Retailer address"),
  shop: z.string().min(1).describe("Shop name"),
  status: z.boolean().default(true).describe("Retailer status"),
});

export type CreateRetailerRequest = z.infer<typeof createRetailerRequestSchema>;

// Schema for creating a retailer response
export const createRetailerResponseSchema = z.object({
  id: idSchema,
  userId: idSchema,
  shopName: z.string(),
  retailerCode: z.string(),
  status: z.boolean(),
  isDeleted: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
  createdBy: idSchema,
  updatedBy: idSchema.nullable(),
  deletedAt: z.string().nullable(),
  deletedBy: idSchema.nullable(),
  user: userSchema.extend({
    addresses: z.array(
      addressesSchema.extend({
        country: selectCountriesSchema,
      }),
    ),
  }),
});

export type CreateRetailerResponse = z.infer<
  typeof createRetailerResponseSchema
>;

// Schema for updating a retailer
export const updateRetailerRequestSchema =
  createRetailerRequestSchema.partial();

export type UpdateRetailerRequest = z.infer<typeof updateRetailerRequestSchema>;

// Schema for getting a retailer
export const getRetailerResponseSchema = createRetailerResponseSchema;

export type GetRetailerResponse = z.infer<typeof getRetailerResponseSchema>;

// Schema for listing retailers
export const listRetailersResponseSchema = z.array(getRetailerResponseSchema);

export type ListRetailersResponse = z.infer<typeof listRetailersResponseSchema>;
