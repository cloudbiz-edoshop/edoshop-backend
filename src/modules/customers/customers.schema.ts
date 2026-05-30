import { z } from "@hono/zod-openapi";

import { addressesSchema } from "@/db/models/addresses";
import { selectCountriesSchema } from "@/db/models/countries";
import { customerSchema } from "@/db/models/customers";
import {
  emailSchema,
  idSchema,
  nameSchema,
  phoneSchema,
  streetAddressSchema,
} from "@/lib/zod-schemas/common-schemas";

import { userSchema } from "../users/users.schema";

export const createCustomerRequestSchema = z.object({
  fullName: nameSchema.describe("Customer name"),
  email: emailSchema.optional().describe("Customer email"),
  phoneNumber: phoneSchema.describe("Customer phone number"),
  countryId: idSchema.describe("Country ID"),
  address: streetAddressSchema.describe("Customer address"),
});

export type CreateCustomerRequest = z.infer<typeof createCustomerRequestSchema>;

export const createCustomerResponseSchema = customerSchema.extend({
  user: userSchema.extend({
    addresses: z.array(
      addressesSchema.extend({
        country: selectCountriesSchema,
      }),
    ),
  }),
});

export type CreateCustomerResponse = z.infer<
  typeof createCustomerResponseSchema
>;

export const updateCustomerRequestSchema =
  createCustomerRequestSchema.partial();

export type UpdateCustomerRequest = z.infer<typeof updateCustomerRequestSchema>;

// Schema for getting a customer
export const getCustomerResponseSchema = customerSchema.extend({
  user: userSchema.extend({
    addresses: z.array(
      addressesSchema.extend({
        country: selectCountriesSchema,
      }),
    ),
  }),
});

// Get customer response type
export type GetCustomerResponse = z.infer<typeof getCustomerResponseSchema>;

// List customers response schema
export const listCustomersResponseSchema = z.array(getCustomerResponseSchema);

// List customers response type
export type ListCustomersResponse = z.infer<typeof listCustomersResponseSchema>;
